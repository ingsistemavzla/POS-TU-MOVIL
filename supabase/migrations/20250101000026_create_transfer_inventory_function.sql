-- Create function to transfer inventory between stores
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
BEGIN
  -- Check if user has permission (admin or manager)
  IF NOT (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'manager')
    AND company_id = p_company_id
  )) THEN
    RETURN json_build_object(
      'error', true,
      'message', 'No tienes permisos para transferir inventario',
      'code', 'INSUFFICIENT_PERMISSIONS'
    );
  END IF;

  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN json_build_object(
      'error', true,
      'message', 'La cantidad debe ser mayor a 0',
      'code', 'INVALID_QUANTITY'
    );
  END IF;

  -- Get product name
  SELECT name INTO v_product_name
  FROM public.products
  WHERE id = p_product_id AND company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Producto no encontrado',
      'code', 'PRODUCT_NOT_FOUND'
    );
  END IF;

  -- Get store names
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

  -- Check if stores are different
  IF p_from_store_id = p_to_store_id THEN
    RETURN json_build_object(
      'error', true,
      'message', 'No puedes transferir a la misma tienda',
      'code', 'SAME_STORE'
    );
  END IF;

  -- Get source inventory
  SELECT id, qty INTO v_from_inventory_id, v_from_qty
  FROM public.inventories
  WHERE product_id = p_product_id 
    AND store_id = p_from_store_id 
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'error', true,
      'message', 'No hay inventario del producto en la tienda de origen',
      'code', 'NO_INVENTORY_SOURCE'
    );
  END IF;

  -- Check if there's enough quantity
  IF v_from_qty < p_quantity THEN
    RETURN json_build_object(
      'error', true,
      'message', 'No hay suficiente stock. Disponible: ' || v_from_qty,
      'code', 'INSUFFICIENT_STOCK'
    );
  END IF;

  -- Get or create destination inventory
  SELECT id, qty INTO v_to_inventory_id, v_to_qty
  FROM public.inventories
  WHERE product_id = p_product_id 
    AND store_id = p_to_store_id 
    AND company_id = p_company_id;

  -- If destination inventory doesn't exist, create it
  IF NOT FOUND THEN
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

  -- Update source inventory (subtract)
  UPDATE public.inventories
  SET qty = qty - p_quantity,
      updated_at = NOW()
  WHERE id = v_from_inventory_id;

  -- Update destination inventory (add)
  UPDATE public.inventories
  SET qty = qty + p_quantity,
      updated_at = NOW()
  WHERE id = v_to_inventory_id;

  -- Create transfer record
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

  -- Create inventory movements for both stores
  -- Movement out from source store
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

  -- Movement in to destination store
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

  -- Return success result
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
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;
