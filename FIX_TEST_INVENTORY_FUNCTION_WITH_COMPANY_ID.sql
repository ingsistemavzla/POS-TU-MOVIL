-- ============================================================================
-- FIX: Test get_inventory_financial_summary con company_id explícito
-- ============================================================================
-- Problema: get_user_company_id() retorna NULL en SQL Editor (no hay auth context)
-- Solución: Obtener company_id manualmente y pasarlo como parámetro
-- ============================================================================

-- PASO 1: Obtener company_id de la tabla companies o users
-- Opción A: Si conoces el nombre de la compañía
SELECT id AS company_id, name 
FROM public.companies 
WHERE active = true
LIMIT 5;

-- Opción B: Obtener company_id de cualquier usuario
SELECT DISTINCT company_id 
FROM public.users 
WHERE company_id IS NOT NULL 
LIMIT 5;

-- PASO 2: Una vez que tengas el company_id, reemplaza 'TU_COMPANY_ID_AQUI' en la query de abajo
-- Ejemplo: Si el company_id es 'aa11bb22-cc33-dd44-ee55-ff6677889900', usa:

SELECT 
  (result->>'out_of_stock_count')::integer AS out_of_stock,
  (result->>'critical_stock_count')::integer AS low_stock,
  (result->>'total_cost_value')::numeric AS total_cost,
  (result->>'total_retail_value')::numeric AS total_retail,
  (result->>'total_items')::integer AS total_units,
  result->>'calculated_at' AS calculated_at
FROM (
  SELECT get_inventory_financial_summary('TU_COMPANY_ID_AQUI'::uuid) AS result
) AS subquery;

-- PASO 3: Verificar el resultado completo (para debugging)
SELECT get_inventory_financial_summary('TU_COMPANY_ID_AQUI'::uuid) AS full_result;


