-- ====================================================================================
-- VERIFICACIÓN DE FUNCIONES CREADAS
-- ====================================================================================
-- Este script verifica que las funciones del blindaje se crearon correctamente
-- y muestra sus firmas completas para detectar duplicados
-- ====================================================================================

-- Ver todas las versiones de las funciones críticas
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type,
  prokind as function_type
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('transfer_inventory', 'create_product_v3', 'process_sale')
ORDER BY proname, arguments;

-- Verificar que el trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'on_store_created';

-- Contar inventarios creados por el Smart Healer (si se ejecutó)
SELECT 
  COUNT(*) as total_inventories,
  COUNT(DISTINCT product_id) as total_products,
  COUNT(DISTINCT store_id) as total_stores
FROM inventories;





