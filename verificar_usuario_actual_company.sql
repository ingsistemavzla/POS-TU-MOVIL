-- ============================================================================
-- VERIFICACIÓN: Company ID del Usuario Actual
-- ============================================================================
-- Este script muestra específicamente el company_id del usuario actual
-- ============================================================================

-- ============================================================================
-- 1. USUARIO ACTUAL Y SU COMPANY_ID
-- ============================================================================
SELECT 
  '👤 USUARIO ACTUAL' AS "Tipo",
  id AS "user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  company_id AS "Company ID",
  assigned_store_id AS "Store ID",
  auth_user_id AS "auth_user_id",
  active AS "Activo",
  CASE 
    WHEN company_id IS NULL THEN '❌ SIN COMPANY_ID - No podrá ver usuarios'
    ELSE '✅ CON COMPANY_ID'
  END AS "Estado"
FROM public.users
WHERE auth_user_id = auth.uid();

-- ============================================================================
-- 2. USUARIOS QUE DEBERÍA VER (Misma Company ID)
-- ============================================================================
SELECT 
  '📋 USUARIOS QUE DEBERÍA VER' AS "Tipo",
  id AS "user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  company_id AS "Company ID",
  assigned_store_id AS "Store ID",
  active AS "Activo",
  auth_user_id AS "auth_user_id"
FROM public.users
WHERE company_id = (
  SELECT company_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1
)
AND role IN ('admin', 'manager', 'cashier', 'master_admin')
ORDER BY role, name;

-- ============================================================================
-- 3. CONTEO DE USUARIOS QUE DEBERÍA VER
-- ============================================================================
SELECT 
  '📊 CONTEO' AS "Tipo",
  COUNT(*) AS "Total Usuarios",
  COUNT(CASE WHEN role = 'admin' THEN 1 END) AS "Admins",
  COUNT(CASE WHEN role = 'manager' THEN 1 END) AS "Managers",
  COUNT(CASE WHEN role = 'cashier' THEN 1 END) AS "Cashiers",
  COUNT(CASE WHEN role = 'master_admin' THEN 1 END) AS "Master Admins"
FROM public.users
WHERE company_id = (
  SELECT company_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1
)
AND role IN ('admin', 'manager', 'cashier', 'master_admin');


