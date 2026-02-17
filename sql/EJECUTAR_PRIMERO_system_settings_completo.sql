-- ============================================================================
-- EJECUTAR PRIMERO: Crear system_settings + columnas de Precios Dinámicos
-- ============================================================================
-- Ejecuta este archivo en Supabase SQL Editor ANTES de las otras migraciones.
-- ============================================================================

-- 1. Crear tabla system_settings (si no existe)
CREATE TABLE IF NOT EXISTS public.system_settings (
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

-- 2. Habilitar RLS (ignorar error si ya está habilitado)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 3. Políticas (ignorar error si ya existen)
DROP POLICY IF EXISTS "Users can view their company settings" ON public.system_settings;
CREATE POLICY "Users can view their company settings" ON public.system_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage their company settings" ON public.system_settings;
CREATE POLICY "Admins can manage their company settings" ON public.system_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Índice (ignorar error si ya existe)
CREATE INDEX IF NOT EXISTS idx_system_settings_company_id ON public.system_settings(company_id);

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON public.system_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Añadir columnas de Precios Dinámicos (si no existen)
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS web_adjustment_rate NUMERIC(10,4) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS web_tax_percentage NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS manual_bcv_rate NUMERIC(12,4) DEFAULT NULL;

ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS web_adjustment_method TEXT DEFAULT 'RATE'
  CHECK (web_adjustment_method IN ('RATE', 'PERCENTAGE'));

COMMENT ON COLUMN public.system_settings.web_adjustment_rate IS 'Tasa administrativa para inflado web (ej. 50).';
COMMENT ON COLUMN public.system_settings.web_tax_percentage IS 'Recargo porcentual extra para precio web (ej. 5 = 5%).';
COMMENT ON COLUMN public.system_settings.manual_bcv_rate IS 'Tasa BCV oficial (la que ve el público, ej. 40).';
COMMENT ON COLUMN public.system_settings.web_adjustment_method IS 'Método de ajuste: RATE=tasa inversa, PERCENTAGE=porcentaje. Solo uno aplica.';

-- Listo
SELECT 'system_settings creada y columnas de precios dinámicos añadidas' AS resultado;
