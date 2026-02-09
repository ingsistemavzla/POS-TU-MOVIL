-- ============================================================================
-- VERIFICACIÓN RÁPIDA: Estado actual de la imagen en BD
-- ============================================================================
-- Ejecuta este script para ver qué hay en la base de datos AHORA
-- ============================================================================

-- Ver el registro completo de web_product_metadata
SELECT 
  wpm.product_id,
  p.name AS product_name,
  wpm.image_url,
  CASE 
    WHEN wpm.image_url IS NULL THEN '❌ NULL'
    WHEN wpm.image_url = '' THEN '❌ VACÍO'
    WHEN LENGTH(wpm.image_url) > 0 THEN '✅ TIENE VALOR (' || LENGTH(wpm.image_url) || ' caracteres)'
    ELSE '❓ DESCONOCIDO'
  END AS estado_url,
  wpm.visible,
  wpm.updated_at,
  EXTRACT(EPOCH FROM (NOW() - wpm.updated_at)) AS segundos_desde_actualizacion
FROM public.web_product_metadata wpm
LEFT JOIN public.products p ON wpm.product_id = p.id
WHERE wpm.product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- Ver qué retorna el RPC
SELECT 
  id,
  name,
  web_image_url,
  CASE 
    WHEN web_image_url IS NULL THEN '❌ NULL'
    WHEN web_image_url = '' THEN '❌ VACÍO'
    WHEN LENGTH(web_image_url) > 0 THEN '✅ TIENE VALOR (' || LENGTH(web_image_url) || ' caracteres)'
    ELSE '❓ DESCONOCIDO'
  END AS estado_url_en_rpc,
  web_visible
FROM public.get_web_products_catalog()
WHERE id = 'e61c2270-823f-47db-9531-8d04c7e3a853';





