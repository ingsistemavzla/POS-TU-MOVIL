-- ============================================================================
-- PASO 3: Verificar Aplicación de Correcciones
-- ============================================================================
-- Ejecutar DESPUÉS de aplicar las migraciones anteriores
-- ============================================================================

-- 1. Verificar que el campo IMEI existe
SELECT 
    'Campo IMEI' as verificacion,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE - Ejecutar primero 01_crear_campo_imei.sql'
    END as resultado,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sale_items'
  AND column_name = 'imei'
GROUP BY column_name, data_type, is_nullable;

-- 2. Verificar que la función process_sale incluye IMEI
SELECT 
    'Función process_sale' as verificacion,
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%imei%' THEN '✅ IMEI INCLUIDO'
        ELSE '❌ IMEI NO INCLUIDO - Ejecutar 02_aplicar_migracion_process_sale.sql'
    END as resultado
FROM pg_proc
WHERE proname = 'process_sale'
ORDER BY oid DESC
LIMIT 1;

-- 3. Verificar estructura completa de sale_items
SELECT 
    'Estructura sale_items' as verificacion,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sale_items'
ORDER BY ordinal_position;

-- 4. Verificar índice de IMEI
SELECT 
    'Índice IMEI' as verificacion,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'sale_items'
  AND indexname = 'idx_sale_items_imei';

-- 5. Resumen final
SELECT 
    'RESUMEN FINAL' as tipo,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'sale_items' AND column_name = 'imei'
        ) AND EXISTS (
            SELECT 1 FROM pg_proc
            WHERE proname = 'process_sale' 
            AND pg_get_functiondef(oid) LIKE '%imei%'
        ) THEN '✅ TODO CORRECTO - Listo para usar'
        ELSE '❌ FALTAN CORRECCIONES - Revisar pasos anteriores'
    END as estado;

