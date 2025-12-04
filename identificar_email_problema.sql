-- ============================================================================
-- IDENTIFICACIÓN RÁPIDA: Email del Usuario con Problema
-- Fecha: 2025-01-27
-- Objetivo: Encontrar el email exacto del usuario que no puede registrarse
-- ============================================================================

-- ============================================================================
-- CONSULTA 1: Usuarios en auth.users que NO tienen perfil vinculado
-- ============================================================================
SELECT 
  '🔴 USUARIO SIN PERFIL' AS "Problema",
  au.email AS "Email",
  au.id AS "auth_user_id",
  au.created_at AS "Fecha Creación",
  NULL::UUID AS "profile_id"
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
)
ORDER BY au.created_at DESC;

-- ============================================================================
-- CONSULTA 2: Perfiles en public.users que NO están vinculados
-- ============================================================================
SELECT 
  '🟡 PERFIL SIN VINCULAR' AS "Problema",
  pu.email AS "Email",
  NULL::UUID AS "auth_user_id",
  pu.created_at AS "Fecha Creación",
  pu.id AS "profile_id",
  pu.company_id AS "company_id"
FROM public.users pu
WHERE pu.auth_user_id IS NULL
ORDER BY pu.created_at DESC;

-- ============================================================================
-- CONSULTA 3: Posibles vinculaciones (mismo email, no vinculados)
-- ============================================================================
SELECT 
  '🟢 PUEDE VINCULARSE' AS "Problema",
  au.email AS "Email",
  au.id AS "auth_user_id",
  au.created_at AS "Fecha Creación Auth",
  pu.id AS "profile_id",
  pu.company_id AS "company_id"
FROM auth.users au
INNER JOIN public.users pu ON pu.email = au.email
WHERE pu.auth_user_id IS NULL
   OR pu.auth_user_id != au.id
ORDER BY au.created_at DESC;

-- ============================================================================
-- RESUMEN: Contar problemas
-- ============================================================================
SELECT 
  '📊 RESUMEN' AS "Tipo",
  COUNT(*) AS "Cantidad",
  'Usuarios en auth.users sin perfil' AS "Descripción"
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
)
UNION ALL
SELECT 
  '📊 RESUMEN',
  COUNT(*),
  'Perfiles sin auth_user_id'
FROM public.users pu
WHERE pu.auth_user_id IS NULL
UNION ALL
SELECT 
  '📊 RESUMEN',
  COUNT(*),
  'Pueden vincularse por email'
FROM auth.users au
INNER JOIN public.users pu ON pu.email = au.email
WHERE pu.auth_user_id IS NULL OR pu.auth_user_id != au.id;



