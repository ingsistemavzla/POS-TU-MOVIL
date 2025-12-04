-- ============================================================================
-- CORRECCIÓN: Usuarios Pendientes de Verificación
-- ============================================================================
-- OBJETIVO: Corregir los usuarios que no se pueden crear desde Admin Panel
--           porque ya existen en auth.users pero no están correctamente
--           vinculados en public.users
-- ============================================================================
-- USUARIOS A CORREGIR:
-- 1. tumovilstore2025@gmail.com
-- 2. tumovillaisla@gmail.com
-- ============================================================================

-- ============================================================================
-- PASO 1: Obtener información de las tiendas necesarias
-- ============================================================================
-- IDs confirmados de las tiendas:
-- Tu Móvil Store: bb11cc22-dd33-ee44-ff55-aa6677889900
-- Tu Móvil La Isla: 44fa49ac-b6ea-421d-a198-e48e179ae371
-- Company ID: aa11bb22-cc33-dd44-ee55-ff6677889900

-- ============================================================================
-- PASO 2: Corregir tumovilstore2025@gmail.com
-- ============================================================================
DO $$
DECLARE
  v_auth_user_id UUID;
  v_public_user_id UUID;
  v_store_id UUID;
  v_company_id UUID;
  v_profile_created BOOLEAN := FALSE;
BEGIN
  -- 1. Buscar en auth.users
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'tumovilstore2025@gmail.com'
  LIMIT 1;

  -- 2. Buscar en public.users
  SELECT id, assigned_store_id, company_id 
  INTO v_public_user_id, v_store_id, v_company_id
  FROM public.users
  WHERE email = 'tumovilstore2025@gmail.com'
  LIMIT 1;

  -- 3. Obtener store_id si no está asignado (usar ID confirmado)
  IF v_store_id IS NULL THEN
    v_store_id := 'bb11cc22-dd33-ee44-ff55-aa6677889900'::UUID; -- Tu Móvil Store
  END IF;

  -- 4. Obtener company_id si no está asignado (usar ID confirmado)
  IF v_company_id IS NULL THEN
    v_company_id := 'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID;
  END IF;

  -- 5. CASO A: Existe en auth.users pero NO en public.users
  IF v_auth_user_id IS NOT NULL AND v_public_user_id IS NULL THEN
    INSERT INTO public.users (
      auth_user_id,
      email,
      name,
      role,
      assigned_store_id,
      company_id,
      active,
      created_at,
      updated_at
    ) VALUES (
      v_auth_user_id,
      'tumovilstore2025@gmail.com',
      'Tu Móvil Store',
      'manager',
      v_store_id,
      v_company_id,
      TRUE,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_public_user_id;
    
    v_profile_created := TRUE;
    RAISE NOTICE '✅ Creado perfil en public.users para tumovilstore2025@gmail.com';
  END IF;

  -- 6. CASO B: Existe en public.users pero NO vinculado a auth.users
  IF v_public_user_id IS NOT NULL AND v_auth_user_id IS NOT NULL THEN
    UPDATE public.users
    SET
      auth_user_id = v_auth_user_id,
      assigned_store_id = COALESCE(assigned_store_id, v_store_id),
      company_id = COALESCE(company_id, v_company_id),
      role = COALESCE(role, 'manager'),
      name = COALESCE(name, 'Tu Móvil Store'),
      active = TRUE,
      updated_at = NOW()
    WHERE id = v_public_user_id
      AND (auth_user_id IS NULL OR auth_user_id != v_auth_user_id);
    
    IF FOUND THEN
      RAISE NOTICE '✅ Vinculado auth_user_id para tumovilstore2025@gmail.com';
    END IF;
  END IF;

  -- 7. Resumen
  IF v_auth_user_id IS NULL THEN
    RAISE WARNING '⚠️ Usuario tumovilstore2025@gmail.com NO existe en auth.users. Debe registrarse primero.';
  ELSIF v_profile_created THEN
    RAISE NOTICE '✅ Usuario tumovilstore2025@gmail.com CORREGIDO - Perfil creado y vinculado';
  ELSIF v_public_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ Usuario tumovilstore2025@gmail.com CORREGIDO - Perfil actualizado';
  ELSE
    RAISE NOTICE 'ℹ️ Usuario tumovilstore2025@gmail.com ya está correctamente configurado';
  END IF;
END $$;

-- ============================================================================
-- PASO 3: Corregir tumovillaisla@gmail.com
-- ============================================================================
DO $$
DECLARE
  v_auth_user_id UUID;
  v_public_user_id UUID;
  v_store_id UUID;
  v_company_id UUID;
  v_profile_created BOOLEAN := FALSE;
BEGIN
  -- 1. Buscar en auth.users
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'tumovillaisla@gmail.com'
  LIMIT 1;

  -- 2. Buscar en public.users
  SELECT id, assigned_store_id, company_id 
  INTO v_public_user_id, v_store_id, v_company_id
  FROM public.users
  WHERE email = 'tumovillaisla@gmail.com'
  LIMIT 1;

  -- 3. Obtener store_id si no está asignado (usar ID confirmado)
  IF v_store_id IS NULL THEN
    v_store_id := '44fa49ac-b6ea-421d-a198-e48e179ae371'::UUID; -- Tu Móvil La Isla
  END IF;

  -- 4. Obtener company_id si no está asignado (usar ID confirmado)
  IF v_company_id IS NULL THEN
    v_company_id := 'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID;
  END IF;

  -- 5. CASO A: Existe en auth.users pero NO en public.users
  IF v_auth_user_id IS NOT NULL AND v_public_user_id IS NULL THEN
    INSERT INTO public.users (
      auth_user_id,
      email,
      name,
      role,
      assigned_store_id,
      company_id,
      active,
      created_at,
      updated_at
    ) VALUES (
      v_auth_user_id,
      'tumovillaisla@gmail.com',
      'Tu Móvil La Isla',
      'manager',
      v_store_id,
      v_company_id,
      TRUE,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_public_user_id;
    
    v_profile_created := TRUE;
    RAISE NOTICE '✅ Creado perfil en public.users para tumovillaisla@gmail.com';
  END IF;

  -- 6. CASO B: Existe en public.users pero NO vinculado a auth.users
  IF v_public_user_id IS NOT NULL AND v_auth_user_id IS NOT NULL THEN
    UPDATE public.users
    SET
      auth_user_id = v_auth_user_id,
      assigned_store_id = COALESCE(assigned_store_id, v_store_id),
      company_id = COALESCE(company_id, v_company_id),
      role = COALESCE(role, 'manager'),
      name = COALESCE(name, 'Tu Móvil La Isla'),
      active = TRUE,
      updated_at = NOW()
    WHERE id = v_public_user_id
      AND (auth_user_id IS NULL OR auth_user_id != v_auth_user_id);
    
    IF FOUND THEN
      RAISE NOTICE '✅ Vinculado auth_user_id para tumovillaisla@gmail.com';
    END IF;
  END IF;

  -- 7. Resumen
  IF v_auth_user_id IS NULL THEN
    RAISE WARNING '⚠️ Usuario tumovillaisla@gmail.com NO existe en auth.users. Debe registrarse primero.';
  ELSIF v_profile_created THEN
    RAISE NOTICE '✅ Usuario tumovillaisla@gmail.com CORREGIDO - Perfil creado y vinculado';
  ELSIF v_public_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ Usuario tumovillaisla@gmail.com CORREGIDO - Perfil actualizado';
  ELSE
    RAISE NOTICE 'ℹ️ Usuario tumovillaisla@gmail.com ya está correctamente configurado';
  END IF;
END $$;

-- ============================================================================
-- PASO 4: Verificación Final
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Tipo",
  pu.id AS "public_user_id",
  pu.auth_user_id AS "auth_user_id",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.assigned_store_id AS "Store ID",
  s.name AS "Store Name",
  pu.company_id AS "Company ID",
  pu.active AS "Activo",
  CASE
    WHEN pu.auth_user_id IS NOT NULL AND au.id IS NOT NULL THEN '✅ CORRECTO'
    WHEN pu.auth_user_id IS NULL THEN '⚠️ Falta vincular auth_user_id'
    ELSE '❌ Error'
  END AS "Estado"
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
LEFT JOIN public.stores s ON pu.assigned_store_id = s.id
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY pu.email;

