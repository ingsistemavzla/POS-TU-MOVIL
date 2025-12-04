-- Eliminar perfil admin duplicado para el usuario cajero
-- Dejar solo el perfil cashier que tiene assigned_store_id

-- Verificar primero qué perfiles existen
SELECT id, auth_user_id, email, name, role, assigned_store_id, active
FROM users
WHERE auth_user_id = '23d936ae-1551-4fb9-9e49-0b6f83f46eab';

-- Eliminar el perfil admin (el que no tiene assigned_store_id)
DELETE FROM users
WHERE id = 'd03e9506-9a05-4dee-aab0-ae370dc1d2f1'
AND auth_user_id = '23d936ae-1551-4fb9-9e49-0b6f83f46eab'
AND role = 'admin'
AND assigned_store_id IS NULL;

-- Verificar que solo queda el perfil cashier
SELECT id, auth_user_id, email, name, role, assigned_store_id, active
FROM users
WHERE auth_user_id = '23d936ae-1551-4fb9-9e49-0b6f83f46eab';

-- Resultado esperado: Solo debería quedar 1 fila con role = 'cashier'





