-- ============================================================================
-- DIAGNÓSTICO: Usuarios Huérfanos y Perfiles Inconsistentes
-- Fecha: 2025-01-27
-- Objetivo: Identificar usuarios que existen en auth.users pero NO en public.users
--           y perfiles en public.users sin auth_user_id vinculado
-- ============================================================================

-- ============================================================================
-- CASO 1: Usuarios en auth.users SIN perfil en public.users
-- ============================================================================
SELECT 
  '🔴 USUARIO HUÉRFANO EN AUTH' AS "Tipo de Problema",
  au.id AS "auth_user_id",
  au.email AS "Email",
  au.created_at AS "Fecha Creación Auth",
  NULL::UUID AS "perfil_id",
  NULL::TEXT AS "nombre_perfil",
  NULL::TEXT AS "rol_perfil",
  NULL::UUID AS "company_id_perfil"
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.users pu 
  WHERE pu.auth_user_id = au.id
)
ORDER BY au.created_at DESC;

-- ============================================================================
-- CASO 2: Perfiles en public.users SIN auth_user_id (no vinculados)
-- ============================================================================
SELECT 
  '🟡 PERFIL SIN VINCULAR' AS "Tipo de Problema",
  NULL::UUID AS "auth_user_id",
  pu.email AS "Email",
  NULL::TIMESTAMPTZ AS "Fecha Creación Auth",
  pu.id AS "perfil_id",
  pu.name AS "nombre_perfil",
  pu.role AS "rol_perfil",
  pu.company_id AS "company_id_perfil"
FROM public.users pu
WHERE pu.auth_user_id IS NULL
ORDER BY pu.created_at DESC;

-- ============================================================================
-- CASO 3: Usuarios en auth.users que PODRÍAN vincularse con perfiles por EMAIL
-- ============================================================================
SELECT 
  '🟢 POSIBLE VINCULACIÓN POR EMAIL' AS "Tipo de Problema",
  au.id AS "auth_user_id",
  au.email AS "Email",
  au.created_at AS "Fecha Creación Auth",
  pu.id AS "perfil_id",
  pu.name AS "nombre_perfil",
  pu.role AS "rol_perfil",
  pu.company_id AS "company_id_perfil",
  pu.auth_user_id AS "auth_user_id_actual"
FROM auth.users au
INNER JOIN public.users pu ON pu.email = au.email
WHERE pu.auth_user_id IS NULL
  OR pu.auth_user_id != au.id
ORDER BY au.created_at DESC;

-- ============================================================================
-- CASO 4: Perfiles con company_id NULL (no aparecen en el panel admin)
-- ============================================================================
SELECT 
  '🔵 PERFIL SIN COMPANY_ID' AS "Tipo de Problema",
  pu.auth_user_id AS "auth_user_id",
  pu.email AS "Email",
  NULL::TIMESTAMPTZ AS "Fecha Creación Auth",
  pu.id AS "perfil_id",
  pu.name AS "nombre_perfil",
  pu.role AS "rol_perfil",
  pu.company_id AS "company_id_perfil"
FROM public.users pu
WHERE pu.company_id IS NULL
ORDER BY pu.created_at DESC;

-- ============================================================================
-- RESUMEN: Conteo de problemas
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
  'Perfiles sin auth_user_id vinculado'
FROM public.users pu
WHERE pu.auth_user_id IS NULL
UNION ALL
SELECT 
  '📊 RESUMEN',
  COUNT(*),
  'Perfiles sin company_id'
FROM public.users pu
WHERE pu.company_id IS NULL
UNION ALL
SELECT 
  '📊 RESUMEN',
  COUNT(*),
  'Posibles vinculaciones por email'
FROM auth.users au
INNER JOIN public.users pu ON pu.email = au.email
WHERE pu.auth_user_id IS NULL OR pu.auth_user_id != au.id;



