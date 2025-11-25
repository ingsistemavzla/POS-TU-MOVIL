-- Create function to delete a sale and restore inventory
-- Migration: 20250102000003_create_delete_sale_function.sql

-- Create function to delete a sale and restore inventory
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
    v_deleted_items JSONB := '[]'::jsonb;
    v_item JSONB;
BEGIN
    -- Get user's company
    SELECT company_id INTO v_user_company_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_user_company_id IS NULL THEN
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

    -- Get all sale items and restore inventory
    FOR v_sale_item IN 
        SELECT * FROM public.sale_items 
        WHERE sale_id = p_sale_id
    LOOP
        -- Restore inventory quantity
        UPDATE public.inventories 
        SET qty = qty + v_sale_item.qty,
            updated_at = NOW()
        WHERE product_id = v_sale_item.product_id 
        AND store_id = v_store_id
        AND company_id = v_company_id;

        -- Add item to deleted items list
        v_item := jsonb_build_object(
            'product_id', v_sale_item.product_id,
            'product_name', v_sale_item.product_name,
            'qty_restored', v_sale_item.qty,
            'price_usd', v_sale_item.price_usd
        );
        v_deleted_items := v_deleted_items || v_item;
    END LOOP;

    -- Delete sale items first (due to foreign key constraint)
    DELETE FROM public.sale_items 
    WHERE sale_id = p_sale_id;

    -- Delete the sale
    DELETE FROM public.sales 
    WHERE id = p_sale_id;

    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Venta eliminada exitosamente e inventario restaurado',
        'sale_id', p_sale_id,
        'invoice_number', v_sale_record.invoice_number,
        'total_usd', v_sale_record.total_usd,
        'total_bs', v_sale_record.total_bs,
        'deleted_items', v_deleted_items,
        'items_count', jsonb_array_length(v_deleted_items)
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

-- Add comment to the function
COMMENT ON FUNCTION delete_sale_and_restore_inventory(UUID) IS 'Elimina una venta y restaura el inventario de todos los productos vendidos';
