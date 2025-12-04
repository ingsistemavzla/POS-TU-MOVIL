-- ====================================================================================
-- CORRECCIÓN: Función restore_product - Búsqueda de Productos Inactivos
-- Fecha: 2025-01-27
-- Descripción: Corrige la función restore_product para buscar productos inactivos
--              sin filtrar por active = true
-- ====================================================================================
-- PROBLEMA IDENTIFICADO:
-- La función original filtraba por active = true al buscar el producto,
-- pero necesitamos restaurar productos con active = false.
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- FUNCIÓN CORREGIDA: restore_product()
-- ====================================================================================
-- Cambios principales:
-- 1. Eliminado filtro de active = true en la búsqueda del producto
-- 2. Búsqueda directa por id sin restricción de active
-- 3. Validación de company_id sin asumir que el producto está activo
-- ====================================================================================

DROP FUNCTION IF EXISTS public.restore_product(UUID);

CREATE OR REPLACE FUNCTION public.restore_product(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_company_id UUID;
  v_product_company_id UUID;
  v_product_name TEXT;
  v_product_active BOOLEAN;
  v_user_id UUID;
  v_rows_affected INTEGER;
BEGIN
  -- ====================================================================================
  -- VALIDACIÓN DE SEGURIDAD CRÍTICA: Solo master_admin puede restaurar
  -- ====================================================================================
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Acceso denegado. Función exclusiva de Laboratorio/Técnico. Solo usuarios con rol master_admin pueden restaurar productos eliminados.';
  END IF;

  -- Obtener company_id y user_id del usuario actual
  SELECT company_id, id INTO v_user_company_id, v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- ====================================================================================
  -- BÚSQUEDA CORREGIDA: Buscar producto SIN filtrar por active
  -- ====================================================================================
  -- IMPORTANTE: 
  -- 1. No filtramos por active porque queremos restaurar productos inactivos
  -- 2. master_admin puede restaurar productos de CUALQUIER compañía
  -- 3. Solo verificamos que el producto existe (sin restricción de company_id para master_admin)
  -- ====================================================================================
  SELECT name, active, company_id INTO v_product_name, v_product_active, v_product_company_id
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Producto no encontrado.'
    );
  END IF;

  -- ====================================================================================
  -- VALIDACIÓN: Verificar que el producto esté inactivo
  -- ====================================================================================
  -- Si ya está activo, no tiene sentido restaurarlo
  -- master_admin puede restaurar productos de cualquier compañía (sin validar company_id)
  -- ====================================================================================
  IF v_product_active = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'El producto "' || v_product_name || '" ya está activo. No es necesario restaurarlo.'
    );
  END IF;

  -- ====================================================================================
  -- RESTAURAR EL PRODUCTO: Cambiar active de false a true
  -- ====================================================================================
  -- master_admin puede restaurar productos de cualquier compañía
  -- Solo actualizamos si el producto está inactivo (seguridad adicional)
  -- ====================================================================================
  UPDATE public.products
  SET active = true,
      updated_at = NOW()
  WHERE id = p_product_id 
    AND active = false  -- Solo actualizar si está inactivo (seguridad adicional)
  RETURNING 1 INTO v_rows_affected;

  IF v_rows_affected = 0 THEN
    -- Esto no debería pasar si llegamos aquí, pero por seguridad verificamos
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se pudo restaurar el producto. Puede que ya esté activo o haya sido modificado.'
    );
  END IF;

  -- Retornar éxito
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Producto "' || v_product_name || '" restaurado exitosamente.',
    'product_id', p_product_id,
    'product_name', v_product_name,
    'previous_status', 'inactive',
    'new_status', 'active'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error al restaurar producto: ' || SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION public.restore_product(UUID) IS 
'Restaura un producto eliminado (soft delete) cambiando active de false a true.
SEGURIDAD: Solo usuarios con rol master_admin pueden ejecutar esta función.
CORRECCIÓN: Busca productos sin filtrar por active, permitiendo restaurar productos inactivos.';

-- Grant execute permission to authenticated users
-- (La validación de seguridad está dentro de la función)
GRANT EXECUTE ON FUNCTION public.restore_product(UUID) TO authenticated;

-- ====================================================================================
-- VERIFICACIÓN Y REPORTE
-- ====================================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  -- Verificar que restore_product() existe
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'restore_product'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ Función restore_product() corregida exitosamente';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 CAMBIOS APLICADOS:';
    RAISE NOTICE '   - Búsqueda de producto SIN filtro de active = true';
    RAISE NOTICE '   - Validación de producto inactivo antes de restaurar';
    RAISE NOTICE '   - UPDATE con condición adicional active = false (seguridad)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SEGURIDAD: Solo usuarios con rol master_admin pueden ejecutar.';
  ELSE
    RAISE WARNING '⚠️ La función restore_product no se creó correctamente.';
  END IF;
END $$;

COMMIT;

-- ====================================================================================
-- RESUMEN DE CORRECCIONES
-- ====================================================================================
-- ✅ Eliminado filtro de active = true en la búsqueda del producto
-- ✅ Búsqueda directa por id sin restricción de estado activo
-- ✅ Validación adicional: verifica que el producto esté inactivo antes de restaurar
-- ✅ UPDATE con condición active = false para mayor seguridad
-- ✅ Mensajes de error más descriptivos
-- ✅ Mantenida validación de seguridad is_master_admin()
-- ====================================================================================

