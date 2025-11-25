-- Enhance products and inventory system
-- Add cost price to products table and ensure proper inventory management per store

-- Add cost price column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Rename price_usd to sale_price_usd for clarity
ALTER TABLE public.products 
RENAME COLUMN price_usd TO sale_price_usd;

-- Add comment to clarify the columns
COMMENT ON COLUMN public.products.cost_usd IS 'Product cost price in USD';
COMMENT ON COLUMN public.products.sale_price_usd IS 'Product sale price in USD';

-- Ensure RLS policies exist for products
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "products_insert_policy" ON public.products;
DROP POLICY IF EXISTS "products_update_policy" ON public.products;
DROP POLICY IF EXISTS "products_delete_policy" ON public.products;

CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "products_insert_policy" ON public.products
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND
    public.is_admin()
  );

CREATE POLICY "products_update_policy" ON public.products
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND
    public.is_admin()
  );

CREATE POLICY "products_delete_policy" ON public.products
  FOR DELETE USING (
    company_id = public.get_user_company_id() AND
    public.is_admin()
  );

-- Ensure RLS policies exist for inventories
DROP POLICY IF EXISTS "inventories_select_policy" ON public.inventories;
DROP POLICY IF EXISTS "inventories_insert_policy" ON public.inventories;
DROP POLICY IF EXISTS "inventories_update_policy" ON public.inventories;
DROP POLICY IF EXISTS "inventories_delete_policy" ON public.inventories;

CREATE POLICY "inventories_select_policy" ON public.inventories
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "inventories_insert_policy" ON public.inventories
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND
    (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND company_id = inventories.company_id 
      AND role IN ('admin', 'manager')
    ))
  );

CREATE POLICY "inventories_update_policy" ON public.inventories
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND
    (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND company_id = inventories.company_id 
      AND role IN ('admin', 'manager')
    ))
  );

CREATE POLICY "inventories_delete_policy" ON public.inventories
  FOR DELETE USING (
    company_id = public.get_user_company_id() AND
    public.is_admin()
  );

-- Create function to create product with initial inventory for all stores
CREATE OR REPLACE FUNCTION create_product_with_inventory(
  p_sku text,
  p_barcode text,
  p_name text,
  p_category text,
  p_cost_usd decimal,
  p_sale_price_usd decimal,
  p_tax_rate decimal DEFAULT 16.00,
  p_store_inventories jsonb DEFAULT '[]'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_company_id uuid;
  product_record record;
  store_inventory jsonb;
  store_id uuid;
  initial_qty integer;
  min_qty integer;
BEGIN
  -- Get user's company
  SELECT company_id INTO user_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF user_company_id IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'User not found or not associated with a company',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Only administrators can create products',
      'code', 'INSUFFICIENT_PERMISSIONS'
    );
  END IF;

  -- Create the product
  INSERT INTO public.products (
    company_id, sku, barcode, name, category, 
    cost_usd, sale_price_usd, tax_rate, active
  )
  VALUES (
    user_company_id, p_sku, p_barcode, p_name, p_category,
    p_cost_usd, p_sale_price_usd, p_tax_rate, true
  )
  RETURNING * INTO product_record;

  -- Create inventory entries for each store
  FOR store_inventory IN SELECT * FROM jsonb_array_elements(p_store_inventories)
  LOOP
    store_id := (store_inventory->>'store_id')::uuid;
    initial_qty := COALESCE((store_inventory->>'qty')::integer, 0);
    min_qty := COALESCE((store_inventory->>'min_qty')::integer, 5);

    -- Verify store belongs to user's company
    IF EXISTS (
      SELECT 1 FROM public.stores 
      WHERE id = store_id AND company_id = user_company_id
    ) THEN
      INSERT INTO public.inventories (
        company_id, store_id, product_id, qty, min_qty
      )
      VALUES (
        user_company_id, store_id, product_record.id, initial_qty, min_qty
      );
    END IF;
  END LOOP;

  -- Return the created product
  RETURN row_to_json(product_record);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Create function to update inventory for a specific store
CREATE OR REPLACE FUNCTION update_store_inventory(
  p_product_id uuid,
  p_store_id uuid,
  p_qty integer,
  p_min_qty integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_company_id uuid;
  inventory_record record;
BEGIN
  -- Get user's company
  SELECT company_id INTO user_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF user_company_id IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'User not found',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Check permissions (admin or manager)
  IF NOT (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND company_id = user_company_id 
    AND role IN ('admin', 'manager')
  )) THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Insufficient permissions',
      'code', 'INSUFFICIENT_PERMISSIONS'
    );
  END IF;

  -- Update or insert inventory
  INSERT INTO public.inventories (company_id, store_id, product_id, qty, min_qty)
  VALUES (
    user_company_id, 
    p_store_id, 
    p_product_id, 
    p_qty, 
    COALESCE(p_min_qty, 5)
  )
  ON CONFLICT (company_id, store_id, product_id)
  DO UPDATE SET 
    qty = EXCLUDED.qty,
    min_qty = COALESCE(EXCLUDED.min_qty, inventories.min_qty),
    updated_at = now()
  RETURNING * INTO inventory_record;

  RETURN row_to_json(inventory_record);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;
