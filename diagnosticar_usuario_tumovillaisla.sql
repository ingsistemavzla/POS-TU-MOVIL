-- ============================================================================
-- DIAGNÓSTICO: Usuario tumovillaisla@gmail.com
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
  last_sign_in_at AS "Último Login",
  CASE 
    WHEN id IS NULL THEN '❌ NO EXISTE en auth.users'
    ELSE '✅ EXISTE en auth.users'
  END AS "Estado"
FROM auth.users
WHERE email = 'tumovillaisla@gmail.com';

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
  company_id AS "Company ID",
  created_at AS "Creado",
  CASE 
    WHEN id IS NULL THEN '❌ NO EXISTE en public.users'
    WHEN auth_user_id IS NULL THEN '⚠️ EXISTE pero NO VINCULADO (auth_user_id NULL)'
    ELSE '✅ EXISTE y VINCULADO'
  END AS "Estado"
FROM public.users
WHERE email = 'tumovillaisla@gmail.com';

-- ============================================================================
-- 3. VERIFICAR VINCULACIÓN (SIN FULL JOIN - SIMPLIFICADO)
-- ============================================================================
-- Primero verificar si existe en public.users
SELECT 
  '🔗 VINCULACIÓN' AS "Tipo",
  pu.auth_user_id AS "auth_user_id",
  pu.id AS "public_user_id",
  pu.auth_user_id AS "public.auth_user_id",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.assigned_store_id AS "Store ID",
  CASE 
    WHEN pu.auth_user_id IS NULL THEN '⚠️ Existe en public.users pero NO vinculado (auth_user_id NULL) - Usuario debe registrarse'
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = pu.auth_user_id) THEN '✅ Correctamente vinculado'
    ELSE '⚠️ Vinculación incorrecta - auth_user_id no existe en auth.users'
  END AS "Estado Final"
FROM public.users pu
WHERE pu.email = 'tumovillaisla@gmail.com'

UNION ALL

-- Luego verificar si existe en auth.users pero NO en public.users
SELECT 
  '🔗 VINCULACIÓN' AS "Tipo",
  au.id AS "auth_user_id",
  NULL::UUID AS "public_user_id",
  NULL::UUID AS "public.auth_user_id",
  au.email AS "Email",
  NULL::TEXT AS "Nombre",
  NULL::TEXT AS "Rol",
  NULL::UUID AS "Store ID",
  '⚠️ Existe en auth.users pero NO en public.users - Crear perfil' AS "Estado Final"
FROM auth.users au
WHERE au.email = 'tumovillaisla@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu 
    WHERE pu.email = au.email
  );

-- ============================================================================
-- 4. VERIFICAR TODOS LOS USUARIOS EN public.users (Para ver por qué no aparecen en el panel)
-- ============================================================================
SELECT 
  '📋 TODOS LOS USUARIOS' AS "Tipo",
  id AS "user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  assigned_store_id AS "Store ID",
  active AS "Activo",
  auth_user_id AS "auth_user_id",
  company_id AS "Company ID",
  created_at AS "Creado"
FROM public.users
ORDER BY created_at DESC;

