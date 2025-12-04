-- ====================================================================================
-- SCRIPT DE REPARACIÓN: Eliminar Funciones Duplicadas de create_product_v3
-- ====================================================================================
-- Problema: Error 42725 "Ambiguous Function Call" - Dos versiones de create_product_v3
-- Solución: Eliminar ambas versiones y recrear la versión blindada correcta
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- PASO 1: ELIMINAR EXPLÍCITAMENTE AMBAS VERSIONES CONFLICTIVAS
-- ====================================================================================

-- Versión 1: SIN p_tax_rate (7 parámetros)
DROP FUNCTION IF EXISTS public.create_product_v3(
  p_sku text,
  p_barcode text,
  p_name text,
  p_category text,
  p_cost_usd numeric,
  p_sale_price_usd numeric,
  p_store_inventories jsonb
) CASCADE;

-- Versión 2: CON p_tax_rate (8 parámetros)
DROP FUNCTION IF EXISTS public.create_product_v3(
  p_sku text,
  p_barcode text,
  p_name text,
  p_category text,
  p_cost_usd numeric,
  p_sale_price_usd numeric,
  p_tax_rate numeric,
  p_store_inventories jsonb
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
      AND proname = 'create_product_v3'
  LOOP
    func_signature := 'public.create_product_v3(' || r.args || ')';
    RAISE NOTICE 'Eliminando función: %', func_signature;
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_signature || ' CASCADE';
  END LOOP;
END $$;

-- ====================================================================================
-- PASO 2: RECREAR LA VERSIÓN MAESTRA BLINDADA
-- ====================================================================================
-- Firma correcta: Incluye p_tax_rate con DEFAULT para compatibilidad
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
  product_id uuid;
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

  -- ====================================================================================
  -- SAFETY COUNT - Paso 1: Contar tiendas activas ANTES de crear producto
  -- ====================================================================================
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
    p_cost_usd, p_sale_price_usd, COALESCE(p_tax_rate, 16.00), true
  )
  RETURNING * INTO product_record;
  
  product_id := product_record.id;

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
      user_company_id, store_record.id, product_id, initial_qty, min_qty
    );

    -- ====================================================================================
    -- AUDITORÍA: Insertar movimiento de inventario para stock inicial
    -- ====================================================================================
    IF initial_qty > 0 AND v_admin_user_id IS NOT NULL THEN
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
        product_id,
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
  WHERE product_id = product_id AND company_id = user_company_id;

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

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.create_product_v3(text, text, text, text, numeric, numeric, numeric, jsonb) TO authenticated;

-- Comentario de la función
COMMENT ON FUNCTION public.create_product_v3 IS 'Crea un producto con inventario en TODAS las tiendas activas. Versión blindada con Safety Count y lógica híbrida (usa valores del Frontend si existen, sino crea con defaults).';

-- ====================================================================================
-- VERIFICACIÓN FINAL
-- ====================================================================================

-- Verificar que solo existe una versión
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'create_product_v3';

COMMIT;

-- ====================================================================================
-- RESULTADO ESPERADO
-- ====================================================================================
-- Debe mostrar SOLO UNA fila:
-- | function_name      | arguments                                                    |
-- | ------------------ | ------------------------------------------------------------ |
-- | create_product_v3  | text, text, text, text, numeric, numeric, numeric, jsonb    |
-- ====================================================================================





