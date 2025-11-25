-- Drop the previous function
DROP FUNCTION IF EXISTS public.create_user_directly(text, text, text, text, uuid, uuid);

-- Create function that creates both auth user and profile
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
  v_auth_user_id uuid;
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

  -- Create auth user first
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    NOW(),
    '',
    NOW(),
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL
  ) RETURNING id INTO v_auth_user_id;

  -- Create user profile with the auth_user_id
  INSERT INTO public.users (
    auth_user_id,
    company_id,
    name,
    email,
    role,
    active,
    assigned_store_id
  ) VALUES (
    v_auth_user_id,
    p_company_id,
    p_name,
    p_email,
    p_role,
    true,
    p_assigned_store_id
  ) RETURNING id INTO v_user_id;

  -- Return success result
  RETURN json_build_object(
    'error', false,
    'message', 'Usuario creado exitosamente. Puede iniciar sesión inmediatamente.',
    'user_id', v_user_id,
    'auth_user_id', v_auth_user_id,
    'email', p_email
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
