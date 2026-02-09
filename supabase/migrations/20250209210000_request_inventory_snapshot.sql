-- ============================================================================
-- RPC para capturar snapshot manual desde el panel de Cierres (solo admins)
-- ============================================================================
-- El cron corre a las 00:00 Venezuela (04:00 UTC). Este wrapper permite que
-- un admin ejecute un snapshot manual desde la UI sin esperar al cron.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.request_inventory_snapshot(
  p_captured_at TIMESTAMPTZ DEFAULT date_trunc('day', now())
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden ejecutar el snapshot manualmente.';
  END IF;
  RETURN public.capture_inventory_snapshots(p_captured_at);
END;
$$;

COMMENT ON FUNCTION public.request_inventory_snapshot(TIMESTAMPTZ) IS
'Captura snapshot de inventario manualmente. Solo admins. El cron corre a 00:00 Venezuela (04:00 UTC).';

GRANT EXECUTE ON FUNCTION public.request_inventory_snapshot(TIMESTAMPTZ) TO authenticated;
