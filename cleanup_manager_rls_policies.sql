-- ============================================
-- SCRIPT DE LIMPIEZA: ELIMINAR POLÍTICAS RLS DE MANAGERS
-- ============================================
-- Este script elimina todas las políticas RLS problemáticas que interfieren
-- con el dashboard administrativo. Las restricciones de managers ahora se
-- manejan completamente en el frontend.
--
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR FUNCIONES NO USADAS
-- ============================================

-- Eliminar función is_manager() (no se usa, restricciones en frontend)
DROP FUNCTION IF EXISTS public.is_manager();

-- Eliminar función is_admin_or_manager() (no se usa, restricciones en frontend)
DROP FUNCTION IF EXISTS public.is_admin_or_manager();

-- MANTENER estas funciones (se usan en funciones críticas):
-- - get_user_company_id() ✅ (usada en process_sale, transfer_inventory, etc.)
-- - is_admin() ✅ (usada en transfer_inventory, update_store_inventory, etc.)
-- - get_assigned_store_id() ✅ (usada en process_sale para validar store)

-- ============================================
-- PASO 2: ELIMINAR POLÍTICAS RLS PROBLEMÁTICAS
-- ============================================

-- INVENTORIES: Eliminar políticas que restringen por store
DROP POLICY IF EXISTS "inventories_select_policy" ON public.inventories;
DROP POLICY IF EXISTS "inventories_all_policy" ON public.inventories;

-- STORES: Eliminar políticas que restringen por store
DROP POLICY IF EXISTS "stores_select_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_modify_policy" ON public.stores;

-- SALES: Eliminar políticas que restringen por store
DROP POLICY IF EXISTS "sales_select_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_update_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_select_admin" ON public.sales;
DROP POLICY IF EXISTS "sales_select_assigned_store" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_admin" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_assigned_store" ON public.sales;
DROP POLICY IF EXISTS "sales_update_admin" ON public.sales;
DROP POLICY IF EXISTS "sales_update_assigned_store" ON public.sales;

-- PRODUCTS: Eliminar políticas que restringen managers
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "products_modify_policy" ON public.products;

-- INVENTORY_MOVEMENTS: Eliminar políticas que restringen por store
DROP POLICY IF EXISTS "inventory_movements_select_policy" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_insert_policy" ON public.inventory_movements;

-- USERS: Eliminar política problemática
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- ============================================
-- PASO 3: RESTAURAR POLÍTICAS RLS ORIGINALES
-- ============================================
-- Estas políticas permiten que admins vean todo y no interfieren
-- con el dashboard. Las restricciones de managers se manejan en frontend.

-- INVENTORIES: Restaurar política original (sin restricción por store)
CREATE POLICY IF NOT EXISTS "Users can view inventories from their company" ON public.inventories
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY IF NOT EXISTS "Managers and admins can manage inventories" ON public.inventories
  FOR ALL USING (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

-- STORES: Restaurar política original (sin restricción por store)
CREATE POLICY IF NOT EXISTS "Users can view stores from their company" ON public.stores
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY IF NOT EXISTS "Admins can manage stores" ON public.stores
  FOR ALL USING (company_id = public.get_user_company_id() AND public.is_admin());

-- SALES: Restaurar políticas originales (sin restricción por store)
CREATE POLICY IF NOT EXISTS "Users can view sales from their company" ON public.sales
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY IF NOT EXISTS "Users can insert sales in their company" ON public.sales
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND
    cashier_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Managers and admins can update sales" ON public.sales
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

-- PRODUCTS: Restaurar políticas originales
CREATE POLICY IF NOT EXISTS "Users can view products from their company" ON public.products
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY IF NOT EXISTS "Managers and admins can insert products" ON public.products
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

CREATE POLICY IF NOT EXISTS "Managers and admins can update products" ON public.products
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

CREATE POLICY IF NOT EXISTS "Admins can delete products" ON public.products
  FOR DELETE USING (company_id = public.get_user_company_id() AND public.is_admin());

-- INVENTORY_MOVEMENTS: Restaurar políticas originales
CREATE POLICY IF NOT EXISTS "Users can view inventory movements from their company" ON public.inventory_movements
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY IF NOT EXISTS "Users can insert inventory movements in their company" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- USERS: Restaurar política original
CREATE POLICY IF NOT EXISTS "Users can view users from their company" ON public.users
  FOR SELECT USING (company_id = public.get_user_company_id());

-- SALE_ITEMS: Restaurar políticas originales
DROP POLICY IF EXISTS "sale_items_select_by_sales" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_insert_by_sales" ON public.sale_items;

CREATE POLICY IF NOT EXISTS "Users can view sale items from their company" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert sale items" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.company_id = public.get_user_company_id()
    )
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las funciones críticas existen
SELECT 
  proname as function_name,
  CASE 
    WHEN proname IN ('get_user_company_id', 'is_admin', 'get_assigned_store_id') THEN '✅ MANTENER'
    ELSE '❌ ELIMINAR'
  END as status
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN ('get_user_company_id', 'is_admin', 'get_assigned_store_id', 'is_manager', 'is_admin_or_manager')
ORDER BY proname;

-- Verificar políticas restauradas
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN policyname LIKE '%admin%' OR policyname LIKE '%manager%' THEN '✅ Política restaurada'
    ELSE '✅ Política original'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('inventories', 'stores', 'sales', 'products', 'inventory_movements', 'users', 'sale_items')
ORDER BY tablename, policyname;





