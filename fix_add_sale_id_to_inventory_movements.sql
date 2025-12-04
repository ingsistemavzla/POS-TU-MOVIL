-- ====================================================================================
-- CORRECCIÓN: Agregar columna sale_id a inventory_movements
-- Fecha: 2025-01-27
-- Descripción: Agrega la columna sale_id a la tabla inventory_movements para
--              permitir la vinculación de movimientos de inventario con ventas
-- ====================================================================================
-- PROBLEMA IDENTIFICADO:
-- La función delete_sale_and_restore_inventory intenta usar:
--   DELETE FROM public.inventory_movements WHERE sale_id = p_sale_id;
-- Pero la tabla inventory_movements NO tiene la columna sale_id.
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- PASO 1: Verificar si la columna ya existe y agregarla si no existe
-- ====================================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory_movements' 
        AND column_name = 'sale_id'
    ) THEN
        -- Agregar la columna sale_id
        ALTER TABLE public.inventory_movements
        ADD COLUMN sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Columna sale_id agregada exitosamente a inventory_movements.';
    ELSE
        RAISE NOTICE '✅ La columna sale_id ya existe en inventory_movements. No se requiere acción.';
    END IF;
END $$;

-- ====================================================================================
-- PASO 2: Crear índice para mejorar rendimiento de consultas
-- ====================================================================================
-- El índice solo se puede crear si la columna existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory_movements' 
        AND column_name = 'sale_id'
    ) THEN
        -- Usar EXECUTE para crear el índice dinámicamente
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_movements_sale_id ON public.inventory_movements(sale_id)';
        
        RAISE NOTICE '✅ Índice idx_inventory_movements_sale_id creado/verificado.';
    ELSE
        RAISE WARNING '⚠️ No se pudo crear el índice porque la columna sale_id no existe.';
    END IF;
END $$;

-- ====================================================================================
-- PASO 4: Verificación final
-- ====================================================================================
DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_index_exists BOOLEAN;
BEGIN
    -- Verificar columna
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory_movements' 
        AND column_name = 'sale_id'
    ) INTO v_column_exists;

    -- Verificar índice
    SELECT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'inventory_movements' 
        AND indexname = 'idx_inventory_movements_sale_id'
    ) INTO v_index_exists;

    IF v_column_exists AND v_index_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ ✅ ✅ CORRECCIÓN COMPLETADA EXITOSAMENTE ✅ ✅ ✅';
        RAISE NOTICE '';
        RAISE NOTICE '📋 CAMBIOS APLICADOS:';
        RAISE NOTICE '   ✅ Columna sale_id agregada a inventory_movements';
        RAISE NOTICE '   ✅ Foreign key a sales(id) con ON DELETE CASCADE';
        RAISE NOTICE '   ✅ Índice idx_inventory_movements_sale_id creado';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 FUNCIONES QUE SE BENEFICIAN:';
        RAISE NOTICE '   ✅ delete_sale_and_restore_inventory: Puede filtrar por sale_id';
        RAISE NOTICE '   ✅ process_sale: Puede vincular movimientos con ventas';
        RAISE NOTICE '';
    ELSE
        RAISE WARNING '⚠️ Algunos componentes no se crearon correctamente.';
        RAISE WARNING '   Columna sale_id: %', v_column_exists;
        RAISE WARNING '   Índice: %', v_index_exists;
    END IF;
END $$;

COMMIT;

-- ====================================================================================
-- RESUMEN
-- ====================================================================================
-- ✅ Columna sale_id agregada a inventory_movements
-- ✅ Foreign key a sales(id) con ON DELETE CASCADE (si se elimina una venta, se eliminan sus movimientos)
-- ✅ Índice creado para mejorar rendimiento
-- ✅ Verificación final completada
-- ====================================================================================

