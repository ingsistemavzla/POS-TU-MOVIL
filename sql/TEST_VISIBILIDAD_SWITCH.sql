-- ============================================================================
-- TEST: Verificar que el switch de visibilidad funciona correctamente
-- ============================================================================
-- Este script ayuda a diagnosticar si la visibilidad se está guardando
-- correctamente en la base de datos cuando se cambia desde el switch
-- ============================================================================

-- ID del producto a testear (reemplazar con el ID real)
\set product_id '''e61c2270-823f-47db-9531-8d04c7e3a853'''

-- 1. Estado actual ANTES del cambio
SELECT 
  '1. Estado ANTES del cambio' AS paso,
  wpm.product_id,
  p.name AS product_name,
  wpm.image_url,
  wpm.visible,
  wpm.updated_at
FROM public.web_product_metadata wpm
LEFT JOIN public.products p ON wpm.product_id = p.id
WHERE wpm.product_id = :product_id;

-- 2. Simular cambio de visibilidad a FALSE (ocultar) - SIN cambiar imagen
-- IMPORTANTE: p_web_image_url = NULL para mantener la imagen existente
BEGIN;
  SELECT 
    '2. Simulando cambiar visibilidad a FALSE (mantener imagen)' AS paso,
    public.sync_web_product_price(
      :product_id,
      (SELECT sale_price_usd FROM public.products WHERE id = :product_id),
      NULL,  -- ✅ NULL = mantener imagen existente
      false  -- ✅ Cambiar visibilidad a false (ocultar)
    ) AS resultado;
ROLLBACK;

-- 3. Simular cambio de visibilidad a TRUE (mostrar) - SIN cambiar imagen
-- IMPORTANTE: p_web_image_url = NULL para mantener la imagen existente
BEGIN;
  SELECT 
    '3. Simulando cambiar visibilidad a TRUE (mantener imagen)' AS paso,
    public.sync_web_product_price(
      :product_id,
      (SELECT sale_price_usd FROM public.products WHERE id = :product_id),
      NULL,  -- ✅ NULL = mantener imagen existente
      true   -- ✅ Cambiar visibilidad a true (mostrar)
    ) AS resultado;
ROLLBACK;

-- 4. Verificar qué retorna get_web_products_catalog para este producto
SELECT 
  '4. Estado en get_web_products_catalog' AS paso,
  id,
  name,
  web_image_url,
  web_visible,
  updated_at
FROM public.get_web_products_catalog()
WHERE id = :product_id;

-- 5. Comparar estado entre tabla directa y RPC
SELECT 
  '5. Comparación tabla vs RPC' AS paso,
  'web_product_metadata' AS fuente,
  wpm.image_url,
  wpm.visible,
  wpm.updated_at
FROM public.web_product_metadata wpm
WHERE wpm.product_id = :product_id
UNION ALL
SELECT 
  'get_web_products_catalog' AS fuente,
  rpc.web_image_url,
  rpc.web_visible,
  rpc.updated_at
FROM public.get_web_products_catalog() rpc
WHERE rpc.id = :product_id;





