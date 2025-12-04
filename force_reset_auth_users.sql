-- ============================================================================
-- FORCE RESET: Authentication and Profile Data for 2 Users
-- ============================================================================
-- OBJETIVO: Forzar reinicio completo de autenticación y perfil para usuarios
--           que no pueden iniciar sesión
-- ============================================================================
-- USUARIOS OBJETIVO:
-- 1. tumovilstore2025@gmail.com (Gerente Tu Móvil Store)
-- 2. tumovillaisla@gmail.com (Gerente Tu Móvil La Isla)
-- ============================================================================
-- CONTRASEÑA: '2677Tele$'
-- ============================================================================

-- ============================================================================
-- PASO 1: Habilitar extensión pgcrypto para encriptación de contraseñas
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- PASO 2: IDs de tiendas confirmados
-- ============================================================================
-- Tu Móvil Store: bb11cc22-dd33-ee44-ff55-aa6677889900
-- Tu Móvil La Isla: 44fa49ac-b6ea-421d-a198-e48e179ae371
-- Company ID: aa11bb22-cc33-dd44-ee55-ff6677889900

-- ============================================================================
-- PASO 3: FORCE RESET - tumovilstore2025@gmail.com
-- ============================================================================
DO $$
DECLARE
  v_auth_user_id UUID;
  v_store_id UUID := 'bb11cc22-dd33-ee44-ff55-aa6677889900'::UUID;
  v_company_id UUID := 'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Obtener auth_user_id
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'tumovilstore2025@gmail.com'
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE WARNING '⚠️ Usuario tumovilstore2025@gmail.com NO existe en auth.users';
  ELSE
    -- Generar hash de contraseña
    v_encrypted_password := crypt('2677Tele$', gen_salt('bf'));

    -- FORCE RESET en auth.users
    UPDATE auth.users
    SET
      email_confirmed_at = NOW(),
      encrypted_password = v_encrypted_password,
      updated_at = NOW()
    WHERE id = v_auth_user_id;

    RAISE NOTICE '✅ auth.users actualizado para tumovilstore2025@gmail.com';
    RAISE NOTICE '   - Email confirmado: %', NOW();
    RAISE NOTICE '   - Contraseña reseteada';
  END IF;

  -- SYNC PROFILE en public.users
  UPDATE public.users
  SET
    active = TRUE,
    role = 'manager',
    company_id = v_company_id,
    assigned_store_id = v_store_id,
    name = COALESCE(name, 'Tu Móvil Store'),
    updated_at = NOW()
  WHERE email = 'tumovilstore2025@gmail.com';

  IF FOUND THEN
    RAISE NOTICE '✅ public.users sincronizado para tumovilstore2025@gmail.com';
  ELSE
    RAISE WARNING '⚠️ Usuario tumovilstore2025@gmail.com NO existe en public.users';
  END IF;
END $$;

-- ============================================================================
-- PASO 4: FORCE RESET - tumovillaisla@gmail.com
-- ============================================================================
DO $$
DECLARE
  v_auth_user_id UUID;
  v_store_id UUID := '44fa49ac-b6ea-421d-a198-e48e179ae371'::UUID;
  v_company_id UUID := 'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Obtener auth_user_id
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'tumovillaisla@gmail.com'
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE WARNING '⚠️ Usuario tumovillaisla@gmail.com NO existe en auth.users';
  ELSE
    -- Generar hash de contraseña
    v_encrypted_password := crypt('2677Tele$', gen_salt('bf'));

    -- FORCE RESET en auth.users
    UPDATE auth.users
    SET
      email_confirmed_at = NOW(),
      encrypted_password = v_encrypted_password,
      updated_at = NOW()
    WHERE id = v_auth_user_id;

    RAISE NOTICE '✅ auth.users actualizado para tumovillaisla@gmail.com';
    RAISE NOTICE '   - Email confirmado: %', NOW();
    RAISE NOTICE '   - Contraseña reseteada';
  END IF;

  -- SYNC PROFILE en public.users
  UPDATE public.users
  SET
    active = TRUE,
    role = 'manager',
    company_id = v_company_id,
    assigned_store_id = v_store_id,
    name = COALESCE(name, 'Tu Móvil La Isla'),
    updated_at = NOW()
  WHERE email = 'tumovillaisla@gmail.com';

  IF FOUND THEN
    RAISE NOTICE '✅ public.users sincronizado para tumovillaisla@gmail.com';
  ELSE
    RAISE WARNING '⚠️ Usuario tumovillaisla@gmail.com NO existe en public.users';
  END IF;
END $$;

-- ============================================================================
-- PASO 5: VERIFICACIÓN FINAL
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL - auth.users' AS "Tipo",
  au.email AS "Email",
  au.email_confirmed_at IS NOT NULL AS "Email Confirmado",
  au.encrypted_password IS NOT NULL AS "Contraseña Configurada",
  au.updated_at AS "Última Actualización"
FROM auth.users au
WHERE au.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY au.email;

SELECT 
  '✅ VERIFICACIÓN FINAL - public.users' AS "Tipo",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.active AS "Activo",
  pu.company_id AS "Company ID",
  pu.assigned_store_id AS "Store ID",
  s.name AS "Store Name",
  pu.auth_user_id IS NOT NULL AS "Vinculado",
  CASE
    WHEN pu.active = TRUE 
         AND pu.company_id = 'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID
         AND pu.role = 'manager'
         AND pu.assigned_store_id IS NOT NULL
    THEN '✅ LISTO PARA LOGIN'
    ELSE '❌ FALTAN DATOS'
  END AS "Estado"
FROM public.users pu
LEFT JOIN public.stores s ON pu.assigned_store_id = s.id
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY pu.email;


