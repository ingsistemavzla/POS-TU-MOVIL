-- ============================================================================
-- Migración: Función get_public_bcv_rate() - SECURITY DEFINER
-- ============================================================================
-- Retorna manual_bcv_rate de system_settings (si existe) o la tasa más reciente
-- de bcv_rates. Pública para rol anon.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_bcv_rate()
RETURNS NUMERIC(12,4)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_rate NUMERIC(12,4);
BEGIN
  -- 1. Intentar manual_bcv_rate desde system_settings (primera empresa con valor)
  SELECT manual_bcv_rate INTO v_rate
  FROM public.system_settings
  WHERE manual_bcv_rate IS NOT NULL AND manual_bcv_rate > 0
  ORDER BY company_id
  LIMIT 1;

  -- 2. Fallback a bcv_rates
  IF v_rate IS NULL THEN
    SELECT rate INTO v_rate
    FROM public.bcv_rates
    ORDER BY fetched_at DESC
    LIMIT 1;
  END IF;

  -- 3. Fallback final (evitar NULL)
  RETURN COALESCE(v_rate, 41.73);
END;
$$;

COMMENT ON FUNCTION public.get_public_bcv_rate() IS 
'Retorna tasa BCV para web pública: manual_bcv_rate de system_settings o última de bcv_rates.';

GRANT EXECUTE ON FUNCTION public.get_public_bcv_rate() TO anon, authenticated;
