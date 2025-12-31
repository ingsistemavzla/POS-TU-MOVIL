-- ============================================================================
-- VER CÓDIGO COMPLETO DE AMBAS VERSIONES
-- ============================================================================
-- Ejecuta esto para ver el código completo de cada versión
-- y comparar cuál es la más reciente y completa
-- ============================================================================

-- VERSIÓN 1: CON p_category (7 parámetros) - DEBE ELIMINARSE
SELECT 
    'VERSIÓN CON p_category (7 parámetros)' as version_type,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2'
AND pg_get_function_arguments(p.oid) LIKE '%p_category%';

-- VERSIÓN 2: SIN p_category (6 parámetros) - DEBE MANTENERSE
SELECT 
    'VERSIÓN SIN p_category (6 parámetros)' as version_type,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2'
AND pg_get_function_arguments(p.oid) NOT LIKE '%p_category%';

-- ============================================================================
-- COMPARACIÓN RÁPIDA: Verificar características clave
-- ============================================================================
SELECT 
    CASE 
        WHEN pg_get_function_arguments(p.oid) LIKE '%p_category%' THEN 'CON p_category'
        ELSE 'SIN p_category'
    END as version_type,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%created_at%' THEN '✅ Tiene created_at'
        ELSE '❌ NO tiene created_at'
    END as has_created_at,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%cashea_enabled%' THEN '✅ Tiene Cashea'
        ELSE '❌ NO tiene Cashea'
    END as has_cashea,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%category%' THEN '✅ Tiene category en items'
        ELSE '❌ NO tiene category en items'
    END as has_category_in_items
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2'
ORDER BY 
    CASE 
        WHEN pg_get_function_arguments(p.oid) LIKE '%p_category%' THEN 1
        ELSE 2
    END;

