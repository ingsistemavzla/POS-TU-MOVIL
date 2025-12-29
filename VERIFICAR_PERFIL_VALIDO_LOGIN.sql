-- ============================================================================
-- VERIFICACIÓN: Perfil Válido para Login
-- ============================================================================
-- Este script verifica que el perfil válido esté correctamente configurado
-- para poder iniciar sesión.

-- PERFIL A VERIFICAR:
-- ID: 6bc65d7c-c858-4457-a4cf-0b3670a4a082
-- Email: tumovilcentro4@gmail.com
-- Company: db66d95b-9a33-4b4b-9157-5e34d5fb610a
-- auth_user_id: a0d30702-6fbf-46ae-9144-bd381e73e878

-- PASO 1: Verificar que el perfil existe en public.users
SELECT 
  '🔍 PERFIL EN public.users' AS paso,
  id,
  email,
  name,
  role,
  company_id,
  auth_user_id,
  active,
  CASE 
    WHEN auth_user_id IS NULL THEN '❌ ERROR: auth_user_id es NULL'
    WHEN active = false THEN '⚠️ ADVERTENCIA: Usuario inactivo'
    ELSE '✅ OK: Perfil válido y activo'
  END AS diagnostico
FROM public.users
WHERE id = '6bc65d7c-c858-4457-a4cf-0b3670a4a082';

-- PASO 2: Verificar que existe en auth.users
SELECT 
  '🔍 PERFIL EN auth.users' AS paso,
  id AS auth_user_id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '⚠️ ADVERTENCIA: Email no confirmado'
    ELSE '✅ OK: Email confirmado'
  END AS diagnostico
FROM auth.users
WHERE id = 'a0d30702-6fbf-46ae-9144-bd381e73e878';

-- PASO 3: Verificar vinculación entre public.users y auth.users
SELECT 
  '🔍 VINCULACIÓN' AS paso,
  pu.id AS public_user_id,
  pu.email AS public_email,
  pu.auth_user_id,
  au.id AS auth_user_id,
  au.email AS auth_email,
  CASE 
    WHEN pu.auth_user_id = au.id THEN '✅ OK: Correctamente vinculado'
    ELSE '❌ ERROR: IDs no coinciden'
  END AS diagnostico
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.id = '6bc65d7c-c858-4457-a4cf-0b3670a4a082';

-- PASO 4: Verificar que el email coincide en ambas tablas
SELECT 
  '🔍 COINCIDENCIA DE EMAIL' AS paso,
  pu.email AS public_email,
  au.email AS auth_email,
  CASE 
    WHEN LOWER(pu.email) = LOWER(au.email) THEN '✅ OK: Emails coinciden'
    ELSE '❌ ERROR: Emails no coinciden'
  END AS diagnostico
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.id = '6bc65d7c-c858-4457-a4cf-0b3670a4a082';

-- PASO 5: Verificar estado del usuario (activo/inactivo)
SELECT 
  '🔍 ESTADO DEL USUARIO' AS paso,
  pu.active AS public_active,
  au.email_confirmed_at IS NOT NULL AS auth_confirmed,
  CASE 
    WHEN pu.active = true AND au.email_confirmed_at IS NOT NULL THEN '✅ OK: Usuario puede iniciar sesión'
    WHEN pu.active = false THEN '❌ ERROR: Usuario inactivo (no puede iniciar sesión)'
    WHEN au.email_confirmed_at IS NULL THEN '⚠️ ADVERTENCIA: Email no confirmado (puede requerir confirmación)'
    ELSE '⚠️ ESTADO DESCONOCIDO'
  END AS diagnostico
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.id = '6bc65d7c-c858-4457-a4cf-0b3670a4a082';

-- PASO 6: Información completa para login
SELECT 
  '🔍 INFORMACIÓN PARA LOGIN' AS paso,
  pu.email AS email_login,
  pu.name AS nombre_usuario,
  pu.role AS rol,
  pu.company_id AS empresa_id,
  pu.active AS activo,
  au.email_confirmed_at IS NOT NULL AS email_confirmado,
  CASE 
    WHEN pu.active = true AND au.email_confirmed_at IS NOT NULL THEN '✅ LISTO PARA LOGIN'
    ELSE '❌ NO PUEDE INICIAR SESIÓN'
  END AS puede_login
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.id = '6bc65d7c-c858-4457-a4cf-0b3670a4a082';





