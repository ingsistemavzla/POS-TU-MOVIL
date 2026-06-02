-- =============================================================================
-- REPORTE: Productos SIN categoría válida (Sin categoría en Estadísticas)
-- Ejecutar TODO este archivo en Supabase SQL Editor (una sola consulta)
--
-- Categorías válidas: phones | accessories | technical_service
-- =============================================================================

-- Opcional en productos_sin_cat: AND p.company_id = 'aa11bb22-...'::uuid

WITH
categorias_validas AS (
  SELECT unnest(ARRAY['phones', 'accessories', 'technical_service']) AS cat
),
productos_sin_cat AS (
  SELECT
    p.id,
    p.sku,
    p.name,
    p.category AS categoria_en_bd,
    CASE
      WHEN p.category IS NULL THEN 'NULL'
      WHEN btrim(p.category) = '' THEN 'VACÍO'
      ELSE 'VALOR_NO_VALIDO'
    END AS motivo,
    p.sale_price_usd,
    p.active
  FROM products p
  WHERE p.active = true
    AND (
      p.category IS NULL
      OR btrim(p.category) = ''
      OR p.category NOT IN (SELECT cat FROM categorias_validas)
    )
),
stock_global AS (
  SELECT
    i.product_id,
    sum(greatest(i.qty, 0)) AS unidades_total,
    sum(greatest(i.qty, 0) * p.sale_price_usd) AS valor_usd_total
  FROM inventories i
  JOIN productos_sin_cat p ON p.id = i.product_id
  JOIN stores s ON s.id = i.store_id AND s.active = true
  GROUP BY i.product_id
),
stock_por_tienda AS (
  SELECT
    i.product_id,
    s.name AS tienda,
    sum(greatest(i.qty, 0)) AS unidades
  FROM inventories i
  JOIN productos_sin_cat p ON p.id = i.product_id
  JOIN stores s ON s.id = i.store_id AND s.active = true
  GROUP BY i.product_id, s.id, s.name
),
detalle AS (
  SELECT
    p.id,
    p.sku,
    p.name,
    p.categoria_en_bd,
    p.motivo,
    p.sale_price_usd,
    coalesce(sg.unidades_total, 0) AS unidades_total,
    round(coalesce(sg.valor_usd_total, 0)::numeric, 2) AS valor_usd_inventario,
    coalesce(
      (
        SELECT string_agg(t.tienda || ': ' || t.unidades::text, ' | ' ORDER BY t.tienda)
        FROM stock_por_tienda t
        WHERE t.product_id = p.id AND t.unidades > 0
      ),
      '(sin stock)'
    ) AS stock_por_sucursal
  FROM productos_sin_cat p
  LEFT JOIN stock_global sg ON sg.product_id = p.id
),
resumen AS (
  SELECT
    count(*)::int AS productos_sin_categoria,
    coalesce(sum(unidades_total), 0)::int AS unidades_totales,
    coalesce(sum(valor_usd_inventario), 0)::numeric AS valor_usd_total
  FROM detalle
)
-- Fila 1 = resumen (debe cuadrar con panel ~3 / ~3 / ~41)
-- Filas siguientes = cada producto
SELECT
  orden,
  sku,
  producto,
  categoria_bd,
  motivo,
  precio_usd,
  unidades,
  valor_usd,
  stock_por_sucursal
FROM (
  SELECT
    0 AS orden,
    '*** RESUMEN ***' AS sku,
    r.productos_sin_categoria::text || ' productos sin categoría' AS producto,
    NULL::text AS categoria_bd,
    'TOTALES' AS motivo,
    NULL::numeric AS precio_usd,
    r.unidades_totales AS unidades,
    r.valor_usd_total AS valor_usd,
    NULL::text AS stock_por_sucursal
  FROM resumen r

  UNION ALL

  SELECT
    1 AS orden,
    d.sku,
    d.name AS producto,
    d.categoria_en_bd AS categoria_bd,
    d.motivo,
    d.sale_price_usd AS precio_usd,
    d.unidades_total AS unidades,
    d.valor_usd_inventario AS valor_usd,
    d.stock_por_sucursal
  FROM detalle d
) t
ORDER BY orden, valor_usd DESC NULLS LAST, producto;

-- =============================================================================
-- Corrección (ejemplo — NO ejecutar sin revisar):
-- UPDATE products SET category = 'accessories' WHERE id = 'UUID'::uuid;
-- =============================================================================
