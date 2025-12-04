-- ====================================================================================
-- ACTUALIZACIÓN: Regla de Existencia Física para create_product_v3
-- Fecha: 2025-01-27
-- Descripción: Agrega validación estricta: Un producto NO puede crearse sin stock físico inicial
--              en al menos una sucursal.
-- ====================================================================================

-- ====================================================================================
-- FUNCIÓN ACTUALIZADA: create_product_v3 con Validación de Existencia Física
-- ====================================================================================
-- REGLA DE NEGOCIO: "Un producto no puede ser creado si no existe físicamente 
--                   en al menos una sucursal."
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.create_product_v3(
  p_sku text,
  p_barcode text,
  p_name text,
  p_category text,
  p_cost_usd decimal,
  p_sale_price_usd decimal,
  p_tax_rate decimal DEFAULT 16.00,
  p_store_inventories jsonb DEFAULT '[]'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_company_id uuid;
  product_record record;
  v_product_id uuid;  -- Renombrado para evitar ambigüedad con columna product_id
  store_record record;
  store_inventory jsonb;
  store_id uuid;
  initial_qty integer;
  min_qty integer;
  v_store_map jsonb := '{}'::jsonb;
  v_expected_stores integer;
  v_actual_inventories integer;
  v_admin_user_id uuid;
  v_has_physical_stock boolean := false;
BEGIN
  -- ====================================================================================
  -- VALIDACIÓN PREVIA: Existencia Física Obligatoria
  -- ====================================================================================
  -- REGLA: Al menos una sucursal DEBE tener qty > 0
  -- Esto garantiza que el producto existe físicamente antes de registrarlo en el sistema
  -- ====================================================================================
  
  -- Verificar si existe al menos una tienda con stock positivo en el JSON recibido
  SELECT EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(p_store_inventories) AS elem
    WHERE (elem->>'qty')::integer > 0
  ) INTO v_has_physical_stock;
  
  -- Si NO hay stock físico en ninguna sucursal, rechazar la creación
  IF NOT v_has_physical_stock THEN
    RAISE EXCEPTION 'No se puede registrar un producto sin existencia física inicial. Al menos una sucursal debe tener stock > 0.';
  END IF;
  
  -- ====================================================================================
  -- LÓGICA HÍBRIDA (Mantenida del script original)
  -- ====================================================================================
  
  -- Get user's company
  SELECT company_id INTO user_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not associated with a company';
  END IF;

  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can create products';
  END IF;

  -- Obtener ID de admin para movimientos
  SELECT id INTO v_admin_user_id
  FROM public.users
  WHERE company_id = user_company_id AND role = 'admin'
  LIMIT 1;

  -- Contar tiendas activas ANTES de crear producto (Safety Count - Paso 1)
  SELECT COUNT(*) INTO v_expected_stores
  FROM public.stores
  WHERE company_id = user_company_id AND active = true;

  -- Crear mapa de inventarios recibidos del Frontend
  FOR store_inventory IN SELECT * FROM jsonb_array_elements(p_store_inventories) LOOP
    store_id := (store_inventory->>'store_id')::uuid;
    IF store_id IS NOT NULL THEN
      v_store_map := v_store_map || jsonb_build_object(
        store_id::text, 
        jsonb_build_object(
          'qty', COALESCE((store_inventory->>'qty')::integer, 0),
          'min_qty', COALESCE((store_inventory->>'min_qty')::integer, 5)
        )
      );
    END IF;
  END LOOP;

  -- Crear el producto
  INSERT INTO public.products (
    company_id, sku, barcode, name, category, 
    cost_usd, sale_price_usd, tax_rate, active
  )
  VALUES (
    user_company_id, p_sku, p_barcode, p_name, p_category,
    p_cost_usd, p_sale_price_usd, p_tax_rate, true
  )
  RETURNING * INTO product_record;
  
  v_product_id := product_record.id;

  -- ====================================================================================
  -- LÓGICA HÍBRIDA: Crear inventario para TODAS las tiendas activas
  -- ====================================================================================
  -- Si el Frontend envió datos para una tienda, los usa
  -- Si NO, crea automáticamente con qty=0
  FOR store_record IN 
    SELECT id FROM public.stores 
    WHERE company_id = user_company_id AND active = true
  LOOP
    -- Obtener valores del mapa si existen, sino usar defaults
    IF v_store_map ? store_record.id::text THEN
      initial_qty := COALESCE((v_store_map->store_record.id::text->>'qty')::integer, 0);
      min_qty := COALESCE((v_store_map->store_record.id::text->>'min_qty')::integer, 5);
    ELSE
      -- Tienda no está en el array del Frontend - crear con defaults
      initial_qty := 0;
      min_qty := 5;
    END IF;

    -- Insertar inventario
    INSERT INTO public.inventories (
      company_id, store_id, product_id, qty, min_qty
    )
    VALUES (
      user_company_id, store_record.id, v_product_id, initial_qty, min_qty
    );

    -- ====================================================================================
    -- AUDITORÍA: Insertar movimiento de inventario para stock inicial
    -- ====================================================================================
    IF initial_qty > 0 THEN
      INSERT INTO public.inventory_movements (
        company_id,
        product_id,
        type,
        qty,
        store_to_id,
        reason,
        user_id
      ) VALUES (
        user_company_id,
        v_product_id,
        'ADJUST',
        initial_qty,
        store_record.id,
        'Stock inicial al crear producto',
        v_admin_user_id
      );
    END IF;
  END LOOP;

  -- ====================================================================================
  -- SAFETY COUNT (El Juez): Validación post-inserción
  -- ====================================================================================
  -- Contar inventarios creados para este producto
  SELECT COUNT(*) INTO v_actual_inventories
  FROM public.inventories
  WHERE product_id = v_product_id AND company_id = user_company_id;

  -- Si los números no coinciden, hacer ROLLBACK automático
  IF v_actual_inventories != v_expected_stores THEN
    RAISE EXCEPTION 'Inconsistencia detectada: Se esperaban % inventarios para % tiendas activas, pero se crearon %. ROLLBACK automático.', 
      v_expected_stores, v_expected_stores, v_actual_inventories;
  END IF;

  -- Retornar producto creado
  RETURN row_to_json(product_record);

  -- NO capturamos excepciones - dejamos que PostgreSQL haga ROLLBACK si algo falla
END;
$$;

-- Comentario actualizado
COMMENT ON FUNCTION public.create_product_v3(text, text, text, text, decimal, decimal, decimal, jsonb) IS 
'Crea un producto y su inventario inicial en todas las sucursales activas.
REGLAS:
1. EXISTENCIA FÍSICA OBLIGATORIA: Al menos una sucursal debe tener stock inicial > 0.
2. LÓGICA HÍBRIDA: Usa datos del Frontend si existen, sino crea con qty=0 en otras tiendas.
3. SAFETY COUNT: Valida que inventarios creados = tiendas activas.
Solo administradores pueden ejecutar esta función.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_product_v3(text, text, text, text, decimal, decimal, decimal, jsonb) TO authenticated;

-- ====================================================================================
-- RESUMEN DE CAMBIOS
-- ====================================================================================
-- ✅ Validación de Existencia Física: Rechaza productos sin stock inicial
-- ✅ Lógica Híbrida: Mantenida (usa datos del Frontend o defaults)
-- ✅ Safety Count: Mantenido (valida integridad)
-- ✅ Auditoría: Mantenida (registra movimientos de stock inicial)
-- ====================================================================================

