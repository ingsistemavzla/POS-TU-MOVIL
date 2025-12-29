-- ============================================================================
-- Migration: Corregir validación de stock por sucursal en process_sale
-- Fecha: 2025-01-31
-- Descripción: Corrige el problema de Race Condition en lecturas concurrentes
--              de inventario que causaba stock negativo (Split-Brain).
--              Implementa bloqueo pesimista (SELECT FOR UPDATE) para serializar
--              transacciones concurrentes y eliminar race conditions.
--              Única fuente de verdad: La tabla inventories almacena todo el stock.
-- ============================================================================

-- Crear función corregida
CREATE OR REPLACE FUNCTION public.process_sale(
    p_company_id UUID,
    p_store_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash_usd',
    p_customer_name TEXT DEFAULT 'Cliente General',
    p_bcv_rate NUMERIC DEFAULT 41.73,
    p_customer_id_number TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_notes TEXT DEFAULT NULL,
    p_tax_rate NUMERIC DEFAULT 0.16,
    p_krece_enabled BOOLEAN DEFAULT false,
    p_krece_initial_amount_usd NUMERIC DEFAULT 0,
    p_krece_financed_amount_usd NUMERIC DEFAULT 0,
    p_krece_initial_percentage NUMERIC DEFAULT 0,
    p_is_mixed_payment BOOLEAN DEFAULT false,
    p_mixed_payments JSONB DEFAULT '[]'::jsonb,
    p_subtotal_usd NUMERIC DEFAULT 0,
    p_total_bs NUMERIC DEFAULT NULL,
    p_krece_initial_amount_bs NUMERIC DEFAULT NULL,
    p_krece_financed_amount_bs NUMERIC DEFAULT NULL,
    p_cashea_enabled BOOLEAN DEFAULT false,
    p_cashea_initial_amount_usd NUMERIC DEFAULT 0,
    p_cashea_financed_amount_usd NUMERIC DEFAULT 0,
    p_cashea_initial_percentage NUMERIC DEFAULT 0,
    p_cashea_initial_amount_bs NUMERIC DEFAULT NULL,
    p_cashea_financed_amount_bs NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id UUID;
    item JSONB;
    v_subtotal_calculado NUMERIC := 0;
    v_total_calculado NUMERIC := 0;
    v_qty NUMERIC;
    v_price NUMERIC;
    v_product_name TEXT;
    v_product_sku TEXT;
    v_invoice_number TEXT;
    v_product_id UUID;
    v_current_stock NUMERIC;
    v_product_name_db TEXT;
    v_product_sku_db TEXT;
    v_sale_price_usd NUMERIC;
    v_total_bs_final NUMERIC;
    v_krece_initial_bs_final NUMERIC;
    v_krece_financed_bs_final NUMERIC;
    v_cashea_initial_bs_final NUMERIC;
    v_cashea_financed_bs_final NUMERIC;
    -- Variables para mensajes de auditoría
    v_product_name_mov TEXT;
    v_product_sku_mov TEXT;
    v_store_name_mov TEXT;
BEGIN
    -- 🔒 SEGURIDAD ANTI-COLGAMIENTO: Timeout de bloqueo para evitar transacciones zombie
    SET LOCAL lock_timeout = '4000ms';

    -- ✅ ELIMINACIÓN DE IVA: Anular cualquier parámetro de tax_rate que envíe el frontend
    p_tax_rate := 0;

    -- ========================================================================
    -- VALIDACIÓN DE INTEGRIDAD FINANCIERA (ACTUALIZADA: Incluye Cashea)
    -- ========================================================================
    IF (p_total_bs IS NOT NULL AND p_total_bs < 0) OR 
       (p_krece_initial_amount_bs IS NOT NULL AND p_krece_initial_amount_bs < 0) OR
       (p_krece_financed_amount_bs IS NOT NULL AND p_krece_financed_amount_bs < 0) OR
       (p_cashea_initial_amount_bs IS NOT NULL AND p_cashea_initial_amount_bs < 0) OR
       (p_cashea_financed_amount_bs IS NOT NULL AND p_cashea_financed_amount_bs < 0) THEN
        RAISE EXCEPTION 'Error de Integridad: Los montos financieros en Bolívares no pueden ser negativos.';
    END IF;

    -- 1. VALIDACIONES INICIALES
    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'company_id es requerido';
    END IF;
    
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'store_id es requerido';
    END IF;
    
    IF p_cashier_id IS NULL THEN
        RAISE EXCEPTION 'cashier_id es requerido';
    END IF;
    
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta debe contener al menos un item';
    END IF;

    -- 2. CÁLCULO SEGURO DEL SUBTOTAL Y VALIDACIÓN DE ITEMS
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id := (item->>'product_id')::UUID;
        v_price := COALESCE((item->>'price_usd')::NUMERIC, 0);
        v_qty := COALESCE((item->>'qty')::NUMERIC, 0);
        
        IF v_product_id IS NULL THEN
            RAISE EXCEPTION 'Todos los items deben tener product_id válido';
        END IF;
        
        -- ✅ CORRECCIÓN: Validar que qty > 0 (no convertir 0 a 1)
        IF v_qty <= 0 THEN 
            RAISE EXCEPTION 'La cantidad debe ser mayor a 0 para el producto %', v_product_id;
        END IF;
        
        IF v_price < 0 THEN
            RAISE EXCEPTION 'El precio no puede ser negativo para el producto %', v_product_id;
        END IF;
        
        v_subtotal_calculado := v_subtotal_calculado + (v_qty * v_price);
    END LOOP;
    
    IF v_subtotal_calculado <= 0 THEN
        v_subtotal_calculado := COALESCE(p_subtotal_usd, 0);
    END IF;

    v_total_calculado := v_subtotal_calculado;

    -- ========================================================================
    -- CÁLCULO DE VALORES EN BOLÍVARES
    -- ========================================================================
    v_total_bs_final := COALESCE(
        p_total_bs, 
        v_total_calculado * COALESCE(p_bcv_rate, 41.73)
    );

    v_krece_initial_bs_final := COALESCE(
        p_krece_initial_amount_bs,
        p_krece_initial_amount_usd * COALESCE(p_bcv_rate, 41.73)
    );

    v_krece_financed_bs_final := COALESCE(
        p_krece_financed_amount_bs,
        p_krece_financed_amount_usd * COALESCE(p_bcv_rate, 41.73)
    );

    v_cashea_initial_bs_final := COALESCE(
        p_cashea_initial_amount_bs,
        p_cashea_initial_amount_usd * COALESCE(p_bcv_rate, 41.73)
    );

    v_cashea_financed_bs_final := COALESCE(
        p_cashea_financed_amount_bs,
        p_cashea_financed_amount_usd * COALESCE(p_bcv_rate, 41.73)
    );

    -- 4. GENERAR NÚMERO DE FACTURA
    BEGIN
        v_invoice_number := generate_invoice_number(p_company_id);
    EXCEPTION
        WHEN OTHERS THEN
            v_invoice_number := 'FAC-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
    END;

    -- 5. INSERTAR CABECERA DE VENTA
    INSERT INTO sales (
        company_id, store_id, cashier_id, customer_id, customer_name, 
        customer_id_number, bcv_rate_used, is_mixed_payment,
        subtotal_usd, total_usd, total_bs, payment_method, notes, 
        krece_enabled, 
        krece_initial_amount_usd, krece_financed_amount_usd,
        krece_initial_amount_bs, krece_financed_amount_bs,
        cashea_enabled,
        cashea_initial_amount_usd, cashea_financed_amount_usd,
        cashea_initial_percentage,
        cashea_initial_amount_bs, cashea_financed_amount_bs,
        status, tax_rate, invoice_number
    ) VALUES (
        p_company_id, p_store_id, p_cashier_id, p_customer_id, p_customer_name, 
        p_customer_id_number, COALESCE(p_bcv_rate, 0), COALESCE(p_is_mixed_payment, false),
        v_subtotal_calculado, v_total_calculado, v_total_bs_final, 
        p_payment_method, p_notes, 
        p_krece_enabled, 
        COALESCE(p_krece_initial_amount_usd, 0), COALESCE(p_krece_financed_amount_usd, 0),
        v_krece_initial_bs_final, v_krece_financed_bs_final,
        p_cashea_enabled,
        COALESCE(p_cashea_initial_amount_usd, 0), COALESCE(p_cashea_financed_amount_usd, 0),
        COALESCE(p_cashea_initial_percentage, 0),
        v_cashea_initial_bs_final, v_cashea_financed_bs_final,
        'completed', 0, v_invoice_number
    ) RETURNING id INTO new_sale_id;

    -- ========================================================================
    -- 6. PROCESAR ITEMS Y ACTUALIZAR STOCK (🔒 BLOQUEO PESIMISTA - ANTI RACE CONDITION)
    -- ========================================================================
    -- ✅ ESTRATEGIA: Bloqueo pesimista con SELECT FOR UPDATE
    -- ✅ ORDEN DETERMINISTA: Ordenar por product_id ASC para evitar deadlocks
    -- ✅ TRANSACCIÓN ATÓMICA: Todo dentro de la misma transacción implícita
    -- ✅ ÚNICA FUENTE DE VERDAD: La tabla inventories es la única que almacena stock
    
    FOR item IN 
        SELECT elem.value 
        FROM jsonb_array_elements(p_items) AS elem
        ORDER BY (elem.value->>'product_id') ASC  -- 🔒 CRÍTICO: Orden determinista para evitar Deadlocks
    LOOP
        v_product_id := (item->>'product_id')::UUID;
        v_qty := COALESCE((item->>'qty')::NUMERIC, 0);
        
        -- ✅ VALIDACIÓN PREVIA: Validar product_id y qty antes de procesar
        IF v_product_id IS NULL THEN
            RAISE EXCEPTION 'Item inválido detectado: product_id es NULL o inválido. Verifica que todos los items del carrito tienen un product_id válido.';
        END IF;
        
        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Item inválido detectado: La cantidad debe ser mayor a 0 para el producto %', v_product_id;
        END IF;

        -- ✅ PASO A: OBTENER DATOS DEL PRODUCTO (sin bloqueo, solo lectura)
        SELECT name, sku, sale_price_usd 
        INTO v_product_name_db, v_product_sku_db, v_sale_price_usd
        FROM products 
        WHERE id = v_product_id AND company_id = p_company_id;

        -- ✅ VALIDACIÓN: Si no encuentra el producto, lanzar error claro
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto no encontrado (ID: %). Verifica que el producto existe y pertenece a la compañía.', v_product_id;
        END IF;

        v_product_name := COALESCE(v_product_name_db, item->>'product_name', 'Producto Sin Nombre');
        v_product_sku := COALESCE(v_product_sku_db, item->>'product_sku', 'N/A');
        v_price := COALESCE(v_sale_price_usd, (item->>'price_usd')::NUMERIC, 0);

        -- ✅ PASO B: BLOQUEO PESIMISTA DE FILA (🔒 EL CANDADO - Serialización de ventas concurrentes)
        -- Si no existe inventario, crear uno con stock 0 primero (sin bloqueo)
        INSERT INTO inventories (company_id, store_id, product_id, qty, min_qty)
        VALUES (p_company_id, p_store_id, v_product_id, 0, 0)
        ON CONFLICT (company_id, store_id, product_id) DO NOTHING;

        -- 🔒 BLOQUEO DE FILA: SELECT FOR UPDATE (Serializa transacciones concurrentes)
        SELECT i.qty INTO v_current_stock
        FROM inventories i
        WHERE i.product_id = v_product_id
          AND i.company_id = p_company_id
          AND i.store_id = p_store_id
        FOR UPDATE OF i;  -- 🔒 BLOQUEO ATÓMICO: Esta fila queda bloqueada hasta COMMIT/ROLLBACK

        -- ✅ VALIDACIÓN POST-BLOQUEO: Verificar que existe inventario
        IF v_current_stock IS NULL THEN
            RAISE EXCEPTION 'Error crítico: No se pudo obtener el stock del producto % (SKU: %) después de crear el registro de inventario.', 
                v_product_name, v_product_sku;
        END IF;

        -- ✅ PASO C: VALIDACIÓN ATÓMICA DE STOCK (Dentro del bloqueo)
        IF v_current_stock < v_qty THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto % (SKU: %) en la sucursal seleccionada. Stock disponible: %, solicitado: %.', 
                v_product_name, v_product_sku, v_current_stock, v_qty;
        END IF;

        -- ✅ PASO D: ACTUALIZACIÓN ATÓMICA DE INVENTARIO (Fila ya está bloqueada)
        UPDATE inventories
        SET 
            qty = qty - v_qty,
            updated_at = NOW()
        WHERE product_id = v_product_id
          AND company_id = p_company_id
          AND store_id = p_store_id;

        -- ✅ PASO E: REGISTRO DE ITEM DE VENTA (Dentro de la misma transacción)
        INSERT INTO sale_items (
            sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd
        ) VALUES (
            new_sale_id, v_product_id, v_product_name, v_product_sku,
            v_qty, v_price, (v_qty * v_price)
        );
        
        -- ✅ PASO F: REGISTRO DE MOVIMIENTO DE INVENTARIO (AUDITORÍA - NO CRÍTICO)
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_schema = 'public' 
                      AND table_name = 'inventory_movements') THEN
                -- Obtener nombre de la sucursal
                SELECT name INTO v_store_name_mov
                FROM public.stores
                WHERE id = p_store_id AND company_id = p_company_id
                LIMIT 1;
                
                -- Construir mensaje mejorado con información completa
                INSERT INTO public.inventory_movements (
                    product_id, type, qty, store_from_id, store_to_id, reason,
                    user_id, company_id, sale_id, created_at
                ) VALUES (
                    v_product_id, 'OUT', -v_qty, p_store_id, NULL,
                    'Venta - Factura: ' || COALESCE(v_invoice_number, new_sale_id::text) || 
                    ' - Cliente: ' || COALESCE(p_customer_name, 'Cliente General') ||
                    ' - Sucursal: ' || COALESCE(v_store_name_mov, 'Desconocida') ||
                    ' - Producto: ' || COALESCE(v_product_name, 'N/A') ||
                    CASE WHEN v_product_sku IS NOT NULL THEN ' (' || v_product_sku || ')' ELSE '' END,
                    p_cashier_id, p_company_id, new_sale_id, NOW()
                );
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error pero continuar (NO CRÍTICO - la venta ya se procesó correctamente)
                RAISE WARNING 'Error al registrar movimiento de inventario para producto % (SKU: %): %', 
                    v_product_name, v_product_sku, SQLERRM;
        END;
    END LOOP;

    -- 7. REGISTRAR PAGOS
    IF p_is_mixed_payment AND p_mixed_payments IS NOT NULL AND jsonb_array_length(p_mixed_payments) > 0 THEN
        FOR item IN SELECT * FROM jsonb_array_elements(p_mixed_payments) LOOP
            INSERT INTO sale_payments (
                sale_id, company_id, payment_method, amount, amount_usd, amount_bs
            ) VALUES (
                new_sale_id,
                p_company_id,
                COALESCE(item->>'payment_method', 'cash_usd'),
                COALESCE((item->>'amount_usd')::NUMERIC, 0),
                COALESCE((item->>'amount_usd')::NUMERIC, 0),
                COALESCE((item->>'amount_bs')::NUMERIC, 0)
            );
        END LOOP;
    ELSE
        INSERT INTO sale_payments (
            sale_id, company_id, payment_method, amount, amount_usd, amount_bs
        ) VALUES (
            new_sale_id,
            p_company_id,
            p_payment_method,
            v_total_calculado,
            v_total_calculado,
            v_total_bs_final
        );
    END IF;

    -- 8. MANEJAR FINANCIAMIENTO KRECE
    IF p_krece_enabled THEN
        INSERT INTO krece_financing (
            company_id, sale_id, customer_id, amount_financed, remaining_amount, status
        ) VALUES (
            p_company_id, new_sale_id, p_customer_id,
            COALESCE(p_krece_financed_amount_usd, 0), 
            COALESCE(p_krece_financed_amount_usd, 0), 
            'active'
        );
    END IF;

    -- 9. RETORNAR RESULTADO
    RETURN jsonb_build_object(
        'success', true, 
        'sale_id', new_sale_id, 
        'id', new_sale_id, 
        'data', new_sale_id,
        'invoice_number', v_invoice_number,
        'subtotal', v_subtotal_calculado,
        'total', v_total_calculado,
        'total_bs', v_total_bs_final
    );
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error al procesar la venta: % (Company: %, Store: %, Cashier: %)', 
            SQLERRM, p_company_id, p_store_id, p_cashier_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_sale(
    UUID, UUID, UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, JSONB, TEXT, NUMERIC, 
    BOOLEAN, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, JSONB, NUMERIC,
    NUMERIC, NUMERIC, NUMERIC,
    BOOLEAN, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC
) TO authenticated;

COMMENT ON FUNCTION process_sale IS 
'Función blindada para procesar ventas con BLOQUEO PESIMISTA (Pessimistic Locking).
Implementa SELECT FOR UPDATE para serializar transacciones concurrentes y eliminar race conditions.
Orden determinista de items (product_id ASC) previene deadlocks.
Validación atómica de stock dentro del bloqueo garantiza integridad de datos.
Única fuente de verdad: La tabla inventories es la única que almacena stock (sistema normalizado).
Timeout de bloqueo (4000ms) previene transacciones zombie que bloqueen la tienda.
Todas las operaciones (UPDATE inventario, INSERT sale_items, INSERT movimientos) ocurren dentro de la misma transacción atómica.
Elimina completamente el problema de Split-Brain causado por race conditions en lecturas concurrentes de inventories.';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración de corrección crítica de race condition completada';
    RAISE NOTICE '   - 🔒 TIMEOUT DE BLOQUEO: lock_timeout = 4000ms para prevenir transacciones zombie';
    RAISE NOTICE '   - 🔒 BLOQUEO PESIMISTA: SELECT FOR UPDATE implementado para serializar transacciones';
    RAISE NOTICE '   - 🔒 ORDEN DETERMINISTA: Items ordenados por product_id ASC para prevenir deadlocks';
    RAISE NOTICE '   - ✅ VALIDACIÓN ATÓMICA: Stock validado dentro del bloqueo (elimina race conditions)';
    RAISE NOTICE '   - ✅ ACTUALIZACIÓN ATÓMICA: UPDATE de inventario dentro del bloqueo garantiza integridad';
    RAISE NOTICE '   - ✅ ÚNICA FUENTE DE VERDAD: Solo inventories almacena stock (sistema normalizado)';
    RAISE NOTICE '   - ✅ TRANSACCIÓN ÚNICA: Todas las operaciones (UPDATE, INSERT sale_items, INSERT movimientos) en misma transacción';
    RAISE NOTICE '   - ✅ ELIMINACIÓN DE SPLIT-BRAIN: Elimina race conditions en lecturas concurrentes de inventories';
    RAISE NOTICE '   - ✅ CREACIÓN AUTOMÁTICA: Inventario creado automáticamente si no existe antes del bloqueo';
END $$;
