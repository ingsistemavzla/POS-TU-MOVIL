-- ============================================
-- SCRIPT SIMPLE PARA CREAR TU PERFIL
-- ============================================
-- Ejecuta cada paso por separado en Supabase SQL Editor

-- ============================================
-- PASO 1: Ver tu email y auth_user_id
-- ============================================
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================
-- PASO 2: Ver companies disponibles
-- ============================================
SELECT id, name, created_at 
FROM public.companies 
ORDER BY created_at ASC 
LIMIT 5;

-- ============================================
-- PASO 3: Crear tu perfil
-- ============================================
-- ⚠️ IMPORTANTE: Reemplaza estos valores antes de ejecutar:
--    - 'TU_EMAIL_AQUI' → Tu email (del PASO 1)
--    - 'TU_COMPANY_ID_AQUI' → Un company_id válido (del PASO 2)

INSERT INTO public.users (
  auth_user_id,
  company_id,
  email,
  name,
  role,
  active
)
SELECT 
  au.id as auth_user_id,
  'TU_COMPANY_ID_AQUI'::uuid as company_id,  -- ⚠️ REEMPLAZA
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  COALESCE(au.raw_user_meta_data->>'role', 'admin') as role,
  true as active
FROM auth.users au
WHERE au.email = 'TU_EMAIL_AQUI'  -- ⚠️ REEMPLAZA
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ REEMPLAZA
  )
RETURNING id, auth_user_id, email, name, role, company_id, active;

-- ============================================
-- PASO 4: Verificar que se creó
-- ============================================
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





