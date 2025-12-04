-- ====================================================================================
-- LIMPIEZA DE FUNCIONES DUPLICADAS (Si es necesario)
-- ====================================================================================
-- Este script elimina versiones antiguas de las funciones si hay duplicados
-- EJECUTAR SOLO SI HAY PROBLEMAS CON FUNCIONES DUPLICADAS
-- ====================================================================================

-- Ver funciones duplicadas primero
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments,
  oid
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('transfer_inventory', 'create_product_v3', 'process_sale')
ORDER BY proname, arguments;

-- Si necesitas eliminar funciones específicas, usa este formato:
-- DROP FUNCTION IF EXISTS public.transfer_inventory(uuid, uuid, uuid, integer, uuid, uuid) CASCADE;
-- DROP FUNCTION IF EXISTS public.create_product_v3(text, text, text, text, decimal, decimal, decimal, jsonb) CASCADE;

-- O eliminar TODAS las versiones y dejar solo las nuevas (CUIDADO):
-- DO $$
-- DECLARE
--   r RECORD;
-- BEGIN
--   FOR r IN 
--     SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
--     FROM pg_proc
--     WHERE pronamespace = 'public'::regnamespace
--       AND proname IN ('transfer_inventory', 'create_product_v3', 'process_sale')
--   LOOP
--     EXECUTE 'DROP FUNCTION IF EXISTS public.' || r.proname || '(' || r.args || ') CASCADE';
--   END LOOP;
-- END $$;





