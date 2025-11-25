-- Agregar constraint para validar categorías de productos
ALTER TABLE public.products 
ADD CONSTRAINT products_category_check 
CHECK (category IS NULL OR category IN ('phones', 'accessories', 'technical_service'));

-- Crear índice para mejor rendimiento en búsquedas por categoría
CREATE INDEX idx_products_category ON public.products(category);

-- Agregar comentario
COMMENT ON COLUMN public.products.category IS 'Categoría del producto: phones, accessories, technical_service';









