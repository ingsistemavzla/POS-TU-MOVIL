-- ============================================================================
-- LEGACY FINANCIAL FUNCTIONS - FASE 1: Backend SQL/RPCs
-- ============================================================================
-- Descripción: 3 Funciones RPC críticas para funcionalidades Legacy
-- Autor: Sistema Legacy POS
-- Fecha: 2025-01-05
-- ============================================================================

-- ============================================================================
-- FUNCIÓN 1: CEREBRO FINANCIERO (Panel 'Almacén')
-- ============================================================================
-- Nombre: get_inventory_financial_summary
-- Objetivo: Valoración financiera del inventario con desglose por categoría
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
  category_stats AS (
    -- CTE 2: Agregación por categoría (GROUP BY category)
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
    SELECT 
      COALESCE(SUM(cost_value), 0) AS total_cost,
      COALESCE(SUM(retail_value), 0) AS total_retail,
      COALESCE(SUM(retail_value), 0) - COALESCE(SUM(cost_value), 0) AS profit_potential,
      COALESCE(SUM(qty), 0) AS total_items,
      COUNT(DISTINCT product_id) AS unique_products,
      COUNT(DISTINCT CASE WHEN qty = 0 THEN product_id END) AS out_of_stock_count,
      COUNT(DISTINCT CASE WHEN qty > 0 AND qty <= 5 THEN product_id END) AS critical_stock_count
    FROM joined_data
  )
  -- SELECT FINAL: Construir JSONB combinando global_stats y subquery a category_stats
  SELECT jsonb_build_object(
    'total_cost_value', gs.total_cost,
    'total_retail_value', gs.total_retail,
    'profit_potential', gs.profit_potential,
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
-- FUNCIÓN 2: MATRIZ DE STOCK POR SUCURSAL (Panel 'Almacén')
-- ============================================================================
-- Nombre: get_stock_matrix_by_store
-- Objetivo: Matriz cruzada de stock agrupada por Tienda -> Categorías
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_stock_matrix_by_store(
  p_company_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_matrix JSONB;
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

  -- Construir matriz usando CTEs para evitar agregaciones anidadas
  WITH products_by_company AS (
    -- CTE 1: Productos filtrados por company_id y active
    SELECT 
      id,
      category,
      cost_usd,
      sale_price_usd
    FROM public.products
    WHERE company_id = v_company_id
      AND active = true
  ),
  stores_by_company AS (
    -- CTE 2: Tiendas filtradas por company_id y active
    SELECT 
      id,
      name
    FROM public.stores
    WHERE company_id = v_company_id
      AND active = true
  ),
  inventory_agg AS (
    -- CTE 3: Agregar inventarios por (store_id, product_id)
    SELECT 
      inv.store_id,
      inv.product_id,
      inv.qty,
      inv.min_qty,
      p.category,
      p.cost_usd,
      p.sale_price_usd,
      inv.qty * p.cost_usd AS cost_value,
      inv.qty * p.sale_price_usd AS retail_value
    FROM public.inventories inv
    INNER JOIN products_by_company p ON inv.product_id = p.id
    WHERE inv.company_id = v_company_id
  ),
  category_agg AS (
    -- CTE 4: Agrupar por (store_id, category)
    SELECT 
      store_id,
      COALESCE(category, 'Sin Categoría') AS category_name,
      COALESCE(SUM(qty), 0) AS stock_qty,
      COALESCE(SUM(cost_value), 0) AS value_cost,
      COALESCE(SUM(retail_value), 0) AS value_retail,
      COUNT(DISTINCT product_id) AS products_count,
      COUNT(DISTINCT CASE 
        WHEN qty > 0 AND qty <= min_qty 
        THEN product_id 
      END) AS low_stock_count
    FROM inventory_agg
    GROUP BY store_id, COALESCE(category, 'Sin Categoría')
  ),
  store_totals AS (
    -- CTE 5: Totales por tienda
    SELECT 
      store_id,
      COUNT(DISTINCT product_id) AS total_items,
      COALESCE(SUM(qty), 0) AS total_stock_quantity
    FROM inventory_agg
    GROUP BY store_id
  )
  -- SELECT FINAL: Construir JSON estructurado sin anidaciones
  SELECT jsonb_agg(
    jsonb_build_object(
      'store_id', s.id,
      'store_name', s.name,
      'total_items', COALESCE(st.total_items, 0),
      'total_stock_quantity', COALESCE(st.total_stock_quantity, 0),
      'categories', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'category_name', ca.category_name,
            'stock_qty', ca.stock_qty,
            'value_cost', ca.value_cost,
            'value_retail', ca.value_retail,
            'products_count', ca.products_count,
            'low_stock_count', ca.low_stock_count
          )
          ORDER BY ca.value_retail DESC
        ), '[]'::jsonb)
        FROM category_agg ca
        WHERE ca.store_id = s.id
      )
    )
    ORDER BY s.name
  )
  INTO v_matrix
  FROM stores_by_company s
  LEFT JOIN store_totals st ON s.id = st.store_id;

  RETURN jsonb_build_object(
    'matrix', COALESCE(v_matrix, '[]'::jsonb),
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
-- FUNCIÓN 3: RESUMEN DE VENTAS POR TIENDA (Panel 'Dashboard')
-- ============================================================================
-- Nombre: get_dashboard_store_performance
-- Objetivo: Tabla detallada de rendimiento por sucursal
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
      'estimated_profit', COALESCE(
        sp.total_subtotal - sp.total_cost,
        0
      ),
      'orders_count', COALESCE(sp.orders_count, 0),
      'avg_order_value', COALESCE(sp.avg_order_value, 0),
      'profit_margin_percent', CASE
        WHEN COALESCE(sp.total_subtotal, 0) > 0
        THEN ((COALESCE(sp.total_subtotal, 0) - COALESCE(sp.total_cost, 0)) / COALESCE(sp.total_subtotal, 0)) * 100
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
-- GRANTS: Permisos de ejecución
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_inventory_financial_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_matrix_by_store(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_store_performance(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ============================================================================
-- ÍNDICES RECOMENDADOS (Si no existen)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_inventories_company_product 
ON public.inventories(company_id, product_id);

CREATE INDEX IF NOT EXISTS idx_products_company_category 
ON public.products(company_id, category) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_inventories_store_product 
ON public.inventories(store_id, product_id);

CREATE INDEX IF NOT EXISTS idx_sales_store_created 
ON public.sales(store_id, created_at) WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale 
ON public.sale_payments(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_product 
ON public.sale_items(sale_id, product_id);

-- ============================================================================
-- TESTS MANUALES (Comentados - Descomentar para probar)
-- ============================================================================

/*
-- TEST 1: get_inventory_financial_summary
SELECT public.get_inventory_financial_summary();

-- TEST 2: get_stock_matrix_by_store
SELECT public.get_stock_matrix_by_store();

-- TEST 3: get_dashboard_store_performance (Últimos 30 días)
SELECT public.get_dashboard_store_performance();

-- TEST 3b: get_dashboard_store_performance (Rango personalizado)
SELECT public.get_dashboard_store_performance(
  NULL,
  '2025-01-01 00:00:00+00'::timestamptz,
  '2025-01-31 23:59:59+00'::timestamptz
);

-- TEST 3c: get_dashboard_store_performance (Con company_id específico)
SELECT public.get_dashboard_store_performance(
  'aa11bb22-cc33-dd44-ee55-ff6677889900'::uuid
);
*/

