-- Eliminar el perfil de ADMIN en "Zona Gammer" que acabamos de crear
-- Mantener el perfil de MANAGER en "Tu Movil Margarita"

DELETE FROM public.users
WHERE id = '1d5f8f6e-5452-4ce0-9514-c7a6f5ea6609'  -- Perfil ADMIN en Zona Gammer
  AND email = 'zonagamermargarita@gmail.com'
  AND role = 'admin'
  AND company_id = 'f1f036c0-dd6c-423e-8575-c3bc86b7a6b0';

-- Verificar que solo queda el perfil de MANAGER activo
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
WHERE u.email = 'zonagamermargarita@gmail.com'
ORDER BY u.active DESC, u.created_at DESC;





