-- ====================================================================================
-- CORRECCIÓN COMPLETA: Restauración de Productos para master_admin
-- Fecha: 2025-01-27
-- Descripción: Script combinado que corrige tanto las políticas RLS como la función
--              restore_product para permitir que master_admin restaure productos
--              inactivos de cualquier compañía
-- ====================================================================================
-- PROBLEMA IDENTIFICADO:
-- 1. Políticas RLS bloquean acceso a productos inactivos
-- 2. Función restore_product filtra por company_id, impidiendo restaurar productos de otras compañías
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- PASO 1: Crear/Verificar función helper is_master_admin()
-- ====================================================================================

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

-- ====================================================================================
-- PASO 2: Corregir Políticas RLS para products
-- ====================================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "Users can view products from their company" ON public.products;
DROP POLICY IF EXISTS "master_admin_products_select_policy" ON public.products;
DROP POLICY IF EXISTS "products_update_policy" ON public.products;
DROP POLICY IF EXISTS "Managers and admins can update products" ON public.products;
DROP POLICY IF EXISTS "master_admin_products_update_policy" ON public.products;

-- Política SELECT para master_admin (ACCESO TOTAL - ve todos los productos, activos e inactivos)
CREATE POLICY "master_admin_products_select_policy" ON public.products
  FOR SELECT 
  USING (public.is_master_admin() = true);

-- Política SELECT para usuarios normales (RESTRICCIÓN POR COMPANY_ID)
CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT 
  USING (
    NOT public.is_master_admin()
    AND company_id = public.get_user_company_id()
  );

-- Política UPDATE para master_admin (puede actualizar cualquier producto)
CREATE POLICY "master_admin_products_update_policy" ON public.products
  FOR UPDATE
  USING (public.is_master_admin() = true);

-- Política UPDATE para usuarios normales
CREATE POLICY "products_update_policy" ON public.products
  FOR UPDATE
  USING (
    NOT public.is_master_admin()
    AND company_id = public.get_user_company_id()
    AND public.is_admin()
  );

-- ====================================================================================
-- PASO 3: Corregir Función restore_product()
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

  -- Obtener información del usuario actual (opcional, solo para logging)
  SELECT company_id, id INTO v_user_company_id, v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- ====================================================================================
  -- BÚSQUEDA FORENSE: Buscar producto SIN filtrar por active NI company_id
  -- ====================================================================================
  -- IMPORTANTE: 
  -- - master_admin puede restaurar productos de CUALQUIER compañía
  -- - Buscamos solo por id, sin restricción de company_id
  -- - NO filtramos por active para encontrar productos inactivos
  -- ====================================================================================
  SELECT name, active, company_id 
  INTO v_product_name, v_product_active, v_product_company_id
  FROM public.products
  WHERE id = p_product_id;
  -- ⚠️ CRÍTICO: NO filtramos por company_id ni active aquí
  -- master_admin puede restaurar productos de cualquier compañía

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Producto no encontrado.'
    );
  END IF;

  -- ====================================================================================
  -- VALIDACIÓN: Verificar que el producto esté inactivo
  -- ====================================================================================
  IF v_product_active = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'El producto "' || v_product_name || '" ya está activo. No es necesario restaurarlo.'
    );
  END IF;

  -- ====================================================================================
  -- RESTAURACIÓN: SOLO actualizar products.active
  -- ====================================================================================
  -- PRINCIPIO DE NO-INTERVENCIÓN DE STOCK (Crítico):
  -- - Esta función SOLO tiene permiso para hacer UPDATE en la tabla products
  -- - PROHIBIDO tocar la tabla inventories
  -- - Racional: Al volver a poner active = true, las vistas y reportes volverán a
  --   "ver" y sumar automáticamente las cantidades que ya existen en inventories
  --   para cada sucursal. No hay que sumar, restar ni resetear nada.
  -- ====================================================================================
  -- Restores product visibility. Does NOT modify inventory counts to preserve historical data.
  -- ====================================================================================
  -- master_admin puede restaurar productos de CUALQUIER compañía
  -- NO filtramos por company_id en el UPDATE
  UPDATE public.products
  SET active = true,
      updated_at = NOW()
  WHERE id = p_product_id 
    AND active = false  -- Solo actualizar si está inactivo (seguridad adicional)
  RETURNING 1 INTO v_rows_affected;

  IF v_rows_affected = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se pudo restaurar el producto. Puede que ya esté activo o haya sido modificado.'
    );
  END IF;

  -- Retornar éxito con confirmación de preservación de inventario
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Producto "' || v_product_name || '" restaurado exitosamente. El inventario histórico se ha preservado intacto.',
    'product_id', p_product_id,
    'product_name', v_product_name,
    'product_company_id', v_product_company_id,
    'previous_status', 'inactive',
    'new_status', 'active',
    'inventory_preserved', true,
    'note', 'Restores product visibility. Does NOT modify inventory counts to preserve historical data.'
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
PRESERVACIÓN DE DATOS HISTÓRICOS: Esta función SOLO actualiza products.active.
NO modifica la tabla inventories. El inventario histórico se preserva automáticamente.
Restores product visibility. Does NOT modify inventory counts to preserve historical data.
master_admin puede restaurar productos de CUALQUIER compañía sin restricción de company_id.';

GRANT EXECUTE ON FUNCTION public.restore_product(UUID) TO authenticated;

-- ====================================================================================
-- VERIFICACIÓN Y REPORTE
-- ====================================================================================

DO $$
DECLARE
  v_master_select_policy BOOLEAN;
  v_normal_select_policy BOOLEAN;
  v_master_update_policy BOOLEAN;
  v_normal_update_policy BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  -- Verificar políticas SELECT
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'products' 
    AND policyname = 'master_admin_products_select_policy'
  ) INTO v_master_select_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'products' 
    AND policyname = 'products_select_policy'
  ) INTO v_normal_select_policy;

  -- Verificar políticas UPDATE
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'products' 
    AND policyname = 'master_admin_products_update_policy'
  ) INTO v_master_update_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'products' 
    AND policyname = 'products_update_policy'
  ) INTO v_normal_update_policy;

  -- Verificar función
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'restore_product'
  ) INTO v_function_exists;

  IF v_master_select_policy AND v_normal_select_policy AND 
     v_master_update_policy AND v_normal_update_policy AND v_function_exists THEN
    RAISE NOTICE '✅ CORRECCIÓN COMPLETA APLICADA EXITOSAMENTE';
    RAISE NOTICE '';
    RAISE NOTICE '📋 POLÍTICAS RLS:';
    RAISE NOTICE '   ✅ master_admin_products_select_policy: master_admin ve TODOS los productos (activos e inactivos)';
    RAISE NOTICE '   ✅ products_select_policy: Usuarios normales ven solo productos de su compañía';
    RAISE NOTICE '   ✅ master_admin_products_update_policy: master_admin puede actualizar cualquier producto';
    RAISE NOTICE '   ✅ products_update_policy: Usuarios normales pueden actualizar solo productos de su compañía';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FUNCIÓN restore_product:';
    RAISE NOTICE '   ✅ Búsqueda sin restricción de company_id (master_admin puede restaurar de cualquier compañía)';
    RAISE NOTICE '   ✅ Búsqueda sin filtro de active (encuentra productos inactivos)';
    RAISE NOTICE '   ✅ UPDATE sin restricción de company_id';
    RAISE NOTICE '   ✅ Preservación de stock: SOLO actualiza products.active (NO toca inventories)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SEGURIDAD: Solo usuarios con rol master_admin pueden ejecutar.';
    RAISE NOTICE '';
    RAISE NOTICE '💾 PRESERVACIÓN DE DATOS: Restores product visibility. Does NOT modify inventory counts to preserve historical data.';
  ELSE
    RAISE WARNING '⚠️ Algunos componentes no se crearon correctamente.';
    RAISE WARNING '   master_admin SELECT: %', v_master_select_policy;
    RAISE WARNING '   normal SELECT: %', v_normal_select_policy;
    RAISE WARNING '   master_admin UPDATE: %', v_master_update_policy;
    RAISE WARNING '   normal UPDATE: %', v_normal_update_policy;
    RAISE WARNING '   función restore_product: %', v_function_exists;
  END IF;
END $$;

COMMIT;

-- ====================================================================================
-- RESUMEN FINAL
-- ====================================================================================
-- ✅ Políticas RLS corregidas: master_admin puede ver y actualizar todos los productos
-- ✅ Función restore_product corregida: Sin restricción de company_id
-- ✅ Búsqueda forense: Encuentra productos inactivos sin filtros
-- ✅ Preservación de stock: NO toca inventories
-- ✅ Seguridad: Mantiene validación is_master_admin()
-- ====================================================================================





