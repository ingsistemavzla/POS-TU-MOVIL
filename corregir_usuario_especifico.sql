-- ============================================================================
-- CORRECCIÓN INMEDIATA: Usuario Específico con Problema de Registro
-- Fecha: 2025-01-27
-- Objetivo: Vincular o crear perfil para un usuario que no puede registrarse
-- ============================================================================
-- 
-- INSTRUCCIONES:
-- 1. Reemplaza 'EMAIL_DEL_USUARIO@example.com' con el email real del usuario problemático
-- 2. Ejecuta este script en Supabase SQL Editor
-- 3. Verifica los resultados
--
-- ============================================================================

DO $$
DECLARE
  v_email TEXT := 'EMAIL_DEL_USUARIO@example.com'; -- ⚠️ CAMBIAR ESTE EMAIL
  v_auth_user_id UUID;
  v_profile_id UUID;
  v_profile_auth_id UUID;
  v_company_id UUID;
  v_result TEXT;
BEGIN
  RAISE NOTICE '🔍 Buscando usuario con email: %', v_email;
  RAISE NOTICE '';
  
  -- ============================================================================
  -- PASO 1: Verificar si existe en auth.users
  -- ============================================================================
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;
  
  IF v_auth_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ Usuario encontrado en auth.users';
    RAISE NOTICE '   auth_user_id: %', v_auth_user_id;
  ELSE
    RAISE NOTICE '❌ Usuario NO encontrado en auth.users';
  END IF;
  
  -- ============================================================================
  -- PASO 2: Verificar si existe perfil en public.users
  -- ============================================================================
  SELECT id, auth_user_id, company_id INTO v_profile_id, v_profile_auth_id, v_company_id
  FROM public.users
  WHERE email = v_email
  LIMIT 1;
  
  IF v_profile_id IS NOT NULL THEN
    RAISE NOTICE '✅ Perfil encontrado en public.users';
    RAISE NOTICE '   profile_id: %', v_profile_id;
    RAISE NOTICE '   auth_user_id actual: %', v_profile_auth_id;
    RAISE NOTICE '   company_id: %', v_company_id;
  ELSE
    RAISE NOTICE '❌ Perfil NO encontrado en public.users';
  END IF;
  
  RAISE NOTICE '';
  
  -- ============================================================================
  -- PASO 3: Decidir acción según el caso
  -- ============================================================================
  
  -- CASO A: Existe en auth.users Y en public.users, pero NO están vinculados
  IF v_auth_user_id IS NOT NULL AND v_profile_id IS NOT NULL AND v_profile_auth_id IS NULL THEN
    RAISE NOTICE '🔧 CASO A: Vincular perfil existente con auth_user_id';
    
    UPDATE public.users
    SET 
      auth_user_id = v_auth_user_id,
      updated_at = NOW()
    WHERE id = v_profile_id;
    
    RAISE NOTICE '✅ Perfil vinculado exitosamente';
    v_result := 'VINCULADO';
  END IF;
  
  -- CASO B: Existe en auth.users pero NO en public.users
  IF v_auth_user_id IS NOT NULL AND v_profile_id IS NULL THEN
    RAISE NOTICE '🔧 CASO B: Crear perfil para usuario existente en auth.users';
    RAISE NOTICE '⚠️  Necesito company_id para crear el perfil';
    RAISE NOTICE '   Por favor, proporciona el company_id o ejecuta manualmente:';
    RAISE NOTICE '';
    RAISE NOTICE '   INSERT INTO public.users (';
    RAISE NOTICE '     auth_user_id, company_id, email, name, role, active';
    RAISE NOTICE '   ) VALUES (';
    RAISE NOTICE '     ''%'', ''COMPANY_ID_AQUI'', ''%'', ''Nombre Usuario'', ''cashier'', true';
    RAISE NOTICE '   );', v_auth_user_id, v_email;
    
    v_result := 'REQUIERE_COMPANY_ID';
  END IF;
  
  -- CASO C: Existe en public.users pero NO en auth.users (usuario creado por admin)
  IF v_auth_user_id IS NULL AND v_profile_id IS NOT NULL THEN
    RAISE NOTICE '🔧 CASO C: Perfil existe pero usuario NO se ha registrado en auth.users';
    RAISE NOTICE '✅ El usuario puede registrarse normalmente desde el login';
    RAISE NOTICE '   El sistema vinculará automáticamente cuando se registre';
    
    v_result := 'ESPERANDO_REGISTRO';
  END IF;
  
  -- CASO D: Existe en ambos y están vinculados (pero con auth_user_id diferente)
  IF v_auth_user_id IS NOT NULL AND v_profile_id IS NOT NULL AND v_profile_auth_id IS NOT NULL AND v_profile_auth_id != v_auth_user_id THEN
    RAISE NOTICE '🔧 CASO D: Perfil vinculado con auth_user_id diferente';
    RAISE NOTICE '⚠️  Esto puede causar problemas. Corrigiendo...';
    
    UPDATE public.users
    SET 
      auth_user_id = v_auth_user_id,
      updated_at = NOW()
    WHERE id = v_profile_id;
    
    RAISE NOTICE '✅ Perfil re-vinculado con el auth_user_id correcto';
    v_result := 'REVINCULADO';
  END IF;
  
  -- CASO E: Ya están vinculados correctamente
  IF v_auth_user_id IS NOT NULL AND v_profile_id IS NOT NULL AND v_profile_auth_id = v_auth_user_id THEN
    RAISE NOTICE '✅ CASO E: Usuario y perfil ya están vinculados correctamente';
    RAISE NOTICE '   Si aún hay problemas, puede ser un problema de RLS o permisos';
    
    v_result := 'YA_VINCULADO';
  END IF;
  
  -- CASO F: No existe en ningún lado
  IF v_auth_user_id IS NULL AND v_profile_id IS NULL THEN
    RAISE NOTICE '❌ CASO F: Usuario NO existe en auth.users NI en public.users';
    RAISE NOTICE '   El usuario debe crearse desde el panel admin primero';
    
    v_result := 'NO_EXISTE';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 RESULTADO: %', v_result;
  
END $$;

-- ============================================================================
-- VERIFICACIÓN POST-CORRECCIÓN
-- ============================================================================
SELECT 
  'VERIFICACIÓN' AS "Estado",
  au.id AS "auth_user_id",
  au.email AS "Email",
  pu.id AS "profile_id",
  pu.auth_user_id AS "profile_auth_user_id",
  pu.company_id AS "company_id",
  CASE 
    WHEN au.id IS NULL THEN '❌ No existe en auth.users'
    WHEN pu.id IS NULL THEN '❌ No existe en public.users'
    WHEN pu.auth_user_id IS NULL THEN '🟡 Perfil sin vincular'
    WHEN pu.auth_user_id = au.id THEN '✅ Correctamente vinculado'
    ELSE '🔴 Vinculado incorrectamente'
  END AS "Estado Vinculación"
FROM auth.users au
FULL OUTER JOIN public.users pu ON pu.email = au.email
WHERE (au.email = 'EMAIL_DEL_USUARIO@example.com' OR pu.email = 'EMAIL_DEL_USUARIO@example.com')
  -- ⚠️ CAMBIAR EL EMAIL AQUÍ TAMBIÉN
LIMIT 1;



