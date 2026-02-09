-- ============================================================================
-- Migración: Trigger de auditoría automática en cambios de inventario
-- ============================================================================
-- Fecha: 2025-02-09
-- Descripción: AFTER UPDATE en inventories: inserta en inventory_movements
--              con old_qty, new_qty y user_id. Solo cuando qty cambió.
-- NOTA: process_sale también inserta en inventory_movements (tipo OUT).
--       En la misma transacción el trigger corre antes que ese INSERT, por lo que
--       puede haber dos filas por venta (una ADJUST del trigger, una OUT del RPC).
--       La condición "último segundo" evita duplicados entre transacciones paralelas.
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
BEGIN
  -- Solo actuar si el stock cambió
  IF OLD.qty IS NOT DISTINCT FROM NEW.qty THEN
    RETURN NEW;
  END IF;

  v_delta := NEW.qty - OLD.qty;

  -- Resolver user_id: sesión actual (public.users.id) o primer admin de la empresa
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

  -- Si no hay usuario (ej. job de sistema), no insertar para no violar NOT NULL
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Regla de oro: evitar duplicados con otra transacción (ej. process_sale que inserta después)
  -- Para la misma transacción no evita el duplicado: process_sale inserta tras el UPDATE.
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
    NULL,                          -- Ajuste en una sola tienda, no es transferencia
    NEW.store_id,
    'ADJUST',
    v_delta,
    OLD.qty,
    NEW.qty,
    v_user_id,
    'Ajuste automático de auditoría'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.audit_inventory_change() IS
'Trigger function: registra en inventory_movements cada cambio de qty en inventories. Usa old_qty/new_qty para conciliación.';

-- Trigger: AFTER UPDATE en inventories, solo cuando qty cambió
DROP TRIGGER IF EXISTS trg_audit_inventory_change ON public.inventories;

CREATE TRIGGER trg_audit_inventory_change
  AFTER UPDATE ON public.inventories
  FOR EACH ROW
  WHEN (OLD.qty IS DISTINCT FROM NEW.qty)
  EXECUTE FUNCTION public.audit_inventory_change();

COMMENT ON TRIGGER trg_audit_inventory_change ON public.inventories IS
'Auditoría automática: inserta en inventory_movements con old_qty/new_qty cuando cambia qty.';
