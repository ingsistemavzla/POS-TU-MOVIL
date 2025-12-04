-- ============================================================================
-- DIAGNÓSTICO: Usuarios Pendientes de Verificación
-- ============================================================================
-- OBJETIVO: Verificar el estado de los usuarios que no se pueden crear
--           desde el Admin Panel porque dicen "ya existe"
-- ============================================================================
-- USUARIOS A DIAGNOSTICAR:
-- 1. tumovilstore2025@gmail.com
-- 2. tumovillaisla@gmail.com
-- ============================================================================

-- ============================================================================
-- 1. DIAGNÓSTICO COMPLETO: tumovilstore2025@gmail.com
-- ============================================================================
-- Usar UNION ALL para evitar error de FULL OUTER JOIN
SELECT 
  '🔍 DIAGNÓSTICO: tumovilstore2025@gmail.com' AS "Tipo",
  pu.id AS "public_user_id",
  pu.auth_user_id AS "auth_user_id",
  au.id AS "auth.users.id",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.assigned_store_id AS "Store ID",
  pu.company_id AS "Company ID",
  pu.active AS "Activo",
  CASE
    WHEN pu.id IS NOT NULL AND au.id IS NOT NULL AND pu.auth_user_id = au.id THEN '✅ CORRECTO - Vinculado correctamente'
    WHEN pu.id IS NOT NULL AND au.id IS NOT NULL AND pu.auth_user_id IS NULL THEN '⚠️ Existe en ambas pero NO vinculado - Vincular auth_user_id'
    WHEN pu.id IS NOT NULL AND au.id IS NOT NULL AND pu.auth_user_id != au.id THEN '❌ ERROR - auth_user_id incorrecto'
    WHEN pu.id IS NOT NULL AND au.id IS NULL THEN '⚠️ Existe en public.users pero NO en auth.users - Usuario huérfano'
    ELSE '❓ Estado desconocido'
  END AS "Estado Final"
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.email = 'tumovilstore2025@gmail.com'

UNION ALL

SELECT 
  '🔍 DIAGNÓSTICO: tumovilstore2025@gmail.com' AS "Tipo",
  NULL::UUID AS "public_user_id",
  NULL::UUID AS "auth_user_id",
  au.id AS "auth.users.id",
  au.email AS "Email",
  NULL::TEXT AS "Nombre",
  NULL::TEXT AS "Rol",
  NULL::UUID AS "Store ID",
  NULL::UUID AS "Company ID",
  NULL::BOOLEAN AS "Activo",
  '⚠️ Existe en auth.users pero NO en public.users - Crear perfil' AS "Estado Final"
FROM auth.users au
WHERE au.email = 'tumovilstore2025@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu
    WHERE pu.email = au.email
  );

-- ============================================================================
-- 2. DIAGNÓSTICO COMPLETO: tumovillaisla@gmail.com
-- ============================================================================
-- Usar UNION ALL para evitar error de FULL OUTER JOIN
SELECT 
  '🔍 DIAGNÓSTICO: tumovillaisla@gmail.com' AS "Tipo",
  pu.id AS "public_user_id",
  pu.auth_user_id AS "auth_user_id",
  au.id AS "auth.users.id",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.assigned_store_id AS "Store ID",
  pu.company_id AS "Company ID",
  pu.active AS "Activo",
  CASE
    WHEN pu.id IS NOT NULL AND au.id IS NOT NULL AND pu.auth_user_id = au.id THEN '✅ CORRECTO - Vinculado correctamente'
    WHEN pu.id IS NOT NULL AND au.id IS NOT NULL AND pu.auth_user_id IS NULL THEN '⚠️ Existe en ambas pero NO vinculado - Vincular auth_user_id'
    WHEN pu.id IS NOT NULL AND au.id IS NOT NULL AND pu.auth_user_id != au.id THEN '❌ ERROR - auth_user_id incorrecto'
    WHEN pu.id IS NOT NULL AND au.id IS NULL THEN '⚠️ Existe en public.users pero NO en auth.users - Usuario huérfano'
    ELSE '❓ Estado desconocido'
  END AS "Estado Final"
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.email = 'tumovillaisla@gmail.com'

UNION ALL

SELECT 
  '🔍 DIAGNÓSTICO: tumovillaisla@gmail.com' AS "Tipo",
  NULL::UUID AS "public_user_id",
  NULL::UUID AS "auth_user_id",
  au.id AS "auth.users.id",
  au.email AS "Email",
  NULL::TEXT AS "Nombre",
  NULL::TEXT AS "Rol",
  NULL::UUID AS "Store ID",
  NULL::UUID AS "Company ID",
  NULL::BOOLEAN AS "Activo",
  '⚠️ Existe en auth.users pero NO en public.users - Crear perfil' AS "Estado Final"
FROM auth.users au
WHERE au.email = 'tumovillaisla@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu
    WHERE pu.email = au.email
  );

-- ============================================================================
-- 3. VERIFICAR SI EXISTEN EN auth.users
-- ============================================================================
SELECT 
  '📊 RESUMEN: Usuarios en auth.users' AS "Tipo",
  id AS "auth_user_id",
  email AS "Email",
  created_at AS "Fecha Creación",
  email_confirmed_at AS "Email Confirmado",
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Email confirmado'
    ELSE '⚠️ Email NO confirmado'
  END AS "Estado Email"
FROM auth.users
WHERE email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY email;

-- ============================================================================
-- 4. VERIFICAR SI EXISTEN EN public.users
-- ============================================================================
SELECT 
  '📊 RESUMEN: Usuarios en public.users' AS "Tipo",
  id AS "public_user_id",
  auth_user_id AS "auth_user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  assigned_store_id AS "Store ID",
  company_id AS "Company ID",
  active AS "Activo",
  CASE
    WHEN auth_user_id IS NULL THEN '⚠️ NO vinculado a auth.users'
    ELSE '✅ Vinculado'
  END AS "Estado Vinculación"
FROM public.users
WHERE email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY email;

-- ============================================================================
-- 5. VERIFICAR TIENDAS ASIGNADAS (si existen)
-- ============================================================================
SELECT 
  '🏪 TIENDAS: Verificar nombres' AS "Tipo",
  s.id AS "store_id",
  s.name AS "store_name",
  s.company_id AS "company_id",
  s.active AS "activa"
FROM public.stores s
WHERE s.name ILIKE '%Tu Móvil Store%'
   OR s.name ILIKE '%Tu Móvil La Isla%'
   OR s.name ILIKE '%Store%'
   OR s.name ILIKE '%Isla%'
ORDER BY s.name;

