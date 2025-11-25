-- Drop all existing process_sale functions to avoid conflicts
DROP FUNCTION IF EXISTS process_sale(UUID, UUID, UUID, UUID, VARCHAR, VARCHAR, DECIMAL, VARCHAR, JSONB, TEXT);
DROP FUNCTION IF EXISTS process_sale(UUID, UUID, UUID, UUID, VARCHAR, VARCHAR, DECIMAL, VARCHAR, JSONB, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS process_sale(UUID, UUID, UUID, VARCHAR, DECIMAL, JSONB, UUID, VARCHAR, VARCHAR, TEXT);

-- Create the correct process_sale function with dynamic tax rate and store info
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
    p_notes TEXT,
    p_tax_rate DECIMAL(5,2) DEFAULT 0
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
    v_role TEXT;
    v_user_company UUID;
    v_assigned_store UUID;
    v_tax_rate_decimal DECIMAL(5,4);
    v_store_info JSONB;
BEGIN
    -- Convert tax rate from percentage to decimal
    v_tax_rate_decimal := COALESCE(p_tax_rate, 0) / 100;
    
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
    
    -- Calculate tax and total using dynamic tax rate
    v_tax_amount_usd := v_subtotal_usd * v_tax_rate_decimal;
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
        v_line_total_usd := (v_item->>'quantity')::DECIMAL * (v_item->>'unit_price_usd')::DECIMAL;
        
        INSERT INTO public.sale_items (
            sale_id, product_id, qty, price_usd, subtotal_usd
        ) VALUES (
            v_sale_id, (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER, (v_item->>'unit_price_usd')::DECIMAL, v_line_total_usd
        );
        
        -- Update inventory
        UPDATE public.inventories 
        SET qty = qty - (v_item->>'quantity')::INTEGER,
            updated_at = NOW()
        WHERE product_id = (v_item->>'product_id')::UUID 
          AND store_id = p_store_id 
          AND company_id = p_company_id;
    END LOOP;
    
    -- Get store information for invoice
    SELECT jsonb_build_object(
        'name', name,
        'business_name', business_name,
        'tax_id', tax_id,
        'fiscal_address', fiscal_address,
        'phone_fiscal', phone_fiscal,
        'email_fiscal', email_fiscal
    ) INTO v_store_info
    FROM public.stores
    WHERE id = p_store_id;
    
    -- Return success with sale details and store info
    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'invoice_number', v_invoice_number,
        'subtotal_usd', v_subtotal_usd,
        'tax_amount_usd', v_tax_amount_usd,
        'total_usd', v_total_usd,
        'total_bs', v_total_bs,
        'bcv_rate', p_bcv_rate,
        'store_info', v_store_info
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_sale(UUID, UUID, UUID, UUID, VARCHAR, VARCHAR, DECIMAL, VARCHAR, JSONB, TEXT, DECIMAL) TO authenticated;
