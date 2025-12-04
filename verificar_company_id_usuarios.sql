-- ============================================================================
-- VERIFICACIÓN CRÍTICA: Company ID de los usuarios
-- ============================================================================
-- El Admin Panel filtra por company_id, por lo que los usuarios deben tener
-- el mismo company_id que el usuario que está viendo el panel
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR COMPANY_ID DE TODOS LOS USUARIOS RELEVANTES
-- ============================================================================
SELECT 
  '🏢 COMPANY_ID COMPARACIÓN' AS "Tipo",
  pu.email AS "Email",
  pu.role AS "Rol",
  pu.company_id AS "Company ID",
  pu.active AS "Activo",
  CASE
    WHEN pu.company_id = (SELECT company_id FROM public.users WHERE email = 'masteradm@gmail.com' LIMIT 1)
    THEN '✅ Mismo company_id que Master Admin'
    WHEN pu.company_id = (SELECT company_id FROM public.users WHERE email = 'tumovilmgta@gmail.com' LIMIT 1)
    THEN '✅ Mismo company_id que Admin Comercial'
    WHEN pu.company_id = (SELECT company_id FROM public.users WHERE email = 'zonagamermargarita@gmail.com' LIMIT 1)
    THEN '✅ Mismo company_id que Gerente Zona Gamer'
    ELSE '❌ Company_id diferente'
  END AS "Estado"
FROM public.users pu
WHERE pu.email IN (
  'tumovilstore2025@gmail.com',
  'tumovillaisla@gmail.com',
  'masteradm@gmail.com',
  'tumovilmgta@gmail.com',
  'zonagamermargarita@gmail.com',
  'tumovilcentro4@gmail.com',
  'cajazonagamer@gmail.com',
  'cajacentro@gmail.com'
)
ORDER BY pu.company_id, pu.role, pu.email;

-- ============================================================================
-- 2. VERIFICAR QUÉ USUARIOS VERÍA UN ADMIN (simulando la query del frontend)
-- ============================================================================
-- Simular la query que hace el Admin Panel:
-- .from("users")
-- .select("id, email, name, role, assigned_store_id, active, created_at")
-- .eq("company_id", companyId)  <-- ESTE ES EL FILTRO CRÍTICO
-- .order("created_at", { ascending: true });

-- Obtener el company_id del admin comercial (tumovilmgta@gmail.com)
DO $$
DECLARE
  v_admin_company_id UUID;
BEGIN
  SELECT company_id INTO v_admin_company_id
  FROM public.users
  WHERE email = 'tumovilmgta@gmail.com'
  LIMIT 1;

  RAISE NOTICE 'Company ID del Admin Comercial: %', v_admin_company_id;

  -- Mostrar qué usuarios vería el admin
  RAISE NOTICE 'Usuarios que debería ver el Admin Panel:';
END $$;

SELECT 
  '👁️ VISTA DEL ADMIN PANEL' AS "Tipo",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.active AS "Activo",
  pu.company_id AS "Company ID",
  pu.assigned_store_id AS "Store ID",
  s.name AS "Store Name",
  CASE
    WHEN pu.role = 'manager' AND pu.active = TRUE THEN '✅ Debería aparecer en "Gerentes"'
    WHEN pu.role = 'cashier' AND pu.active = TRUE THEN '✅ Debería aparecer en "Cajeros"'
    WHEN pu.role = 'admin' AND pu.active = TRUE THEN '✅ Debería aparecer en "Admins"'
    WHEN pu.active = FALSE THEN '❌ NO aparecerá (inactivo)'
    ELSE '❓ Estado desconocido'
  END AS "Visibilidad"
FROM public.users pu
LEFT JOIN public.stores s ON pu.assigned_store_id = s.id
WHERE pu.company_id = (
  SELECT company_id 
  FROM public.users 
  WHERE email = 'tumovilmgta@gmail.com' 
  LIMIT 1
)
ORDER BY pu.role, pu.active DESC, pu.email;

-- ============================================================================
-- 3. VERIFICAR SI LOS USUARIOS PENDIENTES TIENEN EL MISMO COMPANY_ID
-- ============================================================================
SELECT 
  '🔍 VERIFICACIÓN ESPECÍFICA' AS "Tipo",
  pu.email AS "Email",
  pu.company_id AS "Company ID Usuario",
  (SELECT company_id FROM public.users WHERE email = 'tumovilmgta@gmail.com' LIMIT 1) AS "Company ID Admin",
  pu.company_id = (SELECT company_id FROM public.users WHERE email = 'tumovilmgta@gmail.com' LIMIT 1) AS "Company ID Coincide",
  pu.role AS "Rol",
  pu.active AS "Activo",
  pu.assigned_store_id IS NOT NULL AS "Tiene Store ID",
  CASE
    WHEN pu.company_id != (SELECT company_id FROM public.users WHERE email = 'tumovilmgta@gmail.com' LIMIT 1)
    THEN '❌ PROBLEMA: Company ID diferente - NO aparecerá en Admin Panel'
    WHEN pu.role != 'manager'
    THEN '❌ PROBLEMA: Rol incorrecto - NO aparecerá en "Gerentes"'
    WHEN pu.active = FALSE
    THEN '❌ PROBLEMA: Usuario inactivo - NO aparecerá'
    WHEN pu.assigned_store_id IS NULL
    THEN '⚠️ ADVERTENCIA: Sin Store ID asignado'
    ELSE '✅ DEBERÍA APARECER'
  END AS "Diagnóstico"
FROM public.users pu
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY pu.email;


