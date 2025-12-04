-- ============================================================================
-- SCRIPT MAESTRO: CORRECCIÓN CRÍTICA DE SEGURIDAD POR TIENDA
-- ============================================================================
-- PROBLEMA: Gerentes y cajeros están viendo TODO el stock y todas las opciones
--           No se está validando que solo vean/vendan stock de su tienda
-- SOLUCIÓN: Implementar RLS que filtre por store_id para managers/cashiers
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: FUNCIONES AUXILIARES (Asegurar que existen)
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
-- PARTE 2: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Eliminar TODAS las políticas en inventories
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'inventories'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.inventories', r.policyname);
  END LOOP;

  -- Eliminar TODAS las políticas en products (SELECT)
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'products'
      AND cmd = 'SELECT'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', r.policyname);
  END LOOP;

  -- Eliminar TODAS las políticas en sales (SELECT)
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'sales'
      AND cmd = 'SELECT'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sales', r.policyname);
  END LOOP;

  -- Eliminar TODAS las políticas en stores (SELECT)
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'stores'
      AND cmd = 'SELECT'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stores', r.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- PARTE 3: POLÍTICAS RLS PARA INVENTORIES (CRÍTICO)
-- ============================================================================

-- SELECT: Global admins ven TODO el inventario de su company
--         Managers/Cashiers SOLO ven inventario de su assigned_store
CREATE POLICY "inventories_select_by_store" ON public.inventories
  FOR SELECT USING (
    -- Multitenancy: siempre filtrar por company_id
    company_id = public.get_user_company_id()
    AND (
      -- Global admins: ven TODO el inventario de su company
      public.is_global_admin()
      OR
      -- Managers/Cashiers: SOLO inventario de su assigned_store
      (
        public.get_user_store_id() IS NOT NULL 
        AND store_id = public.get_user_store_id()
      )
    )
  );

-- INSERT/UPDATE/DELETE: Solo global admins y managers pueden modificar
-- Managers SOLO pueden modificar inventario de su assigned_store
CREATE POLICY "inventories_modify_by_store" ON public.inventories
  FOR ALL USING (
    company_id = public.get_user_company_id()
    AND (
      -- Global admins: pueden modificar TODO
      public.is_global_admin()
      OR
      -- Managers: SOLO pueden modificar su assigned_store
      (
        public.get_user_role() = 'manager'
        AND public.get_user_store_id() IS NOT NULL
        AND store_id = public.get_user_store_id()
      )
    )
  );

-- ============================================================================
-- PARTE 4: POLÍTICAS RLS PARA PRODUCTS
-- ============================================================================

-- SELECT: Todos ven productos de su company (productos son a nivel company)
-- Global admins ven todos (activos e inactivos), otros solo activos
CREATE POLICY "products_select_by_company" ON public.products
  FOR SELECT USING (
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
-- PARTE 5: POLÍTICAS RLS PARA SALES
-- ============================================================================

-- SELECT: Global admins ven TODAS las ventas de su company
--         Managers/Cashiers SOLO ven ventas de su assigned_store
CREATE POLICY "sales_select_by_store" ON public.sales
  FOR SELECT USING (
    company_id = public.get_user_company_id()
    AND (
      -- Global admins: ven TODAS las ventas de su company
      public.is_global_admin()
      OR
      -- Managers/Cashiers: SOLO ventas de su assigned_store
      (
        public.get_user_store_id() IS NOT NULL
        AND store_id = public.get_user_store_id()
      )
    )
  );

-- ============================================================================
-- PARTE 6: POLÍTICAS RLS PARA STORES
-- ============================================================================

-- SELECT: Global admins ven TODAS las stores de su company
--         Managers/Cashiers SOLO ven su assigned_store
CREATE POLICY "stores_select_by_assignment" ON public.stores
  FOR SELECT USING (
    company_id = public.get_user_company_id()
    AND (
      -- Global admins: ven TODAS las stores de su company
      public.is_global_admin()
      OR
      -- Managers/Cashiers: SOLO su assigned_store
      (
        public.get_user_store_id() IS NOT NULL
        AND id = public.get_user_store_id()
      )
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 
  '✅ POLÍTICAS CREADAS' AS "Estado",
  tablename AS "Tabla",
  COUNT(*) AS "Cantidad Políticas"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('inventories', 'products', 'sales', 'stores')
GROUP BY tablename
ORDER BY tablename;


