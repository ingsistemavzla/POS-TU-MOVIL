-- ✅ CREAR CAMPO IMEI EN sale_items (si no existe)
-- Ejecuta esto PRIMERO en el SQL Editor de Supabase

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

-- 6. Ahora verificar si hay IMEIs guardados (todos deberían ser NULL porque el campo es nuevo)
SELECT 
    'Estado actual' as verificacion,
    COUNT(*) as total_items,
    COUNT(imei) as items_con_imei,
    COUNT(*) - COUNT(imei) as items_sin_imei,
    '⚠️ Todos los IMEIs serán NULL porque el campo es nuevo. Las ventas anteriores NO tienen IMEI guardado.' as mensaje
FROM public.sale_items;

