-- Migration: Crear función transfer_inventory para permitir transferencias entre sucursales
-- Fecha: 2025-01-03
-- Descripción: Esta función permite transferir productos de inventario entre tiendas/sucursales

-- Crear tabla inventory_transfers si no existe
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  to_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transferred_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS inventory_transfers_company_id_idx ON public.inventory_transfers(company_id);
CREATE INDEX IF NOT EXISTS inventory_transfers_product_id_idx ON public.inventory_transfers(product_id);
CREATE INDEX IF NOT EXISTS inventory_transfers_from_store_id_idx ON public.inventory_transfers(from_store_id);
CREATE INDEX IF NOT EXISTS inventory_transfers_to_store_id_idx ON public.inventory_transfers(to_store_id);
CREATE INDEX IF NOT EXISTS inventory_transfers_transferred_by_idx ON public.inventory_transfers(transferred_by);
CREATE INDEX IF NOT EXISTS inventory_transfers_created_at_idx ON public.inventory_transfers(created_at);

-- Habilitar RLS si no está habilitado
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS (eliminar si existen antes de recrearlas)
DO $$ 
BEGIN
  -- Eliminar políticas existentes si existen
  DROP POLICY IF EXISTS "Users can view transfers from their company" ON public.inventory_transfers;
  DROP POLICY IF EXISTS "Admins and managers can create transfers" ON public.inventory_transfers;
  DROP POLICY IF EXISTS "Admins can update transfers" ON public.inventory_transfers;
  DROP POLICY IF EXISTS "Admins can delete transfers" ON public.inventory_transfers;
END $$;

-- Crear políticas RLS
CREATE POLICY "Users can view transfers from their company" ON public.inventory_transfers
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can create transfers" ON public.inventory_transfers
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE auth_user_id = auth.uid()
    ) AND (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'manager')
        AND company_id = inventory_transfers.company_id
      )
    )
  );

CREATE POLICY "Admins can update transfers" ON public.inventory_transfers
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE auth_user_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      AND company_id = inventory_transfers.company_id
    )
  );

CREATE POLICY "Admins can delete transfers" ON public.inventory_transfers
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE auth_user_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      AND company_id = inventory_transfers.company_id
    )
  );

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_inventory_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
DROP TRIGGER IF EXISTS inventory_transfers_updated_at_trigger ON public.inventory_transfers;
CREATE TRIGGER inventory_transfers_updated_at_trigger
  BEFORE UPDATE ON public.inventory_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_transfers_updated_at();

-- Eliminar todas las versiones anteriores de la función para evitar conflictos
DROP FUNCTION IF EXISTS public.transfer_inventory(uuid, uuid, uuid, integer, uuid, uuid);
DROP FUNCTION IF EXISTS public.transfer_inventory(uuid, uuid, uuid, integer, uuid);

-- Crear función principal transfer_inventory
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
  v_assigned_store_id uuid;
BEGIN
  -- Verificar permisos del usuario (admin o manager)
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

  -- Crear movimientos de inventario si la tabla existe (opcional, no falla si no existe)
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
      -- La tabla inventory_movements no existe, continuar sin crear movimientos
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

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.transfer_inventory TO authenticated;

-- Comentario de la función
COMMENT ON FUNCTION public.transfer_inventory IS 'Transfiere productos de inventario entre tiendas. SOLO administradores pueden transferir (las transferencias requieren ver todas las sucursales).';

