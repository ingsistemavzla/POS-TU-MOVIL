-- Create function to delete user completely (both profile and auth user)
CREATE OR REPLACE FUNCTION public.delete_user_complete(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
  v_user_name text;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Solo los administradores pueden eliminar usuarios',
      'code', 'INSUFFICIENT_PERMISSIONS'
    );
  END IF;

  -- Get user data before deletion
  SELECT auth_user_id, name INTO v_auth_user_id, v_user_name
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Usuario no encontrado',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Delete the user profile (this will cascade to related tables)
  DELETE FROM public.users WHERE id = p_user_id;

  -- If user has auth_user_id, delete from auth.users
  IF v_auth_user_id IS NOT NULL THEN
    -- Delete from auth.users using admin privileges
    DELETE FROM auth.users WHERE id = v_auth_user_id;
  END IF;

  -- Return success result
  RETURN json_build_object(
    'error', false,
    'message', 'Usuario eliminado completamente',
    'user_name', v_user_name,
    'auth_user_deleted', v_auth_user_id IS NOT NULL
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;
