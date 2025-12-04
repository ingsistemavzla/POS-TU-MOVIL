-- ============================================================================
-- VERIFICACIÓN: Eliminación de Usuarios del Admin Panel
-- ============================================================================
-- OBJETIVO: Verificar si los usuarios fueron eliminados completamente
--           (HARD DELETE) o solo desactivados (SOFT DELETE)
-- ============================================================================
-- USUARIOS A VERIFICAR:
-- 1. tumovilstore2025@gmail.com
-- 2. tumovillaisla@gmail.com
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN PRINCIPAL: Existencia en Tablas Críticas
-- ============================================================================
SELECT 
  check_list.email AS "Email",
  EXISTS(SELECT 1 FROM auth.users WHERE email = check_list.email) AS "found_in_auth",
  EXISTS(SELECT 1 FROM public.users WHERE email = check_list.email) AS "found_in_public",
  CASE
    WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = check_list.email) 
         AND EXISTS(SELECT 1 FROM public.users WHERE email = check_list.email)
    THEN '⚠️ EXISTE en ambas tablas - NO eliminado'
    WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = check_list.email) 
         AND NOT EXISTS(SELECT 1 FROM public.users WHERE email = check_list.email)
    THEN '⚠️ EXISTE solo en auth.users - Eliminación parcial'
    WHEN NOT EXISTS(SELECT 1 FROM auth.users WHERE email = check_list.email) 
         AND EXISTS(SELECT 1 FROM public.users WHERE email = check_list.email)
    THEN '⚠️ EXISTE solo en public.users - Eliminación parcial'
    ELSE '✅ NO EXISTE en ninguna tabla - Eliminación completa (HARD DELETE)'
  END AS "Estado Eliminación"
FROM (VALUES 
  ('tumovilstore2025@gmail.com'), 
  ('tumovillaisla@gmail.com')
) AS check_list(email)
ORDER BY check_list.email;

-- ============================================================================
-- VERIFICACIÓN DETALLADA: Soft Delete en auth.users
-- ============================================================================
SELECT 
  '🔍 SOFT DELETE - auth.users' AS "Tipo",
  au.email AS "Email",
  au.deleted_at IS NOT NULL AS "Tiene deleted_at",
  au.deleted_at AS "Fecha Eliminación",
  au.email_confirmed_at IS NOT NULL AS "Email Confirmado",
  au.encrypted_password IS NOT NULL AS "Tiene Contraseña",
  CASE
    WHEN au.deleted_at IS NOT NULL THEN '✅ SOFT DELETE (deleted_at establecido)'
    WHEN au.deleted_at IS NULL AND au.id IS NOT NULL THEN '⚠️ NO eliminado (existe activo)'
    ELSE '❌ NO existe'
  END AS "Estado"
FROM auth.users au
WHERE au.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY au.email;

-- ============================================================================
-- VERIFICACIÓN DETALLADA: Soft Delete en public.users
-- ============================================================================
SELECT 
  '🔍 SOFT DELETE - public.users' AS "Tipo",
  pu.email AS "Email",
  pu.active AS "Activo",
  pu.auth_user_id AS "auth_user_id",
  pu.role AS "Rol",
  pu.company_id AS "Company ID",
  CASE
    WHEN pu.active = FALSE THEN '✅ SOFT DELETE (active = false)'
    WHEN pu.active = TRUE AND pu.id IS NOT NULL THEN '⚠️ NO eliminado (existe activo)'
    ELSE '❌ NO existe'
  END AS "Estado"
FROM public.users pu
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY pu.email;

-- ============================================================================
-- RESUMEN EJECUTIVO
-- ============================================================================
SELECT 
  '📊 RESUMEN EJECUTIVO' AS "Tipo",
  check_list.email AS "Email",
  EXISTS(SELECT 1 FROM auth.users WHERE email = check_list.email) AS "En auth.users",
  EXISTS(SELECT 1 FROM public.users WHERE email = check_list.email) AS "En public.users",
  EXISTS(SELECT 1 FROM auth.users WHERE email = check_list.email AND deleted_at IS NOT NULL) AS "Soft Delete auth",
  EXISTS(SELECT 1 FROM public.users WHERE email = check_list.email AND active = FALSE) AS "Soft Delete public",
  CASE
    WHEN NOT EXISTS(SELECT 1 FROM auth.users WHERE email = check_list.email) 
         AND NOT EXISTS(SELECT 1 FROM public.users WHERE email = check_list.email)
    THEN '✅ HARD DELETE - Puede registrarse de nuevo'
    WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = check_list.email AND deleted_at IS NOT NULL)
         OR EXISTS(SELECT 1 FROM public.users WHERE email = check_list.email AND active = FALSE)
    THEN '⚠️ SOFT DELETE - Debe eliminarse completamente antes de registrar'
    ELSE '❌ NO ELIMINADO - Existe activo en la base de datos'
  END AS "Recomendación"
FROM (VALUES 
  ('tumovilstore2025@gmail.com'), 
  ('tumovillaisla@gmail.com')
) AS check_list(email)
ORDER BY check_list.email;


