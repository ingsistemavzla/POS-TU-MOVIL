-- ============================================================================
-- PASO 0: CONSULTA Y RESPALDO ANTES DE ELIMINAR
-- ============================================================================
-- Este script consulta TODAS las versiones existentes de get_sales_history_v2
-- y muestra su código completo para identificar la versión correcta
-- ============================================================================

-- ============================================================================
-- CONSULTA 1: Listar TODAS las versiones existentes
-- ============================================================================
SELECT 
    p.oid as function_oid,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    CASE 
        WHEN pg_get_function_arguments(p.oid) LIKE '%p_category%' THEN '❌ VERSIÓN CON p_category (ANTIGUA)'
        ELSE '✅ VERSIÓN SIN p_category (CORRECTA)'
    END as status,
    CASE 
        WHEN pg_get_function_arguments(p.oid) LIKE '%p_category%' THEN 7
        ELSE 6
    END as parameter_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2'
ORDER BY 
    CASE 
        WHEN pg_get_function_arguments(p.oid) LIKE '%p_category%' THEN 1
        ELSE 2
    END,
    p.oid;

-- ============================================================================
-- CONSULTA 2: Obtener el código completo de CADA versión
-- ============================================================================
-- Esta consulta muestra el código fuente completo de cada función
-- para que puedas verificar cuál es la más reciente y completa

SELECT 
    p.oid as function_oid,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN pg_get_function_arguments(p.oid) LIKE '%p_category%' THEN 'VERSIÓN CON p_category'
        ELSE 'VERSIÓN SIN p_category'
    END as version_type,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2'
ORDER BY 
    CASE 
        WHEN pg_get_function_arguments(p.oid) LIKE '%p_category%' THEN 1
        ELSE 2
    END,
    p.oid;

-- ============================================================================
-- CONSULTA 3: Verificar dependencias (qué objetos dependen de estas funciones)
-- ============================================================================
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    d.classid::regclass as dependent_type,
    d.objid::regclass as dependent_object,
    d.objsubid as dependent_subid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_depend d ON p.oid = d.refobjid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2'
ORDER BY p.proname, d.classid;

-- ============================================================================
-- CONSULTA 4: Verificar permisos (GRANT) de cada versión
-- ============================================================================
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    a.rolname as grantee,
    pr.privilege_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN (
    SELECT 
        oid,
        unnest(ARRAY['EXECUTE', 'ALTER', 'DROP']) as privilege_type
    FROM pg_proc
) pr ON p.oid = pr.oid
LEFT JOIN pg_roles a ON true
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2'
ORDER BY p.proname, a.rolname;

-- ============================================================================
-- RESUMEN: Esta consulta te dará un resumen ejecutivo
-- ============================================================================
SELECT 
    COUNT(*) as total_versions,
    COUNT(*) FILTER (WHERE pg_get_function_arguments(p.oid) LIKE '%p_category%') as versions_with_p_category,
    COUNT(*) FILTER (WHERE pg_get_function_arguments(p.oid) NOT LIKE '%p_category%') as versions_without_p_category,
    CASE 
        WHEN COUNT(*) FILTER (WHERE pg_get_function_arguments(p.oid) LIKE '%p_category%') > 0 
        THEN '⚠️ PROBLEMA: Existen versiones con p_category que deben eliminarse'
        ELSE '✅ OK: Solo existen versiones sin p_category'
    END as diagnosis
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2';

-- ============================================================================
-- INSTRUCCIONES:
-- ============================================================================
-- 1. Ejecuta este script completo en Supabase SQL Editor
-- 2. Revisa los resultados de la CONSULTA 2 (function_definition)
-- 3. Identifica cuál versión es la más reciente y completa (debe ser la sin p_category)
-- 4. Copia el código de la versión correcta (function_definition)
-- 5. Compara con el código en supabase/migrations/20250127000001_update_sales_history_v3.sql
-- 6. Si coinciden, procede con el script 07_eliminar_todas_variaciones_get_sales_history_v2.sql
-- 7. Si NO coinciden, usa el código de la base de datos como base para recrear la función
-- ============================================================================

