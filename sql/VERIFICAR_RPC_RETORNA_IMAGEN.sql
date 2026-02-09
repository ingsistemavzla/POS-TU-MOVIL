-- ============================================================================
-- VERIFICACIÓN: ¿El RPC get_web_products_catalog retorna la imagen?
-- ============================================================================
-- Ejecuta este script para verificar si el RPC está retornando la imagen
-- ============================================================================

-- Ver qué retorna el RPC para el producto específico
SELECT 
  id,
  name,
  web_image_url,
  CASE 
    WHEN web_image_url IS NULL THEN '❌ NULL'
    WHEN web_image_url = '' THEN '❌ VACÍO'
    WHEN LENGTH(web_image_url) > 0 THEN '✅ TIENE VALOR (' || LENGTH(web_image_url) || ' caracteres)'
    ELSE '❓ DESCONOCIDO'
  END AS estado_url,
  web_visible
FROM public.get_web_products_catalog()
WHERE id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- Comparar: BD directa vs RPC
SELECT 
  'BD directa (web_product_metadata)' AS fuente,
  wpm.image_url AS url,
  wpm.visible AS visible
FROM public.web_product_metadata wpm
WHERE wpm.product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853'
UNION ALL
SELECT 
  'RPC (get_web_products_catalog)' AS fuente,
  rpc.web_image_url AS url,
  rpc.web_visible AS visible
FROM public.get_web_products_catalog() rpc
WHERE rpc.id = 'e61c2270-823f-47db-9531-8d04c7e3a853';





