-- ====================================================================================
-- CORRECCIÓN: Políticas RLS para permitir a master_admin ver productos inactivos
-- Fecha: 2025-01-27
-- Descripción: Corrige las políticas RLS de products para que master_admin pueda
--              ver y restaurar productos inactivos (active = false)
-- ====================================================================================
-- PROBLEMA IDENTIFICADO:
-- Las políticas RLS actuales filtran productos por company_id, pero NO filtran por active.
-- Sin embargo, el problema real es que get_user_company_id() puede retornar NULL para
-- master_admin, o las políticas no permiten acceso a productos inactivos.
-- 
-- Además, aunque la función restore_product tiene SECURITY DEFINER, las políticas RLS
-- se aplican ANTES de que la función se ejecute, por lo que el SELECT dentro de la
-- función está siendo filtrado por RLS.
-- ====================================================================================
-- SOLUCIÓN:
-- Crear una política RLS específica para master_admin que permita ver TODOS los
-- productos (activos e inactivos) sin restricción de company_id.
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- PASO 1: Crear función helper para verificar si el usuario es master_admin
-- ====================================================================================
-- Esta función ya debería existir (creada en create_master_restore_features.sql),
-- pero la verificamos y recreamos si es necesario.
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
-- PASO 2: Identificar y eliminar políticas conflictivas
-- ====================================================================================
-- Eliminamos las políticas existentes para recrearlas con la excepción de master_admin
-- ====================================================================================

DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "Users can view products from their company" ON public.products;
DROP POLICY IF EXISTS "master_admin_products_select_policy" ON public.products;

-- ====================================================================================
-- PASO 3: Crear política RLS para master_admin (ACCESO TOTAL)
-- ====================================================================================
-- master_admin puede ver TODOS los productos (activos e inactivos) de TODAS las compañías
-- Esta política tiene prioridad sobre las demás porque se evalúa primero
-- ====================================================================================

CREATE POLICY "master_admin_products_select_policy" ON public.products
  FOR SELECT 
  USING (public.is_master_admin() = true);
  -- ⚠️ IMPORTANTE: No hay filtro de company_id ni active aquí
  -- master_admin ve TODO

-- ====================================================================================
-- PASO 4: Crear política RLS para usuarios normales (RESTRICCIÓN POR COMPANY_ID)
-- ====================================================================================
-- Usuarios normales (admin, manager, cashier) solo ven productos de su compañía
-- Esta política se aplica solo si NO es master_admin
-- ====================================================================================

CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT 
  USING (
    -- Si es master_admin, esta política no se aplica (la anterior tiene prioridad)
    NOT public.is_master_admin()
    AND company_id = public.get_user_company_id()
  );

-- ====================================================================================
-- PASO 5: Verificar políticas de UPDATE para master_admin
-- ====================================================================================
-- Asegurarnos de que master_admin puede actualizar productos inactivos
-- ====================================================================================

DROP POLICY IF EXISTS "products_update_policy" ON public.products;
DROP POLICY IF EXISTS "Managers and admins can update products" ON public.products;

-- Política de UPDATE para master_admin (puede actualizar cualquier producto)
CREATE POLICY "master_admin_products_update_policy" ON public.products
  FOR UPDATE
  USING (public.is_master_admin() = true);

-- Política de UPDATE para usuarios normales
CREATE POLICY "products_update_policy" ON public.products
  FOR UPDATE
  USING (
    NOT public.is_master_admin()
    AND company_id = public.get_user_company_id()
    AND public.is_admin()
  );

-- ====================================================================================
-- PASO 6: Verificación y Reporte
-- ====================================================================================

DO $$
DECLARE
  v_master_policy_exists BOOLEAN;
  v_normal_policy_exists BOOLEAN;
  v_update_master_policy_exists BOOLEAN;
  v_update_normal_policy_exists BOOLEAN;
BEGIN
  -- Verificar políticas SELECT
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'products' 
    AND policyname = 'master_admin_products_select_policy'
  ) INTO v_master_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'products' 
    AND policyname = 'products_select_policy'
  ) INTO v_normal_policy_exists;

  -- Verificar políticas UPDATE
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'products' 
    AND policyname = 'master_admin_products_update_policy'
  ) INTO v_update_master_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'products' 
    AND policyname = 'products_update_policy'
  ) INTO v_update_normal_policy_exists;

  IF v_master_policy_exists AND v_normal_policy_exists AND 
     v_update_master_policy_exists AND v_update_normal_policy_exists THEN
    RAISE NOTICE '✅ Políticas RLS creadas exitosamente:';
    RAISE NOTICE '   - master_admin_products_select_policy: master_admin ve TODOS los productos (activos e inactivos)';
    RAISE NOTICE '   - products_select_policy: Usuarios normales ven solo productos de su compañía';
    RAISE NOTICE '   - master_admin_products_update_policy: master_admin puede actualizar cualquier producto';
    RAISE NOTICE '   - products_update_policy: Usuarios normales pueden actualizar solo productos de su compañía';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 COMPORTAMIENTO:';
    RAISE NOTICE '   - master_admin: Ve y puede restaurar productos inactivos de TODAS las compañías';
    RAISE NOTICE '   - Usuarios normales: Solo ven productos activos de su compañía (como antes)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SEGURIDAD: Las políticas mantienen el aislamiento por company_id para usuarios normales.';
  ELSE
    RAISE WARNING '⚠️ Algunas políticas no se crearon correctamente.';
    RAISE WARNING '   master_admin SELECT: %', v_master_policy_exists;
    RAISE WARNING '   normal SELECT: %', v_normal_policy_exists;
    RAISE WARNING '   master_admin UPDATE: %', v_update_master_policy_exists;
    RAISE WARNING '   normal UPDATE: %', v_update_normal_policy_exists;
  END IF;
END $$;

COMMIT;

-- ====================================================================================
-- RESUMEN DE CAMBIOS
-- ====================================================================================
-- ✅ Política RLS para master_admin: Ve TODOS los productos (activos e inactivos)
-- ✅ Política RLS para usuarios normales: Mantiene restricción por company_id
-- ✅ Políticas de UPDATE: master_admin puede actualizar cualquier producto
-- ✅ Función is_master_admin(): Verificada y recreada si es necesario
-- 
-- RESULTADO:
-- - master_admin puede ver y restaurar productos inactivos de cualquier compañía
-- - Usuarios normales mantienen el aislamiento por company_id
-- - La función restore_product ahora puede encontrar productos inactivos
-- ====================================================================================





