-- ✅ SCRIPT SIMPLE PARA VERIFICAR IMEIs GUARDADOS
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar si el campo imei existe
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'sale_items' AND column_name = 'imei';

-- 2. Contar items con y sin IMEI
SELECT 
    COUNT(*) as total_items,
    COUNT(imei) as items_con_imei,
    COUNT(*) - COUNT(imei) as items_sin_imei
FROM sale_items;

-- 3. Ver ejemplos de ventas CON IMEI (últimas 5)
SELECT 
    si.product_name,
    si.product_sku,
    si.imei,
    s.invoice_number,
    s.created_at::date as fecha_venta
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE si.imei IS NOT NULL AND si.imei != ''
ORDER BY s.created_at DESC
LIMIT 5;

-- 4. Ver la venta específica FAC-20251230-01608
SELECT 
    si.id,
    si.product_name,
    si.product_sku,
    si.imei,
    si.qty,
    s.invoice_number,
    s.created_at
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE s.invoice_number = 'FAC-20251230-01608';

-- 5. Ver teléfonos vendidos recientemente (con y sin IMEI)
SELECT 
    si.product_name,
    si.product_sku,
    si.imei,
    s.invoice_number,
    s.created_at::date as fecha,
    CASE 
        WHEN si.imei IS NOT NULL AND si.imei != '' THEN '✅ CON IMEI'
        ELSE '❌ SIN IMEI'
    END as estado_imei
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
JOIN products p ON p.id = si.product_id
WHERE p.category = 'phones'
ORDER BY s.created_at DESC
LIMIT 10;

