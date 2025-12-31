-- ============================================================================
-- ELIMINACIÓN SELECTIVA: Solo eliminar versión con p_category
-- ============================================================================
-- Este script elimina SOLO la versión con p_category (7 parámetros)
-- y mantiene la versión sin p_category (6 parámetros) que es la correcta
-- ============================================================================

-- Verificar estado inicial
DO $$
DECLARE
    v_count_with_category INTEGER;
    v_count_without_category INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count_with_category
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_sales_history_v2'
    AND pg_get_function_arguments(p.oid) LIKE '%p_category%';
    
    SELECT COUNT(*) INTO v_count_without_category
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_sales_history_v2'
    AND pg_get_function_arguments(p.oid) NOT LIKE '%p_category%';
    
    RAISE NOTICE 'Estado inicial:';
    RAISE NOTICE '  - Versiones CON p_category: %', v_count_with_category;
    RAISE NOTICE '  - Versiones SIN p_category: %', v_count_without_category;
    
    IF v_count_with_category = 0 THEN
        RAISE EXCEPTION 'No hay versiones con p_category para eliminar. Ya está resuelto.';
    END IF;
    
    IF v_count_without_category = 0 THEN
        RAISE EXCEPTION 'ERROR: No existe la versión sin p_category. No se puede eliminar la versión con p_category sin tener la correcta.';
    END IF;
END $$;

-- ============================================================================
-- ELIMINAR SOLO LA VERSIÓN CON p_category
-- ============================================================================

-- Método 1: Eliminar por firma completa con nombres de parámetros
DROP FUNCTION IF EXISTS public.get_sales_history_v2(
    p_company_id UUID,
    p_store_id UUID,
    p_date_from TIMESTAMPTZ,
    p_date_to TIMESTAMPTZ,
    p_category TEXT,
    p_limit INTEGER,
    p_offset INTEGER
) CASCADE;

-- Método 2: Eliminar por firma completa con tipos posicionales
DROP FUNCTION IF EXISTS public.get_sales_history_v2(
    UUID,
    UUID,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    INTEGER,
    INTEGER
) CASCADE;

-- Método 3: Eliminar usando tipos sin nombres (última variación posible)
DROP FUNCTION IF EXISTS public.get_sales_history_v2(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER) CASCADE;

-- ============================================================================
-- VERIFICACIÓN: Confirmar que solo quedó la versión correcta
-- ============================================================================
DO $$
DECLARE
    v_count_with_category INTEGER;
    v_count_without_category INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count_with_category
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_sales_history_v2'
    AND pg_get_function_arguments(p.oid) LIKE '%p_category%';
    
    SELECT COUNT(*) INTO v_count_without_category
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_sales_history_v2'
    AND pg_get_function_arguments(p.oid) NOT LIKE '%p_category%';
    
    RAISE NOTICE 'Estado final:';
    RAISE NOTICE '  - Versiones CON p_category: % (debe ser 0)', v_count_with_category;
    RAISE NOTICE '  - Versiones SIN p_category: % (debe ser 1)', v_count_without_category;
    
    IF v_count_with_category > 0 THEN
        RAISE EXCEPTION 'ERROR: Aún existen % versiones con p_category. La eliminación falló.', v_count_with_category;
    END IF;
    
    IF v_count_without_category = 0 THEN
        RAISE EXCEPTION 'ERROR: Se eliminó la versión correcta. La versión sin p_category no existe.';
    END IF;
    
    IF v_count_without_category > 1 THEN
        RAISE EXCEPTION 'ERROR: Existen % versiones sin p_category. Debe haber solo 1.', v_count_without_category;
    END IF;
    
    RAISE NOTICE '✅ ÉXITO: Solo existe la versión correcta (sin p_category)';
END $$;

-- ============================================================================
-- CONSULTA FINAL: Mostrar la versión que quedó
-- ============================================================================
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    '✅ Versión correcta (sin p_category)' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2'
ORDER BY p.proname;

-- Debe retornar SOLO 1 fila con "✅ Versión correcta (sin p_category)"

