-- ============================================================================
-- MIGRACIÓN: Crear función RPC get_web_products_catalog
-- ============================================================================
-- Fecha: 2025-01-31
-- Descripción: Función RPC que retorna catálogo completo para web pública
--              EXCLUYE cost_usd, incluye stock total y metadatos web
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_web_products_catalog()
RETURNS TABLE (
  id UUID,
  sku TEXT,
  barcode TEXT,
  name TEXT,
  category TEXT,
  sale_price_usd NUMERIC(15,4),
  tax_rate NUMERIC(5,2),
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_stock INTEGER,
  web_image_url TEXT,
  web_visible BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Obtener company_id del usuario autenticado
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN;  -- No retornar nada si no hay company_id
  END IF;

  -- Retornar productos con metadatos web, SIN cost_usd
  RETURN QUERY
  SELECT 
    p.id,
    p.sku,
    p.barcode,
    p.name,
    p.category,
    p.sale_price_usd,  -- ✅ Incluido
    p.tax_rate,
    p.active,
    p.created_at,
    -- ✅ Usar el updated_at más reciente entre products y web_product_metadata
    -- Esto asegura que si solo se actualiza la imagen, el updated_at refleje el cambio
    GREATEST(p.updated_at, COALESCE(wpm.updated_at, p.updated_at)) AS updated_at,
    -- ❌ p.cost_usd EXCLUIDO explícitamente
    COALESCE(SUM(i.qty), 0)::INTEGER AS total_stock,
    wpm.image_url AS web_image_url,
    -- ✅ REGLA: Si no hay imagen, visible = false. Si hay imagen, usar el valor de wpm.visible
    CASE 
      WHEN wpm.image_url IS NULL OR wpm.image_url = '' THEN false
      ELSE COALESCE(wpm.visible, false)
    END AS web_visible
  FROM public.products p
  LEFT JOIN public.inventories i ON p.id = i.product_id AND i.company_id = v_company_id
  LEFT JOIN public.web_product_metadata wpm ON p.id = wpm.product_id
  WHERE p.company_id = v_company_id
    AND p.active = true
  GROUP BY 
    p.id, 
    p.sku, 
    p.barcode, 
    p.name, 
    p.category, 
    p.sale_price_usd, 
    p.tax_rate, 
    p.active, 
    p.created_at, 
    p.updated_at, 
    wpm.image_url, 
    wpm.visible, 
    wpm.updated_at
  ORDER BY p.name;
END;
$$;

-- Comentario de seguridad
COMMENT ON FUNCTION public.get_web_products_catalog() IS 
'Catálogo de productos para web pública. EXCLUYE cost_usd y otros datos sensibles. 
Incluye stock total y metadatos web. Solo productos activos.';

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_web_products_catalog() TO authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Función RPC get_web_products_catalog creada exitosamente';
  RAISE NOTICE '   - cost_usd EXCLUIDO de la respuesta';
  RAISE NOTICE '   - Incluye stock total calculado';
  RAISE NOTICE '   - Incluye metadatos web (imagen, visibilidad)';
  RAISE NOTICE '   - updated_at usa el más reciente entre products y web_product_metadata';
END $$;

