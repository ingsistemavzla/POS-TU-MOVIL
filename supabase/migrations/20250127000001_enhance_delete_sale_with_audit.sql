-- Migration: Enhance delete_sale_and_restore_inventory with full audit trail
-- Fecha: 2025-01-27
-- Descripción: Agrega registro de movimientos de inventario (IN) cuando se elimina una venta
--              y limpia los registros de movimientos (OUT) asociados a la venta eliminada

-- Create enhanced function to delete a sale and restore inventory with full audit trail
CREATE OR REPLACE FUNCTION delete_sale_and_restore_inventory(
    p_sale_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_record RECORD;
    v_sale_item RECORD;
    v_company_id UUID;
    v_store_id UUID;
    v_user_company_id UUID;
    v_user_id UUID;
    v_deleted_items JSONB := '[]'::jsonb;
    v_item JSONB;
    v_movements_created INTEGER := 0;
    v_movements_deleted INTEGER := 0;
BEGIN
    -- Get user's company and user ID
    SELECT company_id, id INTO v_user_company_id, v_user_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_user_company_id IS NULL OR v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuario no encontrado o no asociado a una empresa'
        );
    END IF;

    -- Check if user is admin or manager
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND company_id = v_user_company_id 
        AND role IN ('admin', 'manager')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permisos insuficientes. Solo administradores y gerentes pueden eliminar ventas'
        );
    END IF;

    -- Get sale information
    SELECT * INTO v_sale_record
    FROM public.sales
    WHERE id = p_sale_id 
    AND company_id = v_user_company_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Venta no encontrada o no pertenece a tu empresa'
        );
    END IF;

    -- Check if sale is completed (only allow deletion of completed sales)
    IF v_sale_record.status != 'completed' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Solo se pueden eliminar ventas completadas'
        );
    END IF;

    v_company_id := v_sale_record.company_id;
    v_store_id := v_sale_record.store_id;

    -- PASO 1: Eliminar registros de inventory_movements asociados a esta venta (OUT)
    -- Esto limpia los registros de salida originales antes de crear los de entrada
    DELETE FROM public.inventory_movements 
    WHERE sale_id = p_sale_id;
    
    GET DIAGNOSTICS v_movements_deleted = ROW_COUNT;

    -- PASO 2: Get all sale items, restore inventory, and create audit trail
    FOR v_sale_item IN 
        SELECT * FROM public.sale_items 
        WHERE sale_id = p_sale_id
    LOOP
        -- 2.1. Restore inventory quantity
        UPDATE public.inventories 
        SET qty = qty + v_sale_item.qty,
            updated_at = NOW()
        WHERE product_id = v_sale_item.product_id 
        AND store_id = v_store_id
        AND company_id = v_company_id;

        -- 2.2. Register inventory movement for restoration (AUDIT TRAIL)
        -- Intentar insertar en inventory_movements, pero no fallar si la tabla no tiene sale_id
        BEGIN
            INSERT INTO public.inventory_movements (
                product_id,
                store_from_id,
                qty,
                type,
                reason,
                user_id,
                company_id,
                created_at
            )
            VALUES (
                v_sale_item.product_id,
                v_store_id,
                v_sale_item.qty,
                'IN',
                'Restitución por cancelación de venta - Factura: ' || COALESCE(v_sale_record.invoice_number, v_sale_record.id::text) || 
                ' - Cliente: ' || COALESCE(v_sale_record.customer_id::text, 'Cliente General'),
                v_user_id,
                v_company_id,
                NOW()
            );
            v_movements_created := v_movements_created + 1;
        EXCEPTION
            WHEN OTHERS THEN
                -- Si falla la inserción de movimiento (ej: columna sale_id no existe), continuar
                -- La restitución de stock ya se hizo, esto es solo para auditoría
                -- No fallar la función completa por un problema de auditoría
                NULL;
        END;

        -- 2.3. Add item to deleted items list
        v_item := jsonb_build_object(
            'product_id', v_sale_item.product_id,
            'product_name', v_sale_item.product_name,
            'qty_restored', v_sale_item.qty,
            'price_usd', v_sale_item.price_usd
        );
        v_deleted_items := v_deleted_items || v_item;
    END LOOP;

    -- PASO 3: Delete sale items first (due to foreign key constraint)
    DELETE FROM public.sale_items 
    WHERE sale_id = p_sale_id;

    -- PASO 4: Delete the sale
    DELETE FROM public.sales 
    WHERE id = p_sale_id;

    -- Return success response with audit information
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Venta eliminada exitosamente e inventario restaurado',
        'sale_id', p_sale_id,
        'invoice_number', v_sale_record.invoice_number,
        'total_usd', v_sale_record.total_usd,
        'total_bs', v_sale_record.total_bs,
        'deleted_items', v_deleted_items,
        'items_count', jsonb_array_length(v_deleted_items),
        'audit', jsonb_build_object(
            'movements_created', v_movements_created,
            'movements_deleted', v_movements_deleted
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Error al eliminar la venta: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_sale_and_restore_inventory(UUID) TO authenticated;

-- Update comment to reflect audit trail functionality
COMMENT ON FUNCTION delete_sale_and_restore_inventory(UUID) IS 'Elimina una venta y restaura el inventario de todos los productos vendidos. Registra movimientos de inventario (IN) para auditoría completa y elimina los movimientos (OUT) asociados a la venta.';





