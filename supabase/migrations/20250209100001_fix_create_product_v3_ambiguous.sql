-- ============================================================================
-- Fix: "column reference product_id is ambiguous" en create_product_v3
-- ============================================================================
-- Renombrar variable product_id → v_product_id para evitar conflicto con
-- la columna product_id de la tabla inventories.
-- ============================================================================

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
  v_product_id uuid;
  store_record record;
  store_inventory jsonb;
  store_id uuid;
  initial_qty integer;
  min_qty integer;
  v_store_map jsonb := '{}'::jsonb;
  v_expected_stores integer;
  v_actual_inventories integer;
  v_admin_user_id uuid;
BEGIN
  SELECT company_id INTO user_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not associated with a company';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can create products';
  END IF;

  IF p_name IS NULL OR TRIM(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'El nombre del producto es requerido';
  END IF;
  IF p_sku IS NULL OR TRIM(COALESCE(p_sku, '')) = '' THEN
    RAISE EXCEPTION 'El SKU del producto es requerido';
  END IF;
  IF p_category IS NULL OR TRIM(COALESCE(p_category, '')) = '' THEN
    RAISE EXCEPTION 'La categoría del producto es requerida';
  END IF;
  IF p_cost_usd IS NULL OR p_cost_usd <= 0 THEN
    RAISE EXCEPTION 'El costo (USD) debe ser mayor a 0';
  END IF;
  IF p_sale_price_usd IS NULL OR p_sale_price_usd <= 0 THEN
    RAISE EXCEPTION 'El precio de venta (USD) debe ser mayor a 0';
  END IF;

  SELECT id INTO v_admin_user_id
  FROM public.users
  WHERE company_id = user_company_id AND role = 'admin'
  LIMIT 1;

  SELECT COUNT(*) INTO v_expected_stores
  FROM public.stores
  WHERE company_id = user_company_id AND active = true;

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

  FOR store_record IN
    SELECT id FROM public.stores
    WHERE company_id = user_company_id AND active = true
  LOOP
    IF v_store_map ? store_record.id::text THEN
      initial_qty := COALESCE((v_store_map->store_record.id::text->>'qty')::integer, 0);
      min_qty := COALESCE((v_store_map->store_record.id::text->>'min_qty')::integer, 5);
    ELSE
      initial_qty := 0;
      min_qty := 5;
    END IF;

    INSERT INTO public.inventories (
      company_id, store_id, product_id, qty, min_qty
    )
    VALUES (
      user_company_id, store_record.id, v_product_id, initial_qty, min_qty
    );

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

  SELECT COUNT(*) INTO v_actual_inventories
  FROM public.inventories
  WHERE product_id = v_product_id AND company_id = user_company_id;

  IF v_actual_inventories != v_expected_stores THEN
    RAISE EXCEPTION 'Inconsistencia detectada: Se esperaban % inventarios para % tiendas activas, pero se crearon %. ROLLBACK automático.',
      v_expected_stores, v_expected_stores, v_actual_inventories;
  END IF;

  RETURN row_to_json(product_record);
END;
$$;
