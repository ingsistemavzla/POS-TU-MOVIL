-- ============================================================================
-- VERIFICACIÓN: Error de Autenticación
-- ============================================================================
-- OBJETIVO: Diagnosticar el error "Database error querying schema" durante login
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR ESTADO DE auth.users
-- ============================================================================
SELECT 
  '🔍 ESTADO auth.users' AS "Tipo",
  au.id AS "auth_user_id",
  au.email AS "Email",
  au.email_confirmed_at IS NOT NULL AS "Email Confirmado",
  au.encrypted_password IS NOT NULL AS "Tiene Contraseña",
  LENGTH(au.encrypted_password) AS "Longitud Hash",
  LEFT(au.encrypted_password, 10) AS "Prefijo Hash",
  au.created_at AS "Fecha Creación",
  au.updated_at AS "Última Actualización"
FROM auth.users au
WHERE au.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY au.email;

-- ============================================================================
-- 2. VERIFICAR TRIGGERS EN auth.users
-- ============================================================================
SELECT 
  '🔍 TRIGGERS auth.users' AS "Tipo",
  tgname AS "Trigger Name",
  tgtype::text AS "Trigger Type",
  tgenabled AS "Enabled"
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND tgname LIKE '%user%'
ORDER BY tgname;

-- ============================================================================
-- 3. VERIFICAR FUNCIONES RELACIONADAS CON USUARIOS
-- ============================================================================
SELECT 
  '🔍 FUNCIONES' AS "Tipo",
  p.proname AS "Function Name",
  pg_get_functiondef(p.oid) AS "Function Definition"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%user%'
  AND p.proname LIKE '%new%'
ORDER BY p.proname;

-- ============================================================================
-- 4. VERIFICAR LOGS DE ERRORES (si están disponibles)
-- ============================================================================
-- Nota: Esto puede no funcionar dependiendo de los permisos
SELECT 
  '🔍 ÚLTIMOS ERRORES' AS "Tipo",
  'Verificar logs de Supabase Dashboard' AS "Instrucción";

-- ============================================================================
-- 5. VERIFICAR SI EL HASH ES COMPATIBLE CON SUPABASE
-- ============================================================================
-- Supabase usa un formato específico para hashes de contraseña
-- El formato debe comenzar con '$2a$' o '$2b$' para bcrypt
SELECT 
  '🔍 FORMATO HASH' AS "Tipo",
  au.email AS "Email",
  CASE
    WHEN au.encrypted_password LIKE '$2a$%' THEN '✅ Formato bcrypt $2a$'
    WHEN au.encrypted_password LIKE '$2b$%' THEN '✅ Formato bcrypt $2b$'
    WHEN au.encrypted_password LIKE '$2y$%' THEN '✅ Formato bcrypt $2y$'
    ELSE '❌ Formato desconocido'
  END AS "Formato Hash",
  LEFT(au.encrypted_password, 30) AS "Muestra Hash"
FROM auth.users au
WHERE au.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY au.email;


