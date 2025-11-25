-- Create system_settings table
CREATE TABLE public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 16.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Caracas',
    language VARCHAR(2) NOT NULL DEFAULT 'es',
    auto_backup BOOLEAN NOT NULL DEFAULT true,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    receipt_footer TEXT DEFAULT 'Gracias por su compra',
    barcode_prefix VARCHAR(10) DEFAULT 'POS',
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their company settings" ON public.system_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage their company settings" ON public.system_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create index for better performance
CREATE INDEX idx_system_settings_company_id ON public.system_settings(company_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON public.system_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
