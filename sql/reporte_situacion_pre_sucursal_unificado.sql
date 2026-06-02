-- =============================================================================
-- REPORTE UNIFICADO PRE-SUCURSAL (una sola tabla de resultados)
-- Ejecutar TODO en Supabase SQL Editor → verás UNA tabla con sección + datos
-- =============================================================================

WITH
company AS (
  SELECT c.id AS company_id, c.name AS company_name, count(s.id) AS tiendas_activas
  FROM companies c
  JOIN stores s ON s.company_id = c.id AND s.active = true
  GROUP BY c.id, c.name
),
counts AS (
  SELECT
    (SELECT count(*) FROM stores WHERE active = true) AS stores_active,
    (SELECT count(*) FROM products) AS products_total,
    (SELECT count(*) FROM products WHERE active = true) AS products_active,
    (SELECT count(*) FROM products WHERE active = false) AS products_inactive,
    (SELECT count(*) FROM inventories) AS inventories_rows,
    (SELECT count(*) FROM sales) AS sales_total
),
per_store_rows AS (
  SELECT
    s.name AS tienda,
    count(i.id) AS filas_total,
    count(i.id) FILTER (WHERE p.active = true) AS filas_activos,
    count(i.id) FILTER (WHERE p.active = false) AS filas_inactivos,
    coalesce(sum(i.qty) FILTER (WHERE p.active = true), 0) AS unidades_activos
  FROM stores s
  LEFT JOIN inventories i ON i.store_id = s.id
  LEFT JOIN products p ON p.id = i.product_id
  WHERE s.active = true
  GROUP BY s.id, s.name
),
per_store_units AS (
  SELECT
    s.name AS tienda,
    coalesce(sum(i.qty) FILTER (WHERE p.category = 'phones'), 0) AS telefonos,
    coalesce(sum(i.qty) FILTER (WHERE p.category = 'accessories'), 0) AS accesorios,
    coalesce(sum(i.qty) FILTER (WHERE p.category = 'technical_service'), 0) AS servicio_tecnico,
    coalesce(sum(i.qty) FILTER (WHERE p.category IS NULL OR p.category NOT IN ('phones','accessories','technical_service')), 0) AS sin_categoria,
    coalesce(sum(i.qty), 0) AS total_unidades
  FROM stores s
  LEFT JOIN inventories i ON i.store_id = s.id
  LEFT JOIN products p ON p.id = i.product_id AND p.active = true
  WHERE s.active = true
  GROUP BY s.id, s.name
),
global_units AS (
  SELECT
    coalesce(sum(i.qty) FILTER (WHERE p.category = 'phones'), 0) AS total_telefonos,
    coalesce(sum(i.qty) FILTER (WHERE p.category = 'accessories'), 0) AS total_accesorios,
    coalesce(sum(i.qty) FILTER (WHERE p.category = 'technical_service'), 0) AS total_servicio,
    coalesce(sum(i.qty), 0) AS total_unidades
  FROM inventories i
  JOIN products p ON p.id = i.product_id AND p.active = true
  JOIN stores s ON s.id = i.store_id AND s.active = true
),
gaps AS (
  SELECT count(*) AS huecos_total
  FROM (
    SELECT s.id AS store_id, p.id AS product_id
    FROM stores s
    CROSS JOIN products p
    WHERE s.active = true AND p.active = true
  ) expected
  LEFT JOIN inventories i
    ON i.store_id = expected.store_id AND i.product_id = expected.product_id
  WHERE i.id IS NULL
),
gaps_by_store AS (
  SELECT st.name AS tienda, count(*) AS huecos
  FROM (
    SELECT s.id AS store_id, p.id AS product_id
    FROM stores s CROSS JOIN products p
    WHERE s.active = true AND p.active = true
  ) e
  LEFT JOIN inventories i ON i.store_id = e.store_id AND i.product_id = e.product_id
  JOIN stores st ON st.id = e.store_id
  WHERE i.id IS NULL
  GROUP BY st.id, st.name
),
dupes AS (
  SELECT count(*) AS pares_duplicados
  FROM (
    SELECT store_id, product_id FROM inventories
    GROUP BY store_id, product_id HAVING count(*) > 1
  ) d
),
valor AS (
  SELECT round(coalesce(sum(i.qty * p.sale_price_usd), 0)::numeric, 2) AS usd
  FROM inventories i
  JOIN products p ON p.id = i.product_id AND p.active = true
  JOIN stores s ON s.id = i.store_id AND s.active = true
)

-- Salida única
SELECT 1 AS orden, 'A_COMPANY' AS seccion,
  co.company_id::text AS col1,
  co.company_name AS col2,
  co.tiendas_activas::text AS col3,
  NULL::text AS col4, NULL::text AS col5, NULL::text AS col6
FROM company co

UNION ALL
SELECT 2, 'B_GLOBAL',
  'stores_active=' || c.stores_active,
  'products_active=' || c.products_active,
  'products_inactive=' || c.products_inactive,
  'products_total=' || c.products_total,
  'inventories_rows=' || c.inventories_rows,
  'sales=' || c.sales_total
FROM counts c

UNION ALL
SELECT 3, 'C_FILAS_POR_TIENDA',
  r.tienda,
  'filas_total=' || r.filas_total,
  'filas_activos=' || r.filas_activos,
  'filas_inactivos=' || r.filas_inactivos,
  'unidades_activos=' || r.unidades_activos,
  NULL
FROM per_store_rows r

UNION ALL
SELECT 4, 'D_UNIDADES_POR_TIENDA (=Estadísticas)',
  u.tienda,
  'telefonos=' || u.telefonos,
  'accesorios=' || u.accesorios,
  'servicio=' || u.servicio_tecnico,
  'sin_cat=' || u.sin_categoria,
  'TOTAL=' || u.total_unidades
FROM per_store_units u

UNION ALL
SELECT 5, 'D_TOTALES_GLOBALES',
  'TOTAL_TEL=' || g.total_telefonos,
  'TOTAL_ACC=' || g.total_accesorios,
  'TOTAL_SVC=' || g.total_servicio,
  'TOTAL_UNID=' || g.total_unidades,
  NULL, NULL
FROM global_units g

UNION ALL
SELECT 6, 'E_HUECOS_INVENTARIO',
  coalesce(gb.tienda, '(ninguno)'),
  'huecos=' || coalesce(gb.huecos, 0)::text,
  'huecos_total_sistema=' || (SELECT huecos_total FROM gaps),
  NULL, NULL, NULL
FROM gaps_by_store gb
UNION ALL
SELECT 6, 'E_HUECOS_INVENTARIO', '(sin huecos por tienda)', 'huecos=0',
  'huecos_total_sistema=' || (SELECT huecos_total FROM gaps),
  NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM gaps_by_store)

UNION ALL
SELECT 7, 'G_DUPLICADOS',
  'pares_duplicados=' || (SELECT pares_duplicados FROM dupes),
  CASE WHEN (SELECT pares_duplicados FROM dupes) = 0 THEN 'OK' ELSE 'REVISAR' END,
  NULL, NULL, NULL, NULL

UNION ALL
SELECT 8, 'H_VALOR_USD',
  (SELECT usd::text FROM valor),
  'debe_coincidir_dashboard=155463.51',
  NULL, NULL, NULL, NULL

ORDER BY orden, seccion, col1;
