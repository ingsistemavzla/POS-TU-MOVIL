-- ============================================================================
-- Políticas RLS para el bucket product-images (Storage)
-- ============================================================================
-- Sin estas políticas, los usuarios autenticados reciben:
-- "new row violates row-level security policy" al subir imágenes.
-- Restricción: solo pueden subir/borrar en la carpeta de su company_id.
-- ============================================================================

-- INSERT: subir solo en carpeta {company_id}/
CREATE POLICY "product_images_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

-- SELECT: leer/listar objetos del bucket (necesario para list() y para servir URLs públicas si el bucket es público)
CREATE POLICY "product_images_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

-- UPDATE: sobrescribir (upsert) en carpeta de su company
CREATE POLICY "product_images_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

-- DELETE: borrar solo en carpeta de su company
CREATE POLICY "product_images_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
  )
);
