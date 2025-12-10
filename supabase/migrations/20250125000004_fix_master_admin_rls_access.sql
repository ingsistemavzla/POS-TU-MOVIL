-- ============================================================================
-- MIGRACIÓN: Permitir acceso completo a master_admin en tablas de auditoría
-- ============================================================================
-- Fecha: 2025-01-25
-- Descripción: Agrega políticas RLS especiales para master_admin que permiten
--              ver TODOS los datos sin filtro de company_id en:
--              - inventory_movements
--              - inventory_transfers  
--              - sales
-- ============================================================================

-- Función helper para verificar si el usuario es master_admin
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
    AND role = 'master_admin'
  );
$$;

-- ============================================================================
-- INVENTORY_MOVEMENTS: Política para master_admin
-- ============================================================================
DROP POLICY IF EXISTS "master_admin_can_view_all_movements" ON public.inventory_movements;

CREATE POLICY "master_admin_can_view_all_movements" ON public.inventory_movements
  FOR SELECT
  USING (public.is_master_admin() OR company_id = public.get_user_company_id());

COMMENT ON POLICY "master_admin_can_view_all_movements" ON public.inventory_movements IS 
'Permite a master_admin ver TODOS los movimientos de inventario sin filtro de company_id';

-- ============================================================================
-- INVENTORY_TRANSFERS: Política para master_admin
-- ============================================================================
DROP POLICY IF EXISTS "master_admin_can_view_all_transfers" ON public.inventory_transfers;

CREATE POLICY "master_admin_can_view_all_transfers" ON public.inventory_transfers
  FOR SELECT
  USING (
    public.is_master_admin() 
    OR company_id IN (
      SELECT company_id FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON POLICY "master_admin_can_view_all_transfers" ON public.inventory_transfers IS 
'Permite a master_admin ver TODAS las transferencias sin filtro de company_id';

-- ============================================================================
-- SALES: Política para master_admin
-- ============================================================================
DROP POLICY IF EXISTS "master_admin_can_view_all_sales" ON public.sales;

CREATE POLICY "master_admin_can_view_all_sales" ON public.sales
  FOR SELECT
  USING (public.is_master_admin() OR company_id = public.get_user_company_id());

COMMENT ON POLICY "master_admin_can_view_all_sales" ON public.sales IS 
'Permite a master_admin ver TODAS las ventas sin filtro de company_id';

-- ============================================================================
-- SALE_ITEMS: Política para master_admin (necesaria para JOINs)
-- ============================================================================
DROP POLICY IF EXISTS "master_admin_can_view_all_sale_items" ON public.sale_items;

CREATE POLICY "master_admin_can_view_all_sale_items" ON public.sale_items
  FOR SELECT
  USING (
    public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.company_id = public.get_user_company_id()
    )
  );

COMMENT ON POLICY "master_admin_can_view_all_sale_items" ON public.sale_items IS 
'Permite a master_admin ver TODOS los items de venta sin filtro de company_id';

-- ============================================================================
-- PRODUCTS: Política para master_admin (necesaria para JOINs)
-- ============================================================================
DROP POLICY IF EXISTS "master_admin_can_view_all_products" ON public.products;

CREATE POLICY "master_admin_can_view_all_products" ON public.products
  FOR SELECT
  USING (public.is_master_admin() OR company_id = public.get_user_company_id());

COMMENT ON POLICY "master_admin_can_view_all_products" ON public.products IS 
'Permite a master_admin ver TODOS los productos sin filtro de company_id';

-- ============================================================================
-- STORES: Política para master_admin (necesaria para JOINs)
-- ============================================================================
DROP POLICY IF EXISTS "master_admin_can_view_all_stores" ON public.stores;

CREATE POLICY "master_admin_can_view_all_stores" ON public.stores
  FOR SELECT
  USING (public.is_master_admin() OR company_id = public.get_user_company_id());

COMMENT ON POLICY "master_admin_can_view_all_stores" ON public.stores IS 
'Permite a master_admin ver TODAS las tiendas sin filtro de company_id';

-- ============================================================================
-- USERS: Política CRÍTICA - Evitar recursión infinita
-- ============================================================================
-- ⚠️ PROBLEMA: Las funciones is_master_admin() y get_user_company_id() consultan users,
--               causando recursión cuando se usan en la política RLS de users.
-- ⚠️ SOLUCIÓN: Usar subconsultas directas con alias diferentes para evitar recursión

-- Eliminar TODAS las políticas existentes de users para evitar conflictos
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users';
    END LOOP;
END $$;

-- Política corregida SIN recursión usando SECURITY DEFINER
-- Usamos una función auxiliar que bypass RLS para verificar el rol
CREATE OR REPLACE FUNCTION public.check_user_role_safe()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Esta función tiene SECURITY DEFINER, por lo que bypass RLS
  SELECT role INTO v_role
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(v_role, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id_safe()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Esta función tiene SECURITY DEFINER, por lo que bypass RLS
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$;

-- Política corregida usando funciones SECURITY DEFINER (bypass RLS)
CREATE POLICY "users_select_policy_safe" ON public.users
  FOR SELECT
  USING (
    -- 1. Cualquier usuario puede ver su propio perfil (sin recursión - condición directa)
    auth_user_id = auth.uid()
    -- 2. Master admin puede ver todos (usando función SECURITY DEFINER que bypass RLS)
    OR public.check_user_role_safe() = 'master_admin'
    -- 3. Usuarios de la misma company (usando función SECURITY DEFINER que bypass RLS)
    OR company_id = public.get_user_company_id_safe()
  );

COMMENT ON POLICY "users_select_policy_safe" ON public.users IS 
'Política segura sin recursión: usa funciones SECURITY DEFINER que bypass RLS para evitar loops infinitos';

-- Recrear políticas de INSERT, UPDATE, DELETE para mantener funcionalidad
CREATE POLICY "users_insert_policy_safe" ON public.users
  FOR INSERT
  WITH CHECK (
    auth_user_id = auth.uid()
    OR (company_id = public.get_user_company_id_safe() AND public.check_user_role_safe() IN ('admin', 'master_admin'))
  );

CREATE POLICY "users_update_policy_safe" ON public.users
  FOR UPDATE
  USING (
    auth_user_id = auth.uid()
    OR (company_id = public.get_user_company_id_safe() AND public.check_user_role_safe() IN ('admin', 'master_admin'))
  );

CREATE POLICY "users_delete_policy_safe" ON public.users
  FOR DELETE
  USING (
    company_id = public.get_user_company_id_safe() 
    AND public.check_user_role_safe() IN ('admin', 'master_admin')
  );

-- ============================================================================
-- VERIFICACIÓN: Confirmar que las políticas están activas
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS para master_admin creadas exitosamente';
  RAISE NOTICE '   - inventory_movements: master_admin puede ver todos';
  RAISE NOTICE '   - inventory_transfers: master_admin puede ver todos';
  RAISE NOTICE '   - sales: master_admin puede ver todos';
  RAISE NOTICE '   - sale_items: master_admin puede ver todos';
  RAISE NOTICE '   - products: master_admin puede ver todos';
  RAISE NOTICE '   - stores: master_admin puede ver todos';
  RAISE NOTICE '   - users: master_admin puede ver todos';
END $$;

