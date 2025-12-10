-- ============================================================================
-- MIGRATION: Fix Critical Profit Calculation Bug
-- ============================================================================
-- Fecha: 2025-01-27
-- Descripción: Corrige el cálculo de 'estimated_profit' y 'profit_margin_percent'
--              para usar 'total_invoiced' en lugar de 'total_subtotal'
-- 
-- BUG: Profit se calculaba usando total_subtotal (suma de sale_items.subtotal_usd)
--      pero se comparaba con total_invoiced (sales.total_usd), causando que
--      profit > revenue cuando hay descuentos/impuestos.
--
-- FIX: Usar total_invoiced como base para profit calculation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_store_performance(
  p_company_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT (CURRENT_DATE - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_summary JSONB;
BEGIN
  -- Obtener company_id del usuario si no se proporciona
  IF p_company_id IS NULL THEN
    v_company_id := public.get_user_company_id();
  ELSE
    v_company_id := p_company_id;
  END IF;

  -- Validar que company_id no sea NULL
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Company ID is required'
    );
  END IF;

  -- Construir resumen usando CTEs para evitar duplicación de filas
  WITH sales_filtered AS (
    -- CTE 1: Ventas filtradas por fecha, status y company_id
    SELECT 
      id,
      store_id,
      total_usd,
      created_at
    FROM public.sales
    WHERE company_id = v_company_id
      AND created_at >= p_start_date
      AND created_at < p_end_date
      AND status = 'completed'
  ),
  sale_items_agg AS (
    -- CTE 2: Agregar sale_items por sale_id (evita duplicación)
    SELECT 
      si.sale_id,
      COALESCE(SUM(si.subtotal_usd), 0) AS total_subtotal,
      COALESCE(SUM(si.qty * p.cost_usd), 0) AS total_cost,
      COALESCE(SUM(si.qty), 0) AS total_quantity
    FROM public.sale_items si
    INNER JOIN sales_filtered sf ON si.sale_id = sf.id
    LEFT JOIN public.products p ON si.product_id = p.id
    GROUP BY si.sale_id
  ),
  sale_payments_agg AS (
    -- CTE 3: Agregar sale_payments por sale_id (evita duplicación)
    SELECT 
      sp.sale_id,
      COALESCE(SUM(sp.amount_usd), 0) AS total_payments
    FROM public.sale_payments sp
    INNER JOIN sales_filtered sf ON sp.sale_id = sf.id
    GROUP BY sp.sale_id
  ),
  store_performance AS (
    -- CTE 4: Combinar todo por store_id
    SELECT 
      sf.store_id,
      COUNT(DISTINCT sf.id) AS orders_count,
      COALESCE(SUM(sf.total_usd), 0) AS total_invoiced,
      COALESCE(SUM(spa.total_payments), 0) AS net_income_real,
      COALESCE(SUM(sia.total_subtotal), 0) AS total_subtotal,
      COALESCE(SUM(sia.total_cost), 0) AS total_cost,
      CASE
        WHEN COUNT(DISTINCT sf.id) > 0
        THEN COALESCE(SUM(sf.total_usd), 0) / COUNT(DISTINCT sf.id)
        ELSE 0
      END AS avg_order_value
    FROM sales_filtered sf
    LEFT JOIN sale_items_agg sia ON sf.id = sia.sale_id
    LEFT JOIN sale_payments_agg spa ON sf.id = spa.sale_id
    GROUP BY sf.store_id
  )
  -- SELECT FINAL: Construir JSON estructurado sin anidaciones
  SELECT jsonb_agg(
    jsonb_build_object(
      'store_id', s.id,
      'store_name', s.name,
      'total_invoiced', COALESCE(sp.total_invoiced, 0),
      'net_income_real', COALESCE(sp.net_income_real, 0),
      -- ✅ FIX: Usar total_invoiced en lugar de total_subtotal para profit
      'estimated_profit', COALESCE(
        sp.total_invoiced - sp.total_cost,
        0
      ),
      'orders_count', COALESCE(sp.orders_count, 0),
      'avg_order_value', COALESCE(sp.avg_order_value, 0),
      -- ✅ FIX: Usar total_invoiced en lugar de total_subtotal para profit_margin
      'profit_margin_percent', CASE
        WHEN COALESCE(sp.total_invoiced, 0) > 0
        THEN ((COALESCE(sp.total_invoiced, 0) - COALESCE(sp.total_cost, 0)) / COALESCE(sp.total_invoiced, 0)) * 100
        ELSE 0
      END
    )
    ORDER BY COALESCE(sp.total_invoiced, 0) DESC
  )
  INTO v_summary
  FROM public.stores s
  LEFT JOIN store_performance sp ON s.id = sp.store_id
  WHERE s.company_id = v_company_id
    AND s.active = true;

  RETURN jsonb_build_object(
    'summary', COALESCE(v_summary, '[]'::jsonb),
    'period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'generated_at', NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- ============================================================================
-- VERIFICACIÓN: Comentarios sobre el fix
-- ============================================================================
-- 
-- ANTES (BUG):
--   estimated_profit = total_subtotal - total_cost
--   profit_margin = (total_subtotal - total_cost) / total_subtotal
--   
--   Problema: total_subtotal puede ser > total_invoiced si hay descuentos/impuestos
--   Resultado: Profit > Revenue (matemáticamente imposible)
--
-- DESPUÉS (FIX):
--   estimated_profit = total_invoiced - total_cost
--   profit_margin = (total_invoiced - total_cost) / total_invoiced
--   
--   Garantía: Profit nunca excederá Revenue (asumiendo cost > 0)
--   Consistencia: Profit y Revenue usan la misma base (total_invoiced)
--
-- ============================================================================



