-- Add fiscal information fields to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS fiscal_address TEXT,
ADD COLUMN IF NOT EXISTS phone_fiscal VARCHAR(20),
ADD COLUMN IF NOT EXISTS email_fiscal VARCHAR(255);

-- Add comments to document the new fields
COMMENT ON COLUMN public.stores.business_name IS 'Razón Social de la tienda';
COMMENT ON COLUMN public.stores.tax_id IS 'RIF de la tienda';
COMMENT ON COLUMN public.stores.fiscal_address IS 'Dirección fiscal de la tienda';
COMMENT ON COLUMN public.stores.phone_fiscal IS 'Teléfono fiscal de la tienda';
COMMENT ON COLUMN public.stores.email_fiscal IS 'Email fiscal de la tienda';

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS "Users can view stores from their company" ON public.stores;
CREATE POLICY "Users can view stores from their company" ON public.stores
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage stores from their company" ON public.stores;
CREATE POLICY "Admins can manage stores from their company" ON public.stores
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_stores_company_id ON public.stores(company_id);
