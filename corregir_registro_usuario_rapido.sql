-- ============================================================================
-- CORRECCIÓN RÁPIDA: Vincular Usuario Creado por Admin con Registro
-- ============================================================================
-- PROBLEMA: Usuario creado por admin en public.users (sin auth_user_id)
--           no puede registrarse porque no se vincula automáticamente
-- SOLUCIÓN: Vincular perfiles existentes con usuarios de auth.users por email
-- ============================================================================

DO $$
DECLARE
  v_linked_count INTEGER := 0;
  v_auth_user RECORD;
  v_perfil RECORD;
BEGIN
  RAISE NOTICE '🔄 Iniciando vinculación de usuarios por email...';
  
  -- Buscar usuarios en auth.users que tienen un perfil en public.users con el mismo email
  -- pero que NO están vinculados (auth_user_id es NULL o diferente)
  FOR v_auth_user IN 
    SELECT au.id AS auth_id, au.email, au.created_at AS auth_created
    FROM auth.users au
    WHERE EXISTS (
      SELECT 1 
      FROM public.users pu 
      WHERE pu.email = au.email
        AND (pu.auth_user_id IS NULL OR pu.auth_user_id != au.id)
    )
  LOOP
    -- Buscar el perfil con el mismo email
    SELECT * INTO v_perfil
    FROM public.users
    WHERE email = v_auth_user.email
      AND (auth_user_id IS NULL OR auth_user_id != v_auth_user.auth_id)
    ORDER BY created_at ASC  -- Tomar el más antiguo si hay duplicados
    LIMIT 1;
    
    IF v_perfil IS NOT NULL THEN
      -- Vincular el perfil con el auth_user_id
      UPDATE public.users
      SET 
        auth_user_id = v_auth_user.auth_id,
        updated_at = NOW()
      WHERE id = v_perfil.id;
      
      v_linked_count := v_linked_count + 1;
      RAISE NOTICE '✅ Vinculado: % (auth: %, perfil: %)', 
        v_auth_user.email, v_auth_user.auth_id, v_perfil.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Vinculación completada: % perfiles vinculados', v_linked_count;
  RAISE NOTICE '';
  
  -- Mostrar usuarios que aún no están vinculados
  RAISE NOTICE '📋 Usuarios en auth.users sin perfil vinculado:';
  FOR v_auth_user IN 
    SELECT au.id, au.email
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
    )
  LOOP
    RAISE NOTICE '   ⚠️  % (auth_id: %)', v_auth_user.email, v_auth_user.id;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Perfiles en public.users sin auth_user_id:';
  FOR v_perfil IN 
    SELECT id, email, name, role
    FROM public.users
    WHERE auth_user_id IS NULL
  LOOP
    RAISE NOTICE '   ⚠️  % (perfil_id: %, rol: %)', 
      v_perfil.email, v_perfil.id, v_perfil.role;
  END LOOP;
  
END $$;

-- ============================================================================
-- VERIFICACIÓN POST-CORRECCIÓN
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN' AS "Estado",
  COUNT(*) AS "Usuarios sin perfil",
  'Debe ser 0 o mínimo' AS "Esperado"
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
);

SELECT 
  '✅ VERIFICACIÓN' AS "Estado",
  COUNT(*) AS "Perfiles sin auth_user_id",
  'Debe ser 0 o mínimo' AS "Esperado"
FROM public.users pu
WHERE pu.auth_user_id IS NULL;


