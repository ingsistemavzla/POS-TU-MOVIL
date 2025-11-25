-- Enforce store assignment: admins can use any store; managers/cashiers only their assigned store

-- 1) Schema: add assigned_store_id to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS assigned_store_id uuid REFERENCES public.stores(id);

CREATE INDEX IF NOT EXISTS users_assigned_store_id_idx ON public.users(assigned_store_id);

-- 2) Helper function: get user's assigned store id
CREATE OR REPLACE FUNCTION public.get_assigned_store_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT assigned_store_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 3) Update process_sale to enforce role-based store restriction
CREATE OR REPLACE FUNCTION process_sale(
    p_company_id UUID,
    p_store_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID,
    p_payment_method VARCHAR(50),
    p_customer_name VARCHAR(255),
    p_bcv_rate DECIMAL(12,4),
    p_customer_id_number VARCHAR(50),
    p_items JSONB,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_invoice_number VARCHAR(50);
    v_subtotal_usd DECIMAL(12,2) := 0;
    v_tax_amount_usd DECIMAL(12,2) := 0;
    v_total_usd DECIMAL(12,2) := 0;
    v_total_bs DECIMAL(15,2) := 0;
    v_item JSONB;
    v_line_total_usd DECIMAL(12,2);
    v_line_total_bs DECIMAL(15,2);
    v_product_name VARCHAR(255);
    v_product_sku VARCHAR(100);
    v_role TEXT;
    v_user_company UUID;
    v_assigned_store UUID;
BEGIN
    -- Validate user company and role
    SELECT role, company_id, assigned_store_id INTO v_role, v_user_company, v_assigned_store
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_user_company IS DISTINCT FROM p_company_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'COMPANY_MISMATCH');
    END IF;

    -- If not admin, enforce assigned store
    IF v_role IS DISTINCT FROM 'admin' THEN
      IF v_assigned_store IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_ASSIGNED_STORE');
      END IF;
      IF p_store_id IS DISTINCT FROM v_assigned_store THEN
        RETURN jsonb_build_object('success', false, 'error', 'STORE_NOT_ALLOWED');
      END IF;
    END IF;

    -- Generate invoice number
    v_invoice_number := generate_invoice_number(p_company_id);
    
    -- Calculate totals from items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_line_total_usd := (v_item->>'quantity')::DECIMAL * (v_item->>'unit_price_usd')::DECIMAL;
        v_subtotal_usd := v_subtotal_usd + v_line_total_usd;
    END LOOP;
    
    -- Calculate tax and total
    v_tax_amount_usd := v_subtotal_usd * 0.16;
    v_total_usd := v_subtotal_usd + v_tax_amount_usd;
    v_total_bs := v_total_usd * p_bcv_rate;
    
    -- Create sale record
    INSERT INTO public.sales (
        company_id, store_id, customer_id, cashier_id,
        total_usd, total_bs, bcv_rate_used, payment_method, status
    ) VALUES (
        p_company_id, p_store_id, p_customer_id, p_cashier_id,
        v_total_usd, v_total_bs, p_bcv_rate, p_payment_method, 'completed'
    ) RETURNING id INTO v_sale_id;
    
    -- Update the sale with additional fields after creation
    UPDATE public.sales SET
        invoice_number = v_invoice_number,
        customer_name = p_customer_name,
        customer_id_number = p_customer_id_number,
        subtotal_usd = v_subtotal_usd,
        tax_amount_usd = v_tax_amount_usd,
        notes = p_notes
    WHERE id = v_sale_id;
    
    -- Create sale items and update inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT name, sku INTO v_product_name, v_product_sku
        FROM public.products 
        WHERE id = (v_item->>'product_id')::UUID;
        
        v_line_total_usd := (v_item->>'quantity')::DECIMAL * (v_item->>'unit_price_usd')::DECIMAL;
        v_line_total_bs := v_line_total_usd * p_bcv_rate;
        
        INSERT INTO public.sale_items (
            sale_id, product_id, product_name, product_sku,
            qty, price_usd, subtotal_usd
        ) VALUES (
            v_sale_id, (v_item->>'product_id')::UUID, v_product_name, v_product_sku,
            (v_item->>'quantity')::INTEGER, (v_item->>'unit_price_usd')::DECIMAL, v_line_total_usd
        );
        
        UPDATE public.inventories 
        SET qty = qty - (v_item->>'quantity')::DECIMAL,
            updated_at = NOW()
        WHERE product_id = (v_item->>'product_id')::UUID 
        AND store_id = p_store_id;
    END LOOP;
    
    RETURN jsonb_build_object(
        'sale_id', v_sale_id,
        'invoice_number', v_invoice_number,
        'subtotal_usd', v_subtotal_usd,
        'tax_amount_usd', v_tax_amount_usd,
        'total_usd', v_total_usd,
        'total_bs', v_total_bs,
        'bcv_rate', p_bcv_rate,
        'success', true
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 4) Strengthen RLS on sales for store enforcement
-- Drop existing sales policies to replace cleanly
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE tablename = 'sales' AND schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sales';
  END LOOP;
END $$;

-- Select policies
CREATE POLICY "sales_select_admin" ON public.sales
  FOR SELECT USING (
    company_id = public.get_user_company_id() AND public.is_admin()
  );

CREATE POLICY "sales_select_assigned_store" ON public.sales
  FOR SELECT USING (
    company_id = public.get_user_company_id() AND
    (SELECT assigned_store_id FROM public.users WHERE auth_user_id = auth.uid()) = store_id
  );

-- Insert policies
CREATE POLICY "sales_insert_admin" ON public.sales
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND public.is_admin()
  );

CREATE POLICY "sales_insert_assigned_store" ON public.sales
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND
    cashier_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()) AND
    (SELECT assigned_store_id FROM public.users WHERE auth_user_id = auth.uid()) = store_id
  );

-- Update policies
CREATE POLICY "sales_update_admin" ON public.sales
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND public.is_admin()
  );

CREATE POLICY "sales_update_assigned_store" ON public.sales
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND
    (SELECT assigned_store_id FROM public.users WHERE auth_user_id = auth.uid()) = store_id
  );

-- Ensure sale_items policies continue to depend on sales visibility
CREATE POLICY IF NOT EXISTS "sale_items_select_by_sales" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND (
        (s.company_id = public.get_user_company_id() AND public.is_admin()) OR
        (s.company_id = public.get_user_company_id() AND (SELECT assigned_store_id FROM public.users WHERE auth_user_id = auth.uid()) = s.store_id)
      )
    )
  );

CREATE POLICY IF NOT EXISTS "sale_items_insert_by_sales" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND (
        (s.company_id = public.get_user_company_id() AND public.is_admin()) OR
        (s.company_id = public.get_user_company_id() AND (SELECT assigned_store_id FROM public.users WHERE auth_user_id = auth.uid()) = s.store_id)
      )
    )
  );
