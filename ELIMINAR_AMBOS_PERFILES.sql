-- ============================================================================
-- ELIMINACIÓN COMPLETA: Ambos Perfiles de tumovilcentro4@gmail.com
-- ============================================================================
-- Este script elimina AMBOS perfiles (huérfano y válido) de forma segura.

-- PERFIL 1 (HUÉRFANO):
-- ID: 72a91562-de7a-4b9e-be40-0ac220c663ce
-- Company: aa11bb22-cc33-dd44-ee55-ff6677889900
-- auth_user_id: NULL

-- PERFIL 2 (VÁLIDO):
-- ID: 6bc65d7c-c858-4457-a4cf-0b3670a4a082
-- Company: db66d95b-9a33-4b4b-9157-5e34d5fb610a
-- auth_user_id: a0d30702-6fbf-46ae-9144-bd381e73e878

DO $$
DECLARE
  -- Perfil 1 (Huérfano)
  v_profile1_id UUID := '72a91562-de7a-4b9e-be40-0ac220c663ce';
  v_company1_id UUID := 'aa11bb22-cc33-dd44-ee55-ff6677889900';
  
  -- Perfil 2 (Válido)
  v_profile2_id UUID := '6bc65d7c-c858-4457-a4cf-0b3670a4a082';
  v_company2_id UUID := 'db66d95b-9a33-4b4b-9157-5e34d5fb610a';
  v_auth2_id UUID := 'a0d30702-6fbf-46ae-9144-bd381e73e878';
  
  -- Variables auxiliares
  v_admin_id UUID;
  v_rows_affected INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ ========================================';
  RAISE NOTICE '🗑️ ELIMINACIÓN DE AMBOS PERFILES';
  RAISE NOTICE '🗑️ ========================================';
  RAISE NOTICE '';

  -- ========================================================================
  -- PERFIL 1: HUÉRFANO (auth_user_id IS NULL)
  -- ========================================================================
  RAISE NOTICE '📋 PERFIL 1: Eliminando perfil huérfano...';
  RAISE NOTICE '   ID: %', v_profile1_id;
  RAISE NOTICE '   Company: %', v_company1_id;

  -- Verificar que existe
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_profile1_id) THEN
    -- Obtener admin para reasignar dependencias
    SELECT id INTO v_admin_id
    FROM public.users
    WHERE company_id = v_company1_id
      AND role = 'admin'
      AND active = true
      AND id != v_profile1_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_admin_id IS NOT NULL THEN
      RAISE NOTICE '   ✅ Admin encontrado para reasignación: %', v_admin_id;
      
      -- Reasignar dependencias
      UPDATE inventory_transfers SET transferred_by = v_admin_id WHERE transferred_by = v_profile1_id;
      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      IF v_rows_affected > 0 THEN RAISE NOTICE '      - Reasignadas % transferencias', v_rows_affected; END IF;

      UPDATE sales SET cashier_id = v_admin_id WHERE cashier_id = v_profile1_id;
      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      IF v_rows_affected > 0 THEN RAISE NOTICE '      - Reasignadas % ventas', v_rows_affected; END IF;

      UPDATE admin_activity_log SET user_id = v_admin_id WHERE user_id = v_profile1_id;
      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      IF v_rows_affected > 0 THEN RAISE NOTICE '      - Reasignadas % actividades', v_rows_affected; END IF;
    ELSE
      RAISE WARNING '   ⚠️ No se encontró admin. Las dependencias NO se reasignarán.';
    END IF;

    -- Eliminar perfil huérfano
    DELETE FROM public.users WHERE id = v_profile1_id;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected > 0 THEN
      RAISE NOTICE '   ✅ Perfil huérfano eliminado exitosamente';
    ELSE
      RAISE WARNING '   ⚠️ No se pudo eliminar el perfil huérfano';
    END IF;
  ELSE
    RAISE NOTICE '   ℹ️ Perfil huérfano no existe (ya fue eliminado)';
  END IF;

  RAISE NOTICE '';

  -- ========================================================================
  -- PERFIL 2: VÁLIDO (tiene auth_user_id)
  -- ========================================================================
  RAISE NOTICE '📋 PERFIL 2: Eliminando perfil válido...';
  RAISE NOTICE '   ID: %', v_profile2_id;
  RAISE NOTICE '   Company: %', v_company2_id;
  RAISE NOTICE '   Auth ID: %', v_auth2_id;

  -- Verificar que existe
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_profile2_id) THEN
    -- Obtener admin para reasignar dependencias
    SELECT id INTO v_admin_id
    FROM public.users
    WHERE company_id = v_company2_id
      AND role = 'admin'
      AND active = true
      AND id != v_profile2_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_admin_id IS NOT NULL THEN
      RAISE NOTICE '   ✅ Admin encontrado para reasignación: %', v_admin_id;
      
      -- Reasignar dependencias
      UPDATE inventory_transfers SET transferred_by = v_admin_id WHERE transferred_by = v_profile2_id;
      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      IF v_rows_affected > 0 THEN RAISE NOTICE '      - Reasignadas % transferencias', v_rows_affected; END IF;

      UPDATE sales SET cashier_id = v_admin_id WHERE cashier_id = v_profile2_id;
      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      IF v_rows_affected > 0 THEN RAISE NOTICE '      - Reasignadas % ventas', v_rows_affected; END IF;

      UPDATE admin_activity_log SET user_id = v_admin_id WHERE user_id = v_profile2_id;
      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      IF v_rows_affected > 0 THEN RAISE NOTICE '      - Reasignadas % actividades', v_rows_affected; END IF;
    ELSE
      RAISE WARNING '   ⚠️ No se encontró admin. Las dependencias NO se reasignarán.';
    END IF;

    -- Eliminar perfil de public.users
    DELETE FROM public.users WHERE id = v_profile2_id;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected > 0 THEN
      RAISE NOTICE '   ✅ Perfil eliminado de public.users';
    ELSE
      RAISE WARNING '   ⚠️ No se pudo eliminar el perfil de public.users';
    END IF;

    -- Eliminar usuario de auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth2_id) THEN
      DELETE FROM auth.users WHERE id = v_auth2_id;
      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      
      IF v_rows_affected > 0 THEN
        RAISE NOTICE '   ✅ Usuario eliminado de auth.users';
      ELSE
        RAISE WARNING '   ⚠️ No se pudo eliminar el usuario de auth.users';
      END IF;
    ELSE
      RAISE NOTICE '   ℹ️ Usuario no existe en auth.users (ya fue eliminado)';
    END IF;

    RAISE NOTICE '   ✅ Perfil válido eliminado exitosamente';
  ELSE
    RAISE NOTICE '   ℹ️ Perfil válido no existe (ya fue eliminado)';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ ELIMINACIÓN COMPLETA FINALIZADA';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al eliminar perfiles: %', SQLERRM;
END $$;

-- ============================================================================
-- VERIFICACIÓN POST-ELIMINACIÓN
-- ============================================================================

-- Verificar que ambos perfiles fueron eliminados
SELECT 
  '🔍 VERIFICACIÓN FINAL' AS paso,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.users 
      WHERE id IN (
        '72a91562-de7a-4b9e-be40-0ac220c663ce',
        '6bc65d7c-c858-4457-a4cf-0b3670a4a082'
      )
    ) THEN '❌ ERROR: Algunos perfiles aún existen'
    ELSE '✅ ÉXITO: Ambos perfiles fueron eliminados correctamente'
  END AS resultado;

-- Listar todos los usuarios con ese email (debería retornar 0 filas)
SELECT 
  '🔍 BÚSQUEDA POR EMAIL' AS paso,
  id,
  email,
  name,
  company_id,
  auth_user_id,
  active
FROM public.users
WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com');

-- Verificar que el usuario de auth.users también fue eliminado
SELECT 
  '🔍 VERIFICACIÓN auth.users' AS paso,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = 'a0d30702-6fbf-46ae-9144-bd381e73e878'
    ) THEN '❌ ERROR: El usuario aún existe en auth.users'
    ELSE '✅ ÉXITO: El usuario fue eliminado de auth.users'
  END AS resultado;








