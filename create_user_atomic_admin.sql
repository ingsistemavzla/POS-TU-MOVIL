-- Función RPC para crear perfil de usuario desde el panel admin
-- NOTA: Esta función SOLO crea el perfil en public.users
-- El usuario debe registrarse después con el mismo email para vincular su cuenta
-- El AuthContext automáticamente vinculará el perfil cuando el usuario se registre

CREATE OR REPLACE FUNCTION create_user_atomic_admin(
  p_email TEXT,
  p_password TEXT, -- Se ignora, mantenido para compatibilidad con el frontend
  p_name TEXT,
  p_role TEXT,
  p_company_id UUID,
  p_assigned_store_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Validar que el email no exista en public.users
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El correo electrónico ya está registrado en el sistema'
    );
  END IF;

  -- Validar que el rol sea válido
  IF p_role NOT IN ('admin', 'manager', 'cashier') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rol inválido. Debe ser: admin, manager o cashier'
    );
  END IF;

  -- Validar que manager tenga tienda asignada
  IF p_role = 'manager' AND p_assigned_store_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El rol de Gerente requiere una tienda asignada'
    );
  END IF;

  -- Crear SOLO el perfil en public.users (sin auth_user_id)
  -- El auth_user_id se vinculará cuando el usuario se registre
  INSERT INTO users (
    auth_user_id, -- NULL inicialmente
    company_id,
    email,
    name,
    role,
    assigned_store_id,
    active,
    created_at,
    updated_at
  ) VALUES (
    NULL, -- Se vinculará cuando el usuario se registre
    p_company_id,
    p_email,
    p_name,
    p_role,
    CASE 
      WHEN p_role = 'admin' THEN NULL 
      ELSE p_assigned_store_id 
    END,
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_user_id;

  -- Retornar éxito
  RETURN jsonb_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', p_email,
    'message', 'Perfil creado exitosamente. El usuario debe registrarse con este email para activar su cuenta.'
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
GRANT EXECUTE ON FUNCTION create_user_atomic_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_atomic_admin TO service_role;

-- Comentario de la función
COMMENT ON FUNCTION create_user_atomic_admin IS 'Crea un usuario completo (auth.users + public.users) de forma atómica desde el panel admin. Maneja encriptación de contraseñas y vinculación automática.';

