-- ============================================================================
-- MIGRACIÓN: Crear función RPC sync_web_product_price (VERSIÓN ROBUSTA V2)
-- ============================================================================
-- Fecha: 2025-01-31
-- Descripción: Función RPC para sincronizar precio y metadatos web
--              MECANISMO DE 2 PASOS: Primero borra imagen anterior, luego inserta nueva
--              Valida reglas de negocio y actualiza atomicamente
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_web_product_price(
  p_product_id UUID,
  p_sale_price_usd NUMERIC(15,4),
  p_web_image_url TEXT DEFAULT NULL,
  p_web_visible BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_current_price NUMERIC(15,4);
  v_product_name TEXT;
  v_normalized_image_url TEXT;
  v_final_image_url TEXT;
  v_final_visible BOOLEAN;
  v_old_image_url TEXT;
BEGIN
  -- 1. Validar autenticación y obtener company_id
  SELECT company_id, id INTO v_company_id, v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL OR v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no autenticado o sin company_id'
    );
  END IF;

  -- 2. Validar que el usuario es admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo los administradores pueden sincronizar productos web'
    );
  END IF;

  -- 3. Validar que el producto existe y pertenece a la company
  SELECT sale_price_usd, name INTO v_current_price, v_product_name
  FROM public.products
  WHERE id = p_product_id
    AND company_id = v_company_id
    AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Producto no encontrado o inactivo'
    );
  END IF;

  -- 4. VALIDACIONES DE NEGOCIO
  -- Precio debe ser positivo
  IF p_sale_price_usd <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El precio de venta debe ser mayor a 0'
    );
  END IF;

  -- ✅ REGLA: Si no hay image_url, forzar visible = false (PERMITIR actualizar precio)
  IF p_web_image_url IS NULL OR p_web_image_url = '' THEN
    p_web_visible := false;
  END IF;

  -- ✅ REGLA: Si visible = true después de forzar, debe haber image_url
  IF p_web_visible = true AND (p_web_image_url IS NULL OR p_web_image_url = '') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Un producto visible debe tener una URL de imagen'
    );
  END IF;

  -- 5. ACTUALIZAR PRECIO EN products (ATÓMICO)
  UPDATE public.products
  SET 
    sale_price_usd = p_sale_price_usd,
    updated_at = NOW()
  WHERE id = p_product_id
    AND company_id = v_company_id;

  -- 6. ACTUALIZAR/CREAR METADATOS WEB (MECANISMO ROBUSTO DE 2 PASOS)
  -- ✅ PASO 1: Normalizar la URL: NULL si está vacía o solo espacios
  v_normalized_image_url := NULLIF(TRIM(COALESCE(p_web_image_url, '')), '');
  
  -- ✅ PASO 2: Obtener imagen anterior (si existe) para logging
  SELECT image_url INTO v_old_image_url
  FROM public.web_product_metadata
  WHERE product_id = p_product_id;
  
  -- ✅ PASO 3: MECANISMO EXPLÍCITO DE 2 PASOS
  IF v_normalized_image_url IS NOT NULL THEN
    -- ✅ CASO 1: Hay nueva URL - BORRAR imagen anterior y GUARDAR nueva
    -- Usar UPSERT que SIEMPRE sobrescribe (sin COALESCE que restaure valores)
    INSERT INTO public.web_product_metadata (
      product_id, image_url, visible, updated_at
    ) VALUES (
      p_product_id, 
      v_normalized_image_url,  -- ✅ Nueva URL
      COALESCE(p_web_visible, false),
      NOW()
    )
    ON CONFLICT (product_id)
    DO UPDATE SET
      -- ✅ FORZAR actualización: usar EXCLUDED directamente (nueva URL)
      -- NO usar COALESCE que podría restaurar valores antiguos
      image_url = EXCLUDED.image_url,  -- ✅ Siempre la nueva URL
      visible = COALESCE(EXCLUDED.visible, false),
      updated_at = NOW();
  ELSE
    -- ✅ CASO 2: NO hay nueva URL - Solo actualizar visible (NO tocar image_url)
    -- Si el registro existe, solo actualizar visible
    -- Si no existe, crear con image_url = NULL
    INSERT INTO public.web_product_metadata (
      product_id, image_url, visible, updated_at
    ) VALUES (
      p_product_id, 
      NULL,
      COALESCE(p_web_visible, false),
      NOW()
    )
    ON CONFLICT (product_id)
    DO UPDATE SET
      -- ✅ NO cambiar image_url (mantener el valor existente)
      -- Solo actualizar visible y updated_at
      visible = COALESCE(EXCLUDED.visible, false),
      updated_at = NOW();
    -- ✅ NOTA: image_url NO se actualiza en este caso (se mantiene el valor anterior)
  END IF;

  -- 7. Obtener el valor final guardado de image_url para confirmación
  SELECT image_url, visible INTO v_final_image_url, v_final_visible
  FROM public.web_product_metadata
  WHERE product_id = p_product_id;

  -- 8. Retornar éxito con información completa
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Producto sincronizado exitosamente',
    'product_id', p_product_id,
    'previous_price', v_current_price,
    'new_price', p_sale_price_usd,
    'product_name', v_product_name,
    'image_url_sent', v_normalized_image_url,
    'image_url_old', v_old_image_url,
    'image_url_final', v_final_image_url,
    'visible_saved', COALESCE(p_web_visible, false),
    'visible_final', v_final_visible
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Error al sincronizar producto: ' || SQLERRM
    );
END;
$$;

-- Comentario
COMMENT ON FUNCTION public.sync_web_product_price(UUID, NUMERIC, TEXT, BOOLEAN) IS 
'Sincroniza precio y metadatos de producto para catálogo web. 
MECANISMO ROBUSTO: Si hay nueva URL, SIEMPRE sobrescribe la anterior (sin restaurar valores).
Valida reglas de negocio y registra cambios. Solo para productos activos.
Actualiza atomicamente products y web_product_metadata.
REGLAS: visible = true requiere image_url. Si no hay image_url, visible = false.';

-- Permisos
GRANT EXECUTE ON FUNCTION public.sync_web_product_price(UUID, NUMERIC, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Función RPC sync_web_product_price (V2 ROBUSTO) creada exitosamente';
  RAISE NOTICE '   - Mecanismo de 2 pasos: borra anterior, inserta nueva';
  RAISE NOTICE '   - Valida reglas de negocio';
  RAISE NOTICE '   - Actualiza atomicamente products y web_product_metadata';
  RAISE NOTICE '   - Solo admins pueden ejecutar';
  RAISE NOTICE '   - visible = true requiere image_url';
  RAISE NOTICE '   - NO restaura imágenes antiguas';
END $$;





