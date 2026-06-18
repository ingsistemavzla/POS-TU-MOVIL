-- =============================================================================
-- AUDITORÍA DE INTEGRIDAD — Ventas vs inventario vs IMEI
-- Ejecutar en Supabase SQL Editor, UN bloque a la vez.
-- Solo lectura: no modifica reglas de venta ni inventario.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 0 — ¿Existe sale_id en inventory_movements?
-- Si devuelve 1 fila → usar bloque A (conciliación por venta).
-- Si no devuelve nada → usar bloque A-alt (teléfonos sin IMEI; menos preciso para stock).
-- -----------------------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory_movements'
  AND column_name = 'sale_id';

-- =============================================================================
-- A) ¿sale_items cuadra con inventory_movements por venta?
-- Ejecutar SOLO si el PASO 0 devolvió sale_id.
-- =============================================================================
WITH items AS (
  SELECT
    si.sale_id,
    si.product_id,
    p.sku,
    p.name,
    sum(si.qty)::numeric AS qty_facturada,
    count(*) FILTER (WHERE si.imei IS NOT NULL AND btrim(si.imei) <> '') AS lineas_con_imei
  FROM sale_items si
  JOIN products p ON p.id = si.product_id
  GROUP BY si.sale_id, si.product_id, p.sku, p.name
),
movs AS (
  SELECT
    im.sale_id,
    im.product_id,
    sum(abs(im.qty))::numeric AS qty_movimiento
  FROM inventory_movements im
  WHERE im.type = 'OUT'
    AND im.sale_id IS NOT NULL
  GROUP BY im.sale_id, im.product_id
)
SELECT
  s.id AS sale_id,
  s.created_at,
  st.name AS tienda,
  i.sku,
  i.name AS producto,
  coalesce(i.qty_facturada, 0) AS qty_facturada,
  coalesce(m.qty_movimiento, 0) AS qty_movimiento_out,
  i.qty_facturada - coalesce(m.qty_movimiento, 0) AS diferencia,
  i.lineas_con_imei
FROM sales s
JOIN stores st ON st.id = s.store_id
FULL OUTER JOIN items i ON i.sale_id = s.id
FULL OUTER JOIN movs m ON m.sale_id = COALESCE(i.sale_id, m.sale_id)
  AND m.product_id = i.product_id
WHERE s.created_at >= now() - interval '90 days'
  AND (
    i.qty_facturada IS DISTINCT FROM m.qty_movimiento
    OR i.sale_id IS NULL
    OR m.sale_id IS NULL
  )
ORDER BY s.created_at DESC;

-- =============================================================================
-- A-alt) Si sale_id NO existe en movimientos — trazabilidad teléfonos sin IMEI
-- No detecta cruce 128/256, pero sí ventas de teléfono sin unidad identificada.
-- =============================================================================
/*
SELECT
  si.sale_id,
  si.product_id,
  p.sku,
  si.qty,
  si.imei,
  s.created_at,
  st.name AS tienda
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
JOIN products p ON p.id = si.product_id
JOIN stores st ON st.id = s.store_id
WHERE p.category = 'phones'
  AND (si.imei IS NULL OR btrim(si.imei) = '')
  AND s.created_at >= now() - interval '90 days'
ORDER BY s.created_at DESC;
*/

-- =============================================================================
-- B) Auditoría variantes (128 vs 256) — ajustar ILIKE / LIKE del modelo
-- =============================================================================
WITH variantes AS (
  SELECT id, sku, name, category
  FROM products
  WHERE active = true
    AND category = 'phones'
    -- AND (name ILIKE '%MODELO_X%' OR sku LIKE 'PREFIX%')
)
SELECT
  v.sku,
  v.name,
  s.name AS tienda,
  coalesce(i.qty, 0) AS stock_actual,
  coalesce(ventas.qty_vendida_90d, 0) AS vendido_90d,
  coalesce(ventas.ventas_sin_imei, 0) AS ventas_sin_imei_90d
FROM variantes v
CROSS JOIN stores s
LEFT JOIN inventories i
  ON i.product_id = v.id AND i.store_id = s.id
LEFT JOIN (
  SELECT
    si.product_id,
    sa.store_id,
    sum(si.qty) AS qty_vendida_90d,
    count(*) FILTER (WHERE si.imei IS NULL OR btrim(si.imei) = '') AS ventas_sin_imei
  FROM sale_items si
  JOIN sales sa ON sa.id = si.sale_id
  WHERE sa.created_at >= now() - interval '90 days'
  GROUP BY si.product_id, sa.store_id
) ventas ON ventas.product_id = v.id AND ventas.store_id = s.id
WHERE s.active = true
ORDER BY s.name, v.sku;

-- =============================================================================
-- C) IMEI duplicado (misma unidad vendida más de una vez)
-- =============================================================================
SELECT
  imei,
  count(*) AS veces,
  array_agg(DISTINCT sale_id) AS ventas
FROM sale_items
WHERE imei IS NOT NULL AND btrim(imei) <> ''
GROUP BY imei
HAVING count(*) > 1;

-- =============================================================================
-- EXTRA — Resumen ejecutivo teléfonos (90 días), opcional
-- =============================================================================
SELECT
  count(DISTINCT si.sale_id) AS ventas_con_telefonos,
  count(*) AS lineas_telefono,
  count(*) FILTER (WHERE si.imei IS NOT NULL AND btrim(si.imei) <> '') AS lineas_con_imei,
  count(*) FILTER (WHERE si.imei IS NULL OR btrim(si.imei) = '') AS lineas_sin_imei,
  round(
    100.0 * count(*) FILTER (WHERE si.imei IS NOT NULL AND btrim(si.imei) <> '')
    / nullif(count(*), 0),
    1
  ) AS pct_con_imei
FROM sale_items si
JOIN products p ON p.id = si.product_id
JOIN sales s ON s.id = si.sale_id
WHERE p.category = 'phones'
  AND s.created_at >= now() - interval '90 days';
