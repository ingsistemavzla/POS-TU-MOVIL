-- ✅ VERIFICAR SI HAY IMEIs GUARDADOS EN VENTAS ANTERIORES
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar si el campo imei existe en la tabla
SELECT 
    'Campo IMEI existe' as verificacion,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sale_items'
  AND column_name = 'imei';

-- 2. Contar cuántos sale_items tienen IMEI guardado
SELECT 
    'Conteo de IMEIs' as verificacion,
    COUNT(*) as total_items,
    COUNT(imei) as items_con_imei,
    COUNT(*) - COUNT(imei) as items_sin_imei,
    ROUND(COUNT(imei)::numeric / NULLIF(COUNT(*), 0)::numeric * 100, 2) as porcentaje_con_imei
FROM public.sale_items;

-- 3. Ver ejemplos de ventas CON IMEI (últimas 10)
SELECT 
    'Ventas CON IMEI' as tipo,
    si.id,
    si.product_name,
    si.product_sku,
    si.imei,
    s.invoice_number,
    s.created_at::date as fecha_venta,
    p.category
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
LEFT JOIN public.products p ON p.id = si.product_id
WHERE si.imei IS NOT NULL 
  AND si.imei != ''
  AND si.imei != 'null'
ORDER BY s.created_at DESC
LIMIT 10;

-- 4. Ver la venta específica FAC-20251230-01608
SELECT 
    'Venta FAC-20251230-01608' as tipo,
    si.id,
    si.product_name,
    si.product_sku,
    si.imei,
    si.qty,
    s.invoice_number,
    s.created_at,
    p.category,
    CASE 
        WHEN si.imei IS NOT NULL AND si.imei != '' THEN '✅ TIENE IMEI'
        ELSE '❌ NO TIENE IMEI'
    END as estado_imei
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
LEFT JOIN public.products p ON p.id = si.product_id
WHERE s.invoice_number = 'FAC-20251230-01608'
ORDER BY si.id;

-- 5. Ver teléfonos vendidos recientemente (últimos 20)
SELECT 
    'Teléfonos vendidos' as tipo,
    si.product_name,
    si.product_sku,
    si.imei,
    s.invoice_number,
    s.created_at::date as fecha,
    CASE 
        WHEN si.imei IS NOT NULL AND si.imei != '' AND si.imei != 'null' THEN '✅ CON IMEI'
        ELSE '❌ SIN IMEI'
    END as estado_imei
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
INNER JOIN public.products p ON p.id = si.product_id
WHERE p.category = 'phones'
ORDER BY s.created_at DESC
LIMIT 20;

-- 6. RESUMEN: Cuántos teléfonos tienen IMEI vs cuántos no
SELECT 
    'Resumen teléfonos' as tipo,
    COUNT(*) as total_telefonos_vendidos,
    COUNT(CASE WHEN si.imei IS NOT NULL AND si.imei != '' AND si.imei != 'null' THEN 1 END) as telefonos_con_imei,
    COUNT(CASE WHEN si.imei IS NULL OR si.imei = '' OR si.imei = 'null' THEN 1 END) as telefonos_sin_imei,
    ROUND(
        COUNT(CASE WHEN si.imei IS NOT NULL AND si.imei != '' AND si.imei != 'null' THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0)::numeric * 100, 
        2
    ) as porcentaje_con_imei
FROM public.sale_items si
INNER JOIN public.products p ON p.id = si.product_id
WHERE p.category = 'phones';

