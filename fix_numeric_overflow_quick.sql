-- ====================================================================================
-- FIX RÁPIDO: Numeric Field Overflow - Intervención Quirúrgica
-- ====================================================================================
-- Prioridad: Hacer que el POS funcione AHORA
-- Elimina la vista problemática y arregla las columnas críticas
-- ====================================================================================

-- PASO 1: ELIMINAR VISTA PROBLEMÁTICA (solo es un reporte, no crítico)
DROP VIEW IF EXISTS public.inventory_statistics_view CASCADE;

-- PASO 2: ARREGLAR COLUMNAS CRÍTICAS DE PRODUCTOS (lo que impide crear productos)

-- Ampliar cost_usd
ALTER TABLE public.products 
ALTER COLUMN cost_usd TYPE NUMERIC(15, 4);

-- Ampliar sale_price_usd (la columna que causa el error)
ALTER TABLE public.products 
ALTER COLUMN sale_price_usd TYPE NUMERIC(15, 4);

-- Ampliar tax_rate
ALTER TABLE public.products 
ALTER COLUMN tax_rate TYPE NUMERIC(5, 4);

-- ====================================================================================
-- LISTO. El POS ahora puede crear productos sin errores.
-- La vista inventory_statistics_view se puede recrear después si es necesaria.
-- ====================================================================================





