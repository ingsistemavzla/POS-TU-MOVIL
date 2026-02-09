-- ============================================================================
-- MIGRACIÓN: Crear función RPC get_web_product_stock
-- ============================================================================
-- Fecha: 2025-01-31
-- Descripción: Función RPC optimizada para obtener stock total de un producto
--              Suma todas las sucursales en una sola query
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_web_product_stock(p_product_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
  v_total_stock INTEGER;
BEGIN
  -- Obtener company_id del usuario
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Calcular stock total sumando todas las sucursales
  SELECT COALESCE(SUM(qty), 0) INTO v_total_stock
  FROM public.inventories
  WHERE product_id = p_product_id
    AND company_id = v_company_id;

  RETURN v_total_stock;
END;
$$;

-- Comentario
COMMENT ON FUNCTION public.get_web_product_stock(UUID) IS 
'Calcula stock total de un producto sumando todas las sucursales. 
Optimizado para consultas rápidas desde el módulo web.';

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_web_product_stock(UUID) TO authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Función RPC get_web_product_stock creada exitosamente';
  RAISE NOTICE '   - Suma stock de todas las sucursales';
  RAISE NOTICE '   - Optimizada para consultas rápidas';
END $$;






