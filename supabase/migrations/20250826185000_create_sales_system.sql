-- Create sales system with invoice numbers and transaction details
-- Migration: 20250826185000_create_sales_system.sql

-- Add missing columns to existing sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id_number VARCHAR(50);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS subtotal_usd DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.16;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tax_amount_usd DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing sale_items table structure
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS product_sku VARCHAR(100);

-- Create invoice number sequence function
CREATE OR REPLACE FUNCTION generate_invoice_number(p_company_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year TEXT;
    v_month TEXT;
    v_sequence INTEGER;
    v_invoice_number VARCHAR(50);
BEGIN
    -- Get current year and month
    v_year := EXTRACT(YEAR FROM NOW())::TEXT;
    v_month := LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0');
    
    -- Get next sequence number for this company/month
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(invoice_number FROM '\d+$') AS INTEGER
        )
    ), 0) + 1
    INTO v_sequence
    FROM public.sales 
    WHERE company_id = p_company_id 
    AND invoice_number LIKE v_year || v_month || '-%';
    
    -- Format: YYYYMM-000001
    v_invoice_number := v_year || v_month || '-' || LPAD(v_sequence::TEXT, 6, '0');
    
    RETURN v_invoice_number;
END;
$$;

-- Create function to process a complete sale
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
BEGIN
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
    
    -- Create sale record using existing table structure
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
    
    -- Create sale items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Get product details
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
        
        -- Update inventory (decrease stock)
        UPDATE public.inventories 
        SET qty = qty - (v_item->>'quantity')::DECIMAL,
            updated_at = NOW()
        WHERE product_id = (v_item->>'product_id')::UUID 
        AND store_id = p_store_id;
    END LOOP;
    
    -- Return sale details
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON public.sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON public.sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_date ON public.sales(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sales
CREATE POLICY "Users can view sales from their company" ON public.sales
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create sales for their company" ON public.sales
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update sales from their company" ON public.sales
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Create RLS policies for sale_items
CREATE POLICY "Users can view sale items from their company sales" ON public.sale_items
    FOR SELECT USING (
        sale_id IN (
            SELECT id FROM public.sales 
            WHERE company_id IN (
                SELECT company_id FROM public.users 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create sale items for their company sales" ON public.sale_items
    FOR INSERT WITH CHECK (
        sale_id IN (
            SELECT id FROM public.sales 
            WHERE company_id IN (
                SELECT company_id FROM public.users 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Add updated_at column to sales table if it doesn't exist
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create updated_at trigger for sales
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_updated_at 
    BEFORE UPDATE ON public.sales 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sale_items TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_sale(UUID, UUID, UUID, UUID, VARCHAR, VARCHAR, DECIMAL, VARCHAR, JSONB, TEXT) TO authenticated;
