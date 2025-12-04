-- ============================================================================
-- DIAGNÓSTICO: ¿Por qué no se ven usuarios en el panel?
-- ============================================================================
-- Verifica políticas RLS y usuarios existentes
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR POLÍTICAS RLS EN public.users
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
-- 2. VERIFICAR SI RLS ESTÁ HABILITADO
-- ============================================================================
SELECT 
  '🔒 RLS STATUS' AS "Tipo",
  tablename AS "Tabla",
  rowsecurity AS "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'users';

-- ============================================================================
-- 3. CONTAR USUARIOS POR ROL
-- ============================================================================
SELECT 
  '📊 CONTEO POR ROL' AS "Tipo",
  role AS "Rol",
  COUNT(*) AS "Cantidad",
  COUNT(CASE WHEN active = true THEN 1 END) AS "Activos",
  COUNT(CASE WHEN active = false THEN 1 END) AS "Inactivos",
  COUNT(CASE WHEN auth_user_id IS NULL THEN 1 END) AS "Sin Vincular"
FROM public.users
GROUP BY role
ORDER BY role;

-- ============================================================================
-- 4. VERIFICAR USUARIOS SIN VINCULAR
-- ============================================================================
SELECT 
  '⚠️ USUARIOS SIN VINCULAR' AS "Tipo",
  id AS "user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  assigned_store_id AS "Store ID",
  active AS "Activo",
  created_at AS "Creado"
FROM public.users
WHERE auth_user_id IS NULL
ORDER BY created_at DESC;

-- ============================================================================
-- 5. VERIFICAR USUARIOS POR COMPANY_ID (Para ver si el problema es de multitenancy)
-- ============================================================================
SELECT 
  '🏢 USUARIOS POR COMPANY' AS "Tipo",
  company_id AS "Company ID",
  COUNT(*) AS "Total Usuarios",
  COUNT(CASE WHEN active = true THEN 1 END) AS "Activos",
  COUNT(CASE WHEN role = 'admin' THEN 1 END) AS "Admins",
  COUNT(CASE WHEN role = 'manager' THEN 1 END) AS "Managers",
  COUNT(CASE WHEN role = 'cashier' THEN 1 END) AS "Cashiers"
FROM public.users
GROUP BY company_id
ORDER BY company_id;


