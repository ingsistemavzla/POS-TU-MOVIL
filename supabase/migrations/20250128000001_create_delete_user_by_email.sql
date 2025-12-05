-- ============================================================================
-- MIGRACIÓN: Función para Eliminar Usuario por Email
-- ============================================================================
-- Esta función permite eliminar un usuario buscándolo por email,
-- manteniendo todas las validaciones de seguridad existentes.
-- 
-- Fecha: 2025-01-28
-- Problema: delete_user_atomic_admin requiere UUID, pero a veces necesitamos
--           eliminar por email cuando el usuario no aparece en la UI.
-- Actualización: Ahora maneja perfiles huérfanos (auth_user_id IS NULL)

CREATE OR REPLACE FUNCTION delete_user_by_email(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_profile_id UUID;
  v_user_company_id UUID;
  v_current_user_company_id UUID;
  v_auth_user_id UUID;
  v_user_name TEXT;
  v_admin_id UUID;
  v_result JSONB;
BEGIN
  -- Validar que el email no esté vacío
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El email no puede estar vacío'
    );
  END IF;

  -- Obtener company_id del usuario actual (admin que ejecuta)
  v_current_user_company_id := public.get_user_company_id();

  -- Validar que el usuario actual es admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo los administradores pueden eliminar usuarios'
    );
  END IF;

  -- Buscar usuario por email (case-insensitive) y misma empresa
  -- Incluir auth_user_id para detectar perfiles huérfanos
  SELECT id, company_id, auth_user_id, name
  INTO v_user_profile_id, v_user_company_id, v_auth_user_id, v_user_name
  FROM users
  WHERE LOWER(email) = LOWER(TRIM(p_email))
    AND company_id = v_current_user_company_id  -- Seguridad: Solo misma empresa
  LIMIT 1;

  -- Si no se encuentra, retornar error descriptivo
  IF v_user_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Usuario con email %s no encontrado en tu empresa. Verifica que el email sea correcto y que el usuario pertenezca a tu empresa.', p_email)
    );
  END IF;

  -- CASO ESPECIAL: Perfil huérfano (auth_user_id IS NULL)
  -- No podemos usar delete_user_atomic_admin porque requiere auth_user_id
  IF v_auth_user_id IS NULL THEN
    -- Obtener el ID del primer admin activo de la empresa (para reasignar dependencias)
    SELECT id INTO v_admin_id
    FROM users
    WHERE company_id = v_user_company_id
      AND role = 'admin'
      AND active = true
    ORDER BY created_at ASC
    LIMIT 1;

    -- Si no hay admin, usar el mismo usuario (se eliminará con el perfil)
    IF v_admin_id IS NULL THEN
      v_admin_id := v_user_profile_id;
    END IF;

    -- Reasignar dependencias en inventory_transfers
    UPDATE inventory_transfers
    SET transferred_by = v_admin_id
    WHERE transferred_by = v_user_profile_id;

    -- Reasignar dependencias en sales (cashier_id)
    UPDATE sales
    SET cashier_id = v_admin_id
    WHERE cashier_id = v_user_profile_id;

    -- Reasignar dependencias en admin_activity_log
    UPDATE admin_activity_log
    SET user_id = v_admin_id
    WHERE user_id = v_user_profile_id;

    -- Eliminar el perfil huérfano (no hay auth.users que eliminar)
    DELETE FROM users
    WHERE id = v_user_profile_id;

    -- Retornar éxito
    RETURN jsonb_build_object(
      'success', true,
      'message', format('Perfil huérfano %s eliminado exitosamente', COALESCE(v_user_name, p_email)),
      'was_orphan', true
    );
  END IF;

  -- CASO NORMAL: Perfil válido con auth_user_id
  -- Llamar a la función existente de eliminación atómica
  SELECT delete_user_atomic_admin(v_user_profile_id) INTO v_result;
  
  -- Retornar el resultado
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Error al eliminar usuario: %s', SQLERRM)
    );
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION delete_user_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_by_email TO service_role;

-- Comentario de la función
COMMENT ON FUNCTION delete_user_by_email IS 'Elimina un usuario buscándolo por email. Solo permite eliminar usuarios de la misma empresa del admin que ejecuta la función. Maneja tanto perfiles válidos como perfiles huérfanos (auth_user_id IS NULL).';
