-- Agregar campo IMEI a sale_items para productos de teléfonos
-- Migration: 20250101000017_add_imei_to_sale_items.sql

-- Agregar campo IMEI a la tabla sale_items
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS imei TEXT DEFAULT NULL;

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN public.sale_items.imei IS 'IMEI del teléfono vendido (solo para productos de categoría phones)';

-- Crear índice para búsquedas por IMEI
CREATE INDEX IF NOT EXISTS idx_sale_items_imei ON public.sale_items(imei) WHERE imei IS NOT NULL;

-- Crear función para validar formato de IMEI
CREATE OR REPLACE FUNCTION validate_imei(imei_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- IMEI debe tener exactamente 15 dígitos
    IF imei_text IS NULL OR imei_text = '' THEN
        RETURN TRUE; -- NULL está permitido
    END IF;
    
    -- Verificar que solo contenga dígitos y tenga exactamente 15 caracteres
    IF imei_text ~ '^[0-9]{15}$' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Agregar constraint para validar formato de IMEI
ALTER TABLE public.sale_items 
ADD CONSTRAINT sale_items_imei_format_check 
CHECK (validate_imei(imei));
