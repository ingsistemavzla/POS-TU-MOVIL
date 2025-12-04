-- ============================================================================
-- DIAGNÓSTICO: Usuario específico - zonagamermargarita@gmail.com
-- ============================================================================
-- Verifica el estado del usuario en auth.users y public.users
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR EN auth.users
-- ============================================================================
SELECT 
  '🔍 AUTH.USERS' AS "Tipo",
  id AS "auth_user_id",
  email AS "Email",
  email_confirmed_at AS "Email Confirmado",
  created_at AS "Creado",
  last_sign_in_at AS "Último Login"
FROM auth.users
WHERE email = 'zonagamermargarita@gmail.com';

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
  assigned_store_id AS "Store ID",
  active AS "Activo",
  created_at AS "Creado"
FROM public.users
WHERE email = 'zonagamermargarita@gmail.com';

-- ============================================================================
-- 3. VERIFICAR VINCULACIÓN
-- ============================================================================
SELECT 
  '🔗 VINCULACIÓN' AS "Tipo",
  CASE 
    WHEN au.id IS NULL THEN '❌ No existe en auth.users'
    WHEN pu.id IS NULL THEN '❌ No existe en public.users'
    WHEN pu.auth_user_id IS NULL THEN '⚠️ Existe en ambos pero NO vinculado (auth_user_id NULL)'
    WHEN pu.auth_user_id != au.id THEN '⚠️ Existe en ambos pero vinculación INCORRECTA'
    ELSE '✅ Correctamente vinculado'
  END AS "Estado",
  au.id AS "auth_user_id",
  pu.id AS "public_user_id",
  pu.auth_user_id AS "public.auth_user_id"
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'zonagamermargarita@gmail.com' 
   OR pu.email = 'zonagamermargarita@gmail.com';

-- ============================================================================
-- 4. VERIFICAR TIENDA ASIGNADA
-- ============================================================================
SELECT 
  '🏪 TIENDA' AS "Tipo",
  u.name AS "Usuario",
  u.assigned_store_id AS "Store ID",
  s.name AS "Nombre Tienda",
  s.company_id AS "Company ID"
FROM public.users u
LEFT JOIN public.stores s ON u.assigned_store_id = s.id
WHERE u.email = 'zonagamermargarita@gmail.com';


