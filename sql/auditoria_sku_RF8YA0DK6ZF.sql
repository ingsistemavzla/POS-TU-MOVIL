-- ============================================================
-- AUDITORÍA FORENSE: samsung galaxy a16 128gb/4+4
-- SKU: RF8YA0DK6ZF
-- Objetivo: encontrar origen del +1 unidad en sistema vs físico
-- ============================================================
-- Ejecutar bloque por bloque (selecciona cada consulta y Run)
-- o todo el archivo (Supabase muestra el resultado del ÚLTIMO SELECT)

-- 1) Identificar producto
SELECT
  p.id AS product_id,
  p.name,
  p.sku,
  p.category,
  p.active,
  p.created_at
FROM public.products p
WHERE p.sku = 'RF8YA0DK6ZF'
   OR lower(p.name) LIKE '%galaxy a16%128%';

-- 2) Stock actual por tienda
SELECT
  s.name AS tienda,
  i.qty AS stock_sistema,
  i.min_qty,
  i.updated_at AS ultima_actualizacion,
  i.created_at AS creado
FROM public.inventories i
JOIN public.products p ON p.id = i.product_id
JOIN public.stores s ON s.id = i.store_id
WHERE p.sku = 'RF8YA0DK6ZF'
ORDER BY s.name;

-- 3) TODOS los movimientos de inventario (historial completo)
-- type: OUT=venta | IN=entrada | ADJUST=ajuste manual/UI | TRANSFER=traslado
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_ve,
  im.type,
  im.qty AS unidades_movimiento,
  im.old_qty,
  im.new_qty,
  CASE
    WHEN im.old_qty IS NOT NULL AND im.new_qty IS NOT NULL
      THEN (im.new_qty - im.old_qty)
    WHEN im.type IN ('OUT') THEN -im.qty
    WHEN im.type IN ('IN') THEN im.qty
    ELSE NULL
  END AS delta_calculado,
  sf.name AS tienda_origen,
  st.name AS tienda_destino,
  im.reason,
  COALESCE(u.name, u.email, im.user_id::text) AS usuario,
  im.id AS movement_id
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
LEFT JOIN public.users u ON u.id = im.user_id
WHERE p.sku = 'RF8YA0DK6ZF'
ORDER BY im.created_at DESC;

-- 4) Ventas facturadas de este producto (sale_items)
SELECT
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha_venta,
  sa.id AS sale_id,
  sa.invoice_number,
  s.name AS tienda,
  si.qty AS unidades_vendidas,
  si.price_usd,
  si.subtotal_usd,
  c.name AS cliente,
  COALESCE(u.name, u.email) AS cajero,
  sa.status
FROM public.sale_items si
JOIN public.products p ON p.id = si.product_id
JOIN public.sales sa ON sa.id = si.sale_id
JOIN public.stores s ON s.id = sa.store_id
LEFT JOIN public.customers c ON c.id = sa.customer_id
LEFT JOIN public.users u ON u.id = sa.cashier_id
WHERE p.sku = 'RF8YA0DK6ZF'
ORDER BY sa.created_at DESC;

-- 5) Conciliación rápida: totales por tipo de movimiento
SELECT
  im.type,
  COUNT(*) AS cantidad_registros,
  SUM(im.qty) AS suma_qty,
  SUM(CASE
    WHEN im.old_qty IS NOT NULL AND im.new_qty IS NOT NULL THEN (im.new_qty - im.old_qty)
    WHEN im.type = 'OUT' THEN -im.qty
    WHEN im.type = 'IN' THEN im.qty
    ELSE 0
  END) AS suma_delta
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
WHERE p.sku = 'RF8YA0DK6ZF'
GROUP BY im.type
ORDER BY im.type;

-- 6) Comparar unidades vendidas facturadas vs salidas OUT
WITH prod AS (
  SELECT id FROM public.products WHERE sku = 'RF8YA0DK6ZF' LIMIT 1
),
ventas AS (
  SELECT COALESCE(SUM(si.qty), 0) AS total_facturado
  FROM public.sale_items si
  WHERE si.product_id = (SELECT id FROM prod)
),
salidas AS (
  SELECT COALESCE(SUM(im.qty), 0) AS total_out
  FROM public.inventory_movements im
  WHERE im.product_id = (SELECT id FROM prod)
    AND im.type = 'OUT'
),
ajustes AS (
  SELECT
    COALESCE(SUM(CASE
      WHEN im.old_qty IS NOT NULL AND im.new_qty IS NOT NULL THEN (im.new_qty - im.old_qty)
      ELSE 0
    END), 0) AS total_delta_adjust
  FROM public.inventory_movements im
  WHERE im.product_id = (SELECT id FROM prod)
    AND im.type = 'ADJUST'
)
SELECT
  (SELECT total_facturado FROM ventas) AS unidades_facturadas,
  (SELECT total_out FROM salidas) AS unidades_registradas_como_OUT,
  (SELECT total_delta_adjust FROM ajustes) AS delta_neto_ADJUST,
  (SELECT total_facturado FROM ventas) - (SELECT total_out FROM salidas) AS diferencia_factura_vs_OUT;

-- 7) Ajustes manuales / razones sospechosas (lo más útil para tu caso +1)
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_ve,
  im.type,
  im.old_qty,
  im.new_qty,
  (im.new_qty - im.old_qty) AS delta,
  im.qty,
  im.reason,
  sf.name AS tienda,
  COALESCE(u.name, u.email) AS usuario
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = COALESCE(im.store_from_id, im.store_to_id)
LEFT JOIN public.users u ON u.id = im.user_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND (
    im.type = 'ADJUST'
    OR im.reason ILIKE '%manual%'
    OR im.reason ILIKE '%ajust%'
    OR im.reason ILIKE '%web%'
    OR (im.old_qty IS NOT NULL AND im.new_qty IS NOT NULL AND (im.new_qty - im.old_qty) <> 0)
  )
ORDER BY im.created_at DESC;

-- NOTA: puede haber DOBLE registro por venta
-- (OUT de process_sale + ADJUST del trigger de inventories).
-- Para conciliar, prioriza:
--   A) sale_items = ventas reales facturadas
--   B) ADJUST con reason tipo "Actualización manual" = cambios desde Almacén/Artículos
--   C) TRANSFER = traslados entre tiendas
