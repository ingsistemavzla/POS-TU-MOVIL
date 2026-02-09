-- ============================================================================
-- VERIFICACIÓN: company_id y condiciones del RPC
-- ============================================================================
-- Este script verifica si el problema está en el company_id o en las condiciones
-- ============================================================================

-- 1. Ver el company_id del usuario actual
SELECT 
  '1. company_id del usuario actual' AS verificacion,
  u.id AS user_id,
  u.email,
  u.company_id,
  u.auth_user_id
FROM public.users u
WHERE u.auth_user_id = auth.uid();

-- 2. Ver el company_id del producto que estamos buscando
SELECT 
  '2. company_id del producto' AS verificacion,
  p.id,
  p.name,
  p.company_id,
  p.active
FROM public.products p
WHERE p.id = 'e61c2270-823f-47db-9531-8d04c7e3a853';

-- 3. Verificar si coinciden los company_id
SELECT 
  '3. Comparación de company_id' AS verificacion,
  (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1) AS user_company_id,
  (SELECT company_id FROM public.products WHERE id = 'e61c2270-823f-47db-9531-8d04c7e3a853') AS product_company_id,
  CASE 
    WHEN (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1) = 
         (SELECT company_id FROM public.products WHERE id = 'e61c2270-823f-47db-9531-8d04c7e3a853') 
    THEN '✅ COINCIDEN' 
    ELSE '❌ NO COINCIDEN' 
  END AS coincidencia;

-- 4. Contar productos activos con el company_id del usuario
SELECT 
  '4. Productos activos con company_id del usuario' AS verificacion,
  COUNT(*) AS total_productos_activos
FROM public.products p
WHERE p.company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  AND p.active = true;

-- 5. Simular exactamente lo que hace el RPC (sin el GROUP BY problemático)
SELECT 
  '5. Simulación del RPC (sin GROUP BY)' AS verificacion,
  p.id,
  p.name,
  p.company_id,
  p.active,
  COALESCE(SUM(i.qty), 0) AS total_stock,
  wpm.image_url AS web_image_url,
  wpm.visible AS web_visible
FROM public.products p
LEFT JOIN public.inventories i ON p.id = i.product_id 
  AND i.company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
LEFT JOIN public.web_product_metadata wpm ON p.id = wpm.product_id
WHERE p.company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  AND p.active = true
GROUP BY 
  p.id, 
  p.name, 
  p.company_id, 
  p.active, 
  wpm.image_url, 
  wpm.visible
LIMIT 5;  -- Solo los primeros 5 para verificar

-- 6. Verificar si el problema es el auth.uid() en la función
-- (Esto es para debug: ver qué auth.uid() está retornando)
SELECT 
  '6. auth.uid() actual' AS verificacion,
  auth.uid() AS current_auth_uid;





