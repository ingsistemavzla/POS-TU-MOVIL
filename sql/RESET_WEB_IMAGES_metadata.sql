-- ============================================================================
-- RESET: Limpiar metadatos web de imágenes (web_product_metadata)
-- ============================================================================
-- EJECUTAR EN: Supabase SQL Editor
-- PROPÓSITO: Dejar la tabla sin referencias a imágenes para empezar limpio
-- IMPORTANTE: Esto NO borra los archivos físicos en Storage. Ejecuta el script
--            de Node para vaciar el bucket product-images.
-- ============================================================================

BEGIN;

-- Opción A: Limpiar solo image_url y ocultar (mantener filas)
UPDATE public.web_product_metadata
SET 
  image_url = NULL,
  visible = false,
  updated_at = NOW()
WHERE image_url IS NOT NULL OR visible = true;

-- Ver cuántas filas se afectaron
SELECT 
  'Filas actualizadas (image_url=NULL, visible=false)' AS accion,
  COUNT(*) AS total
FROM public.web_product_metadata
WHERE image_url IS NULL;

COMMIT;

-- ============================================================================
-- OPCIONAL: Si prefieres ELIMINAR todas las filas de web_product_metadata
-- (los productos no tendrán metadatos web hasta que se vuelvan a configurar)
-- ============================================================================
-- BEGIN;
-- DELETE FROM public.web_product_metadata;
-- COMMIT;
-- ============================================================================
