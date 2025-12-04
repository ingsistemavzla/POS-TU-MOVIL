-- ============================================================================
-- VINCULACIÓN DE USUARIOS RESTANTES
-- ============================================================================
-- Este script vincula los usuarios que aún no están vinculados
-- ============================================================================

DO $$
DECLARE
  v_linked_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_auth_user RECORD;
  v_perfil RECORD;
  v_email TEXT;
BEGIN
  RAISE NOTICE '🔄 Iniciando vinculación de usuarios restantes...';
  RAISE NOTICE '';
  
  -- ============================================================================
  -- PASO 1: Vincular usuarios en auth.users con perfiles existentes por EMAIL
  -- ============================================================================
  RAISE NOTICE '📋 PASO 1: Vinculando usuarios de auth.users con perfiles por email...';
  
  FOR v_auth_user IN 
    SELECT au.id AS auth_id, au.email, au.created_at AS auth_created
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
    )
  LOOP
    -- Buscar perfil con el mismo email que no esté vinculado o esté vinculado a otro usuario
    SELECT * INTO v_perfil
    FROM public.users
    WHERE email = v_auth_user.email
      AND (auth_user_id IS NULL OR auth_user_id != v_auth_user.auth_id)
    ORDER BY 
      CASE WHEN auth_user_id IS NULL THEN 0 ELSE 1 END,  -- Priorizar perfiles sin auth_user_id
      created_at ASC  -- Si hay múltiples, tomar el más antiguo
    LIMIT 1;
    
    IF v_perfil IS NOT NULL THEN
      -- Verificar si el perfil ya está vinculado a otro usuario
      IF v_perfil.auth_user_id IS NOT NULL AND v_perfil.auth_user_id != v_auth_user.auth_id THEN
        RAISE NOTICE '⚠️  Perfil % ya está vinculado a otro usuario (auth_id: %). Omitiendo.', 
          v_perfil.email, v_perfil.auth_user_id;
        CONTINUE;
      END IF;
      
      -- Vincular el perfil con el auth_user_id
      UPDATE public.users
      SET 
        auth_user_id = v_auth_user.auth_id,
        updated_at = NOW()
      WHERE id = v_perfil.id;
      
      v_linked_count := v_linked_count + 1;
      RAISE NOTICE '✅ Vinculado: % (auth: %, perfil: %)', 
        v_auth_user.email, v_auth_user.auth_id, v_perfil.id;
    ELSE
      RAISE NOTICE '⚠️  No se encontró perfil para: % (auth_id: %)', 
        v_auth_user.email, v_auth_user.auth_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ PASO 1 completado: % perfiles vinculados', v_linked_count;
  RAISE NOTICE '';
  
  -- ============================================================================
  -- PASO 2: Crear perfiles faltantes para usuarios en auth.users sin perfil
  -- ============================================================================
  RAISE NOTICE '📋 PASO 2: Creando perfiles faltantes para usuarios en auth.users...';
  
  FOR v_auth_user IN 
    SELECT 
      au.id, 
      au.email, 
      au.created_at,
      au.raw_user_meta_data
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
    )
  LOOP
    -- Intentar obtener company_id del metadata
    DECLARE
      v_company_id UUID := NULL;
      v_name TEXT;
      v_role TEXT := 'cashier'; -- Rol por defecto
    BEGIN
      IF v_auth_user.raw_user_meta_data IS NOT NULL THEN
        v_company_id := (v_auth_user.raw_user_meta_data->>'company_id')::UUID;
        v_name := COALESCE(
          v_auth_user.raw_user_meta_data->>'name',
          v_auth_user.raw_user_meta_data->>'full_name',
          SPLIT_PART(v_auth_user.email, '@', 1)
        );
        v_role := COALESCE(
          (v_auth_user.raw_user_meta_data->>'role')::TEXT,
          'cashier'
        );
      ELSE
        v_name := SPLIT_PART(v_auth_user.email, '@', 1);
      END IF;
      
      -- Crear perfil básico
      INSERT INTO public.users (
        auth_user_id,
        email,
        name,
        role,
        company_id,
        active,
        created_at,
        updated_at
      ) VALUES (
        v_auth_user.id,
        v_auth_user.email,
        v_name,
        v_role,
        v_company_id,
        true,
        v_auth_user.created_at,
        NOW()
      );
      
      v_created_count := v_created_count + 1;
      RAISE NOTICE '✅ Creado perfil para: % (auth: %, company_id: %, rol: %)', 
        v_auth_user.email, v_auth_user.id, v_company_id, v_role;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creando perfil para %: %', v_auth_user.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ PASO 2 completado: % perfiles creados', v_created_count;
  RAISE NOTICE '';
  
  -- ============================================================================
  -- REPORTE FINAL
  -- ============================================================================
  RAISE NOTICE '📊 RESUMEN DE VINCULACIÓN:';
  RAISE NOTICE '   - Perfiles vinculados: %', v_linked_count;
  RAISE NOTICE '   - Perfiles creados: %', v_created_count;
  RAISE NOTICE '   - Total procesado: %', v_linked_count + v_created_count;
  RAISE NOTICE '';
  
END $$;

-- ============================================================================
-- VERIFICACIÓN POST-CORRECCIÓN
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Estado",
  COUNT(*) AS "Usuarios sin perfil vinculado",
  'Debe ser 0 o mínimo' AS "Esperado"
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
);

SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Estado",
  COUNT(*) AS "Perfiles sin auth_user_id",
  'Debe ser 0 o mínimo' AS "Esperado"
FROM public.users pu
WHERE pu.auth_user_id IS NULL;

-- ============================================================================
-- DETALLE DE USUARIOS QUE AÚN NO ESTÁN VINCULADOS (si los hay)
-- ============================================================================
SELECT 
  '🔍 DETALLE' AS "Tipo",
  au.email AS "Email Auth",
  au.id AS "Auth User ID",
  pu.email AS "Email Perfil",
  pu.id AS "Profile ID",
  pu.auth_user_id AS "Profile Auth User ID",
  CASE 
    WHEN pu.id IS NULL THEN '❌ No existe perfil'
    WHEN pu.auth_user_id IS NULL THEN '🟡 Perfil sin vincular'
    WHEN pu.auth_user_id != au.id THEN '⚠️ Vinculado a otro usuario'
    ELSE '✅ Vinculado'
  END AS "Estado"
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu2 WHERE pu2.auth_user_id = au.id
)
ORDER BY au.created_at DESC;


