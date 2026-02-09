-- ============================================================================
-- Migración: Cierres diarios de inventario (snapshots a 00:00)
-- ============================================================================
-- Fecha: 2025-02-09
-- Descripción: Tabla inventory_snapshots + función de captura por tienda/empresa.
--              total_value_usd usa COALESCE(cost_usd, 0) para productos sin costo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla inventory_snapshots
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  total_products INTEGER NOT NULL DEFAULT 0,
  total_stock INTEGER NOT NULL DEFAULT 0,
  total_value_usd NUMERIC(18,4) NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_snapshot_company_store_captured UNIQUE (company_id, store_id, captured_at)
);

COMMENT ON TABLE public.inventory_snapshots IS 'Cierre diario de inventario por tienda: productos distintos, stock total y valor USD (stock * costo). captured_at = momento del snapshot (ej. 00:00).';
COMMENT ON COLUMN public.inventory_snapshots.total_value_usd IS 'Suma de (qty * COALESCE(cost_usd,0)). Productos sin costo aportan 0 al valor.';

CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_company_captured
  ON public.inventory_snapshots(company_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_store_captured
  ON public.inventory_snapshots(store_id, captured_at DESC);

ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snapshots of their company"
  ON public.inventory_snapshots FOR SELECT
  USING (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1));

-- Solo el backend (función SECURITY DEFINER o servicio) debe insertar; no exponer INSERT vía RLS a usuarios normales.
CREATE POLICY "Service role can insert snapshots"
  ON public.inventory_snapshots FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. Función de captura (recorre tiendas, agrega inventario, inserta snapshot)
-- ----------------------------------------------------------------------------
-- Parámetro p_captured_at: para cierre de las 00:00, pasar date_trunc('day', now()) desde el cron.
CREATE OR REPLACE FUNCTION public.capture_inventory_snapshots(p_captured_at TIMESTAMPTZ DEFAULT date_trunc('day', now()))
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_total_products INTEGER;
  v_total_stock INTEGER;
  v_total_value_usd NUMERIC(18,4);
  v_inserted INTEGER := 0;
BEGIN
  FOR r IN
    SELECT s.id AS store_id, s.company_id
    FROM public.stores s
    WHERE s.active = true
  LOOP
    SELECT
      COUNT(DISTINCT i.product_id),
      COALESCE(SUM(i.qty), 0)::INTEGER,
      COALESCE(SUM(i.qty * COALESCE(p.cost_usd, 0)), 0)::NUMERIC(18,4)
    INTO v_total_products, v_total_stock, v_total_value_usd
    FROM public.inventories i
    INNER JOIN public.products p ON p.id = i.product_id AND p.company_id = i.company_id
    WHERE i.company_id = r.company_id AND i.store_id = r.store_id;

    INSERT INTO public.inventory_snapshots (
      company_id,
      store_id,
      total_products,
      total_stock,
      total_value_usd,
      captured_at
    ) VALUES (
      r.company_id,
      r.store_id,
      COALESCE(v_total_products, 0),
      COALESCE(v_total_stock, 0),
      COALESCE(v_total_value_usd, 0),
      p_captured_at
    )
    ON CONFLICT (company_id, store_id, captured_at) DO UPDATE SET
      total_products = EXCLUDED.total_products,
      total_stock = EXCLUDED.total_stock,
      total_value_usd = EXCLUDED.total_value_usd;

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.capture_inventory_snapshots(TIMESTAMPTZ) IS
'Genera un snapshot de inventario por cada tienda activa. total_value_usd = suma(qty*COALESCE(cost_usd,0)). Ejecutar a 00:00 vía pg_cron o Edge Function.';

-- RLS: la política de INSERT con WITH CHECK (true) puede ser demasiado abierta. En Supabase, las funciones SECURITY DEFINER se ejecutan con el owner (postgres), por lo que el INSERT desde la función no pasa por RLS del usuario. Si quieres restringir INSERT solo al cron/superuser, puedes usar una política más restrictiva o revocar INSERT a authenticated y dejar que solo la función (definer) inserte. Por defecto en Supabase, authenticated no tiene permiso de INSERT en tablas nuevas; hay que dar GRANT. Para que la función inserte, el owner de la función (postgres) tiene permisos. Dejamos la política de INSERT con CHECK (true) para que un cron job con role postgres pueda insertar. Si usas Edge Function que llama a una RPC, la RPC sería esta función y se ejecutaría como definer.
GRANT SELECT ON public.inventory_snapshots TO authenticated;
GRANT INSERT ON public.inventory_snapshots TO service_role;
