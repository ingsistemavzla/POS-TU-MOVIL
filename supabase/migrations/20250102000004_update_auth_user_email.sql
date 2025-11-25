-- Migration: Update auth user email directly
-- This function allows updating the email in auth.users without requiring email confirmation
-- when email verification is disabled

CREATE OR REPLACE FUNCTION update_auth_user_email(
  p_user_id UUID,
  p_new_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_old_email TEXT;
BEGIN
  -- Check if user exists in auth.users
  SELECT email INTO v_old_email
  FROM auth.users
  WHERE id = p_user_id;
  
  IF v_old_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users'
    );
  END IF;
  
  -- Update the email in auth.users
  UPDATE auth.users
  SET 
    email = p_new_email,
    email_confirmed_at = NOW(), -- Mark as confirmed since verification is disabled
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Check if the update was successful
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Email updated successfully in auth.users',
      'old_email', v_old_email,
      'new_email', p_new_email
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to update email in auth.users'
    );
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_auth_user_email(UUID, TEXT) TO authenticated;
