-- ✅ CORRECCIÓN URGENTE: Agregar IMEI al INSERT de sale_items en process_sale
-- Ejecuta esto en el SQL Editor de Supabase

-- Primero, necesitamos obtener la definición completa de la función actual
-- y luego reemplazarla con la versión corregida que incluye IMEI

-- ⚠️ IMPORTANTE: Este script reemplaza la función process_sale completa
-- Asegúrate de tener un backup antes de ejecutar

-- La corrección está en la línea del INSERT de sale_items:
-- ANTES: INSERT INTO sale_items (sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd)
-- DESPUÉS: INSERT INTO sale_items (sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd, imei)

-- ⚠️ MEJOR OPCIÓN: Aplicar la migración completa desde:
-- supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql

-- Si prefieres solo corregir el INSERT, ejecuta esto:

DO $$
DECLARE
    v_function_definition TEXT;
    v_corrected_definition TEXT;
BEGIN
    -- Obtener la definición actual de la función
    SELECT pg_get_functiondef(oid) INTO v_function_definition
    FROM pg_proc
    WHERE proname = 'process_sale'
    ORDER BY oid DESC
    LIMIT 1;
    
    -- Reemplazar el INSERT sin IMEI por el INSERT con IMEI
    v_corrected_definition := REPLACE(
        v_function_definition,
        'INSERT INTO sale_items (
            sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd
        ) VALUES (
            new_sale_id, v_product_id, v_product_name, v_product_sku,
            v_qty, v_price, (v_qty * v_price)
        );',
        'INSERT INTO sale_items (
            sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd, imei
        ) VALUES (
            new_sale_id, v_product_id, v_product_name, v_product_sku,
            v_qty, v_price, (v_qty * v_price),
            CASE 
                WHEN (item->>''imei'') IS NULL OR (item->>''imei'') = '''' OR (item->>''imei'') = ''null'' THEN NULL
                ELSE (item->>''imei'')
            END
        );'
    );
    
    -- Ejecutar la función corregida
    EXECUTE v_corrected_definition;
    
    RAISE NOTICE '✅ Función process_sale actualizada correctamente. Ahora guardará el IMEI.';
END $$;

-- ⚠️ VERIFICACIÓN: Después de ejecutar, verifica que la función se actualizó:
SELECT 
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%imei%' THEN '✅ IMEI incluido'
        ELSE '❌ IMEI NO incluido'
    END as estado_imei
FROM pg_proc
WHERE proname = 'process_sale'
ORDER BY oid DESC
LIMIT 1;

