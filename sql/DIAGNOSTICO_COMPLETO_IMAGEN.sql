-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Verificar estado de imagen en BD
-- ============================================================================
-- Ejecuta este script DESPUÉS de guardar cambios para ver qué hay en la BD
-- ============================================================================

-- 1. Ver el registro completo de web_product_metadata para este producto
SELECT 
  wpm.id,
  wpm.product_id,
  p.name AS product_name,
  wpm.image_url,
  CASE 
    WHEN wpm.image_url IS NULL THEN 'NULL'
    WHEN wpm.image_url = '' THEN 'VACÍO'
    ELSE 'TIENE VALOR'
  END AS estado_url,
  LENGTH(wpm.image_url) AS image_url_length,
  wpm.visible,
  wpm.created_at,
  wpm.updated_at
FROM public.web_product_metadata wpm
LEFT JOIN public.products p ON wpm.product_id = p.id
WHERE wpm.product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 2. Ver qué retorna el RPC get_web_products_catalog para este producto
SELECT 
  id,
  name,
  web_image_url,
  CASE 
    WHEN web_image_url IS NULL THEN 'NULL'
    WHEN web_image_url = '' THEN 'VACÍO'
    ELSE 'TIENE VALOR'
  END AS estado_url_en_rpc,
  web_visible
FROM public.get_web_products_catalog()
WHERE id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 3. Comparar: ¿Qué hay en web_product_metadata vs qué retorna el RPC?
SELECT 
  'web_product_metadata' AS fuente,
  wpm.image_url AS url_en_bd,
  wpm.visible AS visible_en_bd
FROM public.web_product_metadata wpm
WHERE wpm.product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853'
UNION ALL
SELECT 
  'get_web_products_catalog' AS fuente,
  rpc.web_image_url AS url_en_bd,
  rpc.web_visible AS visible_en_bd
FROM public.get_web_products_catalog() rpc
WHERE rpc.id = 'e61c2270-823f-47db-9531-8d04c7e3a853';





