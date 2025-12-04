-- ============================================================================
-- CORRECCIÓN COMPLETA: Usuario tumovillaisla@gmail.com
-- ============================================================================
-- Este script corrige TODOS los problemas del usuario
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_auth_user_id UUID;
  v_public_user_id UUID;
  v_company_id UUID;
  v_store_id UUID;
BEGIN
  -- Obtener IDs
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'tumovillaisla@gmail.com'
  LIMIT 1;

  SELECT id INTO v_public_user_id
  FROM public.users
  WHERE email = 'tumovillaisla@gmail.com'
  LIMIT 1;

  -- Obtener company_id
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE role IN ('master_admin', 'admin')
    AND company_id IS NOT NULL
    AND active = true
  ORDER BY 
    CASE WHEN role = 'master_admin' THEN 1 ELSE 2 END,
    created_at ASC
  LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM public.companies
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Obtener primera tienda activa para asignar al cashier
  SELECT id INTO v_store_id
  FROM public.stores
  WHERE company_id = v_company_id
    AND active = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- ============================================================================
  -- CORRECCIÓN 1: Asignar company_id
  -- ============================================================================
  IF v_public_user_id IS NOT NULL AND v_company_id IS NOT NULL THEN
    UPDATE public.users
    SET 
      company_id = v_company_id,
      updated_at = NOW()
    WHERE id = v_public_user_id
      AND company_id IS NULL;

    IF FOUND THEN
      RAISE NOTICE '✅ Company ID asignado: %', v_company_id;
    END IF;
  END IF;

  -- ============================================================================
  -- CORRECCIÓN 2: Vincular auth_user_id
  -- ============================================================================
  IF v_auth_user_id IS NOT NULL AND v_public_user_id IS NOT NULL THEN
    UPDATE public.users
    SET 
      auth_user_id = v_auth_user_id,
      updated_at = NOW()
    WHERE id = v_public_user_id
      AND (auth_user_id IS NULL OR auth_user_id != v_auth_user_id);

    IF FOUND THEN
      RAISE NOTICE '✅ auth_user_id vinculado: %', v_auth_user_id;
    END IF;
  END IF;

  -- ============================================================================
  -- CORRECCIÓN 3: Asignar tienda a cashier
  -- ============================================================================
  IF v_public_user_id IS NOT NULL AND v_store_id IS NOT NULL THEN
    UPDATE public.users
    SET 
      assigned_store_id = v_store_id,
      updated_at = NOW()
    WHERE id = v_public_user_id
      AND role = 'cashier'
      AND assigned_store_id IS NULL;

    IF FOUND THEN
      RAISE NOTICE '✅ Tienda asignada: %', v_store_id;
    END IF;
  END IF;

END $$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Estado",
  pu.id AS "user_id",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.company_id AS "Company ID",
  pu.assigned_store_id AS "Store ID",
  pu.auth_user_id AS "auth_user_id",
  CASE 
    WHEN pu.company_id IS NULL THEN '❌ Sin company_id'
    WHEN pu.auth_user_id IS NULL THEN '⚠️ Sin vincular'
    WHEN pu.role = 'cashier' AND pu.assigned_store_id IS NULL THEN '⚠️ Cashier sin tienda'
    ELSE '✅ Correcto'
  END AS "Estado Final"
FROM public.users pu
WHERE pu.email = 'tumovillaisla@gmail.com';


