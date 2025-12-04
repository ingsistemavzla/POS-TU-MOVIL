-- ============================================================================
-- CORRECCIÓN: Función create_user_atomic_admin Mejorada
-- Fecha: 2025-01-27
-- Objetivo: Manejar casos donde el email existe en auth.users pero no en public.users
--           y vincular automáticamente cuando sea posible
-- ============================================================================

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
  existing_auth_user_id UUID;
  existing_profile_id UUID;
  v_auth_user RECORD;
BEGIN
  -- ============================================================================
  -- CASO 1: Email existe en auth.users pero NO en public.users
  -- Solución: Crear perfil y vincularlo automáticamente
  -- ============================================================================
  SELECT id INTO existing_auth_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
  
  -- ============================================================================
  -- CASO 2: Email existe en public.users
  -- Verificar si tiene auth_user_id o si necesita vinculación
  -- ============================================================================
  SELECT id, auth_user_id INTO existing_profile_id, existing_auth_user_id
  FROM users
  WHERE email = p_email
  LIMIT 1;
  
  -- Si existe perfil con auth_user_id ya vinculado
  IF existing_profile_id IS NOT NULL AND existing_auth_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El correo electrónico ya está registrado en el sistema con un usuario vinculado',
      'user_id', existing_profile_id,
      'auth_user_id', existing_auth_user_id,
      'action', 'already_linked'
    );
  END IF;
  
  -- Si existe perfil SIN auth_user_id, intentar vincularlo
  IF existing_profile_id IS NOT NULL AND existing_auth_user_id IS NULL THEN
    -- Buscar si hay un usuario en auth.users con este email
    SELECT id INTO existing_auth_user_id
    FROM auth.users
    WHERE email = p_email
    LIMIT 1;
    
    IF existing_auth_user_id IS NOT NULL THEN
      -- Vincular perfil existente con auth_user_id
      UPDATE users
      SET 
        auth_user_id = existing_auth_user_id,
        company_id = COALESCE(company_id, p_company_id), -- Actualizar company_id si es NULL
        name = COALESCE(name, p_name), -- Actualizar nombre si es NULL
        role = COALESCE(role, p_role), -- Actualizar rol si es NULL
        assigned_store_id = CASE 
          WHEN p_role = 'admin' THEN NULL 
          ELSE COALESCE(assigned_store_id, p_assigned_store_id)
        END,
        updated_at = NOW()
      WHERE id = existing_profile_id
      RETURNING id INTO new_user_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'user_id', new_user_id,
        'email', p_email,
        'auth_user_id', existing_auth_user_id,
        'message', 'Perfil existente vinculado exitosamente con la cuenta de autenticación',
        'action', 'linked_existing'
      );
    ELSE
      -- Perfil existe pero no hay usuario en auth.users
      -- Actualizar perfil con los nuevos datos
      UPDATE users
      SET 
        company_id = COALESCE(company_id, p_company_id),
        name = COALESCE(name, p_name),
        role = COALESCE(role, p_role),
        assigned_store_id = CASE 
          WHEN p_role = 'admin' THEN NULL 
          ELSE COALESCE(assigned_store_id, p_assigned_store_id)
        END,
        updated_at = NOW()
      WHERE id = existing_profile_id
      RETURNING id INTO new_user_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'user_id', new_user_id,
        'email', p_email,
        'message', 'Perfil actualizado. El usuario debe registrarse con este email para vincular su cuenta',
        'action', 'updated_existing'
      );
    END IF;
  END IF;
  
  -- ============================================================================
  -- CASO 3: Email existe en auth.users pero NO en public.users
  -- Solución: Crear perfil y vincularlo automáticamente
  -- ============================================================================
  IF existing_auth_user_id IS NOT NULL AND existing_profile_id IS NULL THEN
    -- Obtener información adicional del usuario en auth.users
    SELECT * INTO v_auth_user
    FROM auth.users
    WHERE id = existing_auth_user_id;
    
    -- Crear perfil vinculado automáticamente
    INSERT INTO users (
      auth_user_id, -- Vincular inmediatamente
      company_id,
      email,
      name,
      role,
      assigned_store_id,
      active,
      created_at,
      updated_at
    ) VALUES (
      existing_auth_user_id,
      p_company_id,
      p_email,
      COALESCE(p_name, v_auth_user.raw_user_meta_data->>'name', SPLIT_PART(p_email, '@', 1)),
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
    
    RETURN jsonb_build_object(
      'success', true,
      'user_id', new_user_id,
      'email', p_email,
      'auth_user_id', existing_auth_user_id,
      'message', 'Perfil creado y vinculado exitosamente con la cuenta de autenticación existente',
      'action', 'created_and_linked'
    );
  END IF;
  
  -- ============================================================================
  -- CASO 4: Email NO existe en ningún lado (caso normal)
  -- Solución: Crear perfil nuevo sin auth_user_id (el usuario se registrará después)
  -- ============================================================================
  
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
    'message', 'Perfil creado exitosamente. El usuario debe registrarse con este email para activar su cuenta.',
    'action', 'created_new'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El correo electrónico ya está registrado (violación de restricción única)'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION create_user_atomic_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_atomic_admin TO service_role;

-- Comentario de la función
COMMENT ON FUNCTION create_user_atomic_admin IS 'Crea o vincula perfiles de usuario de forma inteligente. Maneja casos donde el email existe en auth.users pero no en public.users, y viceversa.';



