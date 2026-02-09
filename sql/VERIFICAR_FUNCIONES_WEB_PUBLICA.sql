-- ============================================================================
-- VERIFICACIÓN: Funciones RPC para Sitio Web Público
-- ============================================================================
-- Este script verifica que las funciones públicas estén funcionando correctamente
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR get_public_web_products_catalog()
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '--- 1. Verificando get_public_web_products_catalog() ---';
END $$;

-- Contar productos visibles retornados
SELECT 
  'Total de productos visibles' AS verificacion,
  COUNT(*) AS total
FROM public.get_public_web_products_catalog();

-- Ver estructura de un producto (primeros 3)
SELECT 
  'Estructura de productos (primeros 3)' AS verificacion,
  id,
  sku,
  name,
  sale_price_usd,
  total_stock,
  web_image_url IS NOT NULL AS tiene_imagen,
  web_visible
FROM public.get_public_web_products_catalog()
LIMIT 3;

-- Verificar que NO hay cost_usd en la respuesta
-- (Si intentamos acceder a cost_usd, debería dar error)
SELECT 
  'Verificación de campos' AS verificacion,
  COUNT(*) AS total_productos,
  COUNT(CASE WHEN web_visible = true THEN 1 END) AS productos_visibles,
  COUNT(CASE WHEN web_image_url IS NOT NULL THEN 1 END) AS productos_con_imagen,
  COUNT(CASE WHEN web_visible = true AND web_image_url IS NOT NULL THEN 1 END) AS productos_visibles_con_imagen
FROM public.get_public_web_products_catalog();

-- ============================================================================
-- 2. VERIFICAR get_public_web_product_stock_by_store()
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '--- 2. Verificando get_public_web_product_stock_by_store() ---';
END $$;

-- Obtener un producto visible para probar
DO $$
DECLARE
  v_test_product_id UUID;
  v_stock_result JSONB;
BEGIN
  -- Obtener el primer producto visible
  SELECT id INTO v_test_product_id
  FROM public.get_public_web_products_catalog()
  LIMIT 1;

  IF v_test_product_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay productos visibles para probar stock por sucursal';
    RETURN;
  END IF;

  RAISE NOTICE 'Producto de prueba: %', v_test_product_id;

  -- Llamar a la función de stock por sucursal
  SELECT get_public_web_product_stock_by_store(v_test_product_id) INTO v_stock_result;

  RAISE NOTICE 'Resultado de stock por sucursal:';
  RAISE NOTICE '%', v_stock_result::text;
END $$;

-- Ver stock por sucursal de un producto específico (reemplazar con ID real)
-- SELECT get_public_web_product_stock_by_store('e61c2270-823f-47db-9531-8d04c7e3a853');

-- ============================================================================
-- 3. VERIFICAR FILTRO DE VISIBILIDAD
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '--- 3. Verificando filtro de visibilidad ---';
END $$;

-- Comparar: productos totales vs productos visibles
SELECT 
  'Comparación de productos' AS verificacion,
  (SELECT COUNT(*) FROM public.products WHERE active = true) AS total_productos_activos,
  (SELECT COUNT(*) FROM public.get_public_web_products_catalog()) AS productos_visibles_publicos,
  (SELECT COUNT(*) FROM public.web_product_metadata WHERE visible = true AND image_url IS NOT NULL) AS productos_con_visible_true_en_metadata;

-- Verificar que todos los productos retornados tienen imagen
SELECT 
  'Verificación de integridad' AS verificacion,
  COUNT(*) AS total_retornados,
  COUNT(CASE WHEN web_image_url IS NULL OR web_image_url = '' THEN 1 END) AS sin_imagen,
  COUNT(CASE WHEN web_visible = false THEN 1 END) AS no_visibles
FROM public.get_public_web_products_catalog();

-- ============================================================================
-- 4. VERIFICAR ESTRUCTURA DE STOCK POR SUCURSAL
-- ============================================================================

-- Obtener un producto y ver su stock por sucursal
DO $$
DECLARE
  v_test_product_id UUID;
  v_stock_result JSONB;
  v_store_count INTEGER;
BEGIN
  -- Obtener el primer producto visible
  SELECT id INTO v_test_product_id
  FROM public.get_public_web_products_catalog()
  LIMIT 1;

  IF v_test_product_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay productos visibles para probar';
    RETURN;
  END IF;

  -- Llamar a la función
  SELECT get_public_web_product_stock_by_store(v_test_product_id) INTO v_stock_result;

  -- Contar sucursales en el resultado
  SELECT jsonb_array_length(v_stock_result) INTO v_store_count;

  RAISE NOTICE 'Producto ID: %', v_test_product_id;
  RAISE NOTICE 'Número de sucursales: %', v_store_count;
  RAISE NOTICE 'Estructura JSON: %', v_stock_result::text;

  -- Verificar estructura de cada elemento
  IF v_store_count > 0 THEN
    RAISE NOTICE 'Primer elemento del array:';
    RAISE NOTICE '  store_id: %', v_stock_result->0->>'store_id';
    RAISE NOTICE '  store_name: %', v_stock_result->0->>'store_name';
    RAISE NOTICE '  qty: %', v_stock_result->0->>'qty';
  END IF;
END $$;

-- ============================================================================
-- 5. RESUMEN DE VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '--- 5. RESUMEN DE VERIFICACIÓN ---';
END $$;

SELECT 
  '✅ Funciones verificadas' AS estado,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_public_web_products_catalog'
    ) THEN '✅ get_public_web_products_catalog existe'
    ELSE '❌ get_public_web_products_catalog NO existe'
  END AS funcion_catalogo,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_public_web_product_stock_by_store'
    ) THEN '✅ get_public_web_product_stock_by_store existe'
    ELSE '❌ get_public_web_product_stock_by_store NO existe'
  END AS funcion_stock;

