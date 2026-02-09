-- ============================================================================
-- MIGRACIÓN: Crear tabla web_product_metadata para Gestión Web
-- ============================================================================
-- Fecha: 2025-01-31
-- Descripción: Tabla para almacenar metadatos específicos del catálogo web
--              (imagen, visibilidad) sin exponer datos sensibles como cost_usd
-- ============================================================================

-- Crear tabla web_product_metadata
CREATE TABLE IF NOT EXISTS public.web_product_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT,  -- URL de la imagen del producto para la web
  visible BOOLEAN NOT NULL DEFAULT true,  -- Si el producto es visible en la web pública
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id)  -- Un producto solo puede tener un registro de metadatos web
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_web_product_metadata_product_id 
  ON public.web_product_metadata(product_id);
CREATE INDEX IF NOT EXISTS idx_web_product_metadata_visible 
  ON public.web_product_metadata(visible) WHERE visible = true;

-- Comentarios
COMMENT ON TABLE public.web_product_metadata IS 
'Metadatos específicos para catálogo web público. Incluye imagen y visibilidad.';
COMMENT ON COLUMN public.web_product_metadata.image_url IS 
'URL de la imagen del producto para mostrar en la web pública';
COMMENT ON COLUMN public.web_product_metadata.visible IS 
'Si el producto es visible en el catálogo web público (true) o está oculto (false)';

-- ============================================================================
-- POLÍTICAS RLS
-- ============================================================================

-- SELECT: Usuarios pueden ver metadatos de productos de su company
CREATE POLICY "web_product_metadata_select_policy" ON public.web_product_metadata
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = web_product_metadata.product_id
        AND p.company_id = public.get_user_company_id()
    )
  );

-- INSERT: Solo admins pueden crear metadatos web
CREATE POLICY "web_product_metadata_insert_policy" ON public.web_product_metadata
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = web_product_metadata.product_id
        AND p.company_id = public.get_user_company_id()
        AND public.is_admin()
    )
  );

-- UPDATE: Solo admins pueden actualizar metadatos web
CREATE POLICY "web_product_metadata_update_policy" ON public.web_product_metadata
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = web_product_metadata.product_id
        AND p.company_id = public.get_user_company_id()
        AND public.is_admin()
    )
  );

-- DELETE: Solo admins pueden eliminar metadatos web
CREATE POLICY "web_product_metadata_delete_policy" ON public.web_product_metadata
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = web_product_metadata.product_id
        AND p.company_id = public.get_user_company_id()
        AND public.is_admin()
    )
  );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Tabla web_product_metadata creada exitosamente';
  RAISE NOTICE '   - Índices creados';
  RAISE NOTICE '   - Políticas RLS configuradas';
END $$;






