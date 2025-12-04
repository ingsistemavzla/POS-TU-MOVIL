-- ============================================================================
-- VERIFICACIÓN: Estado después de la corrección
-- ============================================================================
-- Verificar si los cambios se aplicaron correctamente
-- ============================================================================

-- ============================================================================
-- 1. ESTADO ACTUAL DE LOS USUARIOS PENDIENTES
-- ============================================================================
SELECT 
  '📋 ESTADO ACTUAL' AS "Tipo",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.active AS "Activo",
  pu.company_id AS "Company ID",
  pu.assigned_store_id AS "Store ID",
  s.name AS "Store Name",
  pu.auth_user_id IS NOT NULL AS "Vinculado",
  CASE
    WHEN pu.active = TRUE 
         AND pu.company_id IS NOT NULL 
         AND pu.assigned_store_id IS NOT NULL 
         AND pu.role = 'manager'
    THEN '✅ DEBERÍA APARECER EN ADMIN PANEL'
    ELSE '❌ FALTAN DATOS O ROL INCORRECTO'
  END AS "Estado"
FROM public.users pu
LEFT JOIN public.stores s ON pu.assigned_store_id = s.id
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY pu.email;

-- ============================================================================
-- 2. COMPARAR CON USUARIOS QUE SÍ APARECEN
-- ============================================================================
SELECT 
  '📊 COMPARACIÓN' AS "Tipo",
  pu.email AS "Email",
  pu.role AS "Rol",
  pu.active AS "Activo",
  pu.company_id IS NOT NULL AS "Tiene Company ID",
  pu.assigned_store_id IS NOT NULL AS "Tiene Store ID",
  pu.auth_user_id IS NOT NULL AS "Vinculado",
  s.name AS "Store Name"
FROM public.users pu
LEFT JOIN public.stores s ON pu.assigned_store_id = s.id
WHERE pu.email IN (
  'tumovilstore2025@gmail.com',
  'tumovillaisla@gmail.com',
  'zonagamermargarita@gmail.com',
  'tumovilcentro4@gmail.com'
)
ORDER BY 
  CASE 
    WHEN pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com') THEN 0
    ELSE 1
  END,
  pu.role,
  pu.email;

-- ============================================================================
-- 3. VERIFICAR SI HAY DIFERENCIAS EN COMPANY_ID
-- ============================================================================
SELECT 
  '🏢 VERIFICACIÓN COMPANY_ID' AS "Tipo",
  pu.email AS "Email",
  pu.company_id AS "Company ID",
  pu.role AS "Rol",
  CASE
    WHEN pu.company_id = (SELECT company_id FROM public.users WHERE email = 'zonagamermargarita@gmail.com' LIMIT 1)
    THEN '✅ Mismo company_id que usuarios visibles'
    ELSE '⚠️ Company_id diferente'
  END AS "Estado"
FROM public.users pu
WHERE pu.email IN (
  'tumovilstore2025@gmail.com',
  'tumovillaisla@gmail.com',
  'zonagamermargarita@gmail.com',
  'tumovilcentro4@gmail.com'
)
ORDER BY pu.email;

-- ============================================================================
-- 4. VERIFICAR TODOS LOS MANAGERS EN EL SISTEMA
-- ============================================================================
SELECT 
  '👥 TODOS LOS MANAGERS' AS "Tipo",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.active AS "Activo",
  pu.company_id AS "Company ID",
  pu.assigned_store_id AS "Store ID",
  s.name AS "Store Name",
  pu.auth_user_id IS NOT NULL AS "Vinculado"
FROM public.users pu
LEFT JOIN public.stores s ON pu.assigned_store_id = s.id
WHERE pu.role = 'manager'
ORDER BY pu.email;


