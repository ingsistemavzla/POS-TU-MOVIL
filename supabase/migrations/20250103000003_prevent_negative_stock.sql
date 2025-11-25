-- Migration: Prevenir stock negativo en inventarios
-- Fecha: 2025-01-03
-- Descripción: Agregar constraint y trigger para prevenir valores negativos en qty

-- Constraint CHECK para prevenir stock negativo en inventarios
ALTER TABLE public.inventories 
  DROP CONSTRAINT IF EXISTS inventories_qty_non_negative;

ALTER TABLE public.inventories
  ADD CONSTRAINT inventories_qty_non_negative 
  CHECK (qty >= 0);

-- Función para corregir valores negativos existentes (ejecutar una vez)
CREATE OR REPLACE FUNCTION public.fix_negative_stock()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fixed_count integer := 0;
BEGIN
  -- Corregir todos los valores negativos a 0
  UPDATE public.inventories
  SET qty = 0, updated_at = NOW()
  WHERE qty < 0;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  
  RETURN fixed_count;
END;
$$;

-- Ejecutar corrección de datos existentes
SELECT public.fix_negative_stock() as corrected_records;

-- Comentario
COMMENT ON CONSTRAINT inventories_qty_non_negative ON public.inventories IS 
  'Garantiza que el stock nunca sea negativo. Los valores negativos se bloquean a nivel de base de datos.';

