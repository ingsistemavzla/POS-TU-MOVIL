-- ============================================================================
-- Snapshots por categoría (Teléfonos, Accesorios, Servicios) y total_products correcto
-- ============================================================================
-- total_products = solo productos con stock (qty > 0) en esa tienda.
-- Se agregan qty_phones, qty_accessories, qty_services para coincidir con Estadísticas.
-- ============================================================================

-- Añadir columnas por categoría (unidades, no cantidad de productos)
ALTER TABLE public.inventory_snapshots
  ADD COLUMN IF NOT EXISTS qty_phones INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_accessories INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_services INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.inventory_snapshots.qty_phones IS 'Unidades en stock de productos con category = phones';
COMMENT ON COLUMN public.inventory_snapshots.qty_accessories IS 'Unidades en stock de productos con category = accessories';
COMMENT ON COLUMN public.inventory_snapshots.qty_services IS 'Unidades en stock de productos con category = technical_service';

-- Recrear la función de captura con total_products = solo con stock, y desglose por categoría
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
  v_qty_phones INTEGER;
  v_qty_accessories INTEGER;
  v_qty_services INTEGER;
  v_inserted INTEGER := 0;
BEGIN
  FOR r IN
    SELECT s.id AS store_id, s.company_id
    FROM public.stores s
    WHERE s.active = true
  LOOP
    -- Misma base que el dashboard: solo productos activos (products.active = true)
    -- Productos distintos con stock > 0 en esta tienda
    SELECT COUNT(DISTINCT i.product_id) INTO v_total_products
    FROM public.inventories i
    INNER JOIN public.products p ON p.id = i.product_id AND p.company_id = i.company_id AND COALESCE(p.active, true) = true
    WHERE i.company_id = r.company_id AND i.store_id = r.store_id AND i.qty > 0;

    -- Totales y valor (solo productos activos)
    SELECT
      COALESCE(SUM(i.qty), 0)::INTEGER,
      COALESCE(SUM(i.qty * COALESCE(p.cost_usd, 0)), 0)::NUMERIC(18,4)
    INTO v_total_stock, v_total_value_usd
    FROM public.inventories i
    INNER JOIN public.products p ON p.id = i.product_id AND p.company_id = i.company_id AND COALESCE(p.active, true) = true
    WHERE i.company_id = r.company_id AND i.store_id = r.store_id;

    -- Unidades por categoría: misma comparación que Estadísticas (category = 'phones' etc.; solo productos activos)
    SELECT
      COALESCE(SUM(CASE WHEN TRIM(COALESCE(p.category, '')) = 'phones' THEN i.qty ELSE 0 END), 0)::INTEGER,
      COALESCE(SUM(CASE WHEN TRIM(COALESCE(p.category, '')) = 'accessories' THEN i.qty ELSE 0 END), 0)::INTEGER,
      COALESCE(SUM(CASE WHEN TRIM(COALESCE(p.category, '')) = 'technical_service' THEN i.qty ELSE 0 END), 0)::INTEGER
    INTO v_qty_phones, v_qty_accessories, v_qty_services
    FROM public.inventories i
    INNER JOIN public.products p ON p.id = i.product_id AND p.company_id = i.company_id AND COALESCE(p.active, true) = true
    WHERE i.company_id = r.company_id AND i.store_id = r.store_id;

    INSERT INTO public.inventory_snapshots (
      company_id,
      store_id,
      total_products,
      total_stock,
      total_value_usd,
      qty_phones,
      qty_accessories,
      qty_services,
      captured_at
    ) VALUES (
      r.company_id,
      r.store_id,
      COALESCE(v_total_products, 0),
      COALESCE(v_total_stock, 0),
      COALESCE(v_total_value_usd, 0),
      COALESCE(v_qty_phones, 0),
      COALESCE(v_qty_accessories, 0),
      COALESCE(v_qty_services, 0),
      p_captured_at
    )
    ON CONFLICT (company_id, store_id, captured_at) DO UPDATE SET
      total_products = EXCLUDED.total_products,
      total_stock = EXCLUDED.total_stock,
      total_value_usd = EXCLUDED.total_value_usd,
      qty_phones = EXCLUDED.qty_phones,
      qty_accessories = EXCLUDED.qty_accessories,
      qty_services = EXCLUDED.qty_services;

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;
