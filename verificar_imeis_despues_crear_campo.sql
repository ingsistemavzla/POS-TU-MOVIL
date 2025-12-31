-- ✅ VERIFICAR IMEIs DESPUÉS DE CREAR EL CAMPO
-- Ejecuta esto DESPUÉS de ejecutar crear_campo_imei.sql

-- 1. Verificar que el campo existe
SELECT 
    '1. Campo IMEI existe?' as verificacion,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SÍ existe'
        ELSE '❌ NO existe - Ejecuta primero crear_campo_imei.sql'
    END as resultado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sale_items'
  AND column_name = 'imei';

-- 2. Contar teléfonos vendidos (todos sin IMEI porque el campo es nuevo)
SELECT 
    '2. Estado de IMEIs' as verificacion,
    COUNT(*) as total_telefonos_vendidos,
    COUNT(CASE WHEN si.imei IS NOT NULL AND si.imei != '' AND si.imei != 'null' THEN 1 END) as telefonos_con_imei,
    COUNT(CASE WHEN si.imei IS NULL OR si.imei = '' OR si.imei = 'null' THEN 1 END) as telefonos_sin_imei,
    '⚠️ IMPORTANTE: Todos los IMEIs son NULL porque el campo es nuevo. Las ventas anteriores NO tienen IMEI guardado.' as conclusion
FROM public.sale_items si
INNER JOIN public.products p ON p.id = si.product_id
WHERE p.category = 'phones';

-- 3. Ver la venta específica
SELECT 
    '3. Venta FAC-20251230-01608' as tipo,
    si.product_name,
    si.product_sku,
    si.imei,
    s.invoice_number,
    s.created_at,
    '❌ NO TIENE IMEI - El campo no existía cuando se hizo esta venta' as estado
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
LEFT JOIN public.products p ON p.id = si.product_id
WHERE s.invoice_number = 'FAC-20251230-01608';

-- 4. Ver teléfonos vendidos recientemente
SELECT 
    '4. Teléfonos recientes' as tipo,
    si.product_name,
    si.product_sku,
    si.imei,
    s.invoice_number,
    s.created_at::date as fecha,
    '❌ SIN IMEI - Campo creado después de estas ventas' as estado_imei
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
INNER JOIN public.products p ON p.id = si.product_id
WHERE p.category = 'phones'
ORDER BY s.created_at DESC
LIMIT 15;

