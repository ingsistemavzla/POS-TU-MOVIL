-- ============================================================================
-- SOLUCIÓN: Función para Eliminar Usuario por Email
-- ============================================================================
-- Esta función permite eliminar un usuario buscándolo por email,
-- manteniendo todas las validaciones de seguridad existentes.

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
  SELECT id, company_id
  INTO v_user_profile_id, v_user_company_id
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
COMMENT ON FUNCTION delete_user_by_email IS 'Elimina un usuario buscándolo por email. Solo permite eliminar usuarios de la misma empresa del admin que ejecuta la función.';


