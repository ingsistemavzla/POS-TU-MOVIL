-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Estado de imagen en Base de Datos
-- ============================================================================
-- Ejecuta este script INMEDIATAMENTE después de guardar cambios
-- ============================================================================

-- 1. Ver EXACTAMENTE qué hay en web_product_metadata para este producto
SELECT 
  wpm.id,
  wpm.product_id,
  p.name AS product_name,
  wpm.image_url,
  CASE 
    WHEN wpm.image_url IS NULL THEN '❌ NULL - NO HAY IMAGEN'
    WHEN wpm.image_url = '' THEN '❌ VACÍO - NO HAY IMAGEN'
    WHEN LENGTH(wpm.image_url) > 0 THEN '✅ TIENE VALOR (' || LENGTH(wpm.image_url) || ' caracteres)'
    ELSE '❓ DESCONOCIDO'
  END AS estado_url,
  SUBSTRING(wpm.image_url, 1, 100) AS url_preview,  -- Primeros 100 caracteres
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
  SUBSTRING(web_image_url, 1, 100) AS url_preview_rpc,
  web_visible
FROM public.get_web_products_catalog()
WHERE id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 3. Comparar: ¿Qué hay en BD directa vs qué retorna el RPC?
SELECT 
  'web_product_metadata (BD directa)' AS fuente,
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
  NULL::TIMESTAMPTZ AS actualizado
FROM public.get_web_products_catalog() rpc
WHERE rpc.id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 4. Verificar si el registro existe en web_product_metadata
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.web_product_metadata 
      WHERE product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853'
    ) THEN '✅ EXISTE' 
    ELSE '❌ NO EXISTE' 
  END AS registro_existe;





