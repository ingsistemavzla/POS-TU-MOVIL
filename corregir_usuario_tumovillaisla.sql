-- ============================================================================
-- CORRECCIÓN: Usuario tumovillaisla@gmail.com
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
  v_company_id UUID;
BEGIN
  -- Obtener auth_user_id
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'tumovillaisla@gmail.com'
  LIMIT 1;

  -- Obtener public_user_id
  SELECT id INTO v_public_user_id
  FROM public.users
  WHERE email = 'tumovillaisla@gmail.com'
  LIMIT 1;

  -- Obtener company_id del admin actual (o usar uno por defecto)
  -- Si no hay company_id, usar el primero disponible
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE role IN ('admin', 'master_admin')
    AND active = true
  LIMIT 1;

  -- Si no hay company_id, usar el primero disponible
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM public.companies
    LIMIT 1;
  END IF;

  -- ============================================================================
  -- CASO 1: Existe en auth.users pero NO en public.users
  -- ============================================================================
  IF v_auth_user_id IS NOT NULL AND v_public_user_id IS NULL THEN
    RAISE NOTICE '📝 Caso 1: Crear perfil en public.users para usuario existente en auth.users';
    
    -- Crear perfil en public.users
    INSERT INTO public.users (
      auth_user_id,
      email,
      name,
      role,
      assigned_store_id,
      active,
      company_id,
      created_at,
      updated_at
    )
    SELECT 
      v_auth_user_id,
      au.email,
      COALESCE(au.raw_user_meta_data->>'name', 'Tu Móvil La Isla'),
      'manager',  -- Ajustar según necesidad
      NULL,  -- Ajustar según necesidad
      true,
      v_company_id,
      au.created_at,
      NOW()
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
    RAISE NOTICE '   El perfil ya existe, solo necesita vincularse cuando se registre';
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
      
      -- Intentar vincular usando UPDATE directo
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
          RAISE NOTICE '   El usuario debe intentar hacer login/registro';
          RAISE NOTICE '   El AuthContext vinculará automáticamente';
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '⚠️ Error al vincular: %', SQLERRM;
          RAISE NOTICE '   El usuario debe intentar hacer login/registro';
          RAISE NOTICE '   El AuthContext vinculará automáticamente';
      END;
    ELSE
      RAISE NOTICE '✅ Usuario ya está correctamente vinculado';
    END IF;
  END IF;

  -- ============================================================================
  -- CASO 4: No existe en ninguno
  -- ============================================================================
  IF v_auth_user_id IS NULL AND v_public_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Caso 4: Usuario no existe en ninguna tabla';
    RAISE NOTICE '   El usuario debe ser creado usando el panel admin';
    RAISE NOTICE '   O registrarse desde la página de registro';
  END IF;

END $$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Estado",
  au.id AS "auth_user_id",
  pu.id AS "public_user_id",
  pu.auth_user_id AS "public.auth_user_id",
  pu.name AS "Nombre",
  pu.email AS "Email",
  pu.role AS "Rol",
  pu.assigned_store_id AS "Store ID",
  pu.company_id AS "Company ID",
  CASE 
    WHEN au.id IS NULL THEN '❌ No existe en auth.users'
    WHEN pu.id IS NULL THEN '❌ No existe en public.users'
    WHEN pu.auth_user_id IS NULL THEN '⚠️ No vinculado - Usuario debe hacer login/registro'
    WHEN pu.auth_user_id = au.id THEN '✅ Correctamente vinculado'
    ELSE '⚠️ Vinculación incorrecta'
  END AS "Estado Final"
FROM public.users pu
LEFT JOIN auth.users au ON au.email = pu.email OR pu.auth_user_id = au.id
WHERE pu.email = 'tumovillaisla@gmail.com' 
   OR au.email = 'tumovillaisla@gmail.com';


