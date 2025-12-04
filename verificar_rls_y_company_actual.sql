-- ============================================================================
-- VERIFICACIÓN: RLS y Company ID del Usuario Actual
-- ============================================================================
-- Este script verifica las políticas RLS y el company_id del usuario actual
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR COMPANY_ID DEL USUARIO ACTUAL
-- ============================================================================
SELECT 
  '👤 USUARIO ACTUAL' AS "Tipo",
  id AS "user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  company_id AS "Company ID",
  assigned_store_id AS "Store ID",
  auth_user_id AS "auth_user_id"
FROM public.users
WHERE auth_user_id = auth.uid();

-- ============================================================================
-- 2. VERIFICAR POLÍTICAS RLS EN public.users
-- ============================================================================
SELECT 
  '🔒 POLÍTICAS RLS' AS "Tipo",
  policyname AS "Nombre",
  cmd AS "Operación",
  qual AS "Condición"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY cmd, policyname;

-- ============================================================================
-- 3. VERIFICAR SI RLS ESTÁ HABILITADO
-- ============================================================================
SELECT 
  '🔒 RLS STATUS' AS "Tipo",
  tablename AS "Tabla",
  rowsecurity AS "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'users';

-- ============================================================================
-- 4. CONTAR USUARIOS QUE DEBERÍA VER EL USUARIO ACTUAL
-- ============================================================================
SELECT 
  '📊 USUARIOS VISIBLES' AS "Tipo",
  COUNT(*) AS "Total",
  COUNT(CASE WHEN role = 'admin' THEN 1 END) AS "Admins",
  COUNT(CASE WHEN role = 'manager' THEN 1 END) AS "Managers",
  COUNT(CASE WHEN role = 'cashier' THEN 1 END) AS "Cashiers"
FROM public.users
WHERE company_id = (
  SELECT company_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1
)
AND role IN ('admin', 'manager', 'cashier', 'master_admin');

-- ============================================================================
-- 5. VERIFICAR USUARIOS POR COMPANY_ID (TODOS)
-- ============================================================================
SELECT 
  '🏢 TODOS LOS USUARIOS POR COMPANY' AS "Tipo",
  company_id AS "Company ID",
  COUNT(*) AS "Total Usuarios",
  COUNT(CASE WHEN active = true THEN 1 END) AS "Activos",
  COUNT(CASE WHEN role = 'admin' THEN 1 END) AS "Admins",
  COUNT(CASE WHEN role = 'manager' THEN 1 END) AS "Managers",
  COUNT(CASE WHEN role = 'cashier' THEN 1 END) AS "Cashiers",
  COUNT(CASE WHEN role = 'master_admin' THEN 1 END) AS "Master Admins"
FROM public.users
WHERE role IN ('admin', 'manager', 'cashier', 'master_admin')
GROUP BY company_id
ORDER BY company_id;

-- ============================================================================
-- 6. VERIFICAR USUARIOS SIN COMPANY_ID
-- ============================================================================
SELECT 
  '⚠️ USUARIOS SIN COMPANY_ID' AS "Tipo",
  id AS "user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  assigned_store_id AS "Store ID",
  active AS "Activo",
  created_at AS "Creado"
FROM public.users
WHERE company_id IS NULL
  AND role IN ('admin', 'manager', 'cashier')
ORDER BY created_at DESC;


