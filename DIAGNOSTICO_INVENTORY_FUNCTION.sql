-- ============================================================================
-- DIAGNÓSTICO: Verificar get_inventory_financial_summary
-- ============================================================================
-- Esta query ayuda a diagnosticar problemas con la función
-- ============================================================================

-- PASO 1: Verificar si la función retorna un error
SELECT 
  get_inventory_financial_summary() AS full_result;

-- PASO 2: Verificar si hay campo 'error' en la respuesta
SELECT 
  get_inventory_financial_summary()->'error' AS has_error,
  get_inventory_financial_summary()->'message' AS error_message;

-- PASO 3: Verificar los campos específicos (usando ->> para texto)
SELECT 
  (get_inventory_financial_summary()::jsonb->>'out_of_stock_count')::integer AS out_of_stock,
  (get_inventory_financial_summary()::jsonb->>'critical_stock_count')::integer AS low_stock,
  (get_inventory_financial_summary()::jsonb->>'total_cost_value')::numeric AS total_cost,
  (get_inventory_financial_summary()::jsonb->>'total_items')::integer AS total_units;

-- PASO 4: Verificar si hay datos en las tablas base
SELECT 
  COUNT(DISTINCT inv.product_id) AS total_products,
  COUNT(DISTINCT inv.store_id) AS total_stores,
  SUM(inv.qty) AS total_quantity,
  COUNT(DISTINCT CASE WHEN inv.qty = 0 THEN inv.product_id END) AS products_with_zero_stock
FROM public.inventories inv
INNER JOIN public.products p ON inv.product_id = p.id
WHERE p.active = true;

-- PASO 5: Verificar company_id del usuario actual
SELECT 
  public.get_user_company_id() AS current_company_id;








