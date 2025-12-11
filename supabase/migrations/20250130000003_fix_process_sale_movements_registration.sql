-- ============================================================================
-- Migration: Corregir Registro de Movimientos de Inventario en process_sale
-- Fecha: 2025-01-30
-- Descripción: 
--   Corregir el bloque de registro de movimientos de inventario en process_sale
--   para asegurar que las ventas se registren correctamente con información
--   completa de sucursal y que los errores se logueen para debugging
-- ============================================================================

-- Esta migración actualiza el bloque de registro de movimientos en process_sale
-- Reemplazando el bloque que va desde "6.5. QUINTO PASO" hasta el final del BEGIN/EXCEPTION

-- Nota: Debido a que PostgreSQL no permite modificar partes específicas de una función,
-- necesitamos recrear la función completa. Sin embargo, para evitar romper la función
-- si hay algún error, primero verificamos que existe y luego la recreamos.

-- Paso 1: Verificar que la función existe
DO $$
DECLARE
    v_function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'process_sale' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) INTO v_function_exists;

    IF NOT v_function_exists THEN
        RAISE EXCEPTION 'La función process_sale no existe. Debe ejecutarse primero la migración 20250128000001_optimize_process_sale_batch_update.sql';
    END IF;
    
    RAISE NOTICE 'Función process_sale encontrada. Procediendo a actualizar el bloque de registro de movimientos.';
END $$;

-- Paso 2: Crear función auxiliar para obtener información de sucursal
CREATE OR REPLACE FUNCTION get_store_name_for_movement(p_store_id UUID, p_company_id UUID)
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

-- Paso 3: Crear función auxiliar para obtener información de producto
CREATE OR REPLACE FUNCTION get_product_info_for_movement(p_product_id UUID, p_company_id UUID)
RETURNS TABLE(product_name TEXT, product_sku TEXT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.name, 'Producto Desconocido'),
        COALESCE(p.sku, 'N/A')
    FROM public.products p
    WHERE p.id = p_product_id AND p.company_id = p_company_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'Producto Desconocido'::TEXT, 'N/A'::TEXT;
    END IF;
END;
$$;

-- Nota importante: La actualización completa de process_sale se hará en una migración separada
-- que leerá el archivo completo y reemplazará solo el bloque de registro de movimientos.
-- Por ahora, esta migración prepara las funciones auxiliares necesarias.

COMMENT ON FUNCTION get_store_name_for_movement(UUID, UUID) IS 
'Función auxiliar para obtener el nombre de una sucursal para usar en mensajes de auditoría de movimientos de inventario.';

COMMENT ON FUNCTION get_product_info_for_movement(UUID, UUID) IS 
'Función auxiliar para obtener el nombre y SKU de un producto para usar en mensajes de auditoría de movimientos de inventario.';

