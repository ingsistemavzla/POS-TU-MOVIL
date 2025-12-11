-- ============================================================================
-- Migration: Eliminar cálculo de IVA/Impuesto (tax_rate = 0 siempre)
-- Fecha: 2025-01-25
-- Descripción: Elimina el cálculo de IVA de process_sale, estableciendo
--              tax_rate = 0 siempre. PRESERVA la lógica blindada de stock
--              (qty >= v_qty) de la migración anterior.
-- ============================================================================

-- PASO 1: Eliminar TODAS las versiones existentes de process_sale de forma segura
-- Esto asegura que la nueva versión sea la única activa
DO $$ 
DECLARE
    r RECORD;
    func_signature TEXT;
BEGIN
    -- Buscar todas las funciones process_sale en el esquema public
    FOR r IN 
        SELECT 
            oid, 
            proname, 
            pg_get_function_identity_arguments(oid) as args,
            pg_get_function_result(oid) as returns
        FROM pg_proc 
        WHERE proname = 'process_sale'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        -- Construir la firma completa de la función
        func_signature := 'public.process_sale(' || r.args || ')';
        
        -- Eliminar la función específica
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || func_signature || ' CASCADE';
            RAISE NOTICE 'Eliminada función: %', func_signature;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'No se pudo eliminar función %: %', func_signature, SQLERRM;
        END;
    END LOOP;
END $$;

-- PASO 2: Crear la función sin cálculo de IVA (tax_rate = 0 siempre)
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
    p_subtotal_usd NUMERIC DEFAULT 0
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
    v_new_stock NUMERIC;
BEGIN
    -- ✅ ELIMINACIÓN DE IVA: Anular cualquier parámetro de tax_rate que envíe el frontend
    p_tax_rate := 0;

    -- 1. VALIDACIONES INICIALES (preservadas de la función original)
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

    -- 2. CÁLCULO SEGURO DEL SUBTOTAL (lógica original preservada)
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id := (item->>'product_id')::UUID;
        v_price := COALESCE((item->>'price_usd')::NUMERIC, 0);
        v_qty := COALESCE((item->>'qty')::NUMERIC, 1);
        
        -- Validaciones de datos del item
        IF v_product_id IS NULL THEN
            RAISE EXCEPTION 'Todos los items deben tener product_id';
        END IF;
        
        IF v_qty <= 0 THEN 
            v_qty := 1; 
        END IF;
        
        IF v_price < 0 THEN
            RAISE EXCEPTION 'El precio no puede ser negativo para el producto %', v_product_id;
        END IF;
        
        v_subtotal_calculado := v_subtotal_calculado + (v_qty * v_price);
    END LOOP;
    
    -- Respaldo de subtotal si el cálculo falló (lógica original)
    IF v_subtotal_calculado <= 0 THEN
        v_subtotal_calculado := COALESCE(p_subtotal_usd, 0);
    END IF;

    -- ✅ ELIMINACIÓN DE IVA: Total = Subtotal (sin impuestos)
    v_total_calculado := v_subtotal_calculado;

    -- 4. GENERAR NÚMERO DE FACTURA (lógica original preservada)
    BEGIN
        v_invoice_number := generate_invoice_number(p_company_id);
    EXCEPTION
        WHEN OTHERS THEN
            v_invoice_number := 'FAC-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
    END;

    -- 5. INSERTAR CABECERA DE VENTA (estructura original preservada)
    -- ✅ ELIMINACIÓN DE IVA: tax_rate siempre se guarda como 0
    INSERT INTO sales (
        company_id, store_id, cashier_id, customer_id, customer_name, 
        customer_id_number, bcv_rate_used, is_mixed_payment,
        subtotal_usd, total_usd, payment_method, notes, krece_enabled, 
        krece_initial_amount_usd, krece_financed_amount_usd, status, tax_rate, invoice_number
    ) VALUES (
        p_company_id, p_store_id, p_cashier_id, p_customer_id, p_customer_name, 
        p_customer_id_number, COALESCE(p_bcv_rate, 0), COALESCE(p_is_mixed_payment, false),
        v_subtotal_calculado, v_total_calculado, p_payment_method, p_notes, p_krece_enabled, 
        COALESCE(p_krece_initial_amount_usd, 0), COALESCE(p_krece_financed_amount_usd, 0), 
        'completed', 0, v_invoice_number  -- ✅ tax_rate siempre 0
    ) RETURNING id INTO new_sale_id;

    -- 6. PROCESAR ITEMS, ACTUALIZAR STOCK (LÓGICA BLINDADA EN 3 PASOS - PRESERVADA INTACTA)
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id := (item->>'product_id')::UUID;
        v_qty := COALESCE((item->>'qty')::NUMERIC, 1);
        IF v_qty <= 0 THEN v_qty := 1; END IF;

        -- Obtener datos actualizados del producto (lógica original)
        SELECT name, sku, sale_price_usd 
        INTO v_product_name_db, v_product_sku_db, v_sale_price_usd
        FROM products 
        WHERE id = v_product_id;

        -- Si no encuentra el producto, usar valores del item como respaldo (lógica original)
        IF FOUND THEN
            v_product_name := COALESCE(v_product_name_db, item->>'product_name', 'Producto No Encontrado');
            v_product_sku := COALESCE(v_product_sku_db, item->>'product_sku', 'N/A');
            v_price := COALESCE(v_sale_price_usd, (item->>'price_usd')::NUMERIC, 0);
        ELSE
            v_product_name := COALESCE(item->>'product_name', 'Producto No Encontrado');
            v_product_sku := COALESCE(item->>'product_sku', 'N/A');
            v_price := COALESCE((item->>'price_usd')::NUMERIC, 0);
        END IF;

        -- ========================================================================
        -- PASO 1: Validación Previa (Lectura Sucia para UX rápida)
        -- ========================================================================
        -- Esto es solo para dar un error rápido si es obvio que no hay stock,
        -- pero la validación REAL ocurre en el UPDATE (Paso 2).
        SELECT qty INTO v_current_stock
        FROM inventories 
        WHERE company_id = p_company_id 
          AND store_id = p_store_id 
          AND product_id = v_product_id;

        IF COALESCE(v_current_stock, 0) < v_qty THEN
            RAISE EXCEPTION 'Stock insuficiente (Validación Previa) para el producto %. Stock disponible: %, solicitado: %', 
                v_product_name, COALESCE(v_current_stock, 0), v_qty;
        END IF;

        -- Insertar item de venta (lógica original preservada)
        INSERT INTO sale_items (
            sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd
        ) VALUES (
            new_sale_id, v_product_id, v_product_name, v_product_sku,
            v_qty, v_price, (v_qty * v_price)
        );
        
        -- ========================================================================
        -- PASO 2: Ejecución Atómica y Bloqueante (El corazón del blindaje)
        -- ========================================================================
        -- ✅ PRESERVADO INTACTO: La validación qty >= v_qty se mantiene sin cambios
        -- Al poner la condición en el WHERE, Postgres bloquea la fila y asegura consistencia.
        -- CLAVE: qty >= v_qty permite llegar a 0 exacto, pero evita negativos.
        UPDATE inventories
        SET
            qty = qty - v_qty,
            updated_at = NOW()
        WHERE
            company_id = p_company_id
            AND store_id = p_store_id
            AND product_id = v_product_id
            AND qty >= v_qty; -- ✅ PRESERVADO: Mayor o IGUAL. Permite llegar a 0. Evita negativos.

        -- ========================================================================
        -- PASO 3: Verificación de Integridad Post-Update
        -- ========================================================================
        -- Si el UPDATE no afectó ninguna fila, significa que entre el paso 1 y el 2
        -- alguien más se llevó el stock (Concurrency Check).
        IF NOT FOUND THEN
            -- Obtener el stock actual para el mensaje de error
            SELECT qty INTO v_current_stock
            FROM inventories
            WHERE company_id = p_company_id 
              AND store_id = p_store_id 
              AND product_id = v_product_id;
            
            RAISE EXCEPTION 'Error de Concurrencia: El stock cambió mientras se procesaba la venta. Stock actual: %, solicitado: %. Intente de nuevo.', 
                COALESCE(v_current_stock, 0), v_qty;
        END IF;

        -- ========================================================================
        -- PASO 4: Retorno de Datos (Opcional - para confirmación)
        -- ========================================================================
        -- Obtener el nuevo stock para confirmar al frontend que todo está sincronizado
        SELECT qty INTO v_new_stock
        FROM inventories
        WHERE company_id = p_company_id 
          AND store_id = p_store_id 
          AND product_id = v_product_id;
        
        -- Verificar que el stock no es negativo (doble verificación de seguridad)
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Error crítico de integridad: El stock quedó negativo después de la actualización. Producto: %, Stock resultante: %', 
                v_product_name, v_new_stock;
        END IF;

        -- ✅ NUEVO: Registrar movimiento de inventario para auditoría (OPCIONAL - NO CRÍTICO)
        -- Si esta inserción falla, la venta continúa normalmente
        -- Esto es solo para el panel de auditoría del master admin
        BEGIN
            -- Verificar que la tabla inventory_movements existe antes de insertar
            IF EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_schema = 'public' 
                      AND table_name = 'inventory_movements') THEN
                INSERT INTO public.inventory_movements (
                    product_id, type, qty, store_from_id, store_to_id, reason,
                    user_id, company_id, sale_id, created_at
                ) VALUES (
                    v_product_id, 'OUT', -v_qty, p_store_id, NULL,
                    'Venta - Factura: ' || COALESCE(v_invoice_number, new_sale_id::text) || 
                    ' - Cliente: ' || COALESCE(p_customer_name, 'Cliente General'),
                    p_cashier_id, p_company_id, new_sale_id, NOW()
                );
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Si falla la inserción de movimiento, continuar (NO CRÍTICO)
                NULL;
        END;

    END LOOP;

    -- 7. REGISTRAR PAGOS (lógica original preservada)
    -- 7.1. PAGOS MIXTOS
    IF p_is_mixed_payment AND p_mixed_payments IS NOT NULL AND jsonb_array_length(p_mixed_payments) > 0 THEN
        FOR item IN SELECT * FROM jsonb_array_elements(p_mixed_payments) LOOP
            INSERT INTO sale_payments (
                sale_id, company_id, payment_method, amount, amount_usd, amount_bs
            ) VALUES (
                new_sale_id,
                p_company_id,
                COALESCE(item->>'payment_method', 'cash_usd'),
                COALESCE((item->>'amount_usd')::NUMERIC, 0), -- amount (columna original)
                COALESCE((item->>'amount_usd')::NUMERIC, 0), -- amount_usd
                COALESCE((item->>'amount_bs')::NUMERIC, 0)   -- amount_bs
            );
        END LOOP;
    -- 7.2. PAGO ÚNICO
    ELSE
        INSERT INTO sale_payments (
            sale_id, company_id, payment_method, amount, amount_usd, amount_bs
        ) VALUES (
            new_sale_id,
            p_company_id,
            p_payment_method,
            v_total_calculado, -- amount (columna original)
            v_total_calculado, -- amount_usd
            v_total_calculado * COALESCE(p_bcv_rate, 41.73) -- amount_bs
        );
    END IF;

    -- 8. MANEJAR FINANCIAMIENTO KRECE (lógica original preservada)
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

    -- 9. RETORNAR RESULTADO (estructura original preservada + mejoras opcionales)
    RETURN jsonb_build_object(
        'success', true, 
        'sale_id', new_sale_id, 
        'id', new_sale_id, 
        'data', new_sale_id,
        'invoice_number', v_invoice_number,
        'subtotal', v_subtotal_calculado,
        'total', v_total_calculado
    );
    
EXCEPTION 
    WHEN OTHERS THEN
        -- Log detallado del error (mejora segura)
        RAISE EXCEPTION 'Error al procesar la venta: % (Company: %, Store: %, Cashier: %)', 
            SQLERRM, p_company_id, p_store_id, p_cashier_id;
END;
$$;

-- Grant execute permission (preservado)
GRANT EXECUTE ON FUNCTION process_sale(
    UUID, UUID, UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, JSONB, TEXT, NUMERIC, 
    BOOLEAN, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, JSONB, NUMERIC
) TO authenticated;

COMMENT ON FUNCTION process_sale IS 'Procesa una venta sin cálculo de IVA (tax_rate = 0 siempre). Preserva la validación blindada de stock en 3 pasos que permite ventas hasta stock = 0. Validación atómica con qty >= v_qty en UPDATE para prevenir race conditions y garantizar que el stock nunca sea negativo.';



