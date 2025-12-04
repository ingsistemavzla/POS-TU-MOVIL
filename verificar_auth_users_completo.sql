-- ============================================================================
-- VERIFICACIÓN COMPLETA: Usuario zonagamermargarita@gmail.com
-- ============================================================================
-- Verifica TODOS los datos del usuario en ambas tablas
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR EN auth.users (COMPLETO)
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
WHERE email = 'zonagamermargarita@gmail.com';

-- ============================================================================
-- 2. VERIFICAR EN public.users (COMPLETO)
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
WHERE email = 'zonagamermargarita@gmail.com';

-- ============================================================================
-- 3. VERIFICAR VINCULACIÓN (SIMPLIFICADO)
-- ============================================================================
SELECT 
  '🔗 VINCULACIÓN' AS "Tipo",
  au.id AS "auth_user_id",
  pu.id AS "public_user_id",
  pu.auth_user_id AS "public.auth_user_id",
  CASE 
    WHEN au.id IS NULL AND pu.id IS NULL THEN '❌ No existe en ninguna tabla'
    WHEN au.id IS NULL AND pu.id IS NOT NULL THEN '⚠️ Existe en public.users pero NO en auth.users'
    WHEN au.id IS NOT NULL AND pu.id IS NULL THEN '⚠️ Existe en auth.users pero NO en public.users'
    WHEN au.id IS NOT NULL AND pu.id IS NOT NULL AND pu.auth_user_id IS NULL THEN '⚠️ Existe en ambos pero NO vinculado (auth_user_id NULL)'
    WHEN au.id IS NOT NULL AND pu.id IS NOT NULL AND pu.auth_user_id = au.id THEN '✅ Correctamente vinculado'
    WHEN au.id IS NOT NULL AND pu.id IS NOT NULL AND pu.auth_user_id != au.id THEN '⚠️ Vinculación incorrecta'
    ELSE '❓ Estado desconocido'
  END AS "Estado"
FROM public.users pu
LEFT JOIN auth.users au ON au.email = pu.email
WHERE pu.email = 'zonagamermargarita@gmail.com'

UNION ALL

SELECT 
  '🔗 VINCULACIÓN' AS "Tipo",
  au.id AS "auth_user_id",
  NULL::UUID AS "public_user_id",
  NULL::UUID AS "public.auth_user_id",
  '⚠️ Existe en auth.users pero NO en public.users' AS "Estado"
FROM auth.users au
WHERE au.email = 'zonagamermargarita@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.email = au.email
  );


