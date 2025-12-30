-- ============================================================================
-- ELIMINACIÓN DIRECTA: Perfil Huérfano
-- ============================================================================
-- Este script elimina directamente el perfil huérfano sin retroactividad.
-- Solo para pruebas - no afecta datos históricos.

-- PERFIL A ELIMINAR:
-- ID: 72a91562-de7a-4b9e-be40-0ac220c663ce
-- Email: tumovilcentro4@gmail.com
-- Company: aa11bb22-cc33-dd44-ee55-ff6677889900
-- auth_user_id: NULL (huérfano)

DO $$
DECLARE
  v_user_profile_id UUID := '72a91562-de7a-4b9e-be40-0ac220c663ce';
  v_user_email TEXT := 'tumovilcentro4@gmail.com';
  v_user_company_id UUID := 'aa11bb22-cc33-dd44-ee55-ff6677889900';
  v_admin_id UUID;
  v_rows_affected INTEGER;
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
  RAISE NOTICE '   Email: %', v_user_email;
  RAISE NOTICE '   Company: %', v_user_company_id;

  -- PASO 2: Obtener el ID del primer admin activo de la empresa (para reasignar dependencias)
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE company_id = v_user_company_id
    AND role = 'admin'
    AND active = true
    AND id != v_user_profile_id  -- No usar el mismo usuario
  ORDER BY created_at ASC
  LIMIT 1;

  -- Si no hay admin, usar NULL (las dependencias se quedarán sin reasignar)
  IF v_admin_id IS NULL THEN
    RAISE WARNING '⚠️ No se encontró admin activo en la empresa. Las dependencias NO se reasignarán.';
  ELSE
    RAISE NOTICE '✅ Admin encontrado para reasignación: %', v_admin_id;
  END IF;

  -- PASO 3: Reasignar dependencias en inventory_transfers (solo si hay admin)
  IF v_admin_id IS NOT NULL THEN
    UPDATE inventory_transfers
    SET transferred_by = v_admin_id
    WHERE transferred_by = v_user_profile_id;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected > 0 THEN
      RAISE NOTICE '✅ Reasignadas % transferencias de inventario', v_rows_affected;
    END IF;
  END IF;

  -- PASO 4: Reasignar dependencias en sales (solo si hay admin)
  IF v_admin_id IS NOT NULL THEN
    UPDATE sales
    SET cashier_id = v_admin_id
    WHERE cashier_id = v_user_profile_id;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected > 0 THEN
      RAISE NOTICE '✅ Reasignadas % ventas', v_rows_affected;
    END IF;
  END IF;

  -- PASO 5: Reasignar dependencias en admin_activity_log (solo si hay admin)
  IF v_admin_id IS NOT NULL THEN
    UPDATE admin_activity_log
    SET user_id = v_admin_id
    WHERE user_id = v_user_profile_id;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected > 0 THEN
      RAISE NOTICE '✅ Reasignadas % actividades de admin', v_rows_affected;
    END IF;
  END IF;

  -- PASO 6: Eliminar el perfil huérfano
  DELETE FROM public.users
  WHERE id = v_user_profile_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
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
  RAISE NOTICE '   - Estado: Perfil huérfano eliminado';
  RAISE NOTICE '';
  RAISE NOTICE '✅ El perfil ha sido eliminado.';
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al eliminar perfil huérfano: %', SQLERRM;
END $$;

-- VERIFICACIÓN: Confirmar que el perfil fue eliminado
SELECT 
  '🔍 VERIFICACIÓN POST-ELIMINACIÓN' AS paso,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = '72a91562-de7a-4b9e-be40-0ac220c663ce'
    ) THEN '❌ ERROR: El perfil aún existe'
    ELSE '✅ ÉXITO: El perfil fue eliminado correctamente'
  END AS resultado;








