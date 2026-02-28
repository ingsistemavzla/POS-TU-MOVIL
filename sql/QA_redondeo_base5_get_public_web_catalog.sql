-- ============================================================================
-- QA: Robustez de la lógica de redondeo Base 5 en get_public_web_products_catalog
-- ============================================================================
-- Ejecutar en Supabase SQL Editor o psql para validar límites, tipos y lógica.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PRUEBA DE LÍMITES: ¿Qué pasa si el precio es exactamente múltiplo de 5?
-- ----------------------------------------------------------------------------
-- En PostgreSQL, (100.00 % 5) = 0 exactamente con tipo numeric.
-- (0 > 2.5) es FALSE → se usa FLOOR(val/5)*5 → 100. Sin salto al siguiente nivel.

DO $$
DECLARE
  v_val NUMERIC := 100.00;
  v_rem NUMERIC;
  v_cond BOOLEAN;
  v_result NUMERIC;
BEGIN
  v_rem := v_val % 5;
  v_cond := (v_rem > 2.5);
  v_result := CASE WHEN v_cond THEN CEIL(v_val / 5.0) * 5 ELSE FLOOR(v_val / 5.0) * 5 END;

  RAISE NOTICE '=== Límite: valor exacto 100.00 ===';
  RAISE NOTICE '  (100 %% 5) = %', v_rem;
  RAISE NOTICE '  (residuo > 2.5) = %', v_cond;
  RAISE NOTICE '  Resultado redondeo Base 5: %', v_result;
  IF v_result = 100 THEN
    RAISE NOTICE '  OK: 100 se mantiene en 100 (no salta a 105).';
  ELSE
    RAISE NOTICE '  FALLO: se esperaba 100, se obtuvo %', v_result;
  END IF;
END $$;

-- Casos adicionales: 95, 97.5, 102.5, 0
SELECT
  val,
  (val % 5) AS residuo,
  (val % 5) > 2.5 AS redondear_arriba,
  CASE WHEN (val % 5) > 2.5 THEN CEIL(val / 5.0) * 5 ELSE FLOOR(val / 5.0) * 5 END AS precio_base5
FROM (VALUES
  (95.00::numeric),
  (97.50::numeric),
  (100.00::numeric),
  (102.50::numeric),
  (0.00::numeric)
) AS t(val);

-- Esperado: 95, 95, 100, 105, 0

-- ----------------------------------------------------------------------------
-- 2. CONSISTENCIA DE TIPOS: numeric(15,4) vs numeric(15,2)
-- ----------------------------------------------------------------------------
-- Con numeric(15,4), 95 se serializa en JSON como 95.0000 (cuatro decimales).
-- Con numeric(15,2), 95 se serializa como 95.00 (más limpio para precios Base 5).

SELECT
  (95)::numeric(15,4) AS con_4_decimales,
  (95)::numeric(15,2) AS con_2_decimales,
  (100)::numeric(15,4) AS cien_4_dec,
  (100)::numeric(15,2) AS cien_2_dec;

-- Recomendación: cambiar retorno de la RPC a numeric(15,2) para salida más limpia.
-- Los valores Base 5 son enteros; (15,2) muestra XX.00 en API/JSON.

-- ----------------------------------------------------------------------------
-- 3. RENDIMIENTO: CEIL, FLOOR, % por fila
-- ----------------------------------------------------------------------------
-- Estas operaciones son O(1) por fila. El coste dominante es:
--   - JOINs (products, inventories, web_product_metadata, system_settings)
--   - GROUP BY y ORDER BY
-- Para miles de productos, el overhead de la aritmética es despreciable (< 1 ms).
-- MATERIALIZED VIEW: considerar solo si:
--   - El catálogo se lee muy a menudo y se actualiza poco
--   - Se miden latencias altas en producción (> ~200 ms para 10k filas)
--   - Se requiere cachear el resultado por varios minutos

-- Simulación de coste (opcional): ejecutar EXPLAIN ANALYZE sobre la RPC
-- desde la aplicación o:
-- SELECT * FROM get_public_web_products_catalog();  -- y revisar tiempo en dashboard
