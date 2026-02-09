-- ============================================================================
-- Marcar ajustes manuales desde Almacén en inventory_movements (reason)
-- ============================================================================
-- update_store_inventory establece app.movement_reason para que el trigger
-- guarde "Ajuste manual (almacén)" en vez de "Ajuste automático de auditoría".
-- Así en el panel Historial se distingue cuándo una disminución fue manual.
-- ============================================================================

-- 1. update_store_inventory: fijar motivo antes del UPDATE para que el trigger lo use
CREATE OR REPLACE FUNCTION public.update_store_inventory(
  p_product_id uuid,
  p_store_id uuid,
  p_qty integer,
  p_min_qty integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id uuid;
  inventory_record record;
BEGIN
  SELECT company_id INTO user_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF user_company_id IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'User not found',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  IF NOT public.is_admin() THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Solo los administradores pueden actualizar el stock manualmente. Los gerentes solo pueden ver el inventario y procesar ventas.',
      'code', 'INSUFFICIENT_PERMISSIONS'
    );
  END IF;

  -- Marcar que este cambio es un ajuste manual desde Almacén (el trigger leerá este valor)
  PERFORM set_config('app.movement_reason', 'Ajuste manual (almacén)', true);

  INSERT INTO public.inventories (company_id, store_id, product_id, qty, min_qty)
  VALUES (
    user_company_id,
    p_store_id,
    p_product_id,
    p_qty,
    COALESCE(p_min_qty, 5)
  )
  ON CONFLICT (company_id, store_id, product_id)
  DO UPDATE SET
    qty = EXCLUDED.qty,
    min_qty = COALESCE(EXCLUDED.min_qty, inventories.min_qty),
    updated_at = now()
  RETURNING * INTO inventory_record;

  RETURN row_to_json(inventory_record);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- 2. audit_inventory_change: usar motivo de sesión si existe
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
'Registra en inventory_movements. Si update_store_inventory fijó app.movement_reason, usa ese motivo (ej. Ajuste manual almacén); si no, usa Ajuste automático de auditoría.';
