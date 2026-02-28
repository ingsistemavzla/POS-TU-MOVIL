-- ============================================================================
-- Dualidad de precios: price_internacional_usd + price_nacional_usd
-- ============================================================================
-- price_internacional_usd: p.sale_price_usd (POS, sin Base 5)
-- price_nacional_usd: inflado (RATE/PERCENTAGE) + Base 5. La Web convierte a Bs.
-- sale_price_usd: alias de price_nacional_usd (retrocompatibilidad durante transición)
-- Ver docs/PROPUESTA_DUALIDAD_PRECIOS_WEB.md
-- ============================================================================

-- DROP necesario porque cambia el tipo de retorno (nuevas columnas)
DROP FUNCTION IF EXISTS public.get_public_web_products_catalog();

CREATE FUNCTION public.get_public_web_products_catalog()
RETURNS TABLE (
  id UUID,
  sku TEXT,
  barcode TEXT,
  name TEXT,
  category TEXT,
  sale_price_usd NUMERIC(15,2),
  price_internacional_usd NUMERIC(15,2),
  price_nacional_usd NUMERIC(15,2),
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

    -- sale_price_usd = alias de price_nacional_usd (retrocompatibilidad)
    (CASE
      WHEN ss.id IS NULL THEN
        (CASE
          WHEN (p.sale_price_usd % 5) > 2.5 THEN CEIL(p.sale_price_usd / 5.0) * 5
          ELSE FLOOR(p.sale_price_usd / 5.0) * 5
        END)::numeric(15,2)

      WHEN COALESCE(ss.web_adjustment_method, 'RATE') = 'PERCENTAGE' THEN
        (CASE
          WHEN (p.sale_price_usd * (1 + COALESCE(ss.web_tax_percentage, 0) / 100) % 5) > 2.5
            THEN CEIL((p.sale_price_usd * (1 + COALESCE(ss.web_tax_percentage, 0) / 100)) / 5.0) * 5
          ELSE FLOOR((p.sale_price_usd * (1 + COALESCE(ss.web_tax_percentage, 0) / 100)) / 5.0) * 5
        END)::numeric(15,2)

      WHEN ss.web_adjustment_rate IS NULL OR ss.manual_bcv_rate IS NULL OR ss.manual_bcv_rate = 0 THEN
        (CASE
          WHEN (p.sale_price_usd % 5) > 2.5 THEN CEIL(p.sale_price_usd / 5.0) * 5
          ELSE FLOOR(p.sale_price_usd / 5.0) * 5
        END)::numeric(15,2)

      ELSE
        (CASE
          WHEN (p.sale_price_usd * (ss.web_adjustment_rate / NULLIF(ss.manual_bcv_rate, 0)) % 5) > 2.5
            THEN CEIL((p.sale_price_usd * (ss.web_adjustment_rate / NULLIF(ss.manual_bcv_rate, 0))) / 5.0) * 5
          ELSE FLOOR((p.sale_price_usd * (ss.web_adjustment_rate / NULLIF(ss.manual_bcv_rate, 0))) / 5.0) * 5
        END)::numeric(15,2)
    END) AS sale_price_usd,

    -- price_internacional_usd: POS original, sin inflado, sin Base 5
    p.sale_price_usd::numeric(15,2) AS price_internacional_usd,

    -- price_nacional_usd: inflado + Base 5 (la Web convierte a Bs)
    (CASE
      WHEN ss.id IS NULL THEN
        (CASE
          WHEN (p.sale_price_usd % 5) > 2.5 THEN CEIL(p.sale_price_usd / 5.0) * 5
          ELSE FLOOR(p.sale_price_usd / 5.0) * 5
        END)::numeric(15,2)

      WHEN COALESCE(ss.web_adjustment_method, 'RATE') = 'PERCENTAGE' THEN
        (CASE
          WHEN (p.sale_price_usd * (1 + COALESCE(ss.web_tax_percentage, 0) / 100) % 5) > 2.5
            THEN CEIL((p.sale_price_usd * (1 + COALESCE(ss.web_tax_percentage, 0) / 100)) / 5.0) * 5
          ELSE FLOOR((p.sale_price_usd * (1 + COALESCE(ss.web_tax_percentage, 0) / 100)) / 5.0) * 5
        END)::numeric(15,2)

      WHEN ss.web_adjustment_rate IS NULL OR ss.manual_bcv_rate IS NULL OR ss.manual_bcv_rate = 0 THEN
        (CASE
          WHEN (p.sale_price_usd % 5) > 2.5 THEN CEIL(p.sale_price_usd / 5.0) * 5
          ELSE FLOOR(p.sale_price_usd / 5.0) * 5
        END)::numeric(15,2)

      ELSE
        (CASE
          WHEN (p.sale_price_usd * (ss.web_adjustment_rate / NULLIF(ss.manual_bcv_rate, 0)) % 5) > 2.5
            THEN CEIL((p.sale_price_usd * (ss.web_adjustment_rate / NULLIF(ss.manual_bcv_rate, 0))) / 5.0) * 5
          ELSE FLOOR((p.sale_price_usd * (ss.web_adjustment_rate / NULLIF(ss.manual_bcv_rate, 0))) / 5.0) * 5
        END)::numeric(15,2)
    END) AS price_nacional_usd,

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
'Catálogo PÚBLICO. Dualidad de precios: price_internacional_usd (POS, sin Base 5), price_nacional_usd (inflado + Base 5). sale_price_usd = alias de price_nacional_usd (retrocompatibilidad). La Web convierte a Bs.';

GRANT EXECUTE ON FUNCTION public.get_public_web_products_catalog() TO anon, authenticated;
