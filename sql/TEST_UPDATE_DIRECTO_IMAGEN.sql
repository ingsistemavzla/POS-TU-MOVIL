-- ============================================================================
-- TEST: Actualización directa de imagen (sin RPC)
-- ============================================================================
-- Ejecuta este script para probar si el UPDATE directo funciona
-- ============================================================================

-- 1. Ver el estado actual
SELECT 
  product_id,
  image_url,
  visible,
  updated_at
FROM public.web_product_metadata
WHERE product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 2. Intentar actualizar directamente
UPDATE public.web_product_metadata
SET 
  image_url = 'https://swsqmsbyikznalrvydny.supabase.co/storage/v1/object/public/product-images/aa11bb22-cc33-dd44-ee55-ff6677889900/e61c2270-823f-47db-9531-8d04c7e3a853.png',
  visible = true,
  updated_at = NOW()
WHERE product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 3. Ver el estado después del UPDATE
SELECT 
  product_id,
  image_url,
  visible,
  updated_at
FROM public.web_product_metadata
WHERE product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 4. Verificar qué retorna el RPC después del UPDATE
SELECT 
  id,
  name,
  web_image_url,
  web_visible
FROM public.get_web_products_catalog()
WHERE id = 'e61c2270-823f-47db-9531-8d04c7e3a853';





