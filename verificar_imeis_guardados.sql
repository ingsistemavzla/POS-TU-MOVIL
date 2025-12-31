-- Verificar si hay IMEIs guardados en sale_items
-- Este script verifica:
-- 1. Si el campo imei existe en la tabla
-- 2. Cuántos registros tienen IMEI guardado
-- 3. Ejemplos de ventas con IMEI

-- 1. Verificar si el campo existe
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sale_items'
  AND column_name = 'imei';

-- 2. Contar cuántos sale_items tienen IMEI
SELECT 
    COUNT(*) as total_items,
    COUNT(imei) as items_con_imei,
    COUNT(*) - COUNT(imei) as items_sin_imei,
    ROUND(COUNT(imei)::numeric / COUNT(*)::numeric * 100, 2) as porcentaje_con_imei
FROM public.sale_items;

-- 3. Ver ejemplos de ventas con IMEI (últimas 10)
SELECT 
    si.id,
    si.sale_id,
    si.product_name,
    si.product_sku,
    si.imei,
    si.qty,
    si.price_usd,
    s.invoice_number,
    s.created_at,
    p.category
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
LEFT JOIN public.products p ON p.id = si.product_id
WHERE si.imei IS NOT NULL
  AND si.imei != ''
ORDER BY s.created_at DESC
LIMIT 10;

-- 4. Ver ventas de teléfonos sin IMEI (últimas 10)
SELECT 
    si.id,
    si.sale_id,
    si.product_name,
    si.product_sku,
    si.imei,
    si.qty,
    si.price_usd,
    s.invoice_number,
    s.created_at,
    p.category
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
LEFT JOIN public.products p ON p.id = si.product_id
WHERE p.category = 'phones'
  AND (si.imei IS NULL OR si.imei = '')
ORDER BY s.created_at DESC
LIMIT 10;

-- 5. Verificar la venta específica mencionada por el usuario
SELECT 
    si.id,
    si.sale_id,
    si.product_name,
    si.product_sku,
    si.imei,
    si.qty,
    si.price_usd,
    s.invoice_number,
    s.created_at,
    p.category
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
LEFT JOIN public.products p ON p.id = si.product_id
WHERE s.invoice_number = 'FAC-20251230-01608'
ORDER BY si.id;

