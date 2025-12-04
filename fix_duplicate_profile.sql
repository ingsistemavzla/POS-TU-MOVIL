-- Limpiar perfil duplicado
-- Mantener solo el perfil de ADMIN en "Zona Gammer"
-- Desactivar o eliminar el perfil de MANAGER en "Tu Movil Margarita"

-- Opción 1: Desactivar el perfil duplicado (recomendado - mantiene historial)
UPDATE public.users
SET active = false
WHERE id = '16550532-f36d-45ca-89d9-04fbccf02b51'  -- Perfil MANAGER
  AND email = 'zonagamermargarita@gmail.com'
  AND role = 'manager';

-- Opción 2: Eliminar el perfil duplicado (si prefieres eliminarlo completamente)
-- DELETE FROM public.users
-- WHERE id = '16550532-f36d-45ca-89d9-04fbccf02b51'
--   AND email = 'zonagamermargarita@gmail.com'
--   AND role = 'manager';

-- Verificar que solo queda un perfil activo
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





