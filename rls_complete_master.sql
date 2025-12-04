-- ============================================================================
-- SCRIPT MAESTRO: BLINDAJE RLS COMPLETO PARA MULTITENANCY Y ROLES
-- ============================================================================
-- OBJETIVO: Implementar RLS completo que elimine la necesidad de lógica de
--           seguridad en el Frontend, delegando toda la seguridad a la BD.
-- ============================================================================

-- ============================================================================
-- PARTE 1: FUNCIONES AUXILIARES DE AUTENTICACIÓN Y ROLES
-- ============================================================================

-- Función: Obtener company_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Función: Obtener role del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Función: Obtener assigned_store_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT assigned_store_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Función: Verificar si el usuario es master_admin
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

-- Función: Verificar si el usuario es admin (no master_admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role = 'admin'
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Función: Verificar si el usuario es admin global (master_admin o admin)
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('master_admin', 'admin')
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- PARTE 2: HABILITAR RLS EN TABLAS CRÍTICAS
-- ============================================================================

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 3: ELIMINAR POLÍTICAS EXISTENTES (PARA REEMPLAZARLAS)
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Eliminar políticas SELECT existentes en stores
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stores' AND cmd = 'SELECT')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stores', r.policyname);
  END LOOP;

  -- Eliminar políticas SELECT existentes en products
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND cmd = 'SELECT')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', r.policyname);
  END LOOP;

  -- Eliminar políticas SELECT existentes en inventories
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventories' AND cmd = 'SELECT')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.inventories', r.policyname);
  END LOOP;

  -- Eliminar políticas SELECT existentes en sales
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales' AND cmd = 'SELECT')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sales', r.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- PARTE 4: POLÍTICAS RLS PARA STORES
-- ============================================================================

-- SELECT: Global admins ven todas las stores de su company, managers/cashiers solo su assigned_store
CREATE POLICY "stores_select_policy" ON public.stores
  FOR SELECT USING (
    -- Multitenancy: siempre filtrar por company_id
    company_id = public.get_user_company_id()
    AND (
      -- Global admins (master_admin/admin): ven todas las stores de su company
      public.is_global_admin()
      OR
      -- Managers/Cashiers: solo su assigned_store
      (public.get_user_store_id() IS NOT NULL AND id = public.get_user_store_id())
    )
  );

-- ============================================================================
-- PARTE 5: POLÍTICAS RLS PARA PRODUCTS
-- ============================================================================

-- SELECT: Todos ven productos de su company (productos son a nivel company, no store)
-- Global admins ven todos (activos e inactivos), otros solo activos
CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT USING (
    -- Multitenancy: siempre filtrar por company_id
    company_id = public.get_user_company_id()
    AND (
      -- Global admins: ven todos los productos (activos e inactivos)
      public.is_global_admin()
      OR
      -- Managers/Cashiers: solo productos activos
      (NOT public.is_global_admin() AND active = true)
    )
  );

-- ============================================================================
-- PARTE 6: POLÍTICAS RLS PARA INVENTORIES
-- ============================================================================

-- SELECT: Global admins ven inventario de todas las stores de su company,
--         managers/cashiers solo de su assigned_store
CREATE POLICY "inventories_select_policy" ON public.inventories
  FOR SELECT USING (
    -- Multitenancy: siempre filtrar por company_id
    company_id = public.get_user_company_id()
    AND (
      -- Global admins: ven inventario de todas las stores de su company
      public.is_global_admin()
      OR
      -- Managers/Cashiers: solo inventario de su assigned_store
      (public.get_user_store_id() IS NOT NULL AND store_id = public.get_user_store_id())
    )
  );

-- ============================================================================
-- PARTE 7: POLÍTICAS RLS PARA SALES
-- ============================================================================

-- SELECT: Global admins ven ventas de todas las stores de su company,
--         managers/cashiers solo de su assigned_store
CREATE POLICY "sales_select_policy" ON public.sales
  FOR SELECT USING (
    -- Multitenancy: siempre filtrar por company_id
    company_id = public.get_user_company_id()
    AND (
      -- Global admins: ven ventas de todas las stores de su company
      public.is_global_admin()
      OR
      -- Managers/Cashiers: solo ventas de su assigned_store
      (public.get_user_store_id() IS NOT NULL AND store_id = public.get_user_store_id())
    )
  );

-- ============================================================================
-- PARTE 8: VERIFICACIÓN Y LOGS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS COMPLETO IMPLEMENTADO';
  RAISE NOTICE '   - Funciones auxiliares creadas/actualizadas';
  RAISE NOTICE '   - Políticas RLS aplicadas a: stores, products, inventories, sales';
  RAISE NOTICE '   - Multitenancy: Filtrado por company_id';
  RAISE NOTICE '   - Visibilidad local: Managers/Cashiers solo ven su assigned_store';
  RAISE NOTICE '   - Visibilidad global: Global admins ven todo de su company';
END $$;


