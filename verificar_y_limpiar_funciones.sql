-- ====================================================================================
-- VERIFICACIÓN Y LIMPIEZA DE FUNCIONES
-- ====================================================================================
-- Paso 1: Ver todas las versiones de las funciones con sus firmas completas
-- ====================================================================================

-- Ver funciones con firmas completas
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('transfer_inventory', 'create_product_v3', 'process_sale')
ORDER BY proname, arguments;

-- ====================================================================================
-- Paso 2: Si hay versiones antiguas, ejecuta este bloque para limpiarlas
-- ====================================================================================
-- IMPORTANTE: Solo ejecuta esto si ves versiones antiguas que no quieres
-- ====================================================================================

DO $$
DECLARE
  r RECORD;
  func_signature TEXT;
  keep_functions TEXT[] := ARRAY[
    -- Firmas de las funciones NUEVAS que queremos mantener
    'transfer_inventory(uuid, uuid, uuid, integer, uuid, uuid)',
    'create_product_v3(text, text, text, text, numeric, numeric, numeric, jsonb)',
    'process_sale(uuid, uuid, uuid, uuid, text, text, numeric, text, jsonb, text, numeric, boolean, numeric, numeric, numeric, boolean, jsonb, numeric)'
  ];
  should_keep BOOLEAN;
BEGIN
  FOR r IN 
    SELECT 
      oid,
      proname,
      pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('transfer_inventory', 'create_product_v3', 'process_sale')
  LOOP
    func_signature := r.proname || '(' || r.args || ')';
    should_keep := false;
    
    -- Verificar si esta firma está en la lista de funciones a mantener
    FOR i IN 1..array_length(keep_functions, 1) LOOP
      IF keep_functions[i] = func_signature THEN
        should_keep := true;
        EXIT;
      END IF;
    END LOOP;
    
    -- Si no está en la lista, eliminarla
    IF NOT should_keep THEN
      RAISE NOTICE 'Eliminando función antigua: %', func_signature;
      EXECUTE 'DROP FUNCTION IF EXISTS public.' || func_signature || ' CASCADE';
    ELSE
      RAISE NOTICE 'Manteniendo función: %', func_signature;
    END IF;
  END LOOP;
END $$;

-- ====================================================================================
-- Paso 3: Verificar resultado final
-- ====================================================================================

SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('transfer_inventory', 'create_product_v3', 'process_sale')
ORDER BY proname, arguments;





