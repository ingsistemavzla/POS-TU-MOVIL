-- ============================================================================
-- Migración: Campo web_adjustment_method (RATE | PERCENTAGE)
-- ============================================================================
-- Permite elegir método de ajuste: Tasa Inversa o Porcentaje (excluyentes)
-- ============================================================================

ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS web_adjustment_method TEXT DEFAULT 'RATE'
  CHECK (web_adjustment_method IN ('RATE', 'PERCENTAGE'));

COMMENT ON COLUMN public.system_settings.web_adjustment_method IS 
'Método de ajuste web: RATE=tasa inversa (adj/bcv), PERCENTAGE=porcentaje. Solo uno aplica.';
