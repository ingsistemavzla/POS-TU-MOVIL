-- ====================================================================================
-- SCRIPT DE SEGURIDAD: Funcionalidad de Restauración Exclusiva para Master Admin
-- Fecha: 2025-01-27
-- Descripción: Implementa funciones de seguridad para restaurar productos eliminados
--              EXCLUSIVAMENTE para el rol 'master_admin' (Laboratorio/Técnico)
-- ====================================================================================
-- REGLA DE ORO: El rol 'admin' (Comercial) NO DEBE tener acceso a estas funciones
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- PASO 1: CREAR HELPER DE SEGURIDAD - is_master_admin()
-- ====================================================================================
-- Función que verifica si el usuario actual tiene rol 'master_admin'
-- Esta función es la base de seguridad para todas las operaciones exclusivas
-- ====================================================================================

DROP FUNCTION IF EXISTS public.is_master_admin();

CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role = 'master_admin'
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.is_master_admin() IS 
'Verifica si el usuario actual tiene rol master_admin (Laboratorio/Técnico).
EXCLUSIVO: Solo retorna true para master_admin, NO para admin comercial.';

-- ====================================================================================
-- PASO 2: CREAR RPC DE RESTAURACIÓN - restore_product()
-- ====================================================================================
-- Función que restaura un producto eliminado (soft delete: active = false -> true)
-- SEGURIDAD: Validación estricta al inicio - solo master_admin puede ejecutar
-- ====================================================================================

DROP FUNCTION IF EXISTS public.restore_product(UUID);

CREATE OR REPLACE FUNCTION public.restore_product(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_product_name TEXT;
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
  SELECT company_id, id INTO v_company_id, v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no está vinculado a una compañía.';
  END IF;

  -- Verificar que el producto existe y pertenece a la compañía del usuario
  -- (Aunque master_admin puede ver todas las compañías, validamos por seguridad)
  SELECT name INTO v_product_name
  FROM public.products
  WHERE id = p_product_id 
    AND company_id = v_company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Producto no encontrado o no pertenece a tu compañía.'
    );
  END IF;

  -- Restaurar el producto (cambiar active de false a true)
  UPDATE public.products
  SET active = true,
      updated_at = NOW()
  WHERE id = p_product_id 
    AND company_id = v_company_id
  RETURNING 1 INTO v_rows_affected;

  IF v_rows_affected = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se pudo restaurar el producto. Puede que ya esté activo.'
    );
  END IF;

  -- Retornar éxito
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Producto "' || v_product_name || '" restaurado exitosamente.',
    'product_id', p_product_id,
    'product_name', v_product_name,
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
El rol admin (comercial) NO tiene acceso a esta funcionalidad.';

-- Grant execute permission to authenticated users
-- (La validación de seguridad está dentro de la función)
GRANT EXECUTE ON FUNCTION public.restore_product(UUID) TO authenticated;

-- ====================================================================================
-- PASO 3: VERIFICACIÓN Y REPORTE
-- ====================================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_helper_exists BOOLEAN;
BEGIN
  -- Verificar que is_master_admin() existe
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'is_master_admin'
  ) INTO v_helper_exists;

  -- Verificar que restore_product() existe
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'restore_product'
  ) INTO v_function_exists;

  IF v_helper_exists AND v_function_exists THEN
    RAISE NOTICE '✅ Funciones creadas exitosamente:';
    RAISE NOTICE '   - is_master_admin()';
    RAISE NOTICE '   - restore_product(UUID)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SEGURIDAD: Solo usuarios con rol master_admin pueden restaurar productos.';
    RAISE NOTICE '   El rol admin (comercial) será rechazado con error de acceso denegado.';
  ELSE
    RAISE WARNING '⚠️ Algunas funciones no se crearon correctamente.';
    RAISE WARNING '   is_master_admin: %', v_helper_exists;
    RAISE WARNING '   restore_product: %', v_function_exists;
  END IF;
END $$;

COMMIT;

-- ====================================================================================
-- RESUMEN DE CAMBIOS
-- ====================================================================================
-- ✅ Función is_master_admin(): Helper de seguridad para verificar rol master_admin
-- ✅ Función restore_product(): RPC para restaurar productos eliminados
-- ✅ Validación de seguridad: Solo master_admin puede ejecutar restore_product
-- ✅ Mensaje de error claro: "Acceso denegado. Función exclusiva de Laboratorio/Técnico."
-- 
-- ⚠️ IMPORTANTE: El rol 'admin' (comercial) NO tiene acceso a estas funciones
-- ====================================================================================





