-- Crear perfil para zonagamermargarita@gmail.com
-- Company: Zona Gammer (f1f036c0-dd6c-423e-8575-c3bc86b7a6b0)

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
  'f1f036c0-dd6c-423e-8575-c3bc86b7a6b0'::uuid as company_id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  COALESCE(au.raw_user_meta_data->>'role', 'admin') as role,
  true as active
FROM auth.users au
WHERE au.email = 'zonagamermargarita@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'zonagamermargarita@gmail.com'
  )
RETURNING id, auth_user_id, email, name, role, company_id, active;





