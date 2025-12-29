-- ============================================================================
-- RPC: get_executive_summary_v2 - Reporte Ejecutivo Blindado
-- Migration: 20250131000003_create_get_executive_summary_v2.sql
-- ============================================================================
-- 
-- DESCRIPCIÓN:
-- RPC de SOLO LECTURA (SELECT únicamente) para reportes ejecutivos.
-- Calcula métricas financieras blindadas usando lógica de Ingreso Real.
-- 
-- SEGURIDAD:
-- ✅ Solo SELECT - Sin UPDATE, INSERT, DELETE
-- ✅ Sin bloqueos - No usa FOR UPDATE, FOR SHARE, LOCK TABLE
-- ✅ Respeta RLS automáticamente
-- ✅ No afecta funciones de escritura (process_sale, etc.)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_executive_summary_v2(
  UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, VARCHAR
);

CREATE OR REPLACE FUNCTION public.get_executive_summary_v2(
  p_company_id UUID DEFAULT NULL,
  p_store_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_category VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_company_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Seguridad: Obtener company_id del usuario autenticado
  SELECT company_id INTO v_user_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_user_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Usuario no autenticado o sin company_id'
    );
  END IF;

  -- 2. Query Principal (SOLO SELECT - Sin bloqueos)
  WITH sales_filtered AS (
    -- CTE 1: Ventas filtradas por fecha, status y company_id
    SELECT 
      s.id,
      s.store_id,
      s.total_usd,
      s.subtotal_usd,
      s.tax_amount_usd,
      s.total_bs,
      s.bcv_rate_used,
      s.created_at,
      s.krece_enabled,
      s.krece_initial_amount_usd,
      s.krece_financed_amount_usd,
      s.cashea_enabled,
      s.cashea_initial_amount_usd,
      s.cashea_financed_amount_usd,
      s.is_mixed_payment,
      s.payment_method
    FROM public.sales s
    WHERE s.company_id = COALESCE(p_company_id, v_user_company_id)
      AND (p_store_id IS NULL OR s.store_id = p_store_id)
      AND (p_date_from IS NULL OR s.created_at >= p_date_from)
      AND (p_date_to IS NULL OR s.created_at <= p_date_to)
      AND s.status = 'completed'
  ),
  sale_payments_agg AS (
    -- CTE 2: Agregar sale_payments con lógica blindada de Ingreso Real
    SELECT 
      sp.sale_id,
      -- ✅ LÓGICA BLINDADA: Ingreso Real = amount_usd + (amount_bs convertido a USD)
      COALESCE(SUM(
        sp.amount_usd + (
          COALESCE(sp.amount_bs, 0) / NULLIF(s.bcv_rate_used, 0)
        )
      ), 0) AS net_income_real,
      COALESCE(SUM(sp.amount_usd), 0) AS total_payments_usd,
      COALESCE(SUM(sp.amount_bs), 0) AS total_payments_bs
    FROM public.sale_payments sp
    INNER JOIN sales_filtered sf ON sp.sale_id = sf.id
    INNER JOIN public.sales s ON sp.sale_id = s.id
    GROUP BY sp.sale_id
  ),
  sale_items_agg AS (
    -- CTE 3: Agregar sale_items para cálculo de rentabilidad
    SELECT 
      si.sale_id,
      COALESCE(SUM(si.subtotal_usd), 0) AS total_subtotal,
      COALESCE(SUM(si.qty * p.cost_usd), 0) AS total_cost,
      COALESCE(SUM(si.qty), 0) AS total_quantity
    FROM public.sale_items si
    INNER JOIN sales_filtered sf ON si.sale_id = sf.id
    LEFT JOIN public.products p ON si.product_id = p.id
    WHERE (p_category IS NULL OR p.category = p_category)
    GROUP BY si.sale_id
  ),
  store_performance AS (
    -- CTE 4: Combinar todo por store_id
    SELECT 
      sf.store_id,
      COUNT(DISTINCT sf.id) AS orders_count,
      COALESCE(SUM(sf.total_usd), 0) AS total_invoiced,
      COALESCE(SUM(spa.net_income_real), 0) AS net_income_real,
      COALESCE(SUM(sia.total_subtotal), 0) AS total_subtotal,
      COALESCE(SUM(sia.total_cost), 0) AS total_cost,
      COALESCE(SUM(sia.total_quantity), 0) AS total_quantity,
      CASE
        WHEN COUNT(DISTINCT sf.id) > 0
        THEN COALESCE(SUM(sf.total_usd), 0) / COUNT(DISTINCT sf.id)
        ELSE 0
      END AS avg_order_value
    FROM sales_filtered sf
    LEFT JOIN sale_items_agg sia ON sf.id = sia.sale_id
    LEFT JOIN sale_payments_agg spa ON sf.id = spa.sale_id
    GROUP BY sf.store_id
  ),
  payment_methods_agg AS (
    -- CTE 5: Agregar métodos de pago
    SELECT 
      sp.payment_method,
      COALESCE(SUM(sp.amount_usd), 0) AS total_usd,
      COALESCE(SUM(sp.amount_bs), 0) AS total_bs,
      COUNT(*) AS count
    FROM public.sale_payments sp
    INNER JOIN sales_filtered sf ON sp.sale_id = sf.id
    GROUP BY sp.payment_method
  ),
  krece_summary AS (
    -- CTE 6: Resumen de Krece
    SELECT 
      COUNT(*) FILTER (WHERE sf.krece_enabled = true) AS krece_orders,
      COALESCE(SUM(sf.krece_initial_amount_usd) FILTER (WHERE sf.krece_enabled = true), 0) AS krece_initial_total,
      COALESCE(SUM(sf.krece_financed_amount_usd) FILTER (WHERE sf.krece_enabled = true), 0) AS krece_financed_total
    FROM sales_filtered sf
  ),
  cashea_summary AS (
    -- CTE 7: Resumen de Cashea
    SELECT 
      COUNT(*) FILTER (WHERE sf.cashea_enabled = true) AS cashea_orders,
      COALESCE(SUM(sf.cashea_initial_amount_usd) FILTER (WHERE sf.cashea_enabled = true), 0) AS cashea_initial_total,
      COALESCE(SUM(sf.cashea_financed_amount_usd) FILTER (WHERE sf.cashea_enabled = true), 0) AS cashea_financed_total
    FROM sales_filtered sf
  )
  -- SELECT FINAL: Construir JSON estructurado
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_invoiced', COALESCE(SUM(sp.total_invoiced), 0),
      'net_income_real', COALESCE(SUM(sp.net_income_real), 0),
      'total_orders', COALESCE(SUM(sp.orders_count), 0),
      'avg_order_value', CASE
        WHEN COALESCE(SUM(sp.orders_count), 0) > 0
        THEN COALESCE(SUM(sp.total_invoiced), 0) / SUM(sp.orders_count)
        ELSE 0
      END,
      'total_subtotal', COALESCE(SUM(sp.total_subtotal), 0),
      'total_cost', COALESCE(SUM(sp.total_cost), 0),
      'estimated_profit', COALESCE(SUM(sp.total_subtotal) - SUM(sp.total_cost), 0),
      'profit_margin_percent', CASE
        WHEN COALESCE(SUM(sp.total_subtotal), 0) > 0
        THEN ((COALESCE(SUM(sp.total_subtotal), 0) - COALESCE(SUM(sp.total_cost), 0)) / COALESCE(SUM(sp.total_subtotal), 0)) * 100
        ELSE 0
      END,
      'total_quantity', COALESCE(SUM(sp.total_quantity), 0)
    ),
    'stores', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'store_id', s.id,
          'store_name', s.name,
          'total_invoiced', COALESCE(sp.total_invoiced, 0),
          'net_income_real', COALESCE(sp.net_income_real, 0),
          'orders_count', COALESCE(sp.orders_count, 0),
          'avg_order_value', COALESCE(sp.avg_order_value, 0),
          'estimated_profit', COALESCE(sp.total_subtotal - sp.total_cost, 0),
          'profit_margin_percent', CASE
            WHEN COALESCE(sp.total_subtotal, 0) > 0
            THEN ((COALESCE(sp.total_subtotal, 0) - COALESCE(sp.total_cost, 0)) / COALESCE(sp.total_subtotal, 0)) * 100
            ELSE 0
          END,
          'total_quantity', COALESCE(sp.total_quantity, 0)
        )
        ORDER BY COALESCE(sp.total_invoiced, 0) DESC
      )
      FROM public.stores s
      LEFT JOIN store_performance sp ON s.id = sp.store_id
      WHERE s.company_id = COALESCE(p_company_id, v_user_company_id)
        AND s.active = true
    ), '[]'::jsonb),
    'payment_methods', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'method', pma.payment_method,
          'total_usd', pma.total_usd,
          'total_bs', pma.total_bs,
          'count', pma.count,
          'percentage', CASE
            WHEN (SELECT SUM(total_usd) FROM payment_methods_agg) > 0
            THEN (pma.total_usd / (SELECT SUM(total_usd) FROM payment_methods_agg)) * 100
            ELSE 0
          END
        )
        ORDER BY pma.total_usd DESC
      )
      FROM payment_methods_agg pma
    ), '[]'::jsonb),
    'krece', (
      SELECT jsonb_build_object(
        'orders', COALESCE(ks.krece_orders, 0),
        'initial_total', COALESCE(ks.krece_initial_total, 0),
        'financed_total', COALESCE(ks.krece_financed_total, 0)
      )
      FROM krece_summary ks
    ),
    'cashea', (
      SELECT jsonb_build_object(
        'orders', COALESCE(cs.cashea_orders, 0),
        'initial_total', COALESCE(cs.cashea_initial_total, 0),
        'financed_total', COALESCE(cs.cashea_financed_total, 0)
      )
      FROM cashea_summary cs
    ),
    'period', jsonb_build_object(
      'start_date', p_date_from,
      'end_date', p_date_to
    ),
    'generated_at', NOW()
  )
  INTO v_result
  FROM store_performance sp;

  RETURN COALESCE(v_result, jsonb_build_object('error', true, 'message', 'No se pudieron obtener los datos'));

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_executive_summary_v2(
  UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, VARCHAR
) TO authenticated;

-- Comentario de documentación
COMMENT ON FUNCTION public.get_executive_summary_v2 IS 
'RPC de SOLO LECTURA para reportes ejecutivos blindados:
- Calcula Ingreso Real usando lógica blindada: amount_usd + (amount_bs / bcv_rate_used)
- Retorna métricas agregadas por tienda, método de pago, Krece y Cashea
- Respeta RLS automáticamente
- Solo SELECT - Sin UPDATE, INSERT, DELETE
- Sin bloqueos - No usa FOR UPDATE, FOR SHARE, LOCK TABLE
- No afecta funciones de escritura (process_sale, etc.)';



