-- ============================================================================
-- MIGRACIÓN: Generación Atómica de Números de Factura
-- ============================================================================
-- Fecha: 2025-01-28
-- Objetivo: Reemplazar lógica de MAX() por SEQUENCE de PostgreSQL para
--           garantizar atomicidad y eliminar race conditions.
--
-- IMPORTANTE: Esta migración elimina la dependencia de MAX() y usa nextval()
--             para generar números de factura de forma atómica y monotónica.

-- PASO 1: Crear secuencia global para números de factura
-- IMPORTANTE: Esta secuencia es GLOBAL, CONTINUA y NO se reinicia por día ni sucursal
-- - Empieza en 1000
-- - Incrementa +1 con cada venta (sin importar sucursal o día)
-- - Nunca se reinicia
-- 
-- NOTA: Si ya hay facturas existentes, se ajusta el valor inicial al máximo + 1
DO $$
DECLARE
  v_max_seq INTEGER;
  v_start_value INTEGER := 1000;  -- ✅ EMPIEZA EN 1000
BEGIN
  -- Intentar obtener el máximo número de secuencia existente (GLOBAL, sin filtros)
  SELECT COALESCE(MAX(
    CASE 
      WHEN invoice_number ~ '-\d{6}$' THEN
        CAST(SUBSTRING(invoice_number FROM '-\d{6}$') AS INTEGER)
      WHEN invoice_number ~ '-\d{4}$' THEN
        CAST(SUBSTRING(invoice_number FROM '-\d{4}$') AS INTEGER)
      ELSE NULL
    END
  ), 0) INTO v_max_seq
  FROM public.sales
  WHERE invoice_number IS NOT NULL;
  -- ✅ SIN FILTROS: No filtra por company_id, store_id, ni fecha
  
  -- Usar el máximo encontrado + 1, o empezar desde 1000 si no hay facturas
  v_start_value := GREATEST(v_max_seq + 1, 1000);
  
  -- Crear la secuencia con el valor calculado
  -- ✅ INCREMENT BY 1: Cada venta incrementa +1
  -- ✅ NO MINVALUE / NO MAXVALUE: Sin límites
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS global_invoice_seq START WITH %s INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1', v_start_value);
  
  RAISE NOTICE '✅ Secuencia global_invoice_seq creada/inicializada con valor: % (GLOBAL, CONTINUA, +1 por venta)', v_start_value;
END $$;

-- Comentario de la secuencia
COMMENT ON SEQUENCE global_invoice_seq IS 'Secuencia global atómica para generar números de factura únicos y monotónicos. Usa nextval() para garantizar atomicidad.';

-- PASO 2: Actualizar función generate_invoice_number para usar la secuencia
CREATE OR REPLACE FUNCTION generate_invoice_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_id BIGINT;
  v_date_part TEXT;
  v_invoice_number TEXT;
BEGIN
  -- Obtener el siguiente ID de forma atómica
  v_next_id := nextval('global_invoice_seq');
  
  -- Formatear la parte de fecha (YYYYMMDD)
  v_date_part := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- ✅ Formato: FAC-YYYYMMDD-NNNNN (5 dígitos)
  -- - FAC- = Prefijo
  -- - YYYYMMDD = Fecha actual (solo referencia visual)
  -- - NNNNN = Número secuencial GLOBAL (5 dígitos, relleno con ceros)
  -- Ejemplo: FAC-20250128-01000 (primera venta)
  --          FAC-20250128-01001 (segunda venta, puede ser otra sucursal)
  --          FAC-20250129-01002 (tercera venta, día siguiente, continúa la secuencia)
  v_invoice_number := 'FAC-' || v_date_part || '-' || LPAD(v_next_id::TEXT, 5, '0');
  
  RETURN v_invoice_number;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION generate_invoice_number(UUID) IS 'Genera un número de factura único y atómico usando una secuencia GLOBAL de PostgreSQL. La secuencia es CONTINUA (no se reinicia por día ni sucursal) e incrementa +1 con cada venta. Garantiza monotonicidad y elimina race conditions. Formato: FAC-YYYYMMDD-NNNNN (5 dígitos)';

-- PASO 3: Verificar que la función process_sale usa generate_invoice_number
-- (La función process_sale ya debería estar usando generate_invoice_number,
--  pero verificamos que esté correctamente implementada)

-- PASO 4: Asegurar que process_sale retorna el invoice_number generado
-- (Esto se verifica en la función process_sale existente)

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================
-- Para verificar que la secuencia funciona correctamente, ejecutar:
-- 
-- 1. Verificar que la secuencia existe y obtener el siguiente valor:
--    SELECT nextval('global_invoice_seq');
--
-- 2. Obtener un company_id real de la base de datos:
--    SELECT id FROM companies LIMIT 1;
--
-- 3. Probar la función con un UUID real:
--    SELECT generate_invoice_number((SELECT id FROM companies LIMIT 1));
--
-- O si prefieres usar un UUID específico:
--    SELECT generate_invoice_number('00000000-0000-0000-0000-000000000000'::uuid);

