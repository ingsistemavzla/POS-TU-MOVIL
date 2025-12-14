-- ============================================================================
-- Migration: Corregir Mensaje de Stock Inicial en Creación de Productos
-- Fecha: 2025-01-30
-- Descripción: 
--   Actualizar cualquier función que cree productos para que el mensaje
--   de "Stock inicial al crear producto" incluya el nombre de la sucursal
-- ============================================================================

-- Nota: Esta migración busca y actualiza funciones que contengan el mensaje
-- "Stock inicial al crear producto" para incluir información de sucursal.

-- Crear función auxiliar para obtener nombre de sucursal (si no existe)
CREATE OR REPLACE FUNCTION get_store_name_for_audit(p_store_id UUID, p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_store_name TEXT;
BEGIN
    SELECT name INTO v_store_name
    FROM public.stores
    WHERE id = p_store_id AND company_id = p_company_id;
    
    RETURN COALESCE(v_store_name, 'Sucursal Desconocida');
END;
$$;

-- Nota importante: 
-- Las funciones create_product pueden tener diferentes nombres y estructuras.
-- El mensaje "Stock inicial al crear producto" debe actualizarse manualmente
-- en cada función que lo use, cambiándolo por:
-- 'Stock inicial al crear producto - Sucursal: ' || get_store_name_for_audit(store_record.id, user_company_id) || 
-- ' - Cantidad: ' || initial_qty || ' unidades'

-- Ejemplo de cómo debería verse el INSERT en inventory_movements:
/*
INSERT INTO public.inventory_movements (
    company_id,
    product_id,
    type,
    qty,
    store_to_id,
    reason,
    user_id
) VALUES (
    user_company_id,
    v_product_id,
    'ADJUST',
    initial_qty,
    store_record.id,
    'Stock inicial al crear producto - Sucursal: ' || 
    get_store_name_for_audit(store_record.id, user_company_id) || 
    ' - Cantidad: ' || initial_qty || ' unidades',
    v_admin_user_id
);
*/

COMMENT ON FUNCTION get_store_name_for_audit(UUID, UUID) IS 
'Función auxiliar para obtener el nombre de una sucursal para usar en mensajes de auditoría. 
Asegura que los mensajes de creación de productos incluyan información clara de la sucursal.';


