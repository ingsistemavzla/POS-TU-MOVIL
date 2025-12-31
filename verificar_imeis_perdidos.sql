-- ✅ VERIFICAR SI LOS IMEIs DE VENTAS ANTERIORES ESTÁN GUARDADOS
-- Ejecuta esto en el SQL Editor de Supabase para saber si puedes recuperar los IMEIs

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Si ves IMEIs en los resultados → ✅ SÍ están guardados, puedes acceder a ellos
-- Si NO ves IMEIs (todos NULL o vacíos) → ❌ NO se guardaron, NO se pueden recuperar
-- ============================================================================

-- 1. Verificar si el campo existe
SELECT 
    '1. Campo IMEI existe?' as verificacion,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SÍ existe'
        ELSE '❌ NO existe'
    END as resultado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sale_items'
  AND column_name = 'imei';

-- 2. Contar cuántos teléfonos tienen IMEI guardado
SELECT 
    '2. Teléfonos con IMEI' as verificacion,
    COUNT(*) as total_telefonos_vendidos,
    COUNT(CASE WHEN si.imei IS NOT NULL AND si.imei != '' AND si.imei != 'null' THEN 1 END) as telefonos_con_imei,
    COUNT(CASE WHEN si.imei IS NULL OR si.imei = '' OR si.imei = 'null' THEN 1 END) as telefonos_sin_imei,
    CASE 
        WHEN COUNT(CASE WHEN si.imei IS NOT NULL AND si.imei != '' AND si.imei != 'null' THEN 1 END) > 0 
        THEN '✅ HAY IMEIs GUARDADOS - Puedes acceder a ellos'
        ELSE '❌ NO HAY IMEIs GUARDADOS - No se pueden recuperar'
    END as conclusion
FROM public.sale_items si
INNER JOIN public.products p ON p.id = si.product_id
WHERE p.category = 'phones';

-- 3. Ver ejemplos de teléfonos CON IMEI (si existen)
SELECT 
    '3. Ejemplos con IMEI' as tipo,
    si.product_name,
    si.product_sku,
    si.imei,
    s.invoice_number,
    s.created_at::date as fecha_venta
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
INNER JOIN public.products p ON p.id = si.product_id
WHERE p.category = 'phones'
  AND si.imei IS NOT NULL 
  AND si.imei != ''
  AND si.imei != 'null'
ORDER BY s.created_at DESC
LIMIT 10;

-- 4. Ver la venta específica que mencionaste
SELECT 
    '4. Venta FAC-20251230-01608' as tipo,
    si.product_name,
    si.product_sku,
    si.imei,
    s.invoice_number,
    s.created_at,
    CASE 
        WHEN si.imei IS NOT NULL AND si.imei != '' AND si.imei != 'null' 
        THEN '✅ TIENE IMEI - Puedes verlo'
        ELSE '❌ NO TIENE IMEI - No se guardó, no se puede recuperar'
    END as estado
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
LEFT JOIN public.products p ON p.id = si.product_id
WHERE s.invoice_number = 'FAC-20251230-01608';

-- 5. Ver teléfonos vendidos recientemente (últimos 15)
SELECT 
    '5. Teléfonos recientes' as tipo,
    si.product_name,
    si.product_sku,
    si.imei,
    s.invoice_number,
    s.created_at::date as fecha,
    CASE 
        WHEN si.imei IS NOT NULL AND si.imei != '' AND si.imei != 'null' 
        THEN '✅ CON IMEI'
        ELSE '❌ SIN IMEI'
    END as estado_imei
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
INNER JOIN public.products p ON p.id = si.product_id
WHERE p.category = 'phones'
ORDER BY s.created_at DESC
LIMIT 15;

