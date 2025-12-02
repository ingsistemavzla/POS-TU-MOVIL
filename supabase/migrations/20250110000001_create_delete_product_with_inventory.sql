-- Función para eliminar producto y todo su stock asociado
-- Migration: 20250110000001_create_delete_product_with_inventory.sql

CREATE OR REPLACE FUNCTION delete_product_with_inventory(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_rows_affected INTEGER;
BEGIN
    -- 1. Obtener la Company ID del usuario logueado (Seguridad)
    SELECT company_id INTO v_company_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no está vinculado a una compañía.';
    END IF;

    -- 2. Eliminar inventario asociado
    DELETE FROM inventories 
    WHERE product_id = p_product_id AND company_id = v_company_id;

    -- 3. Eliminar producto
    DELETE FROM products 
    WHERE id = p_product_id AND company_id = v_company_id
    RETURNING 1 INTO v_rows_affected;

    IF v_rows_affected = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Producto no encontrado o permisos insuficientes.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Producto y su inventario eliminados exitosamente.');
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error eliminando producto: %', SQLERRM;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION delete_product_with_inventory(UUID) IS 'Elimina un producto y todo su inventario asociado de forma atómica. Requiere que el usuario esté vinculado a una compañía.';



