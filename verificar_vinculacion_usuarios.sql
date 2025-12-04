-- ============================================================================
-- VERIFICACIÓN: Estado de Vinculación de Usuarios
-- ============================================================================
-- Ejecuta este script para verificar que los usuarios están correctamente vinculados
-- ============================================================================

-- ============================================================================
-- REPORTE 1: Usuarios en auth.users y su estado de vinculación
-- ============================================================================
SELECT 
  '📊 REPORTE DE VINCULACIÓN' AS "Tipo",
  au.email AS "Email",
  au.id AS "Auth User ID",
  pu.id AS "Profile ID",
  pu.auth_user_id AS "Profile Auth User ID",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.company_id AS "Company ID",
  CASE 
    WHEN pu.id IS NULL THEN '🔴 Sin perfil en public.users'
    WHEN pu.auth_user_id IS NULL THEN '🟡 Perfil sin auth_user_id'
    WHEN pu.auth_user_id = au.id THEN '✅ Correctamente vinculado'
    WHEN pu.auth_user_id != au.id THEN '⚠️ Vinculado a otro usuario'
    ELSE '❓ Estado desconocido'
  END AS "Estado"
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
ORDER BY au.created_at DESC;

-- ============================================================================
-- REPORTE 2: Perfiles sin auth_user_id (requieren vinculación)
-- ============================================================================
SELECT 
  '🟡 PERFILES SIN VINCULAR' AS "Tipo",
  pu.id AS "Profile ID",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.company_id AS "Company ID",
  pu.created_at AS "Fecha Creación",
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users au WHERE au.email = pu.email) THEN '✅ Usuario existe en auth.users - Puede vincularse'
    ELSE '❌ No existe usuario en auth.users'
  END AS "Estado Auth"
FROM public.users pu
WHERE pu.auth_user_id IS NULL
ORDER BY pu.created_at DESC;

-- ============================================================================
-- REPORTE 3: Usuarios en auth.users sin perfil
-- ============================================================================
SELECT 
  '🔴 USUARIOS SIN PERFIL' AS "Tipo",
  au.id AS "Auth User ID",
  au.email AS "Email",
  au.created_at AS "Fecha Creación Auth",
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users pu WHERE pu.email = au.email AND pu.auth_user_id IS NULL) THEN '✅ Perfil existe pero sin vincular - Puede vincularse'
    WHEN EXISTS (SELECT 1 FROM public.users pu WHERE pu.email = au.email) THEN '⚠️ Perfil existe pero vinculado a otro usuario'
    ELSE '❌ No existe perfil en public.users'
  END AS "Estado Perfil"
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
)
ORDER BY au.created_at DESC;

-- ============================================================================
-- RESUMEN: Conteo de problemas
-- ============================================================================
SELECT 
  '📊 RESUMEN' AS "Tipo",
  'Usuarios correctamente vinculados' AS "Categoría",
  COUNT(*) AS "Cantidad"
FROM auth.users au
INNER JOIN public.users pu ON pu.auth_user_id = au.id
UNION ALL
SELECT 
  '📊 RESUMEN',
  'Perfiles sin auth_user_id',
  COUNT(*)
FROM public.users pu
WHERE pu.auth_user_id IS NULL
UNION ALL
SELECT 
  '📊 RESUMEN',
  'Usuarios en auth.users sin perfil vinculado',
  COUNT(*)
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
)
UNION ALL
SELECT 
  '📊 RESUMEN',
  'Perfiles que pueden vincularse por email',
  COUNT(*)
FROM public.users pu
WHERE pu.auth_user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.email = pu.email);


