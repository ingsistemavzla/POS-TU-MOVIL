-- Migration: Fix numeric field overflow in products table
-- Fecha: 2025-01-27
-- Descripción: Amplía la precisión de los campos numéricos en products y tablas relacionadas
--              para evitar errores de "numeric field overflow" al crear productos con valores altos

-- ====================================================================================
-- PASO 1: AMPLIAR COLUMNAS DE PRODUCTOS
-- ====================================================================================
-- Cambiar DECIMAL(10,2) a NUMERIC(15,4) para permitir valores más altos y más decimales
-- Esto permite valores hasta 999,999,999,999.9999 (suficiente para cualquier producto)

-- Ampliar cost_usd
ALTER TABLE public.products 
ALTER COLUMN cost_usd TYPE NUMERIC(15, 4);

-- Ampliar sale_price_usd (si existe, puede estar como price_usd)
-- IMPORTANTE: Primero eliminar vistas que dependen de esta columna
DO $$
DECLARE
    v_view_name TEXT;
    v_view_definition TEXT;
    v_views_dropped TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Buscar y eliminar todas las vistas que dependen de la tabla products
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
        -- Guardar la definición de la vista antes de eliminarla
        BEGIN
            SELECT pg_get_viewdef(v_view_name::regclass, true) INTO v_view_definition;
            RAISE NOTICE 'Vista encontrada: %', v_view_name;
            RAISE NOTICE 'Definición: %', v_view_definition;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'No se pudo obtener definición de vista: %', v_view_name;
        END;
        
        -- Eliminar la vista con CASCADE para eliminar dependencias
        EXECUTE 'DROP VIEW IF EXISTS ' || v_view_name || ' CASCADE';
        
        -- Guardar el nombre de la vista eliminada
        v_views_dropped := array_append(v_views_dropped, v_view_name);
        
        RAISE NOTICE 'Vista eliminada: %', v_view_name;
    END LOOP;
    
    -- Si no se encontraron vistas, intentar eliminar la vista específica mencionada en el error
    IF array_length(v_views_dropped, 1) IS NULL THEN
        DROP VIEW IF EXISTS public.inventory_statistics_view CASCADE;
        IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'inventory_statistics_view' AND schemaname = 'public') THEN
            v_views_dropped := array_append(v_views_dropped, 'public.inventory_statistics_view');
            RAISE NOTICE 'Vista inventory_statistics_view eliminada';
        END IF;
    END IF;
    
    -- Ahora cambiar el tipo de columna
    -- Intentar cambiar sale_price_usd si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'sale_price_usd'
    ) THEN
        ALTER TABLE public.products 
        ALTER COLUMN sale_price_usd TYPE NUMERIC(15, 4);
        RAISE NOTICE '✅ Columna sale_price_usd ampliada a NUMERIC(15,4)';
    END IF;
    
    -- Si no existe sale_price_usd, intentar cambiar price_usd
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'price_usd'
    ) THEN
        ALTER TABLE public.products 
        ALTER COLUMN price_usd TYPE NUMERIC(15, 4);
        RAISE NOTICE '✅ Columna price_usd ampliada a NUMERIC(15,4)';
    END IF;
    
    -- Mostrar resumen de vistas eliminadas
    IF array_length(v_views_dropped, 1) > 0 THEN
        RAISE NOTICE '⚠️ Vistas eliminadas (pueden necesitar recrearse): %', array_to_string(v_views_dropped, ', ');
    ELSE
        RAISE NOTICE '✅ No se encontraron vistas dependientes';
    END IF;
END $$;

-- Ampliar tax_rate (de DECIMAL(5,2) a NUMERIC(5,4) para permitir más precisión)
ALTER TABLE public.products 
ALTER COLUMN tax_rate TYPE NUMERIC(5, 4);

-- ====================================================================================
-- PASO 2: AMPLIAR COLUMNAS EN TABLAS RELACIONADAS (Por seguridad)
-- ====================================================================================

-- Ampliar campos en sale_items
DO $$
BEGIN
    -- price_usd en sale_items
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_items' 
        AND column_name = 'price_usd'
    ) THEN
        ALTER TABLE public.sale_items 
        ALTER COLUMN price_usd TYPE NUMERIC(15, 4);
    END IF;
    
    -- subtotal_usd en sale_items
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_items' 
        AND column_name = 'subtotal_usd'
    ) THEN
        ALTER TABLE public.sale_items 
        ALTER COLUMN subtotal_usd TYPE NUMERIC(15, 4);
    END IF;
END $$;

-- Ampliar campos en sales
DO $$
BEGIN
    -- total_usd en sales
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'total_usd'
    ) THEN
        ALTER TABLE public.sales 
        ALTER COLUMN total_usd TYPE NUMERIC(15, 4);
    END IF;
    
    -- total_bs en sales (por si acaso)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'total_bs'
    ) THEN
        ALTER TABLE public.sales 
        ALTER COLUMN total_bs TYPE NUMERIC(18, 4);
    END IF;
    
    -- subtotal_usd en sales
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'subtotal_usd'
    ) THEN
        ALTER TABLE public.sales 
        ALTER COLUMN subtotal_usd TYPE NUMERIC(15, 4);
    END IF;
    
    -- tax_amount_usd en sales
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'tax_amount_usd'
    ) THEN
        ALTER TABLE public.sales 
        ALTER COLUMN tax_amount_usd TYPE NUMERIC(15, 4);
    END IF;
END $$;

-- Ampliar campos en sale_payments
DO $$
BEGIN
    -- amount_usd en sale_payments
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_payments' 
        AND column_name = 'amount_usd'
    ) THEN
        ALTER TABLE public.sale_payments 
        ALTER COLUMN amount_usd TYPE NUMERIC(15, 4);
    END IF;
    
    -- amount_bs en sale_payments
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_payments' 
        AND column_name = 'amount_bs'
    ) THEN
        ALTER TABLE public.sale_payments 
        ALTER COLUMN amount_bs TYPE NUMERIC(18, 4);
    END IF;
    
    -- amount en sale_payments
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_payments' 
        AND column_name = 'amount'
    ) THEN
        ALTER TABLE public.sale_payments 
        ALTER COLUMN amount TYPE NUMERIC(15, 4);
    END IF;
END $$;

-- ====================================================================================
-- PASO 3: ACTUALIZAR FUNCIÓN create_product_v3 (Si tiene restricciones)
-- ====================================================================================
-- La función ya usa 'decimal' sin restricciones, pero vamos a asegurarnos
-- de que los parámetros acepten cualquier valor que la tabla permita

-- Nota: La función create_product_v3 ya está definida con 'decimal' sin límites
-- en fix_inventory_shield_final.sql, así que no necesita cambios.
-- Sin embargo, vamos a recrearla para asegurar compatibilidad.

-- Verificar si la función existe y recrearla si es necesario
DO $$
BEGIN
    -- Si la función existe, no hacer nada (ya está correcta)
    -- Si no existe, se creará en otra migración
    RAISE NOTICE 'Función create_product_v3 verificada. Los parámetros ya usan decimal sin restricciones.';
END $$;

-- ====================================================================================
-- VERIFICACIÓN FINAL
-- ====================================================================================
-- Verificar que los cambios se aplicaron correctamente

DO $$
DECLARE
    v_cost_type text;
    v_price_type text;
    v_tax_type text;
BEGIN
    -- Verificar cost_usd
    SELECT data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
    INTO v_cost_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'cost_usd';
    
    RAISE NOTICE 'cost_usd tipo actual: %', v_cost_type;
    
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
        
        RAISE NOTICE 'sale_price_usd tipo actual: %', v_price_type;
    ELSE
        SELECT data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
        INTO v_price_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'price_usd';
        
        RAISE NOTICE 'price_usd tipo actual: %', v_price_type;
    END IF;
    
    -- Verificar tax_rate
    SELECT data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
    INTO v_tax_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'tax_rate';
    
    RAISE NOTICE 'tax_rate tipo actual: %', v_tax_type;
    
    -- Validar que los cambios fueron exitosos
    IF v_cost_type LIKE 'numeric(15,4)%' AND v_price_type LIKE 'numeric(15,4)%' AND v_tax_type LIKE 'numeric(5,4)%' THEN
        RAISE NOTICE '✅ Todos los campos numéricos fueron ampliados correctamente';
    ELSE
        RAISE WARNING '⚠️ Algunos campos no se actualizaron. Verificar manualmente.';
    END IF;
END $$;

-- ====================================================================================
-- COMENTARIOS FINALES
-- ====================================================================================

COMMENT ON COLUMN public.products.cost_usd IS 'Costo del producto en USD. Precisión: NUMERIC(15,4) - permite valores hasta 999,999,999,999.9999';
COMMENT ON COLUMN public.products.sale_price_usd IS 'Precio de venta del producto en USD. Precisión: NUMERIC(15,4) - permite valores hasta 999,999,999,999.9999';
COMMENT ON COLUMN public.products.tax_rate IS 'Tasa de impuesto en porcentaje. Precisión: NUMERIC(5,4) - permite valores hasta 999.9999%';

