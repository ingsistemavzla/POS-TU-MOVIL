-- ============================================================================
-- Migration: Actualizar tax_rate de ventas antiguas a 0 (Opcional)
-- Fecha: 2025-01-29
-- Descripción: Actualiza las ventas creadas ANTES de la migración para
--              establecer tax_rate = 0. Esto es OPCIONAL y solo para
--              consistencia de datos históricos.
-- ============================================================================

-- ACTUALIZAR VENTAS ANTIGUAS: Establecer tax_rate = 0 en todas las ventas
-- donde tax_rate != 0 (ventas creadas antes de la migración)
UPDATE sales
SET tax_rate = 0
WHERE tax_rate != 0;

-- Verificar el resultado
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Ventas actualizadas: %', updated_count;
    
    IF updated_count > 0 THEN
        RAISE NOTICE '✅ Todas las ventas ahora tienen tax_rate = 0';
    ELSE
        RAISE NOTICE 'ℹ️ No había ventas con tax_rate != 0 para actualizar';
    END IF;
END $$;

COMMENT ON COLUMN sales.tax_rate IS 'Tasa de impuesto (siempre 0 después de la migración 20250125000002). Las ventas antiguas fueron actualizadas a 0.';



