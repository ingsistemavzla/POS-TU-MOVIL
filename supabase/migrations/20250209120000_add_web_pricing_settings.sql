-- ============================================================================
-- Migración: Capa de Precios Dinámicos - Campos en system_settings
-- ============================================================================
-- Añade web_adjustment_rate, web_tax_percentage y manual_bcv_rate
-- ============================================================================

ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS web_adjustment_rate NUMERIC(10,4) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS web_tax_percentage NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS manual_bcv_rate NUMERIC(12,4) DEFAULT NULL;

COMMENT ON COLUMN public.system_settings.web_adjustment_rate IS 'Tasa administrativa para inflado web (ej. 50). Fórmula: P_final = P_base * web_adjustment_rate / manual_bcv_rate.';
COMMENT ON COLUMN public.system_settings.web_tax_percentage IS 'Recargo porcentual extra para precio web (ej. 5 = 5%).';
COMMENT ON COLUMN public.system_settings.manual_bcv_rate IS 'Tasa BCV oficial (la que ve el público, ej. 40). Solo visualización y cálculo BS. NUNCA exponer web_adjustment_rate.';
