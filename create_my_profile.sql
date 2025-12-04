-- Script para crear tu perfil de usuario
-- Ejecuta esto en Supabase SQL Editor

-- PASO 1: Verificar si ya tienes un perfil
SELECT 
  u.id,
  u.auth_user_id,
  u.email,
  u.name,
  u.role,
  u.company_id,
  c.name as company_name
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
WHERE u.email = 'TU_EMAIL_AQUI';  -- ⚠️ REEMPLAZA CON TU EMAIL

-- PASO 2: Ver qué companies existen (para obtener un company_id)
SELECT id, name, created_at 
FROM public.companies 
ORDER BY created_at ASC 
LIMIT 5;

-- PASO 3: Si no tienes perfil, ejecuta esto (reemplaza los valores):
-- ⚠️ IMPORTANTE: Reemplaza 'TU_EMAIL_AQUI' con tu email
-- ⚠️ IMPORTANTE: Reemplaza 'TU_COMPANY_ID_AQUI' con un company_id válido del PASO 2

DO $$
DECLARE
  v_auth_user_id UUID;
  v_company_id UUID;
  v_user_email TEXT := 'TU_EMAIL_AQUI';  -- ⚠️ REEMPLAZA CON TU EMAIL
  v_company_id_str TEXT := 'TU_COMPANY_ID_AQUI';  -- ⚠️ REEMPLAZA CON UN COMPANY_ID VÁLIDO
  v_user_id UUID;
BEGIN
  -- Verificar si ya existe perfil
  IF EXISTS (SELECT 1 FROM public.users WHERE email = v_user_email) THEN
    RAISE NOTICE 'El usuario ya tiene un perfil';
    RETURN;
  END IF;

  -- Obtener auth_user_id del email
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_user_email
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró usuario en auth.users con el email: %', v_user_email;
  END IF;

  -- Convertir company_id string a UUID
  v_company_id := v_company_id_str::uuid;

  -- Verificar que el company_id existe
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = v_company_id) THEN
    RAISE EXCEPTION 'El company_id % no existe en la tabla companies', v_company_id_str;
  END IF;

  -- Crear perfil de usuario
  INSERT INTO public.users (
    auth_user_id,
    company_id,
    email,
    name,
    role,
    active
  )
  VALUES (
    v_auth_user_id,
    v_company_id,
    v_user_email,
    COALESCE(
      (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = v_auth_user_id),
      split_part(v_user_email, '@', 1)
    ),
    COALESCE(
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = v_auth_user_id),
      'admin'
    ),
    true
  )
  RETURNING id INTO v_user_id;

  RAISE NOTICE 'Perfil creado exitosamente. User ID: %, Email: %', v_user_id, v_user_email;

END $$;

-- PASO 4: Verificar que se creó correctamente
SELECT 
  u.id,
  u.auth_user_id,
  u.email,
  u.name,
  u.role,
  u.company_id,
  c.name as company_name,
  u.active
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
WHERE u.email = 'TU_EMAIL_AQUI';  -- ⚠️ REEMPLAZA CON TU EMAIL





