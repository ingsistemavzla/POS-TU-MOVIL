-- ============================================================================
-- VERIFICAR Y ELIMINAR VENTA: Samsung A05 (SKU: R92Y60J5AER)
-- ============================================================================
-- Esta venta no aparecía en el panel de ventas debido a la función duplicada
-- Ahora que está resuelto, podemos verificar y eliminar esta venta de prueba
-- ============================================================================

-- ============================================================================
-- PASO 1: Buscar la venta por SKU o Invoice Number
-- ============================================================================
SELECT 
    s.id as sale_id,
    s.invoice_number,
    s.created_at,
    s.total_usd,
    s.total_bs,
    s.customer_name,
    s.store_id,
    st.name as store_name,
    s.cashier_id,
    u.name as cashier_name
FROM public.sales s
LEFT JOIN public.stores st ON s.store_id = st.id
LEFT JOIN public.users u ON s.cashier_id = u.id
WHERE s.invoice_number = 'FAC-20251231-01610'
   OR s.id = '0400b355-7a2b-486a-8c1e-bc66fb1f0ac9'
ORDER BY s.created_at DESC;

-- ============================================================================
-- PASO 2: Ver los items de esa venta
-- ============================================================================
SELECT 
    si.id as sale_item_id,
    si.sale_id,
    si.product_id,
    si.product_name,
    si.product_sku,
    si.qty,
    si.price_usd,
    si.subtotal_usd,
    si.imei,
    p.category,
    p.name as current_product_name
FROM public.sale_items si
LEFT JOIN public.products p ON si.product_id = p.id
WHERE si.sale_id = '0400b355-7a2b-486a-8c1e-bc66fb1f0ac9'
   OR si.product_sku = 'R92Y60J5AER'
ORDER BY si.id;

-- ============================================================================
-- PASO 3: Verificar stock ANTES de eliminar la venta
-- ============================================================================
SELECT 
    i.id as inventory_id,
    i.product_id,
    p.sku,
    p.name as product_name,
    i.store_id,
    st.name as store_name,
    i.qty as current_stock,
    'Stock ANTES de eliminar venta' as status
FROM public.inventories i
INNER JOIN public.products p ON i.product_id = p.id
LEFT JOIN public.stores st ON i.store_id = st.id
WHERE p.sku = 'R92Y60J5AER'
   OR i.product_id IN (
       SELECT product_id 
       FROM public.sale_items 
       WHERE sale_id = '0400b355-7a2b-486a-8c1e-bc66fb1f0ac9'
   )
ORDER BY st.name, p.sku;

-- ============================================================================
-- PASO 4: Verificar si existe la función delete_sale_and_restore_inventory
-- ============================================================================
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'delete_sale_and_restore_inventory';

-- ============================================================================
-- PASO 5: ELIMINAR LA VENTA (Descomenta cuando estés listo)
-- ============================================================================
-- ⚠️ ADVERTENCIA: Esto eliminará la venta y reintegrará el stock
-- ⚠️ Asegúrate de haber verificado los pasos anteriores antes de ejecutar

/*
-- Opción 1: Usar la función RPC (recomendado)
SELECT public.delete_sale_and_restore_inventory('0400b355-7a2b-486a-8c1e-bc66fb1f0ac9');

-- Opción 2: Si la función no existe, eliminar manualmente (NO RECOMENDADO)
-- Esto requiere eliminar en orden: sale_items, sale_payments, krece_financing, sales
-- Y luego actualizar inventarios manualmente
*/

-- ============================================================================
-- PASO 6: Verificar stock DESPUÉS de eliminar la venta
-- ============================================================================
-- Ejecuta esto DESPUÉS de eliminar la venta para verificar que el stock se reintegró

/*
SELECT 
    i.id as inventory_id,
    i.product_id,
    p.sku,
    p.name as product_name,
    i.store_id,
    st.name as store_name,
    i.qty as current_stock,
    'Stock DESPUÉS de eliminar venta' as status
FROM public.inventories i
INNER JOIN public.products p ON i.product_id = p.id
LEFT JOIN public.stores st ON i.store_id = st.id
WHERE p.sku = 'R92Y60J5AER'
   OR i.product_id IN (
       SELECT product_id 
       FROM public.sale_items 
       WHERE sale_id = '0400b355-7a2b-486a-8c1e-bc66fb1f0ac9'
   )
ORDER BY st.name, p.sku;
*/

-- ============================================================================
-- RESUMEN: Información de la venta
-- ============================================================================
-- Invoice: FAC-20251231-01610
-- Producto: Samsung A05 (SKU: R92Y60J5AER)
-- Fecha: 2025-12-31 11:47:11 (o 7:40 AM según el usuario)
-- Total: $100.00 USD
-- ID: 0400b355-7a2b-486a-8c1e-bc66fb1f0ac9
-- ============================================================================

