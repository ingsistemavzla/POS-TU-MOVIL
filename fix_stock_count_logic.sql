-- ====================================================================================
-- SCRIPT DE CORRECCIÓN: Lógica de Cálculo de Totales de Stock
-- Fecha: 2025-01-27
-- Descripción: Corrige todas las funciones, vistas y consultas que calculan totales
--              de stock para que SIEMPRE filtren productos inactivos (active = false)
-- ====================================================================================
-- PROBLEMA IDENTIFICADO:
-- Cuando se elimina un producto (soft delete: active = false), el stock asociado
-- sigue apareciendo en los totales porque las consultas no filtran por products.active.
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- PASO 1: AUDITORÍA - Identificar vistas y funciones que calculan totales
-- ====================================================================================

-- Verificar si existe la vista inventory_statistics_view
DO $$
DECLARE
    v_view_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname = 'inventory_statistics_view'
    ) INTO v_view_exists;

    IF v_view_exists THEN
        RAISE NOTICE '⚠️ Vista inventory_statistics_view encontrada. Se eliminará y recreará con filtro active = true.';
        DROP VIEW IF EXISTS public.inventory_statistics_view CASCADE;
    ELSE
        RAISE NOTICE '✅ Vista inventory_statistics_view no existe. Continuando...';
    END IF;
END $$;

-- ====================================================================================
-- PASO 2: RECREAR VISTA inventory_statistics_view (si se necesita)
-- ====================================================================================
-- Esta vista calcula estadísticas de inventario por tienda
-- IMPORTANTE: Solo incluye productos activos (active = true)

CREATE OR REPLACE VIEW public.inventory_statistics_view AS
SELECT 
    i.store_id,
    i.company_id,
    COUNT(DISTINCT i.product_id) FILTER (WHERE p.active = true) AS total_products,
    SUM(i.qty) FILTER (WHERE p.active = true) AS total_stock,
    SUM(i.qty * COALESCE(p.sale_price_usd, 0)) FILTER (WHERE p.active = true) AS total_value,
    COUNT(DISTINCT i.product_id) FILTER (
        WHERE p.active = true 
        AND i.qty <= i.min_qty 
        AND i.qty > 0
    ) AS low_stock_count,
    COUNT(DISTINCT i.product_id) FILTER (
        WHERE p.active = true 
        AND i.qty = 0
    ) AS out_of_stock_count
FROM public.inventories i
INNER JOIN public.products p ON i.product_id = p.id
WHERE p.active = true  -- ⚠️ FILTRO CRÍTICO: Solo productos activos
GROUP BY i.store_id, i.company_id;

COMMENT ON VIEW public.inventory_statistics_view IS 
'Vista que calcula estadísticas de inventario por tienda. 
IMPORTANTE: Solo incluye productos activos (active = true) para evitar contar stock de productos eliminados.';

-- ====================================================================================
-- PASO 3: CREAR FUNCIÓN RPC get_store_inventory_stats (si no existe)
-- ====================================================================================
-- Esta función devuelve estadísticas de inventario para una tienda específica
-- IMPORTANTE: Solo incluye productos activos

DROP FUNCTION IF EXISTS public.get_store_inventory_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_store_inventory_stats(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_stats JSONB;
BEGIN
    -- Obtener company_id del usuario
    SELECT company_id INTO v_company_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no está vinculado a una compañía.';
    END IF;

    -- Verificar que la tienda pertenece a la compañía del usuario
    IF NOT EXISTS (
        SELECT 1 FROM public.stores
        WHERE id = p_store_id AND company_id = v_company_id AND active = true
    ) THEN
        RAISE EXCEPTION 'Tienda no encontrada o no pertenece a tu compañía.';
    END IF;

    -- Calcular estadísticas SOLO para productos activos
    SELECT jsonb_build_object(
        'store_id', p_store_id,
        'total_products', COUNT(DISTINCT i.product_id) FILTER (WHERE p.active = true),
        'total_stock', COALESCE(SUM(i.qty) FILTER (WHERE p.active = true), 0),
        'total_value', COALESCE(SUM(i.qty * COALESCE(p.sale_price_usd, 0)) FILTER (WHERE p.active = true), 0),
        'low_stock_count', COUNT(DISTINCT i.product_id) FILTER (
            WHERE p.active = true 
            AND i.qty <= i.min_qty 
            AND i.qty > 0
        ),
        'out_of_stock_count', COUNT(DISTINCT i.product_id) FILTER (
            WHERE p.active = true 
            AND i.qty = 0
        )
    ) INTO v_stats
    FROM public.inventories i
    INNER JOIN public.products p ON i.product_id = p.id
    WHERE i.store_id = p_store_id
    AND i.company_id = v_company_id
    AND p.active = true;  -- ⚠️ FILTRO CRÍTICO: Solo productos activos

    RETURN v_stats;
END;
$$;

COMMENT ON FUNCTION public.get_store_inventory_stats(UUID) IS 
'Devuelve estadísticas de inventario para una tienda específica. 
IMPORTANTE: Solo incluye productos activos (active = true).';

GRANT EXECUTE ON FUNCTION public.get_store_inventory_stats(UUID) TO authenticated;

-- ====================================================================================
-- PASO 4: CREAR FUNCIÓN RPC get_company_inventory_summary (si no existe)
-- ====================================================================================
-- Esta función devuelve un resumen de inventario para toda la compañía
-- IMPORTANTE: Solo incluye productos activos

DROP FUNCTION IF EXISTS public.get_company_inventory_summary();

CREATE OR REPLACE FUNCTION public.get_company_inventory_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_summary JSONB;
BEGIN
    -- Obtener company_id del usuario
    SELECT company_id INTO v_company_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no está vinculado a una compañía.';
    END IF;

    -- Calcular resumen SOLO para productos activos
    SELECT jsonb_build_object(
        'company_id', v_company_id,
        'total_products', COUNT(DISTINCT i.product_id) FILTER (WHERE p.active = true),
        'total_stock', COALESCE(SUM(i.qty) FILTER (WHERE p.active = true), 0),
        'total_value', COALESCE(SUM(i.qty * COALESCE(p.sale_price_usd, 0)) FILTER (WHERE p.active = true), 0),
        'total_stores', COUNT(DISTINCT i.store_id) FILTER (WHERE p.active = true),
        'low_stock_count', COUNT(DISTINCT i.product_id) FILTER (
            WHERE p.active = true 
            AND i.qty <= i.min_qty 
            AND i.qty > 0
        ),
        'out_of_stock_count', COUNT(DISTINCT i.product_id) FILTER (
            WHERE p.active = true 
            AND i.qty = 0
        )
    ) INTO v_summary
    FROM public.inventories i
    INNER JOIN public.products p ON i.product_id = p.id
    WHERE i.company_id = v_company_id
    AND p.active = true;  -- ⚠️ FILTRO CRÍTICO: Solo productos activos

    RETURN v_summary;
END;
$$;

COMMENT ON FUNCTION public.get_company_inventory_summary() IS 
'Devuelve un resumen de inventario para toda la compañía del usuario. 
IMPORTANTE: Solo incluye productos activos (active = true).';

GRANT EXECUTE ON FUNCTION public.get_company_inventory_summary() TO authenticated;

-- ====================================================================================
-- PASO 5: VERIFICACIÓN Y REPORTE
-- ====================================================================================

DO $$
DECLARE
    v_view_count INTEGER;
    v_function_count INTEGER;
BEGIN
    -- Contar vistas creadas
    SELECT COUNT(*) INTO v_view_count
    FROM pg_views
    WHERE schemaname = 'public'
    AND viewname = 'inventory_statistics_view';

    -- Contar funciones creadas
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
    AND proname IN ('get_store_inventory_stats', 'get_company_inventory_summary');

    RAISE NOTICE '✅ Corrección completada:';
    RAISE NOTICE '   - Vistas creadas: %', v_view_count;
    RAISE NOTICE '   - Funciones RPC creadas: %', v_function_count;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANTE: Todas las consultas ahora filtran por products.active = true';
    RAISE NOTICE '   Esto asegura que los productos eliminados (soft delete) no aparezcan en los totales.';
END $$;

COMMIT;

-- ====================================================================================
-- RESUMEN DE CAMBIOS
-- ====================================================================================
-- ✅ Vista inventory_statistics_view: Recreada con filtro active = true
-- ✅ Función get_store_inventory_stats: Creada con filtro active = true
-- ✅ Función get_company_inventory_summary: Creada con filtro active = true
-- 
-- ⚠️ NOTA PARA EL FRONTEND:
-- Las consultas en el frontend también deben filtrar por products.active = true.
-- Ver archivos:
--   - src/pages/AlmacenPage.tsx
--   - src/pages/ArticulosPage.tsx
--   - src/pages/EstadisticasPage.tsx
--   - src/pages/StoreDashboardPage.tsx
--   - src/hooks/useDashboardData.ts
-- ====================================================================================





