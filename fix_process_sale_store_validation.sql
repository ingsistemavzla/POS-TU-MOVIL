-- ============================================================================
-- CORRECCIÓN: Validar assigned_store_id en process_sale
-- ============================================================================
-- PROBLEMA: process_sale no valida que el usuario tenga permiso para vender
--           en la tienda especificada (assigned_store_id)
-- SOLUCIÓN: Agregar validación de assigned_store_id antes de procesar venta
-- ============================================================================

-- Obtener la definición actual de process_sale para modificarla
-- NOTA: Esta es una corrección que debe aplicarse a la función más reciente

-- ============================================================================
-- VALIDACIÓN QUE DEBE AGREGARSE AL INICIO DE process_sale
-- ============================================================================
-- 
-- Agregar después de las validaciones iniciales (línea ~99):
--
-- DECLARE
--   v_user_role TEXT;
--   v_user_company_id UUID;
--   v_assigned_store_id UUID;
-- BEGIN
--   -- Obtener información del usuario actual
--   SELECT role, company_id, assigned_store_id 
--   INTO v_user_role, v_user_company_id, v_assigned_store_id
--   FROM public.users
--   WHERE auth_user_id = auth.uid()
--   LIMIT 1;
--
--   -- Validar company_id
--   IF v_user_company_id IS DISTINCT FROM p_company_id THEN
--     RAISE EXCEPTION 'No tienes permiso para procesar ventas en esta compañía';
--   END IF;
--
--   -- Si NO es admin, validar que la tienda sea su assigned_store
--   IF v_user_role IS DISTINCT FROM 'admin' AND v_user_role IS DISTINCT FROM 'master_admin' THEN
--     IF v_assigned_store_id IS NULL THEN
--       RAISE EXCEPTION 'No tienes una tienda asignada. Contacta al administrador.';
--     END IF;
--     
--     IF p_store_id IS DISTINCT FROM v_assigned_store_id THEN
--       RAISE EXCEPTION 'No tienes permiso para procesar ventas en esta tienda. Tu tienda asignada es: %', 
--         (SELECT name FROM public.stores WHERE id = v_assigned_store_id);
--     END IF;
--   END IF;
--
--   -- Continuar con el resto de la función...
-- ============================================================================

-- NOTA: Esta es una plantilla. La función process_sale debe modificarse manualmente
-- o mediante un script que lea la función actual y la modifique.

SELECT 
  '⚠️ INSTRUCCIONES' AS "Tipo",
  'Esta es una plantilla de validación' AS "Mensaje",
  'La función process_sale debe modificarse para incluir esta validación' AS "Acción";


