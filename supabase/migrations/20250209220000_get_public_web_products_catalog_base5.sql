-- ============================================================================
-- Migración: Redondeo Base 5 en get_public_web_products_catalog
-- ============================================================================
-- Regla: Precio inflado (RATE o PERCENTAGE) se redondea a múltiplos de 5.
-- Si residuo % 5 > 2.5 → redondear arriba. Si no → redondear abajo.
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
  RETURN QUERY
  SELECT 
    p.id,
    p.sku,
    p.barcode,
    p.name,
    p.category,

    -- Precio inflado (RATE o PERCENTAGE) + Redondeo Base 5
    CASE
      WHEN ss.id IS NULL THEN
        (CASE
          WHEN (p.sale_price_usd % 5) > 2.5 THEN CEIL(p.sale_price_usd / 5.0) * 5
          ELSE FLOOR(p.sale_price_usd / 5.0) * 5
        END)::numeric(15,4)

      WHEN COALESCE(ss.web_adjustment_method, 'RATE') = 'PERCENTAGE' THEN
        (CASE
          WHEN (p.sale_price_usd * (1 + COALESCE(ss.web_tax_percentage, 0) / 100) % 5) > 2.5
            THEN CEIL((p.sale_price_usd * (1 + COALESCE(ss.web_tax_percentage, 0) / 100)) / 5.0) * 5
          ELSE FLOOR((p.sale_price_usd * (1 + COALESCE(ss.web_tax_percentage, 0) / 100)) / 5.0) * 5
        END)::numeric(15,4)

      WHEN ss.web_adjustment_rate IS NULL OR ss.manual_bcv_rate IS NULL OR ss.manual_bcv_rate = 0 THEN
        (CASE
          WHEN (p.sale_price_usd % 5) > 2.5 THEN CEIL(p.sale_price_usd / 5.0) * 5
          ELSE FLOOR(p.sale_price_usd / 5.0) * 5
        END)::numeric(15,4)

      ELSE
        (CASE
          WHEN (p.sale_price_usd * (ss.web_adjustment_rate / NULLIF(ss.manual_bcv_rate, 0)) % 5) > 2.5
            THEN CEIL((p.sale_price_usd * (ss.web_adjustment_rate / NULLIF(ss.manual_bcv_rate, 0))) / 5.0) * 5
          ELSE FLOOR((p.sale_price_usd * (ss.web_adjustment_rate / NULLIF(ss.manual_bcv_rate, 0))) / 5.0) * 5
        END)::numeric(15,4)
    END AS sale_price_usd,

    p.tax_rate,
    p.active,
    p.created_at,
    GREATEST(p.updated_at, COALESCE(wpm.updated_at, p.updated_at)) AS updated_at,
    COALESCE(SUM(i.qty), 0)::INTEGER AS total_stock,
    wpm.image_url AS web_image_url,
    CASE 
      WHEN wpm.image_url IS NULL OR wpm.image_url = '' THEN false
      ELSE COALESCE(wpm.visible, false)
    END AS web_visible
  FROM public.products p
  LEFT JOIN public.inventories i ON p.id = i.product_id
  LEFT JOIN public.web_product_metadata wpm ON p.id = wpm.product_id
  LEFT JOIN public.system_settings ss ON ss.company_id = p.company_id
  WHERE p.active = true
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
    wpm.updated_at,
    ss.id,
    ss.web_adjustment_method,
    ss.web_adjustment_rate,
    ss.manual_bcv_rate,
    ss.web_tax_percentage
  ORDER BY p.name;
END;
$$;

COMMENT ON FUNCTION public.get_public_web_products_catalog() IS 
'Catálogo PÚBLICO. Precio según web_adjustment_method (RATE o PERCENTAGE) + redondeo Base 5 (múltiplos de 5).';

GRANT EXECUTE ON FUNCTION public.get_public_web_products_catalog() TO anon, authenticated;
