-- ============================================================================
-- VERIFICACIÓN: Por qué no aparecen en el Admin Panel
-- ============================================================================
-- Los usuarios están vinculados correctamente, pero no aparecen en el Admin Panel
-- Este script verifica posibles causas
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR DATOS COMPLETOS DE LOS USUARIOS
-- ============================================================================
SELECT 
  '📋 DATOS COMPLETOS' AS "Tipo",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.active AS "Activo",
  pu.company_id AS "Company ID",
  pu.assigned_store_id AS "Store ID",
  s.name AS "Store Name",
  pu.auth_user_id IS NOT NULL AS "Vinculado",
  CASE
    WHEN pu.active = FALSE THEN '❌ Usuario INACTIVO - No aparecerá en Admin Panel'
    WHEN pu.company_id IS NULL THEN '❌ Sin company_id - No aparecerá en Admin Panel'
    WHEN pu.role IS NULL THEN '❌ Sin rol - No aparecerá en Admin Panel'
    WHEN pu.assigned_store_id IS NULL AND pu.role IN ('manager', 'cashier') THEN '⚠️ Manager/Cashier sin tienda asignada'
    ELSE '✅ Datos completos'
  END AS "Estado"
FROM public.users pu
LEFT JOIN public.stores s ON pu.assigned_store_id = s.id
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY pu.email;

-- ============================================================================
-- 2. VERIFICAR SI EL COMPANY_ID ES CORRECTO
-- ============================================================================
SELECT 
  '🏢 VERIFICACIÓN COMPANY_ID' AS "Tipo",
  pu.email AS "Email",
  pu.company_id AS "Company ID Usuario",
  'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID AS "Company ID Esperado",
  pu.company_id = 'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID AS "Company ID Correcto",
  CASE
    WHEN pu.company_id IS NULL THEN '❌ company_id es NULL'
    WHEN pu.company_id != 'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID THEN '⚠️ company_id diferente al esperado'
    ELSE '✅ company_id correcto'
  END AS "Estado"
FROM public.users pu
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY pu.email;

-- ============================================================================
-- 3. VERIFICAR SI LAS TIENDAS ESTÁN ASIGNADAS CORRECTAMENTE
-- ============================================================================
SELECT 
  '🏪 VERIFICACIÓN TIENDAS' AS "Tipo",
  pu.email AS "Email",
  pu.assigned_store_id AS "Store ID Asignado",
  CASE 
    WHEN pu.email = 'tumovilstore2025@gmail.com' THEN 'bb11cc22-dd33-ee44-ff55-aa6677889900'::UUID
    WHEN pu.email = 'tumovillaisla@gmail.com' THEN '44fa49ac-b6ea-421d-a198-e48e179ae371'::UUID
  END AS "Store ID Esperado",
  CASE
    WHEN pu.email = 'tumovilstore2025@gmail.com' AND pu.assigned_store_id = 'bb11cc22-dd33-ee44-ff55-aa6677889900'::UUID THEN '✅ Store correcto'
    WHEN pu.email = 'tumovillaisla@gmail.com' AND pu.assigned_store_id = '44fa49ac-b6ea-421d-a198-e48e179ae371'::UUID THEN '✅ Store correcto'
    WHEN pu.assigned_store_id IS NULL THEN '❌ Store NO asignado'
    ELSE '⚠️ Store incorrecto'
  END AS "Estado",
  s.name AS "Store Name Actual"
FROM public.users pu
LEFT JOIN public.stores s ON pu.assigned_store_id = s.id
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY pu.email;

-- ============================================================================
-- 4. VERIFICAR RLS: ¿Puede un admin ver estos usuarios?
-- ============================================================================
-- Esta consulta simula lo que vería un admin al consultar usuarios
SELECT 
  '🔒 TEST RLS (Admin View)' AS "Tipo",
  pu.email AS "Email",
  pu.role AS "Rol",
  pu.company_id AS "Company ID",
  pu.active AS "Activo",
  '✅ Debería ser visible para admin' AS "Resultado Esperado"
FROM public.users pu
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
  AND pu.company_id IS NOT NULL
  AND pu.active = TRUE
ORDER BY pu.email;

-- ============================================================================
-- 5. COMPARAR CON OTROS USUARIOS QUE SÍ APARECEN
-- ============================================================================
SELECT 
  '📊 COMPARACIÓN CON USUARIOS ACTIVOS' AS "Tipo",
  pu.email AS "Email",
  pu.role AS "Rol",
  pu.active AS "Activo",
  pu.company_id IS NOT NULL AS "Tiene Company ID",
  pu.assigned_store_id IS NOT NULL AS "Tiene Store ID",
  pu.auth_user_id IS NOT NULL AS "Vinculado"
FROM public.users pu
WHERE pu.email IN (
  'tumovilstore2025@gmail.com',
  'tumovillaisla@gmail.com',
  'masteradm@gmail.com',
  'tumovilmgta@gmail.com',
  'zonagamermargarita@gmail.com'
)
ORDER BY 
  CASE 
    WHEN pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com') THEN 0
    ELSE 1
  END,
  pu.email;


