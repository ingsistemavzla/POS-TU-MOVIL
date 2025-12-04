-- ====================================================================================
-- SCRIPT DE REPARACIÓN: Eliminar Funciones Duplicadas de transfer_inventory
-- ====================================================================================
-- Problema: Error 42725 "Ambiguous Function Call" - Dos versiones de transfer_inventory
-- Solución: Eliminar ambas versiones y recrear la versión blindada correcta
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- PASO 1: ELIMINAR EXPLÍCITAMENTE AMBAS VERSIONES CONFLICTIVAS
-- ====================================================================================

-- Versión 1: Con p_company_id primero y p_quantity => numeric
DROP FUNCTION IF EXISTS public.transfer_inventory(
  p_company_id uuid,
  p_from_store_id uuid,
  p_to_store_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_transferred_by uuid
) CASCADE;

-- Versión 2: Con p_product_id primero y p_quantity => integer
DROP FUNCTION IF EXISTS public.transfer_inventory(
  p_product_id uuid,
  p_from_store_id uuid,
  p_to_store_id uuid,
  p_quantity integer,
  p_company_id uuid,
  p_transferred_by uuid
) CASCADE;

-- Eliminar cualquier otra versión que pueda existir (por seguridad)
DO $$
DECLARE
  r RECORD;
  func_signature TEXT;
BEGIN
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'transfer_inventory'
  LOOP
    func_signature := 'public.transfer_inventory(' || r.args || ')';
    RAISE NOTICE 'Eliminando función: %', func_signature;
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_signature || ' CASCADE';
  END LOOP;
END $$;

-- ====================================================================================
-- PASO 2: RECREAR LA VERSIÓN MAESTRA BLINDADA
-- ====================================================================================
-- Firma correcta (compatible con Frontend): 
-- p_product_id, p_from_store_id, p_to_store_id, p_quantity (integer), p_company_id, p_transferred_by
-- ====================================================================================

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
  v_new_from_qty integer;
  v_new_to_qty integer;
BEGIN
  -- Verificar permisos del usuario (solo admin)
  SELECT role INTO v_user_role
  FROM public.users
  WHERE auth_user_id = auth.uid() 
    AND company_id = p_company_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado o sin permisos';
  END IF;

  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden transferir inventario entre sucursales';
  END IF;

  -- Validar cantidad
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;

  -- Obtener nombre del producto
  SELECT name INTO v_product_name
  FROM public.products
  WHERE id = p_product_id AND company_id = p_company_id;

  IF v_product_name IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  -- Obtener nombres de las tiendas
  SELECT name INTO v_from_store_name
  FROM public.stores
  WHERE id = p_from_store_id AND company_id = p_company_id;

  SELECT name INTO v_to_store_name
  FROM public.stores
  WHERE id = p_to_store_id AND company_id = p_company_id;

  IF v_from_store_name IS NULL OR v_to_store_name IS NULL THEN
    RAISE EXCEPTION 'Una o ambas tiendas no fueron encontradas';
  END IF;

  -- Verificar que las tiendas sean diferentes
  IF p_from_store_id = p_to_store_id THEN
    RAISE EXCEPTION 'No puedes transferir a la misma tienda';
  END IF;

  -- ====================================================================================
  -- BLOQUEO DE CONCURRENCIA: SELECT ... FOR UPDATE
  -- ====================================================================================
  -- Esto congela el stock de origen y evita que un cajero venda mientras se transfiere
  SELECT id, qty INTO v_from_inventory_id, v_from_qty
  FROM public.inventories
  WHERE product_id = p_product_id 
    AND store_id = p_from_store_id 
    AND company_id = p_company_id
  FOR UPDATE;  -- ← BLOQUEO DE FILA: Congela el stock hasta COMMIT

  IF v_from_inventory_id IS NULL THEN
    RAISE EXCEPTION 'No hay inventario del producto en la tienda de origen';
  END IF;

  -- Verificar que haya suficiente cantidad
  IF v_from_qty < p_quantity THEN
    RAISE EXCEPTION 'No hay suficiente stock. Disponible: %, Solicitado: %', v_from_qty, p_quantity;
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
      5
    ) RETURNING id INTO v_to_inventory_id;
    v_to_qty := 0;
  END IF;

  -- ====================================================================================
  -- VALIDACIÓN ATÓMICA: UPDATE con validación en WHERE
  -- ====================================================================================
  -- Si el stock cambió entre el SELECT y el UPDATE, el WHERE falla y lanza error
  UPDATE public.inventories
  SET qty = qty - p_quantity,
      updated_at = NOW()
  WHERE id = v_from_inventory_id
    AND qty >= p_quantity  -- ← VALIDACIÓN ATÓMICA: Si stock cambió, no encuentra fila
  RETURNING qty INTO v_new_from_qty;

  IF NOT FOUND THEN
    -- Stock cambió durante la transacción (race condition detectada)
    RAISE EXCEPTION 'Stock insuficiente. El stock cambió durante la transferencia. Intenta nuevamente.';
  END IF;

  -- Actualizar inventario de destino (sumar)
  UPDATE public.inventories
  SET qty = qty + p_quantity,
      updated_at = NOW()
  WHERE id = v_to_inventory_id
  RETURNING qty INTO v_new_to_qty;

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

  -- ====================================================================================
  -- AUDITORÍA: Insertar movimientos de inventario
  -- ====================================================================================
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

  -- Retornar resultado exitoso
  RETURN json_build_object(
    'error', false,
    'message', 'Transferencia completada exitosamente',
    'transfer_id', v_transfer_id,
    'product_name', v_product_name,
    'from_store', v_from_store_name,
    'to_store', v_to_store_name,
    'quantity', p_quantity,
    'new_from_qty', v_new_from_qty,
    'new_to_qty', v_new_to_qty
  );

  -- NO capturamos excepciones aquí - dejamos que PostgreSQL haga ROLLBACK automático
  -- Si cualquier operación falla, toda la transacción se revierte
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.transfer_inventory(uuid, uuid, uuid, integer, uuid, uuid) TO authenticated;

-- Comentario de la función
COMMENT ON FUNCTION public.transfer_inventory IS 'Transfiere productos de inventario entre tiendas. SOLO administradores pueden transferir. Versión blindada con bloqueos de concurrencia y validaciones atómicas.';

-- ====================================================================================
-- VERIFICACIÓN FINAL
-- ====================================================================================

-- Verificar que solo existe una versión
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'transfer_inventory';

COMMIT;

-- ====================================================================================
-- RESULTADO ESPERADO
-- ====================================================================================
-- Debe mostrar SOLO UNA fila:
-- | function_name      | arguments                                                    |
-- | ------------------ | ------------------------------------------------------------ |
-- | transfer_inventory | uuid, uuid, uuid, integer, uuid, uuid                        |
-- ====================================================================================





