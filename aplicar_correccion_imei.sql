-- ✅ CORRECCIÓN URGENTE: Agregar IMEI al INSERT de sale_items
-- Esta corrección actualiza la función process_sale para que guarde el IMEI

-- Reemplazar solo la sección del INSERT de sale_items en la función process_sale
-- La función completa está en: supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql

-- ⚠️ IMPORTANTE: Esta es una corrección parcial. 
-- Si prefieres aplicar la migración completa, usa el archivo de migración completo.

-- Buscar y reemplazar esta sección en la función process_sale:
-- ANTES (sin IMEI):
/*
        INSERT INTO sale_items (
            sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd
        ) VALUES (
            new_sale_id, v_product_id, v_product_name, v_product_sku,
            v_qty, v_price, (v_qty * v_price)
        );
*/

-- DESPUÉS (con IMEI):
/*
        -- ✅ PASO E: REGISTRO DE ITEM DE VENTA (Dentro de la misma transacción)
        -- ✅ INCLUIR IMEI: Extraer IMEI del JSON del item si existe
        INSERT INTO sale_items (
            sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd, imei
        ) VALUES (
            new_sale_id, v_product_id, v_product_name, v_product_sku,
            v_qty, v_price, (v_qty * v_price),
            CASE 
                WHEN (item->>'imei') IS NULL OR (item->>'imei') = '' OR (item->>'imei') = 'null' THEN NULL
                ELSE (item->>'imei')
            END
        );
*/

-- ⚠️ RECOMENDACIÓN: Aplicar la migración completa desde el archivo:
-- supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql
-- que ya tiene esta corrección incluida.

