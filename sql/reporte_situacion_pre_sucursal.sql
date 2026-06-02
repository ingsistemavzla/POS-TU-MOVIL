-- =============================================================================
-- REPORTE DE SITUACIÓN PRE-SUCURSAL
-- Ejecutar en Supabase SQL Editor. Guardar resultados en backups/
-- Fecha referencia: antes de create_store_system
--
-- NOTA: El snapshot simple cuenta FILAS en inventories (712/tienda).
--       El panel Estadísticas suma UNIDADES (qty) solo de products.active = true.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Identidad del tenant
-- -----------------------------------------------------------------------------
SELECT c.id AS company_id, c.name AS company_name, count(s.id) AS tiendas_activas
FROM companies c
JOIN stores s ON s.company_id = c.id AND s.active = true
GROUP BY c.id, c.name;

SELECT id, name, active, created_at
FROM stores
WHERE active = true
ORDER BY name;

-- -----------------------------------------------------------------------------
-- B) Conteos globales (referencia rápida)
-- -----------------------------------------------------------------------------
SELECT 'stores_active' AS metrica, count(*)::bigint AS valor FROM stores WHERE active = true
UNION ALL SELECT 'products_total', count(*) FROM products
UNION ALL SELECT 'products_active', count(*) FROM products WHERE active = true
UNION ALL SELECT 'products_inactive', count(*) FROM products WHERE active = false
UNION ALL SELECT 'inventories_rows', count(*) FROM inventories
UNION ALL SELECT 'sales_total', count(*) FROM sales;

-- -----------------------------------------------------------------------------
-- C) Filas de inventario por tienda (712 = una fila por producto en cada tienda)
-- -----------------------------------------------------------------------------
SELECT
  s.name AS tienda,
  count(i.id) AS filas_inventario_total,
  count(i.id) FILTER (WHERE p.active = true) AS filas_productos_activos,
  count(i.id) FILTER (WHERE p.active = false) AS filas_productos_inactivos,
  coalesce(sum(i.qty) FILTER (WHERE p.active = true), 0) AS unidades_productos_activos,
  coalesce(sum(i.qty), 0) AS unidades_todas_filas
FROM stores s
LEFT JOIN inventories i ON i.store_id = s.id
LEFT JOIN products p ON p.id = i.product_id
WHERE s.active = true
GROUP BY s.id, s.name
ORDER BY s.name;

-- -----------------------------------------------------------------------------
-- D) RESUMEN POR SUCURSAL — misma lógica que Estadísticas (EstadisticasPage)
--     Solo products.active = true, suma de qty por categoría
-- -----------------------------------------------------------------------------
WITH inv AS (
  SELECT
    i.store_id,
    i.product_id,
    i.qty,
    p.category,
    p.active
  FROM inventories i
  INNER JOIN products p ON p.id = i.product_id AND p.active = true
  INNER JOIN stores s ON s.id = i.store_id AND s.active = true
),
agg AS (
  SELECT
    store_id,
    coalesce(sum(qty) FILTER (WHERE category = 'phones'), 0) AS telefonos,
    coalesce(sum(qty) FILTER (WHERE category = 'accessories'), 0) AS accesorios,
    coalesce(sum(qty) FILTER (WHERE category = 'technical_service'), 0) AS servicio_tecnico,
    coalesce(sum(qty) FILTER (WHERE category IS NULL OR category NOT IN ('phones','accessories','technical_service')), 0) AS sin_categoria,
    coalesce(sum(qty), 0) AS total_unidades
  FROM inv
  GROUP BY store_id
)
SELECT
  s.name AS tienda,
  a.telefonos,
  a.accesorios,
  a.servicio_tecnico,
  a.sin_categoria,
  a.total_unidades AS total
FROM stores s
LEFT JOIN agg a ON a.store_id = s.id
WHERE s.active = true
ORDER BY s.name;

-- Totales globales (debe cuadrar con fila TOTAL del dashboard)
WITH inv AS (
  SELECT i.qty, p.category
  FROM inventories i
  INNER JOIN products p ON p.id = i.product_id AND p.active = true
  INNER JOIN stores s ON s.id = i.store_id AND s.active = true
)
SELECT
  coalesce(sum(qty) FILTER (WHERE category = 'phones'), 0) AS total_telefonos,
  coalesce(sum(qty) FILTER (WHERE category = 'accessories'), 0) AS total_accesorios,
  coalesce(sum(qty) FILTER (WHERE category = 'technical_service'), 0) AS total_servicio_tecnico,
  coalesce(sum(qty), 0) AS total_unidades_sistema
FROM inv;

-- -----------------------------------------------------------------------------
-- E) Productos activos SIN fila de inventario en alguna tienda (huecos)
--     Antes de crear sucursal debe ser 0 en tiendas existentes
-- -----------------------------------------------------------------------------
WITH active_stores AS (
  SELECT id FROM stores WHERE active = true
),
active_products AS (
  SELECT id FROM products WHERE active = true
),
expected AS (
  SELECT s.id AS store_id, p.id AS product_id
  FROM active_stores s
  CROSS JOIN active_products p
),
missing AS (
  SELECT e.store_id, e.product_id
  FROM expected e
  LEFT JOIN inventories i ON i.store_id = e.store_id AND i.product_id = e.product_id
  WHERE i.id IS NULL
)
SELECT
  st.name AS tienda,
  count(m.product_id) AS productos_activos_sin_fila
FROM missing m
JOIN stores st ON st.id = m.store_id
GROUP BY st.id, st.name
ORDER BY st.name;

-- Detalle (solo si hay huecos; limitar a 50)
-- SELECT st.name, p.sku, p.name AS producto
-- FROM missing m
-- JOIN stores st ON st.id = m.store_id
-- JOIN products p ON p.id = m.product_id
-- ORDER BY st.name, p.name
-- LIMIT 50;

-- -----------------------------------------------------------------------------
-- F) Productos inactivos que aún tienen fila de inventario (explican 712 vs ~659)
-- -----------------------------------------------------------------------------
SELECT
  s.name AS tienda,
  count(*) AS filas_productos_inactivos,
  coalesce(sum(i.qty), 0) AS unidades_en_inactivos
FROM inventories i
JOIN products p ON p.id = i.product_id AND p.active = false
JOIN stores s ON s.id = i.store_id AND s.active = true
GROUP BY s.id, s.name
ORDER BY s.name;

-- -----------------------------------------------------------------------------
-- G) Integridad: filas duplicadas producto+tienda (debe ser 0)
-- -----------------------------------------------------------------------------
SELECT store_id, product_id, count(*) AS duplicados
FROM inventories
GROUP BY store_id, product_id
HAVING count(*) > 1;

-- -----------------------------------------------------------------------------
-- H) Valor financiero aproximado (referencia dashboard ~ USD 155k)
--     Solo productos activos, qty * sale_price_usd
-- -----------------------------------------------------------------------------
SELECT
  coalesce(round(sum(i.qty * p.sale_price_usd)::numeric, 2), 0) AS valor_venta_usd_activos
FROM inventories i
JOIN products p ON p.id = i.product_id AND p.active = true
JOIN stores s ON s.id = i.store_id AND s.active = true;

-- -----------------------------------------------------------------------------
-- I) CHECKLIST POST-CREACIÓN (ejecutar después de la nueva tienda)
--     Nueva tienda debe tener:
--       filas_productos_activos = (SELECT count(*) FROM products WHERE active = true)
--       huecos = 0
-- -----------------------------------------------------------------------------
