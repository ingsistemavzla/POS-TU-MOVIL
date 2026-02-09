-- ============================================================================
-- MIGRACIÓN: Crear función RPC get_web_product_stock_by_store
-- ============================================================================
-- Fecha: 2025-01-31
-- Descripción: Función RPC para obtener stock desglosado por sucursal
--              Retorna array JSON con store_id, store_name y qty
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_web_product_stock_by_store(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
  v_stock_by_store JSONB;
BEGIN
  -- Obtener company_id del usuario autenticado
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_array();  -- Retornar array vacío si no hay company_id
  END IF;

  -- Construir array JSON con stock por sucursal
  SELECT jsonb_agg(
    jsonb_build_object(
      'store_id', s.id,
      'store_name', s.name,
      'qty', COALESCE(i.qty, 0)
    )
    ORDER BY s.name
  ) INTO v_stock_by_store
  FROM public.stores s
  LEFT JOIN public.inventories i ON 
    s.id = i.store_id 
    AND i.product_id = p_product_id
    AND i.company_id = v_company_id
  WHERE s.company_id = v_company_id
    AND s.active = true;  -- Solo sucursales activas

  RETURN COALESCE(v_stock_by_store, jsonb_build_array());
END;
$$;

-- Función PÚBLICA (sin autenticación) para sitio web
CREATE OR REPLACE FUNCTION public.get_public_web_product_stock_by_store(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_stock_by_store JSONB;
  v_product_company_id UUID;
BEGIN
  -- Obtener company_id del producto
  SELECT company_id INTO v_product_company_id
  FROM public.products
  WHERE id = p_product_id
  LIMIT 1;

  IF v_product_company_id IS NULL THEN
    RETURN jsonb_build_array();
  END IF;

  -- Construir array JSON con stock por sucursal
  SELECT jsonb_agg(
    jsonb_build_object(
      'store_id', s.id,
      'store_name', s.name,
      'qty', COALESCE(i.qty, 0)
    )
    ORDER BY s.name
  ) INTO v_stock_by_store
  FROM public.stores s
  LEFT JOIN public.inventories i ON 
    s.id = i.store_id 
    AND i.product_id = p_product_id
    AND i.company_id = v_product_company_id
  WHERE s.company_id = v_product_company_id
    AND s.active = true;  -- Solo sucursales activas

  RETURN COALESCE(v_stock_by_store, jsonb_build_array());
END;
$$;

-- Comentarios
COMMENT ON FUNCTION public.get_web_product_stock_by_store(UUID) IS 
'Retorna stock desglosado por sucursal para un producto específico.
Requiere autenticación. Retorna array JSON con store_id, store_name y qty.';

COMMENT ON FUNCTION public.get_public_web_product_stock_by_store(UUID) IS 
'Retorna stock desglosado por sucursal para un producto específico (PÚBLICO).
NO requiere autenticación. Retorna array JSON con store_id, store_name y qty.';

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_web_product_stock_by_store(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_web_product_stock_by_store(UUID) TO anon, authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Funciones RPC de stock por sucursal creadas exitosamente';
  RAISE NOTICE '   - get_web_product_stock_by_store (requiere autenticación)';
  RAISE NOTICE '   - get_public_web_product_stock_by_store (pública)';
  RAISE NOTICE '   - Retorna array JSON con store_id, store_name y qty';
END $$;

