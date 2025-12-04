-- ============================================================================
-- DIAGNÓSTICO SIMPLIFICADO: Usuarios Pendientes
-- ============================================================================
-- Este script muestra el estado actual de los usuarios pendientes
-- ============================================================================

-- ============================================================================
-- 1. DIAGNÓSTICO: tumovilstore2025@gmail.com
-- ============================================================================
SELECT 
  '🔍 tumovilstore2025@gmail.com' AS "Usuario",
  CASE
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'tumovilstore2025@gmail.com') 
         AND EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovilstore2025@gmail.com' AND auth_user_id IS NOT NULL)
    THEN '✅ Existe en ambas tablas y está vinculado'
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'tumovilstore2025@gmail.com') 
         AND EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovilstore2025@gmail.com' AND auth_user_id IS NULL)
    THEN '⚠️ Existe en ambas pero NO vinculado'
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'tumovilstore2025@gmail.com') 
         AND NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovilstore2025@gmail.com')
    THEN '⚠️ Existe en auth.users pero NO en public.users'
    WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tumovilstore2025@gmail.com') 
         AND EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovilstore2025@gmail.com')
    THEN '⚠️ Existe en public.users pero NO en auth.users'
    ELSE '❌ NO existe en ninguna tabla'
  END AS "Estado";

-- Detalles de auth.users
SELECT 
  '📧 auth.users' AS "Tabla",
  id AS "auth_user_id",
  email AS "Email",
  email_confirmed_at IS NOT NULL AS "Email Confirmado",
  created_at AS "Fecha Creación"
FROM auth.users
WHERE email = 'tumovilstore2025@gmail.com';

-- Detalles de public.users
SELECT 
  '👤 public.users' AS "Tabla",
  id AS "public_user_id",
  auth_user_id AS "auth_user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  assigned_store_id AS "Store ID",
  company_id AS "Company ID",
  active AS "Activo"
FROM public.users
WHERE email = 'tumovilstore2025@gmail.com';

-- ============================================================================
-- 2. DIAGNÓSTICO: tumovillaisla@gmail.com
-- ============================================================================
SELECT 
  '🔍 tumovillaisla@gmail.com' AS "Usuario",
  CASE
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'tumovillaisla@gmail.com') 
         AND EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovillaisla@gmail.com' AND auth_user_id IS NOT NULL)
    THEN '✅ Existe en ambas tablas y está vinculado'
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'tumovillaisla@gmail.com') 
         AND EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovillaisla@gmail.com' AND auth_user_id IS NULL)
    THEN '⚠️ Existe en ambas pero NO vinculado'
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'tumovillaisla@gmail.com') 
         AND NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovillaisla@gmail.com')
    THEN '⚠️ Existe en auth.users pero NO en public.users'
    WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tumovillaisla@gmail.com') 
         AND EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovillaisla@gmail.com')
    THEN '⚠️ Existe en public.users pero NO en auth.users'
    ELSE '❌ NO existe en ninguna tabla'
  END AS "Estado";

-- Detalles de auth.users
SELECT 
  '📧 auth.users' AS "Tabla",
  id AS "auth_user_id",
  email AS "Email",
  email_confirmed_at IS NOT NULL AS "Email Confirmado",
  created_at AS "Fecha Creación"
FROM auth.users
WHERE email = 'tumovillaisla@gmail.com';

-- Detalles de public.users
SELECT 
  '👤 public.users' AS "Tabla",
  id AS "public_user_id",
  auth_user_id AS "auth_user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  assigned_store_id AS "Store ID",
  company_id AS "Company ID",
  active AS "Activo"
FROM public.users
WHERE email = 'tumovillaisla@gmail.com';

-- ============================================================================
-- 3. RESUMEN COMPARATIVO
-- ============================================================================
SELECT 
  '📊 RESUMEN COMPARATIVO' AS "Tipo",
  'tumovilstore2025@gmail.com' AS "Email",
  EXISTS (SELECT 1 FROM auth.users WHERE email = 'tumovilstore2025@gmail.com') AS "En auth.users",
  EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovilstore2025@gmail.com') AS "En public.users",
  EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovilstore2025@gmail.com' AND auth_user_id IS NOT NULL) AS "Vinculado"

UNION ALL

SELECT 
  '📊 RESUMEN COMPARATIVO' AS "Tipo",
  'tumovillaisla@gmail.com' AS "Email",
  EXISTS (SELECT 1 FROM auth.users WHERE email = 'tumovillaisla@gmail.com') AS "En auth.users",
  EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovillaisla@gmail.com') AS "En public.users",
  EXISTS (SELECT 1 FROM public.users WHERE email = 'tumovillaisla@gmail.com' AND auth_user_id IS NOT NULL) AS "Vinculado";


