-- ====================================================================================
-- CORRECCIÓN: Función restore_product - Restauración con Preservación de Datos Históricos
-- Fecha: 2025-01-27
-- Descripción: Corrige la función restore_product para restaurar productos inactivos
--              sin alterar el inventario histórico (principio de no-intervención)
-- ====================================================================================
-- PROBLEMA IDENTIFICADO:
-- La función original no encontraba productos inactivos porque filtraba implícitamente
-- por active = true al buscar el producto, impidiendo restaurar productos "muertos".
-- ====================================================================================
-- ARQUITECTURA DEL SISTEMA:
-- - Soft Delete: products.active = false (producto "muerto")
-- - Inventario: inventories NO se modifica al eliminar (stock permanece intacto)
-- - Restauración: Solo cambia products.active = true (inventario se "revela" automáticamente)
-- ====================================================================================
-- REGLAS TÉCNICAS INNEGOCIABLES:
-- 1. Búsqueda forense: SELECT sin filtro de active (encuentra productos "muertos")
-- 2. Principio de no-intervención: SOLO actualiza products, NO toca inventories
-- 3. Seguridad: Mantiene validación is_master_admin()
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- FUNCIÓN CORREGIDA: restore_product()
-- ====================================================================================
-- Restores product visibility. Does NOT modify inventory counts to preserve historical data.
-- ====================================================================================

DROP FUNCTION IF EXISTS public.restore_product(UUID);

CREATE OR REPLACE FUNCTION public.restore_product(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_company_id UUID;
  v_product_company_id UUID;
  v_product_name TEXT;
  v_product_active BOOLEAN;
  v_user_id UUID;
  v_rows_affected INTEGER;
BEGIN
  -- ====================================================================================
  -- VALIDACIÓN DE SEGURIDAD CRÍTICA: Solo master_admin puede restaurar
  -- ====================================================================================
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Acceso denegado. Función exclusiva de Laboratorio/Técnico. Solo usuarios con rol master_admin pueden restaurar productos eliminados.';
  END IF;

  -- Obtener company_id y user_id del usuario actual
  SELECT company_id, id INTO v_user_company_id, v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- ====================================================================================
  -- BÚSQUEDA FORENSE: Buscar producto SIN filtrar por active
  -- ====================================================================================
  -- IMPORTANTE: Esta búsqueda DEBE IGNORAR el estado de la columna active
  -- Busca solo por id y company_id para encontrar productos "muertos" (active = false)
  -- ====================================================================================
  SELECT name, active, company_id 
  INTO v_product_name, v_product_active, v_product_company_id
  FROM public.products
  WHERE id = p_product_id
    AND company_id = v_user_company_id;
  -- ⚠️ CRÍTICO: NO filtramos por active aquí para poder encontrar productos inactivos

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Producto no encontrado o no pertenece a tu compañía.'
    );
  END IF;

  -- ====================================================================================
  -- VALIDACIÓN: Verificar que el producto esté inactivo
  -- ====================================================================================
  -- Si ya está activo, no tiene sentido restaurarlo
  -- ====================================================================================
  IF v_product_active = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'El producto "' || v_product_name || '" ya está activo. No es necesario restaurarlo.'
    );
  END IF;

  -- ====================================================================================
  -- RESTAURACIÓN: SOLO actualizar products.active
  -- ====================================================================================
  -- PRINCIPIO DE NO-INTERVENCIÓN DE STOCK (Crítico):
  -- - Esta función SOLO tiene permiso para hacer UPDATE en la tabla products
  -- - PROHIBIDO tocar la tabla inventories
  -- - Racional: Al volver a poner active = true, las vistas y reportes volverán a
  --   "ver" y sumar automáticamente las cantidades que ya existen en inventories
  --   para cada sucursal. No hay que sumar, restar ni resetear nada.
  -- ====================================================================================
  -- Restores product visibility. Does NOT modify inventory counts to preserve historical data.
  -- ====================================================================================
  UPDATE public.products
  SET active = true,
      updated_at = NOW()
  WHERE id = p_product_id 
    AND company_id = v_user_company_id
    AND active = false  -- Solo actualizar si está inactivo (seguridad adicional)
  RETURNING 1 INTO v_rows_affected;

  IF v_rows_affected = 0 THEN
    -- Esto no debería pasar si llegamos aquí, pero por seguridad verificamos
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se pudo restaurar el producto. Puede que ya esté activo o haya sido modificado.'
    );
  END IF;

  -- Retornar éxito con confirmación de preservación de inventario
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Producto "' || v_product_name || '" restaurado exitosamente. El inventario histórico se ha preservado intacto.',
    'product_id', p_product_id,
    'product_name', v_product_name,
    'previous_status', 'inactive',
    'new_status', 'active',
    'inventory_preserved', true,
    'note', 'Restores product visibility. Does NOT modify inventory counts to preserve historical data.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error al restaurar producto: ' || SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION public.restore_product(UUID) IS 
'Restaura un producto eliminado (soft delete) cambiando active de false a true.
SEGURIDAD: Solo usuarios con rol master_admin pueden ejecutar esta función.
PRESERVACIÓN DE DATOS HISTÓRICOS: Esta función SOLO actualiza products.active.
NO modifica la tabla inventories. El inventario histórico se preserva automáticamente.
Restores product visibility. Does NOT modify inventory counts to preserve historical data.
Al restaurar, las vistas y reportes volverán a "ver" automáticamente las cantidades
que ya existen en inventories para cada sucursal. No hay que sumar, restar ni resetear nada.';

-- Grant execute permission to authenticated users
-- (La validación de seguridad está dentro de la función)
GRANT EXECUTE ON FUNCTION public.restore_product(UUID) TO authenticated;

-- ====================================================================================
-- VERIFICACIÓN Y REPORTE
-- ====================================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  -- Verificar que restore_product() existe
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'restore_product'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ Función restore_product() corregida exitosamente';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 CAMBIOS APLICADOS:';
    RAISE NOTICE '   ✅ Búsqueda forense: SELECT sin filtro de active (encuentra productos "muertos")';
    RAISE NOTICE '   ✅ Principio de no-intervención: SOLO actualiza products.active (NO toca inventories)';
    RAISE NOTICE '   ✅ Seguridad: Mantiene validación is_master_admin()';
    RAISE NOTICE '';
    RAISE NOTICE '📦 COMPORTAMIENTO DEL INVENTARIO:';
    RAISE NOTICE '   - Al eliminar (soft delete): products.active = false, inventories NO se modifica';
    RAISE NOTICE '   - Al restaurar: products.active = true, inventories NO se modifica';
    RAISE NOTICE '   - Resultado: El stock reaparece intacto, tal cual se dejó';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SEGURIDAD: Solo usuarios con rol master_admin pueden ejecutar.';
    RAISE NOTICE '';
    RAISE NOTICE '💾 PRESERVACIÓN DE DATOS: Restores product visibility. Does NOT modify inventory counts to preserve historical data.';
  ELSE
    RAISE WARNING '⚠️ La función restore_product no se creó correctamente.';
  END IF;
END $$;

COMMIT;

-- ====================================================================================
-- RESUMEN DE CORRECCIONES
-- ====================================================================================
-- ✅ BÚSQUEDA FORENSE: SELECT por id y company_id SIN filtro de active
-- ✅ PRINCIPIO DE NO-INTERVENCIÓN: SOLO actualiza products.active (NO toca inventories)
-- ✅ SEGURIDAD: Mantiene validación is_master_admin()
-- ✅ VALIDACIÓN: Verifica que el producto esté inactivo antes de restaurar
-- ✅ UPDATE SEGURO: Condición active = false en WHERE (seguridad adicional)
-- ✅ COMENTARIOS: Incluye confirmación explícita de preservación de inventario histórico
-- ====================================================================================
-- 
-- FLUJO DE RESTAURACIÓN:
-- 1. Usuario master_admin hace clic en "Restaurar" en la Papelera
-- 2. Función busca producto por id y company_id (sin filtrar por active)
-- 3. Verifica que active = false
-- 4. UPDATE products SET active = true WHERE id = ... AND company_id = ... AND active = false
-- 5. NO toca la tabla inventories
-- 6. El producto reaparece en la lista de activos con su stock intacto
-- 7. Las vistas y reportes vuelven a "ver" automáticamente las cantidades existentes
-- ====================================================================================
-- 
-- PRINCIPIO DE NO-INTERVENCIÓN DE STOCK:
-- Restores product visibility. Does NOT modify inventory counts to preserve historical data.
-- ====================================================================================
