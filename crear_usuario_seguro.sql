-- ============================================================================
-- SCRIPT: Crear Usuario de Forma Segura
-- ============================================================================
-- Este script crea un usuario completo (auth.users + public.users) de forma segura
-- USO: Reemplazar los valores marcados con ⚠️ antes de ejecutar
-- ============================================================================

-- ============================================================================
-- CONFIGURACIÓN: REEMPLAZAR ESTOS VALORES
-- ============================================================================

-- ⚠️ REEMPLAZAR: Datos del usuario
\set p_email 'nuevo_usuario@ejemplo.com'
\set p_password 'ContraseñaSegura123!'
\set p_name 'Nombre Completo del Usuario'
\set p_role 'manager'  -- 'admin', 'manager', o 'cashier'
\set p_company_id 'aa11bb22-cc33-dd44-ee55-ff6677889900'  -- ⚠️ Tu company_id
\set p_assigned_store_id '88aef8e3-df42-4706-a919-a993df60e593'  -- ⚠️ NULL si es admin

-- ============================================================================
-- PASO 1: VERIFICAR QUE EL EMAIL NO EXISTE
-- ============================================================================

DO $$
DECLARE
  v_email TEXT := 'nuevo_usuario@ejemplo.com';  -- ⚠️ REEMPLAZAR
  v_exists_auth BOOLEAN;
  v_exists_public BOOLEAN;
BEGIN
  -- Verificar en auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = v_email) INTO v_exists_auth;
  
  -- Verificar en public.users
  SELECT EXISTS(SELECT 1 FROM public.users WHERE email = v_email) INTO v_exists_public;
  
  IF v_exists_auth OR v_exists_public THEN
    RAISE EXCEPTION 'El email % ya existe en el sistema. Usa el script de corrección en su lugar.', v_email;
  END IF;
  
  RAISE NOTICE '✅ Email verificado: No existe en el sistema';
END $$;

-- ============================================================================
-- PASO 2: CREAR USUARIO EN auth.users (Requiere permisos de service_role)
-- ============================================================================
-- NOTA: Esta parte requiere permisos elevados. Si no tienes permisos,
--       el usuario debe registrarse desde el frontend.

DO $$
DECLARE
  v_email TEXT := 'nuevo_usuario@ejemplo.com';  -- ⚠️ REEMPLAZAR
  v_password TEXT := 'ContraseñaSegura123!';  -- ⚠️ REEMPLAZAR
  v_auth_user_id UUID;
BEGIN
  -- Intentar crear usuario en auth.users
  -- NOTA: Esto requiere permisos de service_role o usar Supabase Admin API
  -- Si no tienes permisos, el usuario debe registrarse desde el frontend
  
  BEGIN
    -- Este es un ejemplo - en producción, usar Supabase Admin API o RPC
    RAISE NOTICE '⚠️ No se puede crear usuario en auth.users directamente desde SQL';
    RAISE NOTICE '   El usuario debe registrarse desde el frontend con este email: %', v_email;
    RAISE NOTICE '   O usar el RPC create_user_atomic_admin si está disponible';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- PASO 3: CREAR PERFIL EN public.users
-- ============================================================================

DO $$
DECLARE
  v_email TEXT := 'nuevo_usuario@ejemplo.com';  -- ⚠️ REEMPLAZAR
  v_name TEXT := 'Nombre Completo del Usuario';  -- ⚠️ REEMPLAZAR
  v_role TEXT := 'manager';  -- ⚠️ REEMPLAZAR: 'admin', 'manager', o 'cashier'
  v_company_id UUID := 'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID;  -- ⚠️ REEMPLAZAR
  v_assigned_store_id UUID := '88aef8e3-df42-4706-a919-a993df60e593'::UUID;  -- ⚠️ REEMPLAZAR o NULL
  v_public_user_id UUID;
BEGIN
  -- Validar que manager/cashier tenga tienda asignada
  IF v_role IN ('manager', 'cashier') AND v_assigned_store_id IS NULL THEN
    RAISE EXCEPTION 'Los usuarios con rol % deben tener una tienda asignada', v_role;
  END IF;
  
  -- Validar que admin NO tenga tienda asignada
  IF v_role = 'admin' AND v_assigned_store_id IS NOT NULL THEN
    RAISE WARNING 'Los administradores no deben tener tienda asignada. Se establecerá NULL.';
    v_assigned_store_id := NULL;
  END IF;
  
  -- Crear perfil en public.users
  INSERT INTO public.users (
    auth_user_id,  -- NULL inicialmente, se vinculará cuando el usuario se registre
    company_id,
    email,
    name,
    role,
    assigned_store_id,
    active,
    created_at,
    updated_at
  ) VALUES (
    NULL,  -- Se vinculará cuando el usuario se registre
    v_company_id,
    v_email,
    v_name,
    v_role,
    v_assigned_store_id,
    true,
    NOW(),
    NOW()
  ) RETURNING id INTO v_public_user_id;
  
  RAISE NOTICE '✅ Perfil creado en public.users con ID: %', v_public_user_id;
  RAISE NOTICE '📝 El usuario debe registrarse desde el frontend con el email: %', v_email;
  RAISE NOTICE '   El sistema vinculará automáticamente el perfil cuando se registre.';
END $$;

-- ============================================================================
-- PASO 4: VERIFICACIÓN FINAL
-- ============================================================================

SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Estado",
  pu.id AS "public_user_id",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.assigned_store_id AS "Store ID",
  pu.auth_user_id AS "auth_user_id",
  CASE 
    WHEN pu.auth_user_id IS NULL THEN '⚠️ No vinculado - Usuario debe registrarse'
    ELSE '✅ Vinculado'
  END AS "Estado Vinculación"
FROM public.users pu
WHERE pu.email = 'nuevo_usuario@ejemplo.com';  -- ⚠️ REEMPLAZAR


