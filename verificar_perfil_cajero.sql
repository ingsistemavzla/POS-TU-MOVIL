-- Verificar perfil del cajero después de eliminar el duplicado
SELECT 
    id, 
    auth_user_id, 
    email, 
    name, 
    role, 
    assigned_store_id, 
    active,
    company_id
FROM users
WHERE auth_user_id = '23d936ae-1551-4fb9-9e49-0b6f83f46eab';

-- Resultado esperado: Solo 1 fila con:
-- - role = 'cashier'
-- - assigned_store_id = 'd1ae400d-f3a2-430c-b256-3f74b35529b4'
-- - active = true





