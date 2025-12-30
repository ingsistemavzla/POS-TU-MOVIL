-- ============================================================================
-- SCRIPT DE VERIFICACIÓN: ¿La función process_sale ya tiene bloqueo pesimista?
-- ============================================================================
-- Ejecuta este script en Supabase SQL Editor para verificar el código actual
-- de la función process_sale

-- Ver el código fuente completo de la función
SELECT 
    pg_get_functiondef(oid) as function_code
FROM pg_proc 
WHERE proname = 'process_sale'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY oid DESC
LIMIT 1;

-- ============================================================================
-- INDICADORES A BUSCAR EN EL RESULTADO:
-- ============================================================================
-- ✅ Si ves "SELECT ... FOR UPDATE" → La función YA tiene bloqueo pesimista
-- ✅ Si ves "SET LOCAL lock_timeout" → La función YA tiene timeout
-- ✅ Si ves "ORDER BY (elem.value->>'product_id') ASC" → La función YA tiene orden determinista
--
-- ❌ Si NO ves estos elementos → Necesitas aplicar la migración
-- ============================================================================




