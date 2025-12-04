-- ============================================================================
-- CORRECCIÓN: Hacer visibles los usuarios en el Admin Panel
-- ============================================================================
-- OBJETIVO: Corregir los datos que impiden que los usuarios aparezcan
--           en el Admin Panel (active, company_id, assigned_store_id, role)
-- ============================================================================

-- ============================================================================
-- CORRECCIÓN: tumovilstore2025@gmail.com
-- ============================================================================
-- PROBLEMAS DETECTADOS:
-- 1. Rol es 'cashier' pero debe ser 'manager' ✅ CORREGIDO
-- 2. assigned_store_id es NULL pero debe ser 'bb11cc22-dd33-ee44-ff55-aa6677889900' ✅ CORREGIDO
-- 3. ⚠️ CRÍTICO: company_id es 'db66d95b-9a33-4b4b-9157-5e34d5fb610a' pero debe ser 'aa11bb22-cc33-dd44-ee55-ff6677889900'
UPDATE public.users
SET
  active = TRUE,
  company_id = 'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID, -- ⚠️ FORZAR company_id correcto
  assigned_store_id = 'bb11cc22-dd33-ee44-ff55-aa6677889900'::UUID, -- Forzar asignación de Store ID
  role = 'manager', -- Forzar cambio de rol de 'cashier' a 'manager'
  name = COALESCE(name, 'Tu Móvil Store'),
  updated_at = NOW()
WHERE email = 'tumovilstore2025@gmail.com';

-- Verificar cambios
SELECT 
  '✅ CORRECCIÓN: tumovilstore2025@gmail.com' AS "Tipo",
  email AS "Email",
  active AS "Activo",
  company_id IS NOT NULL AS "Tiene Company ID",
  assigned_store_id IS NOT NULL AS "Tiene Store ID",
  role AS "Rol",
  name AS "Nombre"
FROM public.users
WHERE email = 'tumovilstore2025@gmail.com';

-- ============================================================================
-- CORRECCIÓN: tumovillaisla@gmail.com
-- ============================================================================
-- PROBLEMAS DETECTADOS:
-- 1. Rol es 'cashier' pero debe ser 'manager' ✅ CORREGIDO
-- 2. assigned_store_id es NULL pero debe ser '44fa49ac-b6ea-421d-a198-e48e179ae371' ✅ CORREGIDO
-- 3. ⚠️ CRÍTICO: company_id es 'db66d95b-9a33-4b4b-9157-5e34d5fb610a' pero debe ser 'aa11bb22-cc33-dd44-ee55-ff6677889900'
UPDATE public.users
SET
  active = TRUE,
  company_id = 'aa11bb22-cc33-dd44-ee55-ff6677889900'::UUID, -- ⚠️ FORZAR company_id correcto
  assigned_store_id = '44fa49ac-b6ea-421d-a198-e48e179ae371'::UUID, -- Forzar asignación de Store ID
  role = 'manager', -- Forzar cambio de rol de 'cashier' a 'manager'
  name = COALESCE(name, 'Tu Móvil La Isla'),
  updated_at = NOW()
WHERE email = 'tumovillaisla@gmail.com';

-- Verificar cambios
SELECT 
  '✅ CORRECCIÓN: tumovillaisla@gmail.com' AS "Tipo",
  email AS "Email",
  active AS "Activo",
  company_id IS NOT NULL AS "Tiene Company ID",
  assigned_store_id IS NOT NULL AS "Tiene Store ID",
  role AS "Rol",
  name AS "Nombre"
FROM public.users
WHERE email = 'tumovillaisla@gmail.com';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Tipo",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.active AS "Activo",
  pu.company_id AS "Company ID",
  pu.assigned_store_id AS "Store ID",
  s.name AS "Store Name",
  CASE
    WHEN pu.active = TRUE 
         AND pu.company_id IS NOT NULL 
         AND pu.assigned_store_id IS NOT NULL 
         AND pu.role IS NOT NULL 
         AND pu.name IS NOT NULL
    THEN '✅ LISTO PARA ADMIN PANEL'
    ELSE '❌ FALTAN DATOS'
  END AS "Estado"
FROM public.users pu
LEFT JOIN public.stores s ON pu.assigned_store_id = s.id
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY pu.email;

