-- ============================================================================
-- VERIFICACIÓN FINAL: Estado del Sistema
-- ============================================================================
-- Verificar que todo está funcionando correctamente después de las correcciones
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR USUARIOS Y SU ESTADO
-- ============================================================================
SELECT 
  '👥 USUARIOS' AS "Tipo",
  id AS "user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  company_id AS "Company ID",
  assigned_store_id AS "Store ID",
  auth_user_id AS "auth_user_id",
  active AS "Activo",
  CASE 
    WHEN company_id IS NULL THEN '❌ Sin company_id'
    WHEN auth_user_id IS NULL THEN '⚠️ Sin vincular'
    WHEN role IN ('manager', 'cashier') AND assigned_store_id IS NULL THEN '⚠️ Sin tienda asignada'
    ELSE '✅ Correcto'
  END AS "Estado"
FROM public.users
WHERE role IN ('admin', 'manager', 'cashier', 'master_admin')
ORDER BY role, name;

-- ============================================================================
-- 2. VERIFICAR POLÍTICAS RLS EN public.users
-- ============================================================================
SELECT 
  '🔒 POLÍTICAS RLS' AS "Tipo",
  policyname AS "Nombre",
  cmd AS "Operación"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY cmd, policyname;

-- ============================================================================
-- 3. VERIFICAR POLÍTICAS RLS EN OTRAS TABLAS CRÍTICAS
-- ============================================================================
SELECT 
  '🔒 RLS OTRAS TABLAS' AS "Tipo",
  tablename AS "Tabla",
  COUNT(*) AS "Políticas",
  STRING_AGG(cmd, ', ') AS "Operaciones"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('inventories', 'sales', 'stores', 'products')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 4. VERIFICAR FUNCIONES CRÍTICAS
-- ============================================================================
SELECT 
  '⚙️ FUNCIONES' AS "Tipo",
  routine_name AS "Nombre",
  routine_type AS "Tipo",
  security_type AS "Seguridad"
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('process_sale', 'get_user_company_id_safe', 'get_user_store_id', 'is_global_admin')
ORDER BY routine_name;


