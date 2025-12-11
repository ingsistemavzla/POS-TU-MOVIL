-- ============================================================================
-- Migration: Persistencia Financiera Dual (USD y Bolívares) - Zero Downtime
-- Fecha: 2025-01-26
-- Descripción: Corrige la persistencia de montos en Bolívares usando el
--              principio "Lo que el cajero ve es la VERDAD INMUTABLE".
--              Agrega columnas y parámetros para financiamiento dual manteniendo
--              compatibilidad con frontend viejo (DEFAULT NULL).
-- ============================================================================

-- ============================================================================
-- FASE A: CAMBIOS DE SCHEMA (Zero Downtime)
-- ============================================================================

-- 1. Permitir NULL en total_bs para evitar bloqueos durante migración
--    (Las ventas existentes mantienen su valor, nuevas pueden ser NULL temporalmente)
ALTER TABLE public.sales 
ALTER COLUMN total_bs DROP NOT NULL;

-- 2. Agregar columnas de financiamiento en Bolívares (NULLABLE para compatibilidad)
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS krece_initial_amount_bs NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS krece_financed_amount_bs NUMERIC(15,2);

-- Comentarios de documentación
COMMENT ON COLUMN public.sales.krece_initial_amount_bs IS 
'Inicial de financiamiento en Bolívares (valor exacto visto por el cajero). Si NULL, se calcula usando krece_initial_amount_usd * bcv_rate_used.';

COMMENT ON COLUMN public.sales.krece_financed_amount_bs IS 
'Monto financiado en Bolívares (valor exacto visto por el cajero). Si NULL, se calcula usando krece_financed_amount_usd * bcv_rate_used.';

-- ============================================================================
-- FASE B: ACTUALIZACIÓN DE RPC (process_sale)
-- ============================================================================

-- Eliminar versiones anteriores de forma segura
DO $$ 
DECLARE
    r RECORD;
    func_signature TEXT;
BEGIN
    FOR r IN 
        SELECT 
            oid, 
            proname, 
            pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE proname = 'process_sale'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        func_signature := 'public.process_sale(' || r.args || ')';
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || func_signature || ' CASCADE';
            RAISE NOTICE 'Eliminada función: %', func_signature;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'No se pudo eliminar función %: %', func_signature, SQLERRM;
        END;
    END LOOP;
END $$;

-- Crear función actualizada con persistencia financiera dual
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
    -- ✅ NUEVOS PARÁMETROS: Montos en Bolívares (DEFAULT NULL para compatibilidad)
    p_total_bs NUMERIC DEFAULT NULL,
    p_krece_initial_amount_bs NUMERIC DEFAULT NULL,
    p_krece_financed_amount_bs NUMERIC DEFAULT NULL
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
    -- ✅ NUEVAS VARIABLES: Valores finales en Bolívares
    v_total_bs_final NUMERIC;
    v_krece_initial_bs_final NUMERIC;
    v_krece_financed_bs_final NUMERIC;
BEGIN
    -- ✅ ELIMINACIÓN DE IVA: Anular cualquier parámetro de tax_rate que envíe el frontend
    p_tax_rate := 0;

    -- ========================================================================
    -- VALIDACIÓN DE INTEGRIDAD FINANCIERA (NUEVA)
    -- ========================================================================
    -- Prevenir montos negativos en Bolívares (seguridad crítica)
    IF (p_total_bs IS NOT NULL AND p_total_bs < 0) OR 
       (p_krece_initial_amount_bs IS NOT NULL AND p_krece_initial_amount_bs < 0) OR
       (p_krece_financed_amount_bs IS NOT NULL AND p_krece_financed_amount_bs < 0) THEN
        RAISE EXCEPTION 'Error de Integridad: Los montos financieros en Bolívares no pueden ser negativos.';
    END IF;

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

    -- ========================================================================
    -- CÁLCULO DE VALORES EN BOLÍVARES (COALESCE CORREGIDO)
    -- ========================================================================
    -- ✅ REGLA DE ORO: Usar v_total_calculado (fuente de verdad) en lugar de parámetros
    -- Si el frontend envía el valor, usarlo. Si no, calcular usando la variable interna.
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

    -- 4. GENERAR NÚMERO DE FACTURA (lógica original preservada)
    BEGIN
        v_invoice_number := generate_invoice_number(p_company_id);
    EXCEPTION
        WHEN OTHERS THEN
            v_invoice_number := 'FAC-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
    END;

    -- 5. INSERTAR CABECERA DE VENTA (✅ CORREGIDO: Incluye total_bs y montos de financiamiento)
    -- ✅ ELIMINACIÓN DE IVA: tax_rate siempre se guarda como 0
    INSERT INTO sales (
        company_id, store_id, cashier_id, customer_id, customer_name, 
        customer_id_number, bcv_rate_used, is_mixed_payment,
        subtotal_usd, total_usd, total_bs, payment_method, notes, krece_enabled, 
        krece_initial_amount_usd, krece_financed_amount_usd,
        krece_initial_amount_bs, krece_financed_amount_bs,
        status, tax_rate, invoice_number
    ) VALUES (
        p_company_id, p_store_id, p_cashier_id, p_customer_id, p_customer_name, 
        p_customer_id_number, COALESCE(p_bcv_rate, 0), COALESCE(p_is_mixed_payment, false),
        v_subtotal_calculado, v_total_calculado, v_total_bs_final, 
        p_payment_method, p_notes, p_krece_enabled, 
        COALESCE(p_krece_initial_amount_usd, 0), COALESCE(p_krece_financed_amount_usd, 0),
        v_krece_initial_bs_final, v_krece_financed_bs_final,
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
        IF NOT FOUND THEN
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
        SELECT qty INTO v_new_stock
        FROM inventories
        WHERE company_id = p_company_id 
          AND store_id = p_store_id 
          AND product_id = v_product_id;
        
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Error crítico de integridad: El stock quedó negativo después de la actualización. Producto: %, Stock resultante: %', 
                v_product_name, v_new_stock;
        END IF;

        -- ✅ NUEVO: Registrar movimiento de inventario para auditoría (OPCIONAL - NO CRÍTICO)
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
                NULL; -- Si falla, continuar (NO CRÍTICO)
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
                COALESCE((item->>'amount_usd')::NUMERIC, 0),
                COALESCE((item->>'amount_usd')::NUMERIC, 0),
                COALESCE((item->>'amount_bs')::NUMERIC, 0)
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
            v_total_calculado,
            v_total_calculado,
            v_total_bs_final  -- ✅ Usar valor final calculado
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
        'total', v_total_calculado,
        'total_bs', v_total_bs_final  -- ✅ NUEVO: Incluir total_bs en respuesta
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
    NUMERIC, NUMERIC, NUMERIC  -- ✅ Nuevos parámetros
) TO authenticated;

COMMENT ON FUNCTION process_sale IS 
'Procesa una venta con persistencia financiera dual (USD y Bolívares). 
Principio de Integridad: "Lo que el cajero ve es la VERDAD INMUTABLE".
- Si el frontend envía montos en BS, se guardan tal cual.
- Si no los envía (frontend viejo), se calculan usando v_total_calculado * bcv_rate.
- Preserva validación blindada de stock (qty >= v_qty) que permite ventas hasta stock = 0.
- Validación atómica para prevenir race conditions y garantizar stock nunca negativo.';

-- ============================================================================
-- FASE C: ACTUALIZAR VENTAS EXISTENTES (OPCIONAL - Backfill)
-- ============================================================================
-- Nota: Esto es opcional. Las ventas existentes mantendrán total_bs = NULL
-- o su valor anterior. Si se desea backfill, ejecutar este bloque:

/*
-- Backfill: Calcular total_bs para ventas que lo tengan NULL
UPDATE public.sales
SET total_bs = total_usd * bcv_rate_used
WHERE total_bs IS NULL
AND bcv_rate_used IS NOT NULL
AND bcv_rate_used > 0;

-- Backfill: Calcular montos de financiamiento en BS
UPDATE public.sales
SET 
    krece_initial_amount_bs = krece_initial_amount_usd * bcv_rate_used,
    krece_financed_amount_bs = krece_financed_amount_usd * bcv_rate_used
WHERE (krece_initial_amount_bs IS NULL OR krece_financed_amount_bs IS NULL)
AND krece_enabled = true
AND bcv_rate_used IS NOT NULL
AND bcv_rate_used > 0
AND (krece_initial_amount_usd > 0 OR krece_financed_amount_usd > 0);
*/

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '   - Columnas agregadas: krece_initial_amount_bs, krece_financed_amount_bs';
    RAISE NOTICE '   - total_bs ahora permite NULL (compatibilidad con frontend viejo)';
    RAISE NOTICE '   - Función process_sale actualizada con 3 nuevos parámetros (DEFAULT NULL)';
    RAISE NOTICE '   - Validación de integridad financiera implementada';
    RAISE NOTICE '   - COALESCE usa v_total_calculado (fuente de verdad)';
END $$;



