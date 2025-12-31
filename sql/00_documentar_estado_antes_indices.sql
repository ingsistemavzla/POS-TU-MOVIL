-- ============================================================================
-- PUNTO DE RESTAURACIÓN - ANTES DE CREAR ÍNDICES
-- ============================================================================
-- Ejecutar este script ANTES de crear los índices de performance
-- Guardar el resultado para referencia futura
-- ============================================================================

-- 1. ÍNDICES EXISTENTES EN TABLAS QUE VAMOS A MODIFICAR
SELECT 
    '=== ÍNDICES EXISTENTES ===' as seccion,
    tablename as tabla,
    indexname as indice,
    indexdef as definicion
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('sales', 'sale_items', 'inventories', 'products')
ORDER BY tablename, indexname;

-- 2. ESTADÍSTICAS DE TABLAS (registros y tamaño)
SELECT 
    '=== ESTADÍSTICAS DE TABLAS ===' as seccion,
    relname as tabla,
    n_live_tup as registros,
    pg_size_pretty(pg_total_relation_size('public.' || relname)) as tamaño_total,
    pg_size_pretty(pg_relation_size('public.' || relname)) as tamaño_datos
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN ('sales', 'sale_items', 'inventories', 'products')
ORDER BY relname;

-- 3. VERIFICAR FUNCIONES CRÍTICAS
SELECT 
    '=== FUNCIONES CRÍTICAS ===' as seccion,
    proname as funcion,
    CASE 
        WHEN oid IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as estado
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('process_sale', 'delete_sale_and_restore_inventory', 'generate_invoice_number')
ORDER BY proname;

-- 4. RESUMEN PARA REFERENCIA RÁPIDA
SELECT 
    '=== RESUMEN ===' as seccion,
    COUNT(DISTINCT tablename) as tablas_revisadas,
    COUNT(*) as indices_existentes,
    SUM(n_live_tup) as total_registros
FROM pg_indexes i
JOIN pg_stat_user_tables t ON i.tablename = t.relname
WHERE i.schemaname = 'public'
  AND i.tablename IN ('sales', 'sale_items', 'inventories', 'products')
  AND t.schemaname = 'public';

-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ejecutar este script completo
-- 2. Copiar TODO el resultado
-- 3. Guardar en: estado_antes_indices_[FECHA].txt
-- 4. Ahora puedes aplicar los índices de forma segura
-- ============================================================================

