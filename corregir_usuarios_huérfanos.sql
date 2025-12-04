-- ============================================================================
-- CORRECCIÓN: Vincular Usuarios Huérfanos y Perfiles Inconsistentes
-- Fecha: 2025-01-27
-- Objetivo: Vincular usuarios de auth.users con perfiles en public.users
--           y crear perfiles faltantes cuando sea necesario
-- ============================================================================

-- ⚠️ ADVERTENCIA: Este script modifica datos. Ejecutar con precaución.
-- ⚠️ Se recomienda hacer backup antes de ejecutar.

DO $$
DECLARE
  v_auth_user RECORD;
  v_perfil RECORD;
  v_company_id UUID;
  v_default_role TEXT := 'cashier';
  v_linked_count INTEGER := 0;
  v_created_count INTEGER := 0;
BEGIN
  -- ============================================================================
  -- PASO 1: Vincular usuarios existentes en auth.users con perfiles por EMAIL
  -- ============================================================================
  RAISE NOTICE '🔄 Iniciando vinculación de usuarios por email...';
  
  FOR v_auth_user IN 
    SELECT au.id, au.email, au.created_at
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
    )
  LOOP
    -- Buscar perfil con el mismo email
    SELECT * INTO v_perfil
    FROM public.users
    WHERE email = v_auth_user.email
      AND (auth_user_id IS NULL OR auth_user_id != v_auth_user.id)
    LIMIT 1;
    
    IF v_perfil IS NOT NULL THEN
      -- Vincular perfil existente
      UPDATE public.users
      SET 
        auth_user_id = v_auth_user.id,
        updated_at = NOW()
      WHERE id = v_perfil.id;
      
      v_linked_count := v_linked_count + 1;
      RAISE NOTICE '✅ Vinculado: % (auth: %, perfil: %)', v_auth_user.email, v_auth_user.id, v_perfil.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Vinculación completada: % perfiles vinculados', v_linked_count;
  
  -- ============================================================================
  -- PASO 2: Crear perfiles faltantes para usuarios en auth.users
  -- ============================================================================
  RAISE NOTICE '🔄 Iniciando creación de perfiles faltantes...';
  
  FOR v_auth_user IN 
    SELECT au.id, au.email, au.created_at, au.raw_user_meta_data
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
    )
  LOOP
    -- Intentar obtener company_id del metadata o usar NULL
    -- Si el usuario tiene metadata con company_id, usarlo
    -- Si no, dejarlo NULL (requerirá asignación manual después)
    
    v_company_id := NULL;
    IF v_auth_user.raw_user_meta_data IS NOT NULL THEN
      v_company_id := (v_auth_user.raw_user_meta_data->>'company_id')::UUID;
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
      COALESCE(
        v_auth_user.raw_user_meta_data->>'name',
        v_auth_user.raw_user_meta_data->>'full_name',
        SPLIT_PART(v_auth_user.email, '@', 1)
      ),
      COALESCE(
        (v_auth_user.raw_user_meta_data->>'role')::TEXT,
        v_default_role
      ),
      v_company_id,
      true,
      v_auth_user.created_at,
      NOW()
    );
    
    v_created_count := v_created_count + 1;
    RAISE NOTICE '✅ Creado perfil para: % (auth: %, company_id: %)', 
      v_auth_user.email, v_auth_user.id, v_company_id;
  END LOOP;
  
  RAISE NOTICE '✅ Creación completada: % perfiles creados', v_created_count;
  
  -- ============================================================================
  -- PASO 3: Reporte final
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '📊 RESUMEN DE CORRECCIÓN:';
  RAISE NOTICE '   - Perfiles vinculados: %', v_linked_count;
  RAISE NOTICE '   - Perfiles creados: %', v_created_count;
  RAISE NOTICE '   - Total procesado: %', v_linked_count + v_created_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NOTA: Los perfiles creados sin company_id requerirán asignación manual.';
  RAISE NOTICE '   Ejecuta el diagnóstico nuevamente para verificar el estado.';
  
END $$;

-- ============================================================================
-- VERIFICACIÓN POST-CORRECCIÓN
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN' AS "Estado",
  COUNT(*) AS "Usuarios sin perfil",
  'Debe ser 0' AS "Esperado"
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
);



