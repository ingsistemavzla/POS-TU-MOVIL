-- ============================================================================
-- FIX: Inventory Financial Summary - Global Aggregation for Stock Counters
-- ============================================================================
-- Fecha: 2025-01-27
-- Descripción: Refactoriza la lógica de "Low Stock" y "Out of Stock" para usar
--              agregación global (suma de todas las tiendas) en lugar de
--              evaluación por fila individual.
-- 
-- BUG ANTERIOR:
--   - Evaluaba qty por fila individual (cada tienda por separado)
--   - Si Store A tiene 100 unidades y Store B tiene 2, contaba como "Low Stock"
--   - Threshold hardcoded a <= 5
--
-- FIX:
--   - Suma qty de todas las tiendas por producto
--   - Evalúa contadores basado en suma global
--   - Mantiene threshold <= 5 (puede cambiarse a usar min_qty en el futuro)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_inventory_financial_summary(
  p_company_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_result JSONB;
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

  -- Usar CTEs para evitar agregaciones anidadas
  WITH joined_data AS (
    -- CTE 1: JOIN de inventories y products con cálculos pre-computados
    -- (Sin cambios - mantiene datos por fila para cálculos financieros)
    SELECT 
      COALESCE(p.category, 'Sin Categoría') AS category,
      inv.qty,
      p.cost_usd,
      p.sale_price_usd,
      inv.product_id,
      inv.qty * p.cost_usd AS cost_value,
      inv.qty * p.sale_price_usd AS retail_value,
      inv.qty * (p.sale_price_usd - p.cost_usd) AS profit_value
    FROM public.inventories inv
    INNER JOIN public.products p ON inv.product_id = p.id
    WHERE inv.company_id = v_company_id
      AND p.active = true
  ),
  product_totals AS (
    -- ✅ NUEVO CTE: Agregación global por producto (suma de todas las tiendas)
    SELECT 
      product_id,
      COALESCE(SUM(qty), 0) AS total_qty_across_all_stores
    FROM joined_data
    GROUP BY product_id
  ),
  category_stats AS (
    -- CTE 2: Agregación por categoría (GROUP BY category)
    -- (Sin cambios - mantiene lógica financiera correcta)
    SELECT 
      category AS category_name,
      COALESCE(SUM(cost_value), 0) AS sum_cost,
      COALESCE(SUM(retail_value), 0) AS sum_retail,
      COALESCE(SUM(profit_value), 0) AS profit_potential,
      COUNT(DISTINCT product_id) AS product_count,
      COALESCE(SUM(qty), 0) AS count_items
    FROM joined_data
    GROUP BY category
  ),
  global_stats AS (
    -- CTE 3: Totales globales y alertas
    -- ✅ MODIFICADO: Usa product_totals para contadores globales
    SELECT 
      COALESCE(SUM(cost_value), 0) AS total_cost,
      COALESCE(SUM(retail_value), 0) AS total_retail,
      COALESCE(SUM(retail_value), 0) - COALESCE(SUM(cost_value), 0) AS profit_potential,
      COALESCE(SUM(qty), 0) AS total_items,
      COUNT(DISTINCT jd.product_id) AS unique_products,
      -- ✅ FIX: Out of Stock - Basado en suma global (todas las tiendas)
      COUNT(DISTINCT CASE 
        WHEN pt.total_qty_across_all_stores = 0 
        THEN pt.product_id 
      END) AS out_of_stock_count,
      -- ✅ FIX: Low Stock - Basado en suma global (todas las tiendas)
      COUNT(DISTINCT CASE 
        WHEN pt.total_qty_across_all_stores > 0 
          AND pt.total_qty_across_all_stores <= 5 
        THEN pt.product_id 
      END) AS critical_stock_count
    FROM joined_data jd
    LEFT JOIN product_totals pt ON jd.product_id = pt.product_id
  )
  -- SELECT FINAL: Construir JSONB combinando global_stats y subquery a category_stats
  SELECT jsonb_build_object(
    'total_cost_value', gs.total_cost,
    'total_retail_value', gs.total_retail,
    'profit_potential', gs.profit_potential,
    'total_items', gs.total_items,
    'out_of_stock_count', COALESCE(gs.out_of_stock_count, 0),
    'critical_stock_count', COALESCE(gs.critical_stock_count, 0),
    'category_breakdown', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'category_name', cs.category_name,
          'total_cost_value', cs.sum_cost,
          'total_retail_value', cs.sum_retail,
          'profit_potential', cs.profit_potential,
          'items_count', cs.product_count,
          'total_quantity', cs.count_items,
          'percentage_of_total', CASE
            WHEN gs.total_retail > 0
            THEN (cs.sum_retail / gs.total_retail) * 100
            ELSE 0
          END
        )
        ORDER BY cs.sum_retail DESC
      ), '[]'::jsonb)
      FROM category_stats cs
      CROSS JOIN global_stats gs
    ),
    'calculated_at', NOW()
  )
  INTO v_result
  FROM global_stats gs;

  RETURN COALESCE(v_result, jsonb_build_object('error', true, 'message', 'No data found'));
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
--   - Evaluaba qty por fila individual (cada tienda)
--   - Si Store A: qty=100, Store B: qty=2 → Contaba como "Low Stock" (FALSE POSITIVE)
--   - Threshold hardcoded <= 5
--
-- DESPUÉS (FIX):
--   - Suma qty de todas las tiendas por producto
--   - Si Store A: qty=100, Store B: qty=2 → Suma global = 102 → NO es "Low Stock" ✅
--   - Threshold sigue siendo <= 5 (puede cambiarse a min_qty en el futuro)
--
-- EJEMPLO:
--   Producto A:
--     - Tienda 1: qty = 10
--     - Tienda 2: qty = 3
--     - Suma global = 13
--   
--   ANTES: Contaba como "Low Stock" (porque Tienda 2 tiene qty <= 5) ❌
--   DESPUÉS: NO cuenta como "Low Stock" (porque suma global = 13 > 5) ✅
--
-- ============================================================================

