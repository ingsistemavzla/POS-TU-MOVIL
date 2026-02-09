-- ============================================================================
-- VERIFICACIÓN: ¿Se guardó la imagen en la base de datos?
-- ============================================================================
-- Ejecuta este script para verificar el estado actual en la BD
-- ============================================================================

-- ID del producto (reemplaza con el ID del producto que editaste)
-- Ejemplo: 'e61c2270-823f-47db-9531-8d04c7e3a853'
-- \set product_id '''e61c2270-823f-47db-9531-8d04c7e3a853''

-- 1. Ver el registro completo en web_product_metadata
SELECT 
  wpm.id,
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
  wpm.created_at,
  wpm.updated_at,
  EXTRACT(EPOCH FROM (NOW() - wpm.updated_at)) AS segundos_desde_actualizacion
FROM public.web_product_metadata wpm
LEFT JOIN public.products p ON wpm.product_id = p.id
WHERE wpm.product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 2. Ver qué retorna el RPC get_web_products_catalog para este producto
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
  web_visible,
  updated_at AS updated_at_rpc
FROM public.get_web_products_catalog()
WHERE id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 3. Comparar: ¿Coinciden los valores entre la tabla y el RPC?
SELECT 
  'web_product_metadata (tabla)' AS fuente,
  wpm.image_url AS url,
  wpm.visible AS visible,
  wpm.updated_at AS actualizado
FROM public.web_product_metadata wpm
WHERE wpm.product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853'
UNION ALL
SELECT 
  'get_web_products_catalog (RPC)' AS fuente,
  rpc.web_image_url AS url,
  rpc.web_visible AS visible,
  rpc.updated_at AS actualizado
FROM public.get_web_products_catalog() rpc
WHERE rpc.id = 'e61c2270-823f-47db-9531-8d04c7e3a853';





