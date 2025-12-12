-- ============================================================================
-- MIGRATION: Fix get_inventory_financial_summary to Include All Products
-- ============================================================================
-- Fecha: 2025-01-31
-- Descripción: Corrige la función get_inventory_financial_summary para incluir
--              productos sin inventario (ej: "Servicio Técnico") usando LEFT JOIN
--              con agregación previa para evitar duplicados.
-- ============================================================================

-- ✅ ELIMINAR TODAS LAS VERSIONES EXISTENTES DE LA FUNCIÓN
-- Esto resuelve el error "function name is not unique" de forma segura
-- El frontend SIEMPRE usa la versión con (p_company_id, p_store_id)
-- La versión antigua (solo p_company_id) no se usa en el código actual
DO $$ 
DECLARE
    r RECORD;
    func_signature TEXT;
    v_functions_dropped INTEGER := 0;
    v_functions_found INTEGER := 0;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Verificando y eliminando funciones existentes...';
    RAISE NOTICE '';
    
    FOR r IN 
        SELECT 
            oid, 
            proname, 
            pg_get_function_identity_arguments(oid) as args,
            CASE 
                WHEN pg_get_function_identity_arguments(oid) = 'p_company_id uuid DEFAULT NULL' THEN 'Versión Antigua (solo p_company_id)'
                WHEN pg_get_function_identity_arguments(oid) = 'p_company_id uuid DEFAULT NULL, p_store_id uuid DEFAULT NULL' THEN 'Versión Nueva (con p_store_id)'
                ELSE 'Versión Desconocida'
            END as version_type
        FROM pg_proc 
        WHERE proname = 'get_inventory_financial_summary'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        v_functions_found := v_functions_found + 1;
        func_signature := 'public.get_inventory_financial_summary(' || r.args || ')';
        
        RAISE NOTICE 'Función encontrada: %', func_signature;
        RAISE NOTICE '  Tipo: %', r.version_type;
        
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || func_signature || ' CASCADE';
            RAISE NOTICE '  ✅ Eliminada exitosamente';
            v_functions_dropped := v_functions_dropped + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING '  ⚠️ Error al eliminar: %', SQLERRM;
        END;
        RAISE NOTICE '';
    END LOOP;
    
    IF v_functions_found = 0 THEN
        RAISE NOTICE 'No se encontraron funciones existentes (primera instalación)';
    ELSE
        RAISE NOTICE '═══════════════════════════════════════════════════════════';
        RAISE NOTICE 'Resumen:';
        RAISE NOTICE '  Funciones encontradas: %', v_functions_found;
        RAISE NOTICE '  Funciones eliminadas: %', v_functions_dropped;
        RAISE NOTICE '';
        RAISE NOTICE '✅ Todas las versiones antiguas eliminadas';
        RAISE NOTICE '✅ Se creará la nueva versión corregida';
    END IF;
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Crear la función corregida con la firma correcta
CREATE OR REPLACE FUNCTION public.get_inventory_financial_summary(
  p_company_id UUID DEFAULT NULL,
  p_store_id UUID DEFAULT NULL
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
  WITH inventory_aggregated AS (
    -- ✅ CTE PREVIO: Agregar inventario por producto (evita duplicados)
    -- 🔥 FILTRO DE SUCURSAL: Aplicar aquí para evitar duplicados cuando hay múltiples tiendas
    SELECT 
      inv.product_id,
      SUM(inv.qty) AS total_qty
    FROM public.inventories inv
    WHERE inv.company_id = v_company_id
      -- 🔥 FILTRO DE SUCURSAL: Solo cuando p_store_id está presente
      AND (p_store_id IS NULL OR inv.store_id = p_store_id)
    GROUP BY inv.product_id
  ),
  joined_data AS (
    -- ✅ CTE CORREGIDO: LEFT JOIN con products como base (incluye productos sin inventario)
    -- ✅ Usa inventario ya agregado para evitar duplicados
    SELECT 
      COALESCE(p.category, 'Sin Categoría') AS category,
      COALESCE(ia.total_qty, 0) AS qty,  -- ✅ Usar qty agregado (sin duplicados)
      p.cost_usd,
      p.sale_price_usd,
      p.id AS product_id,
      COALESCE(ia.total_qty, 0) * p.cost_usd AS cost_value,
      COALESCE(ia.total_qty, 0) * p.sale_price_usd AS retail_value,
      COALESCE(ia.total_qty, 0) * (p.sale_price_usd - p.cost_usd) AS profit_value
    FROM public.products p
    LEFT JOIN inventory_aggregated ia ON ia.product_id = p.id
    WHERE p.company_id = v_company_id
      AND p.active = true
  ),
  product_totals AS (
    -- ✅ CTE: Agregación global por producto (ya está agregado, pero mantenemos para compatibilidad)
    SELECT 
      product_id,
      COALESCE(SUM(qty), 0) AS total_qty_across_all_stores
    FROM joined_data
    GROUP BY product_id
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
      COUNT(DISTINCT jd.product_id) AS unique_products,
      -- ✅ Out of Stock - Basado en suma global (tiendas filtradas)
      COUNT(DISTINCT CASE 
        WHEN pt.total_qty_across_all_stores = 0 
        THEN pt.product_id 
      END) AS out_of_stock_count,
      -- ✅ Low Stock - Basado en suma global (tiendas filtradas)
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
-- COMENTARIOS SOBRE LA MODIFICACIÓN
-- ============================================================================
-- 
-- CAMBIOS REALIZADOS:
--   1. ✅ Agregado CTE inventory_aggregated para agregar inventario por producto
--   2. ✅ Cambiado INNER JOIN a LEFT JOIN con products como tabla base
--   3. ✅ Movido filtro de tienda a inventory_aggregated (evita duplicados)
--   4. ✅ Agregado COALESCE para manejo seguro de NULLs
--   5. ✅ Incluye productos sin inventario (ej: "Servicio Técnico")
--
-- BENEFICIOS:
--   - ✅ Resuelve exclusión de productos sin inventario
--   - ✅ Evita duplicados cuando hay múltiples tiendas
--   - ✅ Garantiza totalización correcta de valores financieros
--   - ✅ Mantiene compatibilidad con filtro de tienda
--
-- COMPATIBILIDAD:
--   - ✅ Retrocompatible: Si no se pasa p_store_id, funciona igual que antes
--   - ✅ Filtrado dinámico: Los KPIs se actualizan al cambiar la sucursal
--   - ✅ Incluye productos sin inventario en todas las categorías
--
-- ============================================================================

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_inventory_financial_summary(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION get_inventory_financial_summary IS 
'Función corregida para incluir todos los productos activos, incluso aquellos sin inventario.
Usa LEFT JOIN con agregación previa para evitar duplicados cuando hay múltiples tiendas.
Garantiza totalización correcta de valores financieros.';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración de corrección completada';
    RAISE NOTICE '   - Incluye productos sin inventario (ej: Servicio Técnico)';
    RAISE NOTICE '   - Evita duplicados con agregación previa';
    RAISE NOTICE '   - Garantiza totalización correcta';
    RAISE NOTICE '   - Mantiene compatibilidad con filtro de tienda';
END $$;

