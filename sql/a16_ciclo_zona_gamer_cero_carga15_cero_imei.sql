-- ============================================================================
-- A16 — Ciclo Zona Gamer: CERO → carga 15 → CERO otra vez (IMEI)
-- ============================================================================
-- SKU: RF8YA0DK6ZF
-- Pedido operativo (síntesis):
--   Estaba en cero → se cargaron 15 (última carga grande) →
--   listar los IMEI vendidos de ese ciclo hasta volver a cero,
--   y ver si un reverso coincide con uno de esos IMEI.
--
-- Zona horaria: America/Caracas
-- Ejecutar bloque por bloque en Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Confirmar tienda Zona Gamer + producto
-- ----------------------------------------------------------------------------
SELECT s.id AS store_id, s.name
FROM public.stores s
WHERE s.name ILIKE '%zona%gamer%' OR s.name ILIKE '%gamer%margarita%';

SELECT id, name, sku FROM public.products WHERE sku = 'RF8YA0DK6ZF';


-- ----------------------------------------------------------------------------
-- 2) Movimientos Zona Gamer A16: desde el cero (25-jun) en adelante
--    Buscar: new_qty=0, luego 0→15, luego próximo new_qty=0
-- ----------------------------------------------------------------------------
WITH zg AS (
  SELECT id FROM public.stores
  WHERE name ILIKE '%zona%gamer%' OR name ILIKE '%gamer%margarita%'
  LIMIT 1
),
prod AS (
  SELECT id FROM public.products WHERE sku = 'RF8YA0DK6ZF' LIMIT 1
)
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  im.old_qty,
  im.new_qty,
  (COALESCE(im.new_qty, 0) - COALESCE(im.old_qty, 0)) AS delta,
  im.type,
  LEFT(im.reason, 120) AS motivo
FROM public.inventory_movements im
CROSS JOIN zg
CROSS JOIN prod
WHERE im.product_id = prod.id
  AND (im.store_to_id = zg.id OR im.store_from_id = zg.id)
  AND im.created_at >= TIMESTAMPTZ '2026-06-25 00:00:00-04'
ORDER BY im.created_at ASC;


-- ----------------------------------------------------------------------------
-- 3) Ventas A16 SOLO Zona Gamer desde la carga 0→15 (26-jun 16:46)
--    hasta el próximo momento en que Zona Gamer vuelve a 0
--    (si aún no volvió a 0, usa tope 20-jul como en el pedido previo)
-- ----------------------------------------------------------------------------
WITH zg AS (
  SELECT id FROM public.stores
  WHERE name ILIKE '%zona%gamer%' OR name ILIKE '%gamer%margarita%'
  LIMIT 1
),
prod AS (
  SELECT id FROM public.products WHERE sku = 'RF8YA0DK6ZF' LIMIT 1
),
carga_15 AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  CROSS JOIN zg
  CROSS JOIN prod
  WHERE im.product_id = prod.id
    AND (im.store_to_id = zg.id OR im.store_from_id = zg.id)
    AND COALESCE(im.old_qty, 0) = 0
    AND COALESCE(im.new_qty, 0) = 15
    AND im.created_at >= TIMESTAMPTZ '2026-06-26 16:00:00-04'
    AND im.created_at <  TIMESTAMPTZ '2026-06-27 00:00:00-04'
  ORDER BY im.created_at ASC
  LIMIT 1
),
vuelve_cero AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  CROSS JOIN zg
  CROSS JOIN prod
  CROSS JOIN carga_15 c
  WHERE im.product_id = prod.id
    AND (im.store_to_id = zg.id OR im.store_from_id = zg.id)
    AND im.new_qty = 0
    AND im.created_at > c.ts
  ORDER BY im.created_at ASC
  LIMIT 1
)
SELECT
  (SELECT ts AT TIME ZONE 'America/Caracas' FROM carga_15) AS desde_carga_15,
  (SELECT ts AT TIME ZONE 'America/Caracas' FROM vuelve_cero) AS hasta_vuelve_cero,
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha_venta,
  sa.invoice_number AS factura,
  sa.status AS estado,
  NULLIF(btrim(si.imei), '') AS imei,
  si.qty AS uds,
  c.name AS cliente
FROM public.sale_items si
JOIN public.products p ON p.id = si.product_id
JOIN public.sales sa ON sa.id = si.sale_id
CROSS JOIN zg
CROSS JOIN carga_15 c15
LEFT JOIN vuelve_cero vc ON true
LEFT JOIN public.customers c ON c.id = sa.customer_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND sa.store_id = zg.id
  AND sa.created_at >= c15.ts
  AND sa.created_at <= COALESCE(vc.ts, TIMESTAMPTZ '2026-07-20 23:59:59.999-04')
ORDER BY sa.created_at ASC, si.id;


-- ----------------------------------------------------------------------------
-- 4) Resumen del ciclo Zona Gamer (¿se vendieron los 15?)
-- ----------------------------------------------------------------------------
WITH zg AS (
  SELECT id FROM public.stores
  WHERE name ILIKE '%zona%gamer%' OR name ILIKE '%gamer%margarita%'
  LIMIT 1
),
prod AS (
  SELECT id FROM public.products WHERE sku = 'RF8YA0DK6ZF' LIMIT 1
),
carga_15 AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  CROSS JOIN zg
  CROSS JOIN prod
  WHERE im.product_id = prod.id
    AND (im.store_to_id = zg.id OR im.store_from_id = zg.id)
    AND COALESCE(im.old_qty, 0) = 0
    AND COALESCE(im.new_qty, 0) = 15
    AND im.created_at >= TIMESTAMPTZ '2026-06-26 16:00:00-04'
    AND im.created_at <  TIMESTAMPTZ '2026-06-27 00:00:00-04'
  ORDER BY im.created_at ASC
  LIMIT 1
),
vuelve_cero AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  CROSS JOIN zg
  CROSS JOIN prod
  CROSS JOIN carga_15 c
  WHERE im.product_id = prod.id
    AND (im.store_to_id = zg.id OR im.store_from_id = zg.id)
    AND im.new_qty = 0
    AND im.created_at > c.ts
  ORDER BY im.created_at ASC
  LIMIT 1
),
ventas AS (
  SELECT
    si.qty,
    sa.status,
    NULLIF(btrim(si.imei), '') AS imei
  FROM public.sale_items si
  JOIN public.products p ON p.id = si.product_id
  JOIN public.sales sa ON sa.id = si.sale_id
  CROSS JOIN zg
  CROSS JOIN carga_15 c15
  LEFT JOIN vuelve_cero vc ON true
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND sa.store_id = zg.id
    AND sa.created_at >= c15.ts
    AND sa.created_at <= COALESCE(vc.ts, TIMESTAMPTZ '2026-07-20 23:59:59.999-04')
)
SELECT
  15 AS uds_cargadas_referencia,
  COALESCE(SUM(qty) FILTER (WHERE status = 'completed'), 0) AS uds_vendidas_completed,
  COALESCE(SUM(qty) FILTER (WHERE status IS DISTINCT FROM 'completed'), 0) AS uds_anuladas_reverso,
  COUNT(*) FILTER (WHERE status = 'completed') AS lineas_completed,
  COUNT(*) FILTER (WHERE imei IS NOT NULL AND status = 'completed') AS lineas_con_imei,
  15 - COALESCE(SUM(qty) FILTER (WHERE status = 'completed'), 0) AS teorico_restante_vs_15
FROM ventas;


-- ----------------------------------------------------------------------------
-- 5) Reversos / no-completed A16 Zona Gamer (misma ventana del ciclo)
--    Si hay filas: el IMEI de ESA factura es el que debe cruzarse
-- ----------------------------------------------------------------------------
WITH zg AS (
  SELECT id FROM public.stores
  WHERE name ILIKE '%zona%gamer%' OR name ILIKE '%gamer%margarita%'
  LIMIT 1
),
carga_15 AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  JOIN public.products p ON p.id = im.product_id
  CROSS JOIN zg
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND (im.store_to_id = zg.id OR im.store_from_id = zg.id)
    AND COALESCE(im.old_qty, 0) = 0
    AND COALESCE(im.new_qty, 0) = 15
    AND im.created_at >= TIMESTAMPTZ '2026-06-26 16:00:00-04'
    AND im.created_at <  TIMESTAMPTZ '2026-06-27 00:00:00-04'
  ORDER BY im.created_at ASC
  LIMIT 1
),
vuelve_cero AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  JOIN public.products p ON p.id = im.product_id
  CROSS JOIN zg
  CROSS JOIN carga_15 c
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND (im.store_to_id = zg.id OR im.store_from_id = zg.id)
    AND im.new_qty = 0
    AND im.created_at > c.ts
  ORDER BY im.created_at ASC
  LIMIT 1
)
SELECT
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  sa.invoice_number AS factura,
  sa.status AS estado,
  NULLIF(btrim(si.imei), '') AS imei,
  'Cruzar este IMEI con la lista de vendidos completed del ciclo' AS instruccion
FROM public.sale_items si
JOIN public.products p ON p.id = si.product_id
JOIN public.sales sa ON sa.id = si.sale_id
CROSS JOIN zg
CROSS JOIN carga_15 c15
LEFT JOIN vuelve_cero vc ON true
WHERE p.sku = 'RF8YA0DK6ZF'
  AND sa.store_id = zg.id
  AND sa.created_at >= c15.ts
  AND sa.created_at <= COALESCE(vc.ts, TIMESTAMPTZ '2026-07-20 23:59:59.999-04')
  AND sa.status IS DISTINCT FROM 'completed'
ORDER BY sa.created_at ASC;


-- ----------------------------------------------------------------------------
-- 6) Transferencias SALIDA desde Zona Gamer (explican por qué no son 15 ventas)
-- ----------------------------------------------------------------------------
WITH zg AS (
  SELECT id FROM public.stores
  WHERE name ILIKE '%zona%gamer%' OR name ILIKE '%gamer%margarita%'
  LIMIT 1
),
prod AS (
  SELECT id FROM public.products WHERE sku = 'RF8YA0DK6ZF' LIMIT 1
)
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  sf.name AS desde,
  st.name AS hacia,
  im.qty,
  im.old_qty,
  im.new_qty,
  LEFT(im.reason, 100) AS motivo
FROM public.inventory_movements im
CROSS JOIN zg
CROSS JOIN prod
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
WHERE im.product_id = prod.id
  AND im.store_from_id = zg.id
  AND im.created_at >= TIMESTAMPTZ '2026-06-26 16:46:00-04'
  AND im.created_at <= TIMESTAMPTZ '2026-07-20 23:59:59.999-04'
  AND (im.type ILIKE '%transfer%' OR im.reason ILIKE '%transfer%' OR st.id IS NOT NULL)
ORDER BY im.created_at ASC;


-- ============================================================================
-- 7) BUSCAR REVERSO — vía movimientos (lo más fiable)
--    Al anular, delete_sale_and_restore_inventory BORRA la factura de sales
--    y deja un IN con motivo "Restitución por cancelación... Factura: FAC-..."
--    Por eso el bloque 5 puede salir vacío aunque sí hubo reverso.
-- ============================================================================
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  COALESCE(st.name, sf.name, '(sin tienda)') AS tienda,
  im.type,
  im.qty,
  im.old_qty,
  im.new_qty,
  im.reason AS motivo_completo,
  substring(im.reason from 'FAC-[0-9]{8}-[0-9]+') AS factura_extraida
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND im.created_at >= TIMESTAMPTZ '2026-06-26 16:46:00-04'
  AND im.created_at <= TIMESTAMPTZ '2026-07-25 23:59:59.999-04'
  AND (
    im.reason ILIKE '%cancelaci%'
    OR im.reason ILIKE '%restituci%'
    OR im.reason ILIKE '%anul%'
    OR im.reason ILIKE '%reverso%'
  )
ORDER BY im.created_at ASC;


-- ----------------------------------------------------------------------------
-- 8) Mismo buscador PERO solo Zona Gamer (ciclo local)
-- ----------------------------------------------------------------------------
WITH zg AS (
  SELECT id FROM public.stores
  WHERE name ILIKE '%zona%gamer%' OR name ILIKE '%gamer%margarita%'
  LIMIT 1
)
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  im.type,
  im.qty,
  im.old_qty,
  im.new_qty,
  im.reason AS motivo_completo,
  substring(im.reason from 'FAC-[0-9]{8}-[0-9]+') AS factura_extraida
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
CROSS JOIN zg
WHERE p.sku = 'RF8YA0DK6ZF'
  AND (im.store_to_id = zg.id OR im.store_from_id = zg.id)
  AND im.created_at >= TIMESTAMPTZ '2026-06-26 16:46:00-04'
  AND im.created_at <= TIMESTAMPTZ '2026-07-25 23:59:59.999-04'
  AND (
    im.reason ILIKE '%cancelaci%'
    OR im.reason ILIKE '%restituci%'
    OR im.reason ILIKE '%anul%'
    OR im.reason ILIKE '%reverso%'
  )
ORDER BY im.created_at ASC;


-- ----------------------------------------------------------------------------
-- 9) Si el bloque 7/8 saca un FAC-…: ¿sigue existiendo en sales? ¿tiene IMEI?
--    (Cambia el literal FAC-... por el que te salga)
-- ----------------------------------------------------------------------------
/*
SELECT
  sa.invoice_number,
  sa.status,
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha_venta,
  st.name AS tienda,
  NULLIF(btrim(si.imei), '') AS imei
FROM public.sales sa
LEFT JOIN public.stores st ON st.id = sa.store_id
LEFT JOIN public.sale_items si ON si.sale_id = sa.id
LEFT JOIN public.products p ON p.id = si.product_id
WHERE sa.invoice_number = 'FAC-PEGAR-AQUI';
*/

