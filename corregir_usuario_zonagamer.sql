-- ============================================================================
-- CORRECCIÓN: Usuario zonagamermargarita@gmail.com
-- ============================================================================
-- Este script corrige la vinculación entre auth.users y public.users
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Obtener IDs
-- ============================================================================
DO $$
DECLARE
  v_auth_user_id UUID;
  v_public_user_id UUID;
  v_store_id UUID;
BEGIN
  -- Obtener auth_user_id
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'zonagamermargarita@gmail.com'
  LIMIT 1;

  -- Obtener public_user_id
  SELECT id INTO v_public_user_id
  FROM public.users
  WHERE email = 'zonagamermargarita@gmail.com'
  LIMIT 1;

  -- Obtener store_id por nombre
  SELECT id INTO v_store_id
  FROM public.stores
  WHERE name ILIKE '%Zona Gamer Margarita%'
  LIMIT 1;

  -- ============================================================================
  -- CASO 1: Existe en auth.users pero NO en public.users
  -- ============================================================================
  IF v_auth_user_id IS NOT NULL AND v_public_user_id IS NULL THEN
    RAISE NOTICE '📝 Caso 1: Crear perfil en public.users para usuario existente en auth.users';
    
    INSERT INTO public.users (
      auth_user_id,
      email,
      name,
      role,
      assigned_store_id,
      active,
      company_id
    )
    SELECT 
      v_auth_user_id,
      au.email,
      'Gerente Zona Gamer',
      'manager',
      v_store_id,
      true,
      (SELECT company_id FROM public.stores WHERE id = v_store_id LIMIT 1)
    FROM auth.users au
    WHERE au.id = v_auth_user_id
    RETURNING id INTO v_public_user_id;
    
    RAISE NOTICE '✅ Perfil creado en public.users con ID: %', v_public_user_id;
  END IF;

  -- ============================================================================
  -- CASO 2: Existe en public.users pero NO en auth.users
  -- ============================================================================
  IF v_auth_user_id IS NULL AND v_public_user_id IS NOT NULL THEN
    RAISE NOTICE '⚠️ Caso 2: Usuario existe en public.users pero NO en auth.users';
    RAISE NOTICE '   El usuario debe registrarse primero en auth.users';
    RAISE NOTICE '   O usar el RPC create_user_atomic_admin para crear ambos';
  END IF;

  -- ============================================================================
  -- CASO 3: Existe en ambos pero NO vinculado (auth_user_id NULL)
  -- ============================================================================
  IF v_auth_user_id IS NOT NULL AND v_public_user_id IS NOT NULL THEN
    -- Verificar si está vinculado
    IF NOT EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE id = v_public_user_id 
        AND auth_user_id = v_auth_user_id
    ) THEN
      RAISE NOTICE '📝 Caso 3: Vincular auth_user_id al perfil existente';
      
      -- Intentar vincular usando UPDATE directo (bypass RLS si se ejecuta como admin)
      -- Si falla, el usuario puede usar el RPC desde el frontend después de autenticarse
      BEGIN
        UPDATE public.users
        SET 
          auth_user_id = v_auth_user_id,
          updated_at = NOW()
        WHERE id = v_public_user_id
          AND (auth_user_id IS NULL OR auth_user_id != v_auth_user_id);
        
        IF FOUND THEN
          RAISE NOTICE '✅ Perfil vinculado exitosamente';
        ELSE
          RAISE NOTICE '⚠️ No se pudo vincular - posible problema de RLS';
          RAISE NOTICE '   SOLUCIÓN: El usuario debe intentar loguearse/registrarse';
          RAISE NOTICE '   El AuthContext automáticamente vinculará el perfil por email';
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '⚠️ Error al vincular: %', SQLERRM;
          RAISE NOTICE '   SOLUCIÓN: El usuario debe intentar loguearse/registrarse';
          RAISE NOTICE '   El AuthContext automáticamente vinculará el perfil por email';
      END;
    ELSE
      RAISE NOTICE '✅ Usuario ya está correctamente vinculado';
    END IF;

    -- Actualizar store_id si es necesario
    IF v_store_id IS NOT NULL THEN
      UPDATE public.users
      SET assigned_store_id = v_store_id
      WHERE id = v_public_user_id
        AND (assigned_store_id IS NULL OR assigned_store_id != v_store_id);
      
      IF FOUND THEN
        RAISE NOTICE '✅ Store ID actualizado: %', v_store_id;
      END IF;
    END IF;
  END IF;

  -- ============================================================================
  -- CASO 4: No existe en ninguno
  -- ============================================================================
  IF v_auth_user_id IS NULL AND v_public_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Caso 4: Usuario no existe en ninguna tabla';
    RAISE NOTICE '   El usuario debe ser creado usando el panel admin';
  END IF;

END $$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
-- Usar UNION para evitar el problema de FULL JOIN con OR
SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Estado",
  COALESCE(au.id, pu.auth_user_id) AS "auth_user_id",
  pu.id AS "public_user_id",
  pu.auth_user_id AS "public.auth_user_id",
  pu.name AS "Nombre",
  pu.email AS "Email",
  pu.role AS "Rol",
  pu.assigned_store_id AS "Store ID",
  CASE 
    WHEN au.id IS NULL AND pu.auth_user_id IS NULL THEN '❌ No existe en auth.users y no vinculado'
    WHEN au.id IS NULL AND pu.auth_user_id IS NOT NULL THEN '⚠️ auth_user_id existe pero no coincide con auth.users'
    WHEN au.id IS NOT NULL AND pu.id IS NULL THEN '❌ Existe en auth.users pero NO en public.users'
    WHEN au.id IS NOT NULL AND pu.id IS NOT NULL AND pu.auth_user_id IS NULL THEN '⚠️ Existe en ambos pero NO vinculado'
    WHEN au.id IS NOT NULL AND pu.id IS NOT NULL AND pu.auth_user_id = au.id THEN '✅ Correctamente vinculado'
    WHEN au.id IS NOT NULL AND pu.id IS NOT NULL AND pu.auth_user_id != au.id THEN '⚠️ Vinculación incorrecta'
    ELSE '❓ Estado desconocido'
  END AS "Estado Final"
FROM public.users pu
LEFT JOIN auth.users au ON au.email = pu.email OR au.id = pu.auth_user_id
WHERE pu.email = 'zonagamermargarita@gmail.com'

UNION ALL

SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Estado",
  au.id AS "auth_user_id",
  NULL::UUID AS "public_user_id",
  NULL::UUID AS "public.auth_user_id",
  NULL::TEXT AS "Nombre",
  au.email AS "Email",
  NULL::TEXT AS "Rol",
  NULL::UUID AS "Store ID",
  '❌ Existe en auth.users pero NO en public.users' AS "Estado Final"
FROM auth.users au
WHERE au.email = 'zonagamermargarita@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu 
    WHERE pu.email = au.email OR pu.auth_user_id = au.id
  );

