-- ============================================================================
-- VERIFICACIÓN: Usuario 514b0012-567f-45c3-8667-7347f55d06ea
-- ============================================================================
-- Verificar si el usuario existe y por qué RLS lo está bloqueando
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR EN auth.users
-- ============================================================================
SELECT 
  '🔍 AUTH.USERS' AS "Tipo",
  id AS "auth_user_id",
  email AS "Email",
  created_at AS "Creado"
FROM auth.users
WHERE id = '514b0012-567f-45c3-8667-7347f55d06ea';

-- ============================================================================
-- 2. VERIFICAR EN public.users
-- ============================================================================
SELECT 
  '🔍 PUBLIC.USERS' AS "Tipo",
  id AS "user_id",
  auth_user_id AS "auth_user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  company_id AS "Company ID",
  assigned_store_id AS "Store ID",
  active AS "Activo",
  CASE 
    WHEN auth_user_id = '514b0012-567f-45c3-8667-7347f55d06ea' THEN '✅ auth_user_id coincide'
    WHEN auth_user_id IS NULL THEN '⚠️ auth_user_id es NULL'
    ELSE '❌ auth_user_id NO coincide'
  END AS "Estado"
FROM public.users
WHERE auth_user_id = '514b0012-567f-45c3-8667-7347f55d06ea'
   OR email = (SELECT email FROM auth.users WHERE id = '514b0012-567f-45c3-8667-7347f55d06ea' LIMIT 1);

-- ============================================================================
-- 3. VERIFICAR POLÍTICAS RLS
-- ============================================================================
SELECT 
  '🔒 POLÍTICAS RLS' AS "Tipo",
  policyname AS "Nombre",
  cmd AS "Operación",
  qual AS "Condición"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- ============================================================================
-- 4. PROBAR EVALUACIÓN DE POLÍTICA (Simular como el usuario)
-- ============================================================================
-- Esto simula si la política permitiría el acceso
SELECT 
  '🧪 TEST POLÍTICA' AS "Tipo",
  id AS "user_id",
  email AS "Email",
  auth_user_id AS "auth_user_id",
  CASE 
    WHEN auth_user_id = '514b0012-567f-45c3-8667-7347f55d06ea' THEN '✅ Debería pasar users_select_own'
    WHEN auth_user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = '514b0012-567f-45c3-8667-7347f55d06ea' LIMIT 1) THEN '✅ Debería pasar users_select_own (por email)'
    ELSE '❌ NO debería pasar users_select_own'
  END AS "Resultado Esperado"
FROM public.users
WHERE auth_user_id = '514b0012-567f-45c3-8667-7347f55d06ea'
   OR email = (SELECT email FROM auth.users WHERE id = '514b0012-567f-45c3-8667-7347f55d06ea' LIMIT 1);


