-- ============================================================================
-- DIAGNÓSTICO: ¿Por qué el RPC no retorna el producto?
-- ============================================================================
-- Este script verifica si el producto cumple las condiciones del RPC
-- ============================================================================

-- ID del producto a verificar
-- \set product_id '''e61c2270-823f-47db-9531-8d04c7e3a853'''

-- 1. Verificar si el producto existe y cumple las condiciones básicas
SELECT 
  '1. Estado del producto en public.products' AS verificacion,
  p.id,
  p.name,
  p.company_id,
  p.active,
  p.updated_at AS products_updated_at
FROM public.products p
WHERE p.id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 2. Verificar si existe el registro en web_product_metadata
SELECT 
  '2. Estado en web_product_metadata' AS verificacion,
  wpm.product_id,
  wpm.image_url,
  wpm.visible,
  wpm.updated_at AS metadata_updated_at
FROM public.web_product_metadata wpm
WHERE wpm.product_id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 3. Verificar el company_id del usuario actual (simula lo que hace el RPC)
SELECT 
  '3. company_id del usuario actual' AS verificacion,
  u.id AS user_id,
  u.company_id,
  u.role,
  u.email
FROM public.users u
WHERE u.auth_user_id = auth.uid();

-- 4. Verificar si el producto cumple TODAS las condiciones del RPC:
--    - p.company_id = v_company_id (del usuario)
--    - p.active = true
--    - p.id = 'e61c2270-823f-47db-9531-8d04c7e3a853'
SELECT 
  '4. Verificación completa de condiciones del RPC' AS verificacion,
  p.id,
  p.name,
  p.company_id AS product_company_id,
  (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1) AS user_company_id,
  CASE 
    WHEN p.company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1) THEN '✅ COINCIDEN'
    ELSE '❌ NO COINCIDEN'
  END AS company_match,
  p.active,
  CASE 
    WHEN p.active = true THEN '✅ ACTIVO'
    ELSE '❌ INACTIVO'
  END AS active_status,
  CASE 
    WHEN p.company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1) 
         AND p.active = true THEN '✅ CUMPLE TODAS LAS CONDICIONES'
    ELSE '❌ NO CUMPLE ALGUNA CONDICIÓN'
  END AS resultado_final
FROM public.products p
WHERE p.id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 5. Intentar ejecutar el RPC directamente para ver si retorna algo
SELECT 
  '5. Resultado del RPC get_web_products_catalog' AS verificacion,
  rpc.id,
  rpc.name,
  rpc.web_image_url,
  rpc.web_visible,
  rpc.updated_at
FROM public.get_web_products_catalog() rpc
WHERE rpc.id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 6. Ver cuántos productos retorna el RPC en total (para verificar que funciona)
SELECT 
  '6. Total de productos retornados por el RPC' AS verificacion,
  COUNT(*) AS total_productos
FROM public.get_web_products_catalog();





