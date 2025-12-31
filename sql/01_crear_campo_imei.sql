-- ============================================================================
-- PASO 1: Crear Campo IMEI en sale_items
-- ============================================================================
-- Ejecutar en Supabase SQL Editor
-- Este script es SEGURO y NO afecta funcionalidades existentes
-- ============================================================================

-- 1. Verificar si el campo existe
SELECT 
    'Verificando campo IMEI' as paso,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sale_items'
  AND column_name = 'imei';

-- 2. Agregar campo IMEI si no existe
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS imei TEXT DEFAULT NULL;

-- 3. Agregar comentario para documentar el campo
COMMENT ON COLUMN public.sale_items.imei IS 'IMEI del teléfono vendido (solo para productos de categoría phones)';

-- 4. Crear índice para búsquedas por IMEI (opcional, pero recomendado)
CREATE INDEX IF NOT EXISTS idx_sale_items_imei 
ON public.sale_items(imei) 
WHERE imei IS NOT NULL;

-- 5. Verificar que se creó correctamente
SELECT 
    'Campo creado' as resultado,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sale_items'
  AND column_name = 'imei';

-- 6. Verificar estado actual (todos los IMEIs serán NULL porque el campo es nuevo)
SELECT 
    'Estado actual' as verificacion,
    COUNT(*) as total_items,
    COUNT(imei) as items_con_imei,
    COUNT(*) - COUNT(imei) as items_sin_imei,
    '⚠️ Todos los IMEIs serán NULL porque el campo es nuevo. Las ventas anteriores NO tienen IMEI guardado.' as mensaje
FROM public.sale_items;

