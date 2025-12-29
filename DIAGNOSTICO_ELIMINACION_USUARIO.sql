-- ============================================================================
-- DIAGNÓSTICO: Eliminación de Usuario
-- Email: tumovilcentro4@gmail.com
-- ============================================================================
-- Este script diagnostica por qué el usuario no puede ser eliminado.

-- PASO 1: Verificar si el usuario existe en public.users
SELECT 
  '🔍 BÚSQUEDA EN public.users' AS paso,
  id,
  email,
  name,
  role,
  company_id,
  auth_user_id,
  active,
  created_at
FROM public.users
WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com');

-- PASO 2: Verificar si existe en auth.users (por email)
SELECT 
  '🔍 BÚSQUEDA EN auth.users (por email)' AS paso,
  id AS auth_user_id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com');

-- PASO 3: Verificar si existe en auth.users (por auth_user_id del paso 1)
-- (Ejecutar después del paso 1 para obtener el auth_user_id)
SELECT 
  '🔍 BÚSQUEDA EN auth.users (por auth_user_id)' AS paso,
  id AS auth_user_id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE id IN (
  SELECT auth_user_id 
  FROM public.users 
  WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com')
);

-- PASO 4: Verificar RLS - ¿Qué usuarios puede ver el usuario actual?
SELECT 
  '🔍 VERIFICACIÓN RLS' AS paso,
  public.get_user_company_id() AS current_user_company_id,
  public.get_user_role() AS current_user_role,
  public.is_admin() AS is_current_user_admin;

-- PASO 5: Listar TODOS los usuarios de la misma company_id (para comparar)
SELECT 
  '🔍 TODOS LOS USUARIOS DE LA MISMA COMPANY' AS paso,
  id,
  email,
  name,
  role,
  company_id,
  auth_user_id,
  active
FROM public.users
WHERE company_id = (
  SELECT company_id 
  FROM public.users 
  WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com')
  LIMIT 1
)
ORDER BY created_at DESC;

-- PASO 6: Verificar si el usuario tiene dependencias (sales, transfers, etc.)
SELECT 
  '🔍 DEPENDENCIAS EN sales' AS paso,
  COUNT(*) AS total_sales
FROM sales
WHERE cashier_id IN (
  SELECT id 
  FROM public.users 
  WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com')
);

SELECT 
  '🔍 DEPENDENCIAS EN inventory_transfers' AS paso,
  COUNT(*) AS total_transfers
FROM inventory_transfers
WHERE transferred_by IN (
  SELECT id 
  FROM public.users 
  WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com')
);

-- PASO 7: Verificar si el usuario está activo o inactivo
SELECT 
  '🔍 ESTADO DEL USUARIO' AS paso,
  id,
  email,
  active,
  CASE 
    WHEN active = true THEN '✅ ACTIVO'
    WHEN active = false THEN '❌ INACTIVO'
    ELSE '⚠️ ESTADO DESCONOCIDO'
  END AS estado_descripcion
FROM public.users
WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com');

-- PASO 8: Simular la búsqueda que hace delete_user_atomic_admin
-- (Esta es la consulta exacta que usa la función)
SELECT 
  '🔍 SIMULACIÓN: Búsqueda de delete_user_atomic_admin' AS paso,
  id AS p_user_profile_id,
  auth_user_id,
  email,
  name,
  company_id,
  CASE 
    WHEN auth_user_id IS NULL THEN '❌ ERROR: auth_user_id es NULL (no se puede eliminar)'
    ELSE '✅ OK: auth_user_id existe'
  END AS diagnostico
FROM public.users
WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com');





