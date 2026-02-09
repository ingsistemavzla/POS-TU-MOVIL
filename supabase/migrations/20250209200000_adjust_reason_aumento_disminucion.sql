-- ============================================================================
-- Ajustes: motivo con "Aumento" o "Disminución" para trazabilidad absoluta
-- ============================================================================
-- En Historial y Panel de Auditoría debe quedar explícito si un ajuste fue
-- aumento o disminución. El trigger ya guarda qty con signo; aquí añadimos
-- al texto del reason " - Aumento" o " - Disminución" para que no quede
-- ninguna transacción sin clasificar.
--
-- POR QUÉ ES SEGURO:
-- - CREATE OR REPLACE FUNCTION reemplaza solo el cuerpo de la función que
--   tiene el mismo nombre y firma (audit_inventory_change(), RETURNS TRIGGER).
-- - No borra tablas ni datos. No toca el trigger trg_audit_inventory_change;
--   el trigger sigue apuntando a esta función por nombre.
-- - Si la función no existiera, CREATE OR REPLACE la crearía; si ya existe,
--   se actualiza. No se pierde nada.
--
-- VERIFICACIÓN OPCIONAL (ejecutar en SQL Editor ANTES de esta migración):
--   SELECT proname, pg_get_function_identity_arguments(oid) AS args
--   FROM pg_proc WHERE proname = 'audit_inventory_change';
--   SELECT tgname, tgrelid::regclass AS tabla FROM pg_trigger
--   WHERE tgname = 'trg_audit_inventory_change';
-- Deberías ver 1 fila en cada consulta (función y trigger en public.inventories).
--
-- DESPUÉS de ejecutar esta migración, puedes comprobar que el motivo incluye
-- Aumento/Disminución haciendo un ajuste de prueba y leyendo inventory_movements.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_inventory_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_delta integer;
  v_reason text;
BEGIN
  IF OLD.qty IS NOT DISTINCT FROM NEW.qty THEN
    RETURN NEW;
  END IF;

  v_delta := NEW.qty - OLD.qty;

  v_reason := NULLIF(trim(current_setting('app.movement_reason', true)), '');
  v_reason := COALESCE(v_reason, 'Ajuste automático de auditoría');

  -- Dejar explícito en el motivo si es aumento o disminución (trazabilidad absoluta)
  IF v_delta > 0 THEN
    v_reason := v_reason || ' - Aumento';
  ELSIF v_delta < 0 THEN
    v_reason := v_reason || ' - Disminución';
  END IF;

  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE company_id = NEW.company_id AND role = 'admin'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.inventory_movements
    WHERE product_id = NEW.product_id
      AND (store_from_id = NEW.store_id OR store_to_id = NEW.store_id)
      AND created_at > now() - interval '1 second'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.inventory_movements (
    company_id,
    product_id,
    store_from_id,
    store_to_id,
    type,
    qty,
    old_qty,
    new_qty,
    user_id,
    reason
  ) VALUES (
    NEW.company_id,
    NEW.product_id,
    NULL,
    NEW.store_id,
    'ADJUST',
    v_delta,
    OLD.qty,
    NEW.qty,
    v_user_id,
    v_reason
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.audit_inventory_change() IS
'Registra en inventory_movements. Usa app.movement_reason si existe (ej. Ajuste manual almacén). Añade " - Aumento" o " - Disminución" al motivo para trazabilidad absoluta.';
