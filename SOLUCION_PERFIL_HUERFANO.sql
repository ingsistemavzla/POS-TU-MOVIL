-- ============================================================================
-- SOLUCIÓN: Eliminar Perfil Huérfano (auth_user_id IS NULL)
-- ============================================================================
-- PROBLEMA DETECTADO:
-- - Usuario: tumovilcentro4@gmail.com
-- - Perfil ID: 72a91562-de7a-4b9e-be40-0ac220c663ce
-- - auth_user_id: NULL (perfil huérfano - no vinculado a auth.users)
-- - Company ID: aa11bb22-cc33-dd44-ee55-ff6677889900
--
-- Este script elimina el perfil huérfano y sus dependencias.

DO $$
DECLARE
  v_user_profile_id UUID := '72a91562-de7a-4b9e-be40-0ac220c663ce';
  v_user_email TEXT := 'tumovilcentro4@gmail.com';
  v_user_company_id UUID := 'aa11bb22-cc33-dd44-ee55-ff6677889900';
  v_admin_id UUID;
  v_dependencies_count INTEGER;
BEGIN
  -- PASO 1: Verificar que el perfil existe y es huérfano
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = v_user_profile_id 
      AND auth_user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'El perfil no existe o ya tiene auth_user_id vinculado';
  END IF;

  RAISE NOTICE '✅ Perfil huérfano encontrado: %', v_user_profile_id;

  -- PASO 2: Obtener el ID del primer admin activo de la empresa (para reasignar dependencias)
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE company_id = v_user_company_id
    AND role = 'admin'
    AND active = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- Si no hay admin, usar el mismo usuario (mejor que dejar NULL)
  IF v_admin_id IS NULL THEN
    RAISE WARNING '⚠️ No se encontró admin activo en la empresa. Las dependencias se reasignarán al mismo usuario (se eliminarán con el perfil).';
    v_admin_id := v_user_profile_id;
  ELSE
    RAISE NOTICE '✅ Admin encontrado para reasignación: %', v_admin_id;
  END IF;

  -- PASO 3: Contar dependencias antes de reasignar
  SELECT COUNT(*) INTO v_dependencies_count
  FROM (
    SELECT cashier_id FROM sales WHERE cashier_id = v_user_profile_id
    UNION ALL
    SELECT transferred_by FROM inventory_transfers WHERE transferred_by = v_user_profile_id
    UNION ALL
    SELECT user_id FROM admin_activity_log WHERE user_id = v_user_profile_id
  ) AS deps;

  IF v_dependencies_count > 0 THEN
    RAISE NOTICE '📊 Dependencias encontradas: % registros', v_dependencies_count;
  END IF;

  -- PASO 4: Reasignar dependencias en inventory_transfers
  UPDATE inventory_transfers
  SET transferred_by = v_admin_id
  WHERE transferred_by = v_user_profile_id;

  GET DIAGNOSTICS v_dependencies_count = ROW_COUNT;
  IF v_dependencies_count > 0 THEN
    RAISE NOTICE '✅ Reasignadas % transferencias de inventario', v_dependencies_count;
  END IF;

  -- PASO 5: Reasignar dependencias en sales (cashier_id)
  UPDATE sales
  SET cashier_id = v_admin_id
  WHERE cashier_id = v_user_profile_id;

  GET DIAGNOSTICS v_dependencies_count = ROW_COUNT;
  IF v_dependencies_count > 0 THEN
    RAISE NOTICE '✅ Reasignadas % ventas', v_dependencies_count;
  END IF;

  -- PASO 6: Reasignar dependencias en admin_activity_log
  UPDATE admin_activity_log
  SET user_id = v_admin_id
  WHERE user_id = v_user_profile_id;

  GET DIAGNOSTICS v_dependencies_count = ROW_COUNT;
  IF v_dependencies_count > 0 THEN
    RAISE NOTICE '✅ Reasignadas % actividades de admin', v_dependencies_count;
  END IF;

  -- PASO 7: Eliminar el perfil huérfano
  DELETE FROM public.users
  WHERE id = v_user_profile_id;

  GET DIAGNOSTICS v_dependencies_count = ROW_COUNT;
  IF v_dependencies_count = 0 THEN
    RAISE EXCEPTION 'No se pudo eliminar el perfil. Verifica que el ID sea correcto.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ PERFIL HUÉRFANO ELIMINADO EXITOSAMENTE';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 RESUMEN:';
  RAISE NOTICE '   - Perfil ID: %', v_user_profile_id;
  RAISE NOTICE '   - Email: %', v_user_email;
  RAISE NOTICE '   - Company ID: %', v_user_company_id;
  RAISE NOTICE '   - Estado: Perfil huérfano (auth_user_id IS NULL)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ El perfil y todas sus dependencias han sido eliminadas/reasignadas.';
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al eliminar perfil huérfano: %', SQLERRM;
END $$;





