-- ============================================================================
-- Migración: Evolución de inventory_movements para conciliación de stock
-- ============================================================================
-- Fecha: 2025-02-09
-- Descripción: Añade old_qty y new_qty para la fórmula de trazabilidad:
--              Stock Anterior + Cambio = Stock Nuevo
--              Los registros existentes quedan con NULL (no se rompen).
-- NOTA: No incluye Trigger. Solo prepara la tabla para futura capa de auditoría.
-- ============================================================================

-- Añadir columna old_qty (stock antes del movimiento)
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS old_qty INTEGER NULL;

COMMENT ON COLUMN public.inventory_movements.old_qty IS
'Stock en inventario antes del movimiento. Usado para conciliación: Stock Anterior + Cambio (qty) = Stock Nuevo. NULL en registros históricos creados antes de esta migración.';

-- Añadir columna new_qty (stock después del movimiento)
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS new_qty INTEGER NULL;

COMMENT ON COLUMN public.inventory_movements.new_qty IS
'Stock en inventario después del movimiento. Usado para conciliación: Stock Anterior (old_qty) + Cambio (qty) = Stock Nuevo. NULL en registros históricos creados antes de esta migración.';
