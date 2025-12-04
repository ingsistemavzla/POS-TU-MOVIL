-- ============================================================================
-- FUNCIÓN RPC: Vincular Perfil de Usuario por Email
-- ============================================================================
-- OBJETIVO: Permitir que un usuario autenticado vincule su auth_user_id
--           con un perfil existente en public.users que tenga el mismo email
-- ============================================================================

CREATE OR REPLACE FUNCTION public.link_user_profile_by_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id UUID;
  v_email TEXT;
  v_profile_id UUID;
  v_current_auth_user_id UUID;
BEGIN
  -- Obtener el auth_user_id del usuario actual
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no autenticado'
    );
  END IF;
  
  -- Obtener email del usuario autenticado
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_auth_user_id;
  
  IF v_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No se pudo obtener el email del usuario'
    );
  END IF;
  
  -- Buscar perfil con el mismo email
  SELECT id, auth_user_id INTO v_profile_id, v_current_auth_user_id
  FROM public.users
  WHERE email = v_email
  LIMIT 1;
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No se encontró un perfil con este email'
    );
  END IF;
  
  -- Si ya está vinculado correctamente, retornar éxito
  IF v_current_auth_user_id = v_auth_user_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'El perfil ya está vinculado correctamente',
      'profile_id', v_profile_id
    );
  END IF;
  
  -- Si está vinculado a otro usuario, no permitir el cambio
  IF v_current_auth_user_id IS NOT NULL AND v_current_auth_user_id != v_auth_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este perfil ya está vinculado a otro usuario'
    );
  END IF;
  
  -- Vincular el perfil (solo si auth_user_id es NULL o diferente)
  UPDATE public.users
  SET 
    auth_user_id = v_auth_user_id,
    updated_at = NOW()
  WHERE id = v_profile_id
    AND (auth_user_id IS NULL OR auth_user_id != v_auth_user_id);
  
  -- Verificar que se actualizó correctamente
  SELECT auth_user_id INTO v_current_auth_user_id
  FROM public.users
  WHERE id = v_profile_id;
  
  IF v_current_auth_user_id = v_auth_user_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Perfil vinculado exitosamente',
      'profile_id', v_profile_id,
      'auth_user_id', v_auth_user_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No se pudo vincular el perfil. Verificar permisos RLS.'
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.link_user_profile_by_email() TO authenticated;

-- Comentario
COMMENT ON FUNCTION public.link_user_profile_by_email IS 'Permite que un usuario autenticado vincule su auth_user_id con un perfil existente en public.users que tenga el mismo email. Útil para usuarios creados por admin que luego se registran.';


