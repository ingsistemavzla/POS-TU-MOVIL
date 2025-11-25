-- Drop the previous function
DROP FUNCTION IF EXISTS public.create_user_directly(text, text, text, text, uuid, uuid);

-- Create function that creates user profile and provides auth setup instructions
CREATE OR REPLACE FUNCTION public.create_user_directly(
  p_email text,
  p_password text,
  p_name text,
  p_role text,
  p_company_id uuid,
  p_assigned_store_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Solo los administradores pueden crear usuarios',
      'code', 'INSUFFICIENT_PERMISSIONS'
    );
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
    RETURN json_build_object(
      'error', true,
      'message', 'El correo electrónico ya está registrado',
      'code', 'EMAIL_EXISTS'
    );
  END IF;

  -- Create user profile without auth_user_id initially
  INSERT INTO public.users (
    company_id,
    name,
    email,
    role,
    active,
    assigned_store_id
  ) VALUES (
    p_company_id,
    p_name,
    p_email,
    p_role,
    true,
    p_assigned_store_id
  ) RETURNING id INTO v_user_id;

  -- Return success result with auth setup instructions
  RETURN json_build_object(
    'error', false,
    'message', 'Perfil de usuario creado. El usuario debe completar el registro para activar su cuenta.',
    'user_id', v_user_id,
    'email', p_email,
    'password', p_password,
    'instructions', 'El usuario debe ir a la página de registro y usar este email para completar su cuenta con la contraseña proporcionada.'
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
