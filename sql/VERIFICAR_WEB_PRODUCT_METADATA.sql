-- ============================================================================
-- VERIFICACIÓN: Estado de web_product_metadata
-- ============================================================================
-- Ejecuta este script para verificar qué hay en la tabla web_product_metadata
-- ============================================================================

-- Ver todos los registros de web_product_metadata
SELECT 
  wpm.id,
  wpm.product_id,
  p.name AS product_name,
  wpm.image_url,
  wpm.visible,
  wpm.created_at,
  wpm.updated_at
FROM public.web_product_metadata wpm
LEFT JOIN public.products p ON wpm.product_id = p.id
ORDER BY wpm.updated_at DESC
LIMIT 20;

-- Ver específicamente el producto que estamos editando
SELECT 
  wpm.id,
  wpm.product_id,
  p.name AS product_name,
  wpm.image_url,
  LENGTH(wpm.image_url) AS image_url_length,
  wpm.visible,
  wpm.created_at,
  wpm.updated_at
FROM public.web_product_metadata wpm
LEFT JOIN public.products p ON wpm.product_id = p.id
WHERE wpm.product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- Verificar si existe el registro
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.web_product_metadata 
      WHERE product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853'
    ) THEN 'EXISTE' 
    ELSE 'NO EXISTE' 
  END AS registro_existe;

