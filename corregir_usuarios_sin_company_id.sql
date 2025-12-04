-- ============================================================================
-- CORRECCIÓN CRÍTICA: Usuarios sin company_id
-- ============================================================================
-- PROBLEMA: Varios usuarios tienen company_id = NULL, por eso no aparecen en el panel
-- SOLUCIÓN: Asignar company_id a usuarios que lo tienen NULL
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Obtener company_id principal
-- ============================================================================
DO $$
DECLARE
  v_company_id UUID;
  v_users_updated INTEGER := 0;
BEGIN
  -- Obtener company_id del master_admin o del primer admin disponible
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE role IN ('master_admin', 'admin')
    AND company_id IS NOT NULL
    AND active = true
  ORDER BY 
    CASE WHEN role = 'master_admin' THEN 1 ELSE 2 END,
    created_at ASC
  LIMIT 1;

  -- Si no hay company_id, usar el primero disponible en companies
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM public.companies
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró company_id. Debe existir al menos una compañía.';
  END IF;

  RAISE NOTICE '✅ Company ID a usar: %', v_company_id;

  -- ============================================================================
  -- PASO 2: Asignar company_id a usuarios que lo tienen NULL
  -- ============================================================================
  UPDATE public.users
  SET 
    company_id = v_company_id,
    updated_at = NOW()
  WHERE company_id IS NULL
    AND role IN ('admin', 'manager', 'cashier');

  GET DIAGNOSTICS v_users_updated = ROW_COUNT;

  RAISE NOTICE '✅ Usuarios actualizados: %', v_users_updated;

  -- ============================================================================
  -- PASO 3: Asignar assigned_store_id a cashiers que no lo tienen
  -- ============================================================================
  -- Obtener la primera tienda activa de la compañía
  DECLARE
    v_store_id UUID;
    v_cashiers_updated INTEGER := 0;
  BEGIN
    SELECT id INTO v_store_id
    FROM public.stores
    WHERE company_id = v_company_id
      AND active = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_store_id IS NOT NULL THEN
      -- Asignar tienda a cashiers que no tienen tienda asignada
      UPDATE public.users
      SET 
        assigned_store_id = v_store_id,
        updated_at = NOW()
      WHERE company_id = v_company_id
        AND role = 'cashier'
        AND assigned_store_id IS NULL;

      GET DIAGNOSTICS v_cashiers_updated = ROW_COUNT;
      RAISE NOTICE '✅ Cashiers actualizados con tienda: %', v_cashiers_updated;
    ELSE
      RAISE NOTICE '⚠️ No hay tiendas activas para asignar a cashiers';
    END IF;
  END;

END $$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Estado",
  COUNT(*) AS "Total Usuarios",
  COUNT(CASE WHEN company_id IS NULL THEN 1 END) AS "Sin Company ID",
  COUNT(CASE WHEN role = 'cashier' AND assigned_store_id IS NULL THEN 1 END) AS "Cashiers Sin Tienda",
  COUNT(CASE WHEN auth_user_id IS NULL THEN 1 END) AS "Sin Vincular"
FROM public.users
WHERE role IN ('admin', 'manager', 'cashier');

-- Mostrar usuarios corregidos
SELECT 
  '📋 USUARIOS CORREGIDOS' AS "Tipo",
  id AS "user_id",
  email AS "Email",
  name AS "Nombre",
  role AS "Rol",
  company_id AS "Company ID",
  assigned_store_id AS "Store ID",
  auth_user_id AS "auth_user_id",
  CASE 
    WHEN company_id IS NULL THEN '❌ Aún sin company_id'
    WHEN role = 'cashier' AND assigned_store_id IS NULL THEN '⚠️ Cashier sin tienda'
    WHEN auth_user_id IS NULL THEN '⚠️ Sin vincular'
    ELSE '✅ Correcto'
  END AS "Estado"
FROM public.users
WHERE role IN ('admin', 'manager', 'cashier')
ORDER BY 
  CASE WHEN company_id IS NULL THEN 1 ELSE 2 END,
  created_at DESC;


