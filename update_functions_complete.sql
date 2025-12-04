-- ============================================
-- ACTUALIZAR FUNCIONES PARA RESTRINGIR MANAGERS
-- ============================================
-- Ejecuta TODO este script en Supabase SQL Editor
-- Esto actualiza las funciones para que SOLO ADMINS puedan transferir y editar stock

-- ============================================
-- PASO 1: ELIMINAR TODAS LAS VERSIONES ANTERIORES
-- ============================================

-- Eliminar todas las versiones de transfer_inventory
DROP FUNCTION IF EXISTS public.transfer_inventory(uuid, uuid, uuid, integer, uuid, uuid);
DROP FUNCTION IF EXISTS public.transfer_inventory(uuid, uuid, uuid, integer, uuid);
DROP FUNCTION IF EXISTS public.transfer_inventory CASCADE;

-- Eliminar todas las versiones de update_store_inventory
DROP FUNCTION IF EXISTS public.update_store_inventory(uuid, uuid, integer, integer);
DROP FUNCTION IF EXISTS public.update_store_inventory(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.update_store_inventory CASCADE;

-- ============================================
-- PASO 2: ACTUALIZAR transfer_inventory (Solo Admins)
-- ============================================

CREATE OR REPLACE FUNCTION public.transfer_inventory(
  p_product_id uuid,
  p_from_store_id uuid,
  p_to_store_id uuid,
  p_quantity integer,
  p_company_id uuid,
  p_transferred_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_inventory_id uuid;
  v_to_inventory_id uuid;
  v_from_qty integer;
  v_to_qty integer;
  v_transfer_id uuid;
  v_product_name text;
  v_from_store_name text;
  v_to_store_name text;
  v_user_role text;
BEGIN
  -- Verificar permisos del usuario
  SELECT role INTO v_user_role
  FROM public.users
  WHERE auth_user_id = auth.uid() 
    AND company_id = p_company_id;

  IF v_user_role IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Usuario no encontrado o sin permisos',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- SOLO ADMINS pueden transferir (las transferencias son entre sucursales)
  -- Managers NO pueden transferir porque solo ven su sucursal asignada
  IF v_user_role != 'admin' THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Solo los administradores pueden transferir inventario entre sucursales. Los gerentes solo pueden ver su sucursal asignada.',
      'code', 'INSUFFICIENT_PERMISSIONS'
    );
  END IF;

  -- Validar cantidad
  IF p_quantity <= 0 THEN
    RETURN json_build_object(
      'error', true,
      'message', 'La cantidad debe ser mayor a 0',
      'code', 'INVALID_QUANTITY'
    );
  END IF;

  -- Obtener nombre del producto
  SELECT name INTO v_product_name
  FROM public.products
  WHERE id = p_product_id AND company_id = p_company_id;

  IF v_product_name IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Producto no encontrado',
      'code', 'PRODUCT_NOT_FOUND'
    );
  END IF;

  -- Obtener nombres de las tiendas
  SELECT name INTO v_from_store_name
  FROM public.stores
  WHERE id = p_from_store_id AND company_id = p_company_id;

  SELECT name INTO v_to_store_name
  FROM public.stores
  WHERE id = p_to_store_id AND company_id = p_company_id;

  IF v_from_store_name IS NULL OR v_to_store_name IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Una o ambas tiendas no fueron encontradas',
      'code', 'STORE_NOT_FOUND'
    );
  END IF;

  -- Verificar que las tiendas sean diferentes
  IF p_from_store_id = p_to_store_id THEN
    RETURN json_build_object(
      'error', true,
      'message', 'No puedes transferir a la misma tienda',
      'code', 'SAME_STORE'
    );
  END IF;

  -- Obtener inventario de origen
  SELECT id, qty INTO v_from_inventory_id, v_from_qty
  FROM public.inventories
  WHERE product_id = p_product_id 
    AND store_id = p_from_store_id 
    AND company_id = p_company_id;

  IF v_from_inventory_id IS NULL THEN
    RETURN json_build_object(
      'error', true,
      'message', 'No hay inventario del producto en la tienda de origen',
      'code', 'NO_INVENTORY_SOURCE'
    );
  END IF;

  -- Verificar que haya suficiente cantidad
  IF v_from_qty < p_quantity THEN
    RETURN json_build_object(
      'error', true,
      'message', 'No hay suficiente stock. Disponible: ' || v_from_qty,
      'code', 'INSUFFICIENT_STOCK'
    );
  END IF;

  -- Obtener o crear inventario de destino
  SELECT id, qty INTO v_to_inventory_id, v_to_qty
  FROM public.inventories
  WHERE product_id = p_product_id 
    AND store_id = p_to_store_id 
    AND company_id = p_company_id;

  -- Si el inventario de destino no existe, crearlo
  IF v_to_inventory_id IS NULL THEN
    INSERT INTO public.inventories (
      product_id,
      store_id,
      company_id,
      qty,
      min_qty
    ) VALUES (
      p_product_id,
      p_to_store_id,
      p_company_id,
      0,
      0
    ) RETURNING id INTO v_to_inventory_id;
    v_to_qty := 0;
  END IF;

  -- Actualizar inventario de origen (restar)
  UPDATE public.inventories
  SET qty = qty - p_quantity,
      updated_at = NOW()
  WHERE id = v_from_inventory_id;

  -- Actualizar inventario de destino (sumar)
  UPDATE public.inventories
  SET qty = qty + p_quantity,
      updated_at = NOW()
  WHERE id = v_to_inventory_id;

  -- Crear registro de transferencia
  INSERT INTO public.inventory_transfers (
    product_id,
    from_store_id,
    to_store_id,
    quantity,
    company_id,
    transferred_by,
    status
  ) VALUES (
    p_product_id,
    p_from_store_id,
    p_to_store_id,
    p_quantity,
    p_company_id,
    p_transferred_by,
    'completed'
  ) RETURNING id INTO v_transfer_id;

  -- Crear movimientos de inventario
  BEGIN
    -- Movimiento de salida desde tienda origen
    INSERT INTO public.inventory_movements (
      product_id,
      type,
      qty,
      store_from_id,
      store_to_id,
      reason,
      user_id,
      company_id
    ) VALUES (
      p_product_id,
      'TRANSFER',
      -p_quantity,
      p_from_store_id,
      p_to_store_id,
      'Transferencia a ' || v_to_store_name,
      p_transferred_by,
      p_company_id
    );

    -- Movimiento de entrada a tienda destino
    INSERT INTO public.inventory_movements (
      product_id,
      type,
      qty,
      store_from_id,
      store_to_id,
      reason,
      user_id,
      company_id
    ) VALUES (
      p_product_id,
      'TRANSFER',
      p_quantity,
      p_from_store_id,
      p_to_store_id,
      'Transferencia desde ' || v_from_store_name,
      p_transferred_by,
      p_company_id
    );
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  -- Retornar resultado exitoso
  RETURN json_build_object(
    'error', false,
    'message', 'Transferencia completada exitosamente',
    'transfer_id', v_transfer_id,
    'product_name', v_product_name,
    'from_store', v_from_store_name,
    'to_store', v_to_store_name,
    'quantity', p_quantity,
    'new_from_qty', v_from_qty - p_quantity,
    'new_to_qty', v_to_qty + p_quantity
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Error al transferir inventario: ' || SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_inventory TO authenticated;

COMMENT ON FUNCTION public.transfer_inventory IS 'Transfiere productos de inventario entre tiendas. SOLO administradores pueden transferir (las transferencias requieren ver todas las sucursales).';

-- ============================================
-- PASO 3: ACTUALIZAR update_store_inventory (Solo Admins)
-- ============================================

CREATE OR REPLACE FUNCTION update_store_inventory(
  p_product_id uuid,
  p_store_id uuid,
  p_qty integer,
  p_min_qty integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_company_id uuid;
  inventory_record record;
BEGIN
  -- Get user's company
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

  -- SOLO ADMINS pueden actualizar stock manualmente
  -- Managers NO pueden editar stock (solo pueden ver y vender)
  IF NOT public.is_admin() THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Solo los administradores pueden actualizar el stock manualmente. Los gerentes solo pueden ver el inventario y procesar ventas.',
      'code', 'INSUFFICIENT_PERMISSIONS'
    );
  END IF;

  -- Update or insert inventory
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

GRANT EXECUTE ON FUNCTION public.update_store_inventory TO authenticated;

COMMENT ON FUNCTION public.update_store_inventory IS 'Actualiza el stock de un producto en una tienda. SOLO administradores pueden usar esta función.';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las funciones se crearon correctamente
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER'
    ELSE '❌ SECURITY INVOKER'
  END as status
FROM pg_proc
WHERE proname IN ('transfer_inventory', 'update_store_inventory')
ORDER BY proname;





