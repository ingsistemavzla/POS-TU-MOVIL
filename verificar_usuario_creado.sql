-- ============================================================================
-- SCRIPT: Verificar Usuario Creado
-- ============================================================================
-- Este script verifica el estado completo de un usuario en el sistema
-- USO: Reemplazar el email antes de ejecutar
-- ============================================================================

-- ⚠️ REEMPLAZAR: Email del usuario a verificar
\set p_email 'nuevo_usuario@ejemplo.com'

-- ============================================================================
-- VERIFICACIÓN COMPLETA
-- ============================================================================

-- 1. Verificar en auth.users
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
WHERE email = 'nuevo_usuario@ejemplo.com';  -- ⚠️ REEMPLAZAR

-- 2. Verificar en public.users
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
WHERE email = 'nuevo_usuario@ejemplo.com';  -- ⚠️ REEMPLAZAR

-- 3. Verificar vinculación
SELECT 
  '🔗 VINCULACIÓN' AS "Tipo",
  au.id AS "auth_user_id",
  pu.id AS "public_user_id",
  pu.auth_user_id AS "public.auth_user_id",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.assigned_store_id AS "Store ID",
  CASE 
    WHEN au.id IS NULL AND pu.id IS NULL THEN '❌ No existe en ninguna tabla'
    WHEN au.id IS NULL AND pu.id IS NOT NULL THEN '⚠️ Existe en public.users pero NO en auth.users - Usuario debe registrarse'
    WHEN au.id IS NOT NULL AND pu.id IS NULL THEN '⚠️ Existe en auth.users pero NO en public.users - Crear perfil'
    WHEN au.id IS NOT NULL AND pu.id IS NOT NULL AND pu.auth_user_id IS NULL THEN '⚠️ Existe en ambos pero NO vinculado - Vincular auth_user_id'
    WHEN au.id IS NOT NULL AND pu.id IS NOT NULL AND pu.auth_user_id = au.id THEN '✅ Correctamente vinculado'
    WHEN au.id IS NOT NULL AND pu.id IS NOT NULL AND pu.auth_user_id != au.id THEN '⚠️ Vinculación incorrecta - Corregir'
    ELSE '❓ Estado desconocido'
  END AS "Estado Final"
FROM public.users pu
LEFT JOIN auth.users au ON au.email = pu.email OR pu.auth_user_id = au.id
WHERE pu.email = 'nuevo_usuario@ejemplo.com'  -- ⚠️ REEMPLAZAR
   OR au.email = 'nuevo_usuario@ejemplo.com';  -- ⚠️ REEMPLAZAR

-- 4. Verificar tienda asignada (si aplica)
SELECT 
  '🏪 TIENDA ASIGNADA' AS "Tipo",
  u.name AS "Usuario",
  u.role AS "Rol",
  u.assigned_store_id AS "Store ID",
  s.name AS "Nombre Tienda",
  s.active AS "Tienda Activa",
  CASE 
    WHEN u.role = 'admin' AND u.assigned_store_id IS NULL THEN '✅ Correcto (admin no tiene tienda)'
    WHEN u.role IN ('manager', 'cashier') AND u.assigned_store_id IS NULL THEN '❌ ERROR: Manager/Cashier debe tener tienda asignada'
    WHEN u.role IN ('manager', 'cashier') AND u.assigned_store_id IS NOT NULL AND s.id IS NULL THEN '❌ ERROR: Tienda asignada no existe'
    WHEN u.role IN ('manager', 'cashier') AND u.assigned_store_id IS NOT NULL AND s.id IS NOT NULL AND s.active = false THEN '⚠️ ADVERTENCIA: Tienda asignada está inactiva'
    WHEN u.role IN ('manager', 'cashier') AND u.assigned_store_id IS NOT NULL AND s.id IS NOT NULL AND s.active = true THEN '✅ Correcto (tienda asignada y activa)'
    ELSE '❓ Estado desconocido'
  END AS "Estado"
FROM public.users u
LEFT JOIN public.stores s ON u.assigned_store_id = s.id
WHERE u.email = 'nuevo_usuario@ejemplo.com';  -- ⚠️ REEMPLAZAR


