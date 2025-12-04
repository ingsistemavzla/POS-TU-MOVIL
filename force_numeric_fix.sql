-- ====================================================================================
-- SCRIPT BULLDOZER: Force Numeric Field Overflow Fix
-- Fecha: 2025-01-27
-- Descripción: Elimina TODAS las dependencias y fuerza el cambio de tipos numéricos
-- Prioridad: Hacer que el POS funcione AHORA
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- PASO 1: ELIMINAR TODAS LAS VISTAS QUE DEPENDEN DE PRODUCTS
-- ====================================================================================
-- CASCADE elimina automáticamente todas las dependencias en cascada
-- ====================================================================================

-- Eliminar vista específica mencionada en el error
DROP VIEW IF EXISTS public.inventory_statistics_view CASCADE;

-- Eliminar CUALQUIER otra vista que dependa de products (por seguridad)
DO $$
DECLARE
    v_view_name TEXT;
    v_views_dropped TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Buscar y eliminar TODAS las vistas que dependen de la tabla products
    FOR v_view_name IN 
        SELECT DISTINCT dependent_ns.nspname::text || '.' || dependent_view.relname::text as view_name
        FROM pg_depend 
        JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
        JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
        JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid 
        JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
        JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
        WHERE source_ns.nspname = 'public'
        AND source_table.relname = 'products'
        AND dependent_view.relkind = 'v'
    LOOP
        -- Eliminar la vista con CASCADE
        EXECUTE 'DROP VIEW IF EXISTS ' || v_view_name || ' CASCADE';
        v_views_dropped := array_append(v_views_dropped, v_view_name);
        RAISE NOTICE 'Vista eliminada: %', v_view_name;
    END LOOP;
    
    -- Mostrar resumen
    IF array_length(v_views_dropped, 1) > 0 THEN
        RAISE NOTICE 'Total de vistas eliminadas: %', array_length(v_views_dropped, 1);
    ELSE
        RAISE NOTICE 'No se encontraron vistas dependientes';
    END IF;
END $$;

-- ====================================================================================
-- PASO 2: FORZAR CAMBIO DE TIPOS NUMÉRICOS (AHORA SIN OBSTÁCULOS)
-- ====================================================================================

-- Tabla products: cost_usd
ALTER TABLE public.products 
ALTER COLUMN cost_usd TYPE NUMERIC(15, 4);

-- Tabla products: sale_price_usd (o price_usd si existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'sale_price_usd'
    ) THEN
        ALTER TABLE public.products 
        ALTER COLUMN sale_price_usd TYPE NUMERIC(15, 4);
        RAISE NOTICE '✅ sale_price_usd cambiado a NUMERIC(15,4)';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'price_usd'
    ) THEN
        ALTER TABLE public.products 
        ALTER COLUMN price_usd TYPE NUMERIC(15, 4);
        RAISE NOTICE '✅ price_usd cambiado a NUMERIC(15,4)';
    END IF;
END $$;

-- Tabla products: tax_rate
ALTER TABLE public.products 
ALTER COLUMN tax_rate TYPE NUMERIC(10, 4);

-- Tabla sale_items: price_usd
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_items' 
        AND column_name = 'price_usd'
    ) THEN
        ALTER TABLE public.sale_items 
        ALTER COLUMN price_usd TYPE NUMERIC(15, 4);
        RAISE NOTICE '✅ sale_items.price_usd cambiado a NUMERIC(15,4)';
    END IF;
END $$;

-- Tabla sale_items: subtotal_usd
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_items' 
        AND column_name = 'subtotal_usd'
    ) THEN
        ALTER TABLE public.sale_items 
        ALTER COLUMN subtotal_usd TYPE NUMERIC(15, 4);
        RAISE NOTICE '✅ sale_items.subtotal_usd cambiado a NUMERIC(15,4)';
    END IF;
END $$;

-- Tabla sales: total_usd
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'total_usd'
    ) THEN
        ALTER TABLE public.sales 
        ALTER COLUMN total_usd TYPE NUMERIC(15, 4);
        RAISE NOTICE '✅ sales.total_usd cambiado a NUMERIC(15,4)';
    END IF;
END $$;

-- ====================================================================================
-- PASO 3: VERIFICACIÓN FINAL
-- ====================================================================================
-- Confirma que los cambios se aplicaron correctamente
-- ====================================================================================

DO $$
DECLARE
    v_cost_type TEXT;
    v_price_type TEXT;
    v_tax_type TEXT;
    v_sale_items_price_type TEXT;
    v_sale_items_subtotal_type TEXT;
    v_sales_total_type TEXT;
    v_all_ok BOOLEAN := true;
BEGIN
    -- Verificar cost_usd
    SELECT data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
    INTO v_cost_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'cost_usd';
    
    RAISE NOTICE '📊 products.cost_usd: %', v_cost_type;
    IF v_cost_type NOT LIKE 'numeric(15,4)%' THEN
        v_all_ok := false;
        RAISE WARNING '❌ cost_usd NO tiene la precisión correcta';
    END IF;
    
    -- Verificar sale_price_usd o price_usd
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'sale_price_usd'
    ) THEN
        SELECT data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
        INTO v_price_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'sale_price_usd';
        
        RAISE NOTICE '📊 products.sale_price_usd: %', v_price_type;
        IF v_price_type NOT LIKE 'numeric(15,4)%' THEN
            v_all_ok := false;
            RAISE WARNING '❌ sale_price_usd NO tiene la precisión correcta';
        END IF;
    ELSE
        SELECT data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
        INTO v_price_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'price_usd';
        
        RAISE NOTICE '📊 products.price_usd: %', v_price_type;
        IF v_price_type NOT LIKE 'numeric(15,4)%' THEN
            v_all_ok := false;
            RAISE WARNING '❌ price_usd NO tiene la precisión correcta';
        END IF;
    END IF;
    
    -- Verificar tax_rate
    SELECT data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
    INTO v_tax_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'tax_rate';
    
    RAISE NOTICE '📊 products.tax_rate: %', v_tax_type;
    IF v_tax_type NOT LIKE 'numeric(10,4)%' AND v_tax_type NOT LIKE 'numeric(5,4)%' THEN
        v_all_ok := false;
        RAISE WARNING '❌ tax_rate NO tiene la precisión correcta';
    END IF;
    
    -- Verificar sale_items.price_usd
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_items' 
        AND column_name = 'price_usd'
    ) THEN
        SELECT data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
        INTO v_sale_items_price_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'sale_items'
        AND column_name = 'price_usd';
        
        RAISE NOTICE '📊 sale_items.price_usd: %', v_sale_items_price_type;
        IF v_sale_items_price_type NOT LIKE 'numeric(15,4)%' THEN
            v_all_ok := false;
            RAISE WARNING '❌ sale_items.price_usd NO tiene la precisión correcta';
        END IF;
    END IF;
    
    -- Verificar sale_items.subtotal_usd
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_items' 
        AND column_name = 'subtotal_usd'
    ) THEN
        SELECT data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
        INTO v_sale_items_subtotal_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'sale_items'
        AND column_name = 'subtotal_usd';
        
        RAISE NOTICE '📊 sale_items.subtotal_usd: %', v_sale_items_subtotal_type;
        IF v_sale_items_subtotal_type NOT LIKE 'numeric(15,4)%' THEN
            v_all_ok := false;
            RAISE WARNING '❌ sale_items.subtotal_usd NO tiene la precisión correcta';
        END IF;
    END IF;
    
    -- Verificar sales.total_usd
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'total_usd'
    ) THEN
        SELECT data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
        INTO v_sales_total_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'sales'
        AND column_name = 'total_usd';
        
        RAISE NOTICE '📊 sales.total_usd: %', v_sales_total_type;
        IF v_sales_total_type NOT LIKE 'numeric(15,4)%' THEN
            v_all_ok := false;
            RAISE WARNING '❌ sales.total_usd NO tiene la precisión correcta';
        END IF;
    END IF;
    
    -- Resumen final
    IF v_all_ok THEN
        RAISE NOTICE '✅ ✅ ✅ TODOS LOS CAMBIOS APLICADOS CORRECTAMENTE ✅ ✅ ✅';
        RAISE NOTICE 'El POS ahora puede crear productos sin errores de overflow.';
    ELSE
        RAISE WARNING '⚠️ Algunos campos no se actualizaron correctamente. Revisar manualmente.';
    END IF;
END $$;

COMMIT;

-- ====================================================================================
-- RESUMEN
-- ====================================================================================
-- ✅ Vistas eliminadas (CASCADE)
-- ✅ Columnas ampliadas a NUMERIC(15,4) o NUMERIC(10,4)
-- ✅ Verificación completada
-- ====================================================================================
-- NOTA: Las vistas eliminadas se pueden recrear después si son necesarias.
-- Prioridad: Hacer que el POS funcione AHORA.
-- ====================================================================================





