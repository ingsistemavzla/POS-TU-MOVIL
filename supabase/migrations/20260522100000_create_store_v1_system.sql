-- ============================================================================
-- Creación de sucursal vía código (RPC) — sin depender del frontend
-- Requiere trigger on_store_created (initialize_inventories_for_new_store) activo
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_store_inventory(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_active_products integer;
  v_inventory_rows integer;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.stores
  WHERE id = p_store_id;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'STORE_NOT_FOUND',
      'message', 'La sucursal no existe'
    );
  END IF;

  SELECT COUNT(*) INTO v_active_products
  FROM public.products
  WHERE company_id = v_company_id AND active = true;

  SELECT COUNT(*) INTO v_inventory_rows
  FROM public.inventories
  WHERE store_id = p_store_id AND company_id = v_company_id;

  RETURN jsonb_build_object(
    'success', v_active_products = v_inventory_rows,
    'store_id', p_store_id,
    'company_id', v_company_id,
    'active_products', v_active_products,
    'inventory_rows', v_inventory_rows,
    'status', CASE
      WHEN v_active_products = v_inventory_rows THEN 'OK'
      ELSE 'FALLO'
    END,
    'message', CASE
      WHEN v_active_products = v_inventory_rows THEN
        'Inventario inicial consistente (qty=0 por producto activo)'
      ELSE
        format(
          'Se esperaban %s filas de inventario, hay %s',
          v_active_products,
          v_inventory_rows
        )
    END
  );
END;
$$;

COMMENT ON FUNCTION public.validate_store_inventory(uuid) IS
'Valida que cada producto activo tenga fila en inventories para la sucursal indicada.';

-- Admin autenticado (desde POS con sesión admin)
CREATE OR REPLACE FUNCTION public.create_store_v1(
  p_name text,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_business_name text DEFAULT NULL,
  p_tax_id text DEFAULT NULL,
  p_fiscal_address text DEFAULT NULL,
  p_phone_fiscal text DEFAULT NULL,
  p_email_fiscal text DEFAULT NULL,
  p_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_store public.stores%ROWTYPE;
  v_validation jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
  END IF;

  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Solo administradores');
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_COMPANY');
  END IF;

  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME');
  END IF;

  INSERT INTO public.stores (
    company_id,
    name,
    address,
    phone,
    business_name,
    tax_id,
    fiscal_address,
    phone_fiscal,
    email_fiscal,
    active
  ) VALUES (
    v_company_id,
    TRIM(p_name),
    NULLIF(TRIM(COALESCE(p_address, '')), ''),
    NULLIF(TRIM(COALESCE(p_phone, '')), ''),
    NULLIF(TRIM(COALESCE(p_business_name, '')), ''),
    NULLIF(TRIM(COALESCE(p_tax_id, '')), ''),
    NULLIF(TRIM(COALESCE(p_fiscal_address, '')), ''),
    NULLIF(TRIM(COALESCE(p_phone_fiscal, '')), ''),
    NULLIF(TRIM(COALESCE(p_email_fiscal, '')), ''),
    COALESCE(p_active, true)
  )
  RETURNING * INTO v_store;

  v_validation := public.validate_store_inventory(v_store.id);

  IF NOT COALESCE((v_validation->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Inventario inconsistente tras crear sucursal %: %',
      v_store.id,
      v_validation->>'message';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'store', to_jsonb(v_store),
    'validation', v_validation
  );
END;
$$;

COMMENT ON FUNCTION public.create_store_v1(text, text, text, text, text, text, text, text, boolean) IS
'Crea sucursal para la empresa del admin autenticado. Dispara trigger de inventario y valida conteos.';

-- Script / service_role — sin sesión de usuario (operaciones controladas)
CREATE OR REPLACE FUNCTION public.create_store_system(
  p_company_id uuid,
  p_name text,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_business_name text DEFAULT NULL,
  p_tax_id text DEFAULT NULL,
  p_fiscal_address text DEFAULT NULL,
  p_phone_fiscal text DEFAULT NULL,
  p_email_fiscal text DEFAULT NULL,
  p_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store public.stores%ROWTYPE;
  v_validation jsonb;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'COMPANY_REQUIRED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'COMPANY_NOT_FOUND');
  END IF;

  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME');
  END IF;

  INSERT INTO public.stores (
    company_id,
    name,
    address,
    phone,
    business_name,
    tax_id,
    fiscal_address,
    phone_fiscal,
    email_fiscal,
    active
  ) VALUES (
    p_company_id,
    TRIM(p_name),
    NULLIF(TRIM(COALESCE(p_address, '')), ''),
    NULLIF(TRIM(COALESCE(p_phone, '')), ''),
    NULLIF(TRIM(COALESCE(p_business_name, '')), ''),
    NULLIF(TRIM(COALESCE(p_tax_id, '')), ''),
    NULLIF(TRIM(COALESCE(p_fiscal_address, '')), ''),
    NULLIF(TRIM(COALESCE(p_phone_fiscal, '')), ''),
    NULLIF(TRIM(COALESCE(p_email_fiscal, '')), ''),
    COALESCE(p_active, true)
  )
  RETURNING * INTO v_store;

  v_validation := public.validate_store_inventory(v_store.id);

  IF NOT COALESCE((v_validation->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Inventario inconsistente tras crear sucursal %: %',
      v_store.id,
      v_validation->>'message';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'store', to_jsonb(v_store),
    'validation', v_validation
  );
END;
$$;

COMMENT ON FUNCTION public.create_store_system(uuid, text, text, text, text, text, text, text, text, boolean) IS
'Crea sucursal por company_id. Solo service_role. Usar desde scripts, no desde el frontend.';

GRANT EXECUTE ON FUNCTION public.validate_store_inventory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_store_v1(text, text, text, text, text, text, text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.create_store_system(uuid, text, text, text, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store_system(uuid, text, text, text, text, text, text, text, text, boolean) TO service_role;
