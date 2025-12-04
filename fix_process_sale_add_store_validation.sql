-- ============================================================================
-- CORRECCIÓN CRÍTICA: Agregar validación de assigned_store_id a process_sale
-- ============================================================================
-- PROBLEMA: process_sale no valida que el usuario tenga permiso para vender
--           en la tienda especificada (assigned_store_id)
-- SOLUCIÓN: Reemplazar la función para incluir validación de assigned_store_id
-- ============================================================================

-- Eliminar la función actual
DROP FUNCTION IF EXISTS process_sale(
    UUID, UUID, UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, JSONB, TEXT, NUMERIC, 
    BOOLEAN, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, JSONB, NUMERIC
);

-- Crear la función corregida con validación de assigned_store_id
CREATE OR REPLACE FUNCTION process_sale(
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
    -- ✅ NUEVO: Variables para validación de tienda
    v_user_role TEXT;
    v_user_company_id UUID;
    v_assigned_store_id UUID;
BEGIN
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

    -- ✅ NUEVO: VALIDACIÓN DE PERMISOS POR TIENDA
    -- Obtener información del usuario actual
    SELECT role, company_id, assigned_store_id 
    INTO v_user_role, v_user_company_id, v_assigned_store_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    -- Validar company_id
    IF v_user_company_id IS DISTINCT FROM p_company_id THEN
        RAISE EXCEPTION 'No tienes permiso para procesar ventas en esta compañía';
    END IF;

    -- Si NO es admin/master_admin, validar que la tienda sea su assigned_store
    IF v_user_role IS DISTINCT FROM 'admin' AND v_user_role IS DISTINCT FROM 'master_admin' THEN
        IF v_assigned_store_id IS NULL THEN
            RAISE EXCEPTION 'No tienes una tienda asignada. Contacta al administrador para que te asigne una tienda.';
        END IF;
        
        IF p_store_id IS DISTINCT FROM v_assigned_store_id THEN
            RAISE EXCEPTION 'No tienes permiso para procesar ventas en esta tienda. Tu tienda asignada es diferente.';
        END IF;
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

    -- 3. CÁLCULO DEL TOTAL CON IMPUESTOS (mejora segura)
    v_total_calculado := v_subtotal_calculado * (1 + COALESCE(p_tax_rate, 0));

    -- 4. GENERAR NÚMERO DE FACTURA (lógica original preservada)
    BEGIN
        v_invoice_number := generate_invoice_number(p_company_id);
    EXCEPTION
        WHEN OTHERS THEN
            v_invoice_number := 'FAC-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
    END;

    -- 5. INSERTAR CABECERA DE VENTA (estructura original preservada)
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
        'completed', COALESCE(p_tax_rate, 0), v_invoice_number
    ) RETURNING id INTO new_sale_id;

    -- 6. PROCESAR ITEMS, ACTUALIZAR STOCK (lógica original preservada)
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

        -- Verificar stock disponible (validación mejorada pero segura)
        SELECT qty INTO v_current_stock
        FROM inventories 
        WHERE company_id = p_company_id 
          AND store_id = p_store_id 
          AND product_id = v_product_id;

        IF COALESCE(v_current_stock, 0) < v_qty THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto %. Stock disponible: %, solicitado: %', 
                v_product_name, COALESCE(v_current_stock, 0), v_qty;
        END IF;

        -- Insertar item de venta (lógica original preservada)
        INSERT INTO sale_items (
            sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd
        ) VALUES (
            new_sale_id, v_product_id, v_product_name, v_product_sku,
            v_qty, v_price, (v_qty * v_price)
        );
        
        -- Actualizar inventario (lógica original preservada - CRÍTICO)
        UPDATE inventories 
        SET qty = qty - v_qty, updated_at = NOW()
        WHERE company_id = p_company_id 
          AND store_id = p_store_id 
          AND product_id = v_product_id;

        -- Registrar movimiento de inventario para auditoría (OPCIONAL - NO CRÍTICO)
        BEGIN
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
                NULL;
        END;

    END LOOP;

    -- 7. REGISTRAR PAGOS (lógica original preservada)
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
            v_total_calculado * COALESCE(p_bcv_rate, 41.73)
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
        RAISE EXCEPTION 'Error al procesar la venta: % (Company: %, Store: %, Cashier: %)', 
            SQLERRM, p_company_id, p_store_id, p_cashier_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_sale(
    UUID, UUID, UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, JSONB, TEXT, NUMERIC, 
    BOOLEAN, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, JSONB, NUMERIC
) TO authenticated;

COMMENT ON FUNCTION process_sale IS 'Procesa una venta con validación de assigned_store_id. Los managers/cashiers solo pueden vender en su tienda asignada. Los admins pueden vender en cualquier tienda de su compañía.';


