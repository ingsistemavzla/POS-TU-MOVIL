-- ============================================================================
-- MIGRACIÓN: Crear vista web_products_view (EXCLUYE cost_usd)
-- ============================================================================
-- Fecha: 2025-01-31
-- Descripción: Vista SQL que expone productos para catálogo web público
--              EXCLUYE cost_usd y otros datos sensibles
-- ============================================================================

-- Eliminar vista si existe (para recrearla)
DROP VIEW IF EXISTS public.web_products_view CASCADE;

-- Crear vista que excluye cost_usd
CREATE OR REPLACE VIEW public.web_products_view AS
SELECT 
  p.id,
  p.company_id,
  p.sku,
  p.barcode,
  p.name,
  p.category,
  p.sale_price_usd,  -- ✅ Incluido (necesario para web)
  p.tax_rate,
  p.active,
  p.created_at,
  p.updated_at,
  -- ❌ cost_usd EXCLUIDO explícitamente
  -- Metadatos web
  wpm.image_url AS web_image_url,
  COALESCE(wpm.visible, true) AS web_visible
FROM public.products p
LEFT JOIN public.web_product_metadata wpm ON p.id = wpm.product_id
WHERE p.active = true;  -- Solo productos activos

-- Comentario de seguridad
COMMENT ON VIEW public.web_products_view IS 
'Vista pública para catálogo web. EXCLUYE cost_usd y otros datos sensibles. 
Solo productos activos. Incluye metadatos web (imagen, visibilidad).';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Vista web_products_view creada exitosamente';
  RAISE NOTICE '   - cost_usd EXCLUIDO de la vista';
  RAISE NOTICE '   - Solo productos activos (active = true)';
  RAISE NOTICE '   - Incluye metadatos web (imagen, visibilidad)';
END $$;






