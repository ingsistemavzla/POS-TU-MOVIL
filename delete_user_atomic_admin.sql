-- Función RPC para eliminar usuario de forma atómica desde el panel admin
-- Esta función elimina el perfil de public.users y el usuario de auth.users
-- Maneja las dependencias (inventory_transfers, sales, etc.) actualizándolas al admin principal

CREATE OR REPLACE FUNCTION delete_user_atomic_admin(
  p_user_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_company_id UUID;
  v_admin_id UUID;
BEGIN
  -- Obtener información del usuario a eliminar
  SELECT auth_user_id, email, name, company_id
  INTO v_auth_user_id, v_user_email, v_user_name, v_company_id
  FROM users
  WHERE id = p_user_profile_id;

  -- Verificar que el usuario existe
  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no encontrado'
    );
  END IF;

  -- Obtener el ID del primer admin activo de la empresa (para reasignar dependencias)
  SELECT id INTO v_admin_id
  FROM users
  WHERE company_id = v_company_id
    AND role = 'admin'
    AND active = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- Si no hay admin, usar el mismo usuario (mejor que dejar NULL)
  IF v_admin_id IS NULL THEN
    v_admin_id := p_user_profile_id;
  END IF;

  -- Actualizar dependencias en inventory_transfers
  UPDATE inventory_transfers
  SET transferred_by = v_admin_id
  WHERE transferred_by = p_user_profile_id;

  -- Actualizar dependencias en sales (cashier_id)
  UPDATE sales
  SET cashier_id = v_admin_id
  WHERE cashier_id = p_user_profile_id;

  -- Actualizar dependencias en admin_activity_log
  UPDATE admin_activity_log
  SET user_id = v_admin_id
  WHERE user_id = p_user_profile_id;

  -- Eliminar el perfil de public.users primero (para evitar problemas de FK)
  DELETE FROM users
  WHERE id = p_user_profile_id;

  -- Eliminar el usuario de auth.users
  IF v_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users
    WHERE id = v_auth_user_id;
  END IF;

  -- Retornar éxito
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Usuario %s eliminado exitosamente', COALESCE(v_user_name, v_user_email))
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION delete_user_atomic_admin TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_atomic_admin TO service_role;

-- Comentario de la función
COMMENT ON FUNCTION delete_user_atomic_admin IS 'Elimina un usuario de forma permanente (public.users + auth.users) y reasigna sus dependencias al admin principal de la empresa.';





