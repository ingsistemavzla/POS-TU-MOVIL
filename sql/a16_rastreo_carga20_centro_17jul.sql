-- ============================================================================
-- A16 — Rastreo de la carga de 20 en Centro (17-jul-2026 17:37)
-- SKU: RF8YA0DK6ZF · Tu Móvil Centro · 0 → 20
-- Objetivo: facturas + IMEI en TODAS las sucursales desde esa carga
-- Zona: America/Caracas · Ejecutar bloque por bloque
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Confirmar la carga de 20
-- ----------------------------------------------------------------------------
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_carga,
  COALESCE(st.name, sf.name) AS tienda,
  im.old_qty AS estaba_en,
  im.new_qty AS quedo_en,
  (im.new_qty - COALESCE(im.old_qty, 0)) AS unidades_cargadas,
  LEFT(im.reason, 100) AS motivo
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND COALESCE(im.old_qty, 0) = 0
  AND COALESCE(im.new_qty, 0) = 20
  AND im.created_at >= TIMESTAMPTZ '2026-07-17 00:00:00-04'
  AND im.created_at <  TIMESTAMPTZ '2026-07-18 00:00:00-04'
ORDER BY im.created_at ASC;


-- ----------------------------------------------------------------------------
-- 2) Movimientos DESPUÉS de esa carga (transferencias / salidas / entradas)
--    Explica si los 20 se quedaron en Centro o se repartieron
-- ----------------------------------------------------------------------------
WITH carga AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  JOIN public.products p ON p.id = im.product_id
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND COALESCE(im.old_qty, 0) = 0
    AND COALESCE(im.new_qty, 0) = 20
    AND im.created_at >= TIMESTAMPTZ '2026-07-17 17:00:00-04'
    AND im.created_at <  TIMESTAMPTZ '2026-07-18 00:00:00-04'
  ORDER BY im.created_at ASC
  LIMIT 1
)
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  sf.name AS desde,
  st.name AS hacia,
  im.type,
  im.qty,
  im.old_qty,
  im.new_qty,
  LEFT(im.reason, 120) AS motivo
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
CROSS JOIN carga c
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND im.created_at > c.ts
ORDER BY im.created_at ASC;


-- ----------------------------------------------------------------------------
-- 3) TODAS las ventas A16 desde la carga de 20 — todas las sucursales
--    Factura + IMEI + tienda + estado
-- ----------------------------------------------------------------------------
WITH carga AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  JOIN public.products p ON p.id = im.product_id
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND COALESCE(im.old_qty, 0) = 0
    AND COALESCE(im.new_qty, 0) = 20
    AND im.created_at >= TIMESTAMPTZ '2026-07-17 17:00:00-04'
    AND im.created_at <  TIMESTAMPTZ '2026-07-18 00:00:00-04'
  ORDER BY im.created_at ASC
  LIMIT 1
)
SELECT
  ROW_NUMBER() OVER (ORDER BY sa.created_at ASC) AS n,
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  st.name AS tienda,
  sa.invoice_number AS factura,
  sa.status AS estado,
  si.qty AS uds,
  NULLIF(btrim(si.imei), '') AS imei,
  CASE
    WHEN NULLIF(btrim(si.imei), '') IS NULL THEN 'SIN IMEI'
    WHEN length(regexp_replace(si.imei, '[^0-9]', '', 'g')) NOT IN (14, 15, 16)
      THEN 'IMEI LARGO/RARO — revisar'
    ELSE 'OK'
  END AS control_imei
FROM public.sale_items si
JOIN public.products p ON p.id = si.product_id
JOIN public.sales sa ON sa.id = si.sale_id
JOIN public.stores st ON st.id = sa.store_id
CROSS JOIN carga c
WHERE p.sku = 'RF8YA0DK6ZF'
  AND sa.created_at >= c.ts
ORDER BY sa.created_at ASC;


-- ----------------------------------------------------------------------------
-- 4) Resumen vs los 20
-- ----------------------------------------------------------------------------
WITH carga AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  JOIN public.products p ON p.id = im.product_id
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND COALESCE(im.old_qty, 0) = 0
    AND COALESCE(im.new_qty, 0) = 20
    AND im.created_at >= TIMESTAMPTZ '2026-07-17 17:00:00-04'
    AND im.created_at <  TIMESTAMPTZ '2026-07-18 00:00:00-04'
  ORDER BY im.created_at ASC
  LIMIT 1
),
ventas AS (
  SELECT
    si.qty,
    sa.status,
    NULLIF(btrim(si.imei), '') AS imei,
    st.name AS tienda
  FROM public.sale_items si
  JOIN public.products p ON p.id = si.product_id
  JOIN public.sales sa ON sa.id = si.sale_id
  JOIN public.stores st ON st.id = sa.store_id
  CROSS JOIN carga c
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND sa.created_at >= c.ts
)
SELECT
  20 AS uds_cargadas_referencia,
  COALESCE(SUM(qty) FILTER (WHERE status = 'completed'), 0) AS uds_vendidas_completed,
  COALESCE(SUM(qty) FILTER (WHERE status IS DISTINCT FROM 'completed'), 0) AS uds_no_completed,
  COUNT(*) FILTER (WHERE status = 'completed') AS facturas_lineas_completed,
  COUNT(*) FILTER (WHERE imei IS NOT NULL AND status = 'completed') AS con_imei,
  COUNT(*) FILTER (WHERE imei IS NULL AND status = 'completed') AS sin_imei,
  20 - COALESCE(SUM(qty) FILTER (WHERE status = 'completed'), 0) AS teorico_restante_vs_20
FROM ventas;


-- ----------------------------------------------------------------------------
-- 5) Ventas completed por tienda (desde la carga)
-- ----------------------------------------------------------------------------
WITH carga AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  JOIN public.products p ON p.id = im.product_id
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND COALESCE(im.old_qty, 0) = 0
    AND COALESCE(im.new_qty, 0) = 20
    AND im.created_at >= TIMESTAMPTZ '2026-07-17 17:00:00-04'
    AND im.created_at <  TIMESTAMPTZ '2026-07-18 00:00:00-04'
  ORDER BY im.created_at ASC
  LIMIT 1
)
SELECT
  st.name AS tienda,
  COUNT(*) AS lineas,
  SUM(si.qty) AS uds
FROM public.sale_items si
JOIN public.products p ON p.id = si.product_id
JOIN public.sales sa ON sa.id = si.sale_id
JOIN public.stores st ON st.id = sa.store_id
CROSS JOIN carga c
WHERE p.sku = 'RF8YA0DK6ZF'
  AND sa.created_at >= c.ts
  AND sa.status = 'completed'
GROUP BY st.name
ORDER BY uds DESC;


-- ----------------------------------------------------------------------------
-- 6) Reversos / cancelaciones desde la carga (si existen)
-- ----------------------------------------------------------------------------
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  COALESCE(st.name, sf.name) AS tienda,
  im.qty,
  im.reason AS motivo_completo,
  substring(im.reason from 'FAC-[0-9]{8}-[0-9]+') AS factura_extraida
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND im.created_at >= TIMESTAMPTZ '2026-07-17 17:37:00-04'
  AND (
    im.reason ILIKE '%cancelaci%'
    OR im.reason ILIKE '%restituci%'
    OR im.reason ILIKE '%anul%'
  )
ORDER BY im.created_at ASC;
