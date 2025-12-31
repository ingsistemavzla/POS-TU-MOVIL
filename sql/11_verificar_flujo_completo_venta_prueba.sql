-- ============================================================================
-- VERIFICACIÓN COMPLETA: Flujo de venta de prueba
-- ============================================================================
-- Este script verifica todo el flujo después de hacer una venta de prueba:
-- 1. Verificar que la venta aparece en get_sales_history_v2
-- 2. Verificar que el stock se descontó correctamente
-- 3. Verificar que los items tienen todos los datos (SKU, categoría, IMEI si aplica)
-- 4. Verificar que se puede eliminar y reintegrar stock
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar la última venta creada (debe ser la de prueba)
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
    u.name as cashier_name,
    s.payment_method,
    s.krece_enabled,
    s.cashea_enabled,
    'Última venta creada' as status
FROM public.sales s
LEFT JOIN public.stores st ON s.store_id = st.id
LEFT JOIN public.users u ON s.cashier_id = u.id
WHERE s.company_id = (
    SELECT company_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1
)
ORDER BY s.created_at DESC
LIMIT 1;

-- ============================================================================
-- PASO 2: Verificar que la venta aparece en get_sales_history_v2 (RPC)
-- ============================================================================
-- Esta es la prueba más importante: verificar que la RPC puede encontrar la venta
SELECT 
    sale->>'id' as sale_id,
    sale->>'invoice_number' as invoice_number,
    sale->>'created_at' as created_at,
    sale->>'created_at_fmt' as created_at_fmt,
    sale->>'total_usd' as total_usd,
    sale->>'client_name' as client_name,
    sale->>'store_name' as store_name,
    sale->>'payment_method' as payment_method,
    sale->>'financing_label' as financing_label,
    jsonb_array_length(sale->'items') as items_count,
    'Venta encontrada por RPC' as status
FROM public.get_sales_history_v2(
    NULL,  -- p_company_id (se deduce del usuario)
    NULL,  -- p_store_id (todas las tiendas)
    NULL,  -- p_date_from (sin filtro de fecha)
    NULL,  -- p_date_to (sin filtro de fecha)
    5,     -- p_limit (últimas 5 ventas)
    0      -- p_offset
) as sale
ORDER BY (sale->>'created_at') DESC
LIMIT 1;

-- ============================================================================
-- PASO 3: Verificar items de la última venta
-- ============================================================================
WITH ultima_venta AS (
    SELECT s.id as sale_id
    FROM public.sales s
    WHERE s.company_id = (
        SELECT company_id 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1
    )
    ORDER BY s.created_at DESC
    LIMIT 1
)
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
    p.name as current_product_name,
    p.sku as current_product_sku,
    CASE 
        WHEN si.imei IS NOT NULL AND si.imei != '' THEN '✅ Tiene IMEI'
        WHEN p.category = 'phones' THEN '⚠️ Teléfono sin IMEI'
        ELSE 'N/A (no es teléfono)'
    END as imei_status
FROM public.sale_items si
INNER JOIN ultima_venta uv ON si.sale_id = uv.sale_id
LEFT JOIN public.products p ON si.product_id = p.id
ORDER BY si.id;

-- ============================================================================
-- PASO 4: Verificar stock DESPUÉS de la venta (debe haberse descontado)
-- ============================================================================
WITH ultima_venta AS (
    SELECT s.id as sale_id
    FROM public.sales s
    WHERE s.company_id = (
        SELECT company_id 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1
    )
    ORDER BY s.created_at DESC
    LIMIT 1
),
productos_vendidos AS (
    SELECT DISTINCT si.product_id, si.qty, si.sale_id
    FROM public.sale_items si
    INNER JOIN ultima_venta uv ON si.sale_id = uv.sale_id
)
SELECT 
    i.id as inventory_id,
    i.product_id,
    p.sku,
    p.name as product_name,
    p.category,
    i.store_id,
    st.name as store_name,
    i.qty as current_stock,
    pv.qty as qty_vendida,
    'Stock DESPUÉS de venta (debe ser menor)' as status
FROM public.inventories i
INNER JOIN productos_vendidos pv ON i.product_id = pv.product_id
INNER JOIN public.products p ON i.product_id = p.id
LEFT JOIN public.stores st ON i.store_id = st.id
ORDER BY st.name, p.sku;

-- ============================================================================
-- PASO 5: Verificar movimientos de inventario (OUT) de la venta
-- ============================================================================
WITH ultima_venta AS (
    SELECT s.id as sale_id
    FROM public.sales s
    WHERE s.company_id = (
        SELECT company_id 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1
    )
    ORDER BY s.created_at DESC
    LIMIT 1
)
SELECT 
    im.id as movement_id,
    im.sale_id,
    im.product_id,
    p.sku,
    p.name as product_name,
    im.store_id,
    st.name as store_name,
    im.movement_type,
    im.qty,
    im.created_at,
    'Movimiento OUT de la venta' as status
FROM public.inventory_movements im
INNER JOIN ultima_venta uv ON im.sale_id = uv.sale_id
INNER JOIN public.products p ON im.product_id = p.id
LEFT JOIN public.stores st ON im.store_id = st.id
WHERE im.movement_type = 'OUT'
ORDER BY im.created_at DESC;

-- ============================================================================
-- PASO 6: Verificar que la venta aparece en el panel (simulación frontend)
-- ============================================================================
-- Simular exactamente lo que hace el frontend: llamar a get_sales_history_v2
-- y verificar que la venta aparece en los primeros resultados
SELECT 
    COUNT(*) as ventas_encontradas,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ La venta aparece en get_sales_history_v2'
        ELSE '❌ ERROR: La venta NO aparece en get_sales_history_v2'
    END as resultado
FROM public.get_sales_history_v2(
    NULL,  -- p_company_id
    NULL,  -- p_store_id
    NULL,  -- p_date_from
    NULL,  -- p_date_to
    15,    -- p_limit (primeras 15 ventas, como el frontend)
    0      -- p_offset
) as sale
WHERE sale->>'id' = (
    SELECT s.id::text
    FROM public.sales s
    WHERE s.company_id = (
        SELECT company_id 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1
    )
    ORDER BY s.created_at DESC
    LIMIT 1
);

-- ============================================================================
-- RESUMEN: Estado completo de la verificación
-- ============================================================================
SELECT 
    'Verificación Completa' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM public.get_sales_history_v2(NULL, NULL, NULL, NULL, 15, 0) as sale
            WHERE sale->>'id' = (
                SELECT s.id::text
                FROM public.sales s
                WHERE s.company_id = (
                    SELECT company_id 
                    FROM public.users 
                    WHERE auth_user_id = auth.uid() 
                    LIMIT 1
                )
                ORDER BY s.created_at DESC
                LIMIT 1
            )
        ) THEN '✅ PASÓ: La venta aparece en get_sales_history_v2'
        ELSE '❌ FALLÓ: La venta NO aparece en get_sales_history_v2'
    END as test_result;

-- ============================================================================
-- INSTRUCCIONES PARA ELIMINAR LA VENTA DE PRUEBA
-- ============================================================================
-- Si quieres eliminar la venta de prueba y verificar que el stock se reintegra:
-- 
-- 1. Obtén el ID de la venta del PASO 1
-- 2. Ejecuta:
--    SELECT public.delete_sale_and_restore_inventory('ID_DE_LA_VENTA_AQUI');
-- 
-- 3. Verifica que el stock se reintegró ejecutando el PASO 4 de nuevo
-- ============================================================================

