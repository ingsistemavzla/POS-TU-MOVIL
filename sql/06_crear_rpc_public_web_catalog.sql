-- ============================================================================
-- MIGRACIÓN: Crear función RPC pública get_public_web_products_catalog
-- ============================================================================
-- Fecha: 2025-01-31
-- Descripción: Función RPC PÚBLICA (sin autenticación) para sitio web público
--              Retorna solo productos visibles (web_visible = true)
--              EXCLUYE cost_usd, incluye stock total y metadatos web
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_web_products_catalog()
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
BEGIN
  -- ✅ RETORNAR SOLO PRODUCTOS VISIBLES (filtro maestro)
  -- Esta función es PÚBLICA y no requiere autenticación
  -- Por seguridad, solo retorna productos con web_visible = true Y web_image_url no nulo
  
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
  LEFT JOIN public.inventories i ON p.id = i.product_id
  LEFT JOIN public.web_product_metadata wpm ON p.id = wpm.product_id
  WHERE p.active = true
    -- ✅ FILTRO MAESTRO: Solo productos visibles con imagen
    AND wpm.image_url IS NOT NULL
    AND wpm.image_url != ''
    AND COALESCE(wpm.visible, false) = true
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
COMMENT ON FUNCTION public.get_public_web_products_catalog() IS 
'Catálogo PÚBLICO de productos para sitio web. EXCLUYE cost_usd y otros datos sensibles. 
Solo retorna productos con web_visible = true y web_image_url no nulo.
NO requiere autenticación (función pública).';

-- Permisos: Permitir ejecución pública (sin autenticación)
GRANT EXECUTE ON FUNCTION public.get_public_web_products_catalog() TO anon, authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Función RPC get_public_web_products_catalog creada exitosamente';
  RAISE NOTICE '   - Función PÚBLICA (no requiere autenticación)';
  RAISE NOTICE '   - Solo retorna productos visibles (web_visible = true)';
  RAISE NOTICE '   - Solo retorna productos con imagen (web_image_url no nulo)';
  RAISE NOTICE '   - cost_usd EXCLUIDO de la respuesta';
  RAISE NOTICE '   - Incluye stock total calculado';
END $$;





