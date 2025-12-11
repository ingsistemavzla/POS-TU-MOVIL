-- ============================================================================
-- Migration: Agregar Auditoría de Ajustes Manuales de Stock
-- ============================================================================
-- Descripción: Modifica update_store_inventory para registrar cambios manuales
--              de stock en inventory_movements con tipo 'ADJUST'
-- ============================================================================

-- Eliminar la función anterior
DROP FUNCTION IF EXISTS public.update_store_inventory(uuid, uuid, integer, integer);
DROP FUNCTION IF EXISTS public.update_store_inventory(uuid, uuid, integer);

-- Crear función mejorada con auditoría
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
  user_id_val uuid;
  user_name_val text;
  store_name_val text;
  product_name_val text;
  product_sku_val text;
  old_qty integer;
  new_qty integer;
  qty_difference integer;
  movement_reason text;
  inventory_record record;
BEGIN
  -- Get user's company and user info
  SELECT 
    u.company_id,
    u.id,
    COALESCE(u.name, u.email, 'Admin')
  INTO 
    user_company_id,
    user_id_val,
    user_name_val
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
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

  -- Obtener información del producto y tienda
  SELECT 
    p.name,
    p.sku,
    s.name
  INTO 
    product_name_val,
    product_sku_val,
    store_name_val
  FROM public.products p
  JOIN public.stores s ON s.company_id = user_company_id
  WHERE p.id = p_product_id
    AND s.id = p_store_id
    AND p.company_id = user_company_id
  LIMIT 1;

  -- Obtener stock anterior (si existe)
  SELECT COALESCE(qty, 0) INTO old_qty
  FROM public.inventories
  WHERE company_id = user_company_id
    AND store_id = p_store_id
    AND product_id = p_product_id;

  -- Si no existe, el stock anterior es 0
  IF old_qty IS NULL THEN
    old_qty := 0;
  END IF;

  -- El nuevo stock es el valor pasado como parámetro
  new_qty := p_qty;

  -- Calcular la diferencia
  qty_difference := new_qty - old_qty;

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

  -- ✅ NUEVO: Registrar movimiento de inventario para auditoría (solo si hay diferencia)
  IF qty_difference != 0 THEN
    BEGIN
      -- Construir mensaje según si es aumento o disminución
      IF qty_difference > 0 THEN
        movement_reason := format(
          'Aumento manual de stock (%s unidades) en %s',
          qty_difference,
          COALESCE(store_name_val, 'sucursal')
        );
      ELSE
        movement_reason := format(
          'Disminución manual de stock (%s unidades) en %s',
          ABS(qty_difference),
          COALESCE(store_name_val, 'sucursal')
        );
      END IF;

      -- Verificar que la tabla inventory_movements existe antes de insertar
      IF EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'inventory_movements') THEN
        INSERT INTO public.inventory_movements (
          company_id,
          type,
          product_id,
          qty,
          store_from_id,
          store_to_id,
          reason,
          user_id,
          created_at
        ) VALUES (
          user_company_id,
          'ADJUST',
          p_product_id,
          qty_difference::numeric, -- Diferencia (positiva o negativa) - Cast a numeric para compatibilidad
          p_store_id,
          NULL,
          movement_reason || ' - Sucursal: ' || COALESCE(store_name_val, 'Desconocida') ||
          ' - Producto: ' || COALESCE(product_name_val, 'N/A') || 
          CASE 
            WHEN product_sku_val IS NOT NULL THEN ' (' || product_sku_val || ')'
            ELSE ''
          END || ' - Admin: ' || COALESCE(user_name_val, 'Admin'),
          user_id_val,
          NOW()
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Si falla la inserción de movimiento, continuar (NO CRÍTICO)
        -- La actualización de stock ya se hizo correctamente, esto es solo para auditoría
        -- No logueamos error para no llenar los logs con warnings no críticos
        NULL;
    END;
  END IF;

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

-- Comentario de la función
COMMENT ON FUNCTION update_store_inventory(uuid, uuid, integer, integer) IS 
'Actualiza el stock de un producto en una tienda específica. Solo los administradores pueden usar esta función. 
Registra automáticamente los cambios en inventory_movements con tipo ADJUST para auditoría forense.
Incluye información detallada: aumento/disminución, cantidad, sucursal, producto, y usuario que realizó el cambio.';

