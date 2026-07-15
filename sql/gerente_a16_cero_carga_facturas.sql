-- ============================================================
-- GERENTE A16 128GB — Preguntas operativas
-- SKU: RF8YA0DK6ZF (samsung galaxy a16 128gb/4+4)
-- ============================================================
-- Qué responde este archivo (en orden):
--   1) ¿Cuándo fue la última vez que el A16 128 estaba en CERO?
--   2) ¿Cuándo se cargó inventario estando en cero (o saliendo de cero)?
--   3) ¿Qué facturas de A16 hubo DESDE esa última carga?
--   4) Resumen: unidades cargadas vs unidades facturadas (desde esa carga)
--
-- Ejecutar bloque por bloque en Supabase SQL Editor.
-- Zona horaria: America/Caracas
-- ============================================================

-- ------------------------------------------------------------
-- 0) Confirmar producto y stock actual (mapa)
-- ------------------------------------------------------------
SELECT
  p.id,
  p.name,
  p.sku,
  s.name AS tienda,
  i.qty AS stock_actual
FROM public.products p
JOIN public.inventories i ON i.product_id = p.id
JOIN public.stores s ON s.id = i.store_id
WHERE p.sku = 'RF8YA0DK6ZF'
ORDER BY s.name;

SELECT SUM(i.qty) AS stock_total_todas_las_tiendas
FROM public.inventories i
JOIN public.products p ON p.id = i.product_id
WHERE p.sku = 'RF8YA0DK6ZF';


-- ------------------------------------------------------------
-- 1) ÚLTIMA VEZ EN CERO
--    A) Por tienda: último movimiento que DEJÓ el stock en 0 (new_qty = 0)
--    B) Global: últimos momentos donde el TOTAL reconstruido llegó a 0
-- ------------------------------------------------------------

-- 1A) Por tienda — última vez que quedó en 0
SELECT DISTINCT ON (COALESCE(sf.name, st.name))
  COALESCE(sf.name, st.name) AS tienda,
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_quedo_en_cero,
  im.type,
  im.old_qty,
  im.new_qty,
  im.qty,
  im.reason,
  COALESCE(u.name, u.email) AS usuario
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
LEFT JOIN public.users u ON u.id = im.user_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND im.new_qty = 0
ORDER BY COALESCE(sf.name, st.name), im.created_at DESC;

-- 1B) Todas las veces que alguna tienda quedó en 0 (histórico reciente / completo)
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_ve,
  COALESCE(sf.name, st.name) AS tienda,
  im.type,
  im.old_qty,
  im.new_qty,
  im.qty,
  LEFT(im.reason, 120) AS motivo
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND im.new_qty = 0
ORDER BY im.created_at DESC;


-- ------------------------------------------------------------
-- 2) ÚLTIMA CARGA SALIENDO DE CERO
--    Cargas típicas del gerente:
--      - ADJUST / “Actualización manual” / “Aumento”
--      - IN de mercancía (NO restituciones de cancelación)
--    Criterio: stock anterior = 0 y stock nuevo > 0
-- ------------------------------------------------------------

-- 2A) Todas las salidas de cero (old_qty = 0 → new_qty > 0)
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_carga,
  COALESCE(sf.name, st.name) AS tienda,
  im.type,
  im.old_qty AS estaba_en,
  im.new_qty AS quedo_en,
  (im.new_qty - COALESCE(im.old_qty, 0)) AS unidades_cargadas,
  im.qty,
  im.reason,
  COALESCE(u.name, u.email) AS usuario,
  im.id AS movement_id
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
LEFT JOIN public.users u ON u.id = im.user_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND COALESCE(im.old_qty, 0) = 0
  AND COALESCE(im.new_qty, 0) > 0
  -- Excluye restituciones de cancelación (son otro tipo de problema)
  AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%cancelaci%'
ORDER BY im.created_at DESC;

-- 2B) LA última carga saliendo de cero (la que el gerente necesita)
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_ultima_carga_desde_cero,
  im.created_at AS fecha_utc_para_filtrar, -- usar esta en el paso 3
  COALESCE(sf.name, st.name) AS tienda,
  im.type,
  im.old_qty AS estaba_en,
  im.new_qty AS quedo_en,
  (im.new_qty - COALESCE(im.old_qty, 0)) AS unidades_cargadas,
  im.reason,
  COALESCE(u.name, u.email) AS usuario
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
LEFT JOIN public.users u ON u.id = im.user_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND COALESCE(im.old_qty, 0) = 0
  AND COALESCE(im.new_qty, 0) > 0
  AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%cancelaci%'
ORDER BY im.created_at DESC
LIMIT 1;

-- 2C) Cargas “grandes” recientes (p.ej. +10/+15/+20), aunque no partan de cero exacto
--     Útil si el gerente recuerda “cargué 15” pero el old_qty no era 0 en esa tienda
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_ve,
  COALESCE(sf.name, st.name) AS tienda,
  im.type,
  im.old_qty,
  im.new_qty,
  (im.new_qty - COALESCE(im.old_qty, 0)) AS delta,
  im.reason,
  COALESCE(u.name, u.email) AS usuario
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
LEFT JOIN public.users u ON u.id = im.user_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND (
    im.type = 'IN'
    OR im.reason ILIKE '%manual%'
    OR im.reason ILIKE '%aument%'
    OR im.reason ILIKE '%actualizaci%'
  )
  AND (im.new_qty - COALESCE(im.old_qty, 0)) >= 5
  AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%cancelaci%'
ORDER BY im.created_at DESC;


-- ------------------------------------------------------------
-- 3) FACTURAS DE A16 DESDE LA ÚLTIMA CARGA DESDE CERO
--    Automático: toma la fecha de 2B y lista sales / sale_items posteriores
-- ------------------------------------------------------------
WITH prod AS (
  SELECT id FROM public.products WHERE sku = 'RF8YA0DK6ZF' LIMIT 1
),
ultima_carga AS (
  SELECT im.created_at AS ts, im.new_qty - COALESCE(im.old_qty, 0) AS qty_cargada
  FROM public.inventory_movements im
  WHERE im.product_id = (SELECT id FROM prod)
    AND COALESCE(im.old_qty, 0) = 0
    AND COALESCE(im.new_qty, 0) > 0
    AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
    AND COALESCE(im.reason, '') NOT ILIKE '%cancelaci%'
  ORDER BY im.created_at DESC
  LIMIT 1
)
SELECT
  (SELECT ts AT TIME ZONE 'America/Caracas' FROM ultima_carga) AS desde_fecha_carga,
  (SELECT qty_cargada FROM ultima_carga) AS unidades_de_esa_carga_ref,
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha_factura,
  sa.invoice_number,
  s.name AS tienda,
  si.qty AS uds,
  si.price_usd,
  c.name AS cliente,
  COALESCE(u.name, u.email) AS cajero,
  sa.status
FROM public.sale_items si
JOIN public.sales sa ON sa.id = si.sale_id
JOIN public.stores s ON s.id = sa.store_id
LEFT JOIN public.customers c ON c.id = sa.customer_id
LEFT JOIN public.users u ON u.id = sa.cashier_id
CROSS JOIN ultima_carga uc
WHERE si.product_id = (SELECT id FROM prod)
  AND sa.created_at >= uc.ts
ORDER BY sa.created_at ASC;


-- ------------------------------------------------------------
-- 4) RESUMEN GERENTE: ¿cuadra carga vs facturas?
--    Interpreta así:
--      Si cargó N y facturó N  → stock esperado ≈ 0 (+/− transferencias/ajustes)
--      Si cargó N y facturó N pero sistema > 0 → hay fantasma / carga de más / restitución
--      Si cargó N y facturó N-1 → debería quedar 1 (normal)
-- ------------------------------------------------------------
WITH prod AS (
  SELECT id FROM public.products WHERE sku = 'RF8YA0DK6ZF' LIMIT 1
),
ultima_carga AS (
  SELECT im.created_at AS ts
  FROM public.inventory_movements im
  WHERE im.product_id = (SELECT id FROM prod)
    AND COALESCE(im.old_qty, 0) = 0
    AND COALESCE(im.new_qty, 0) > 0
    AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
    AND COALESCE(im.reason, '') NOT ILIKE '%cancelaci%'
  ORDER BY im.created_at DESC
  LIMIT 1
),
cargas_despues AS (
  -- Todas las entradas / aumentos manuales desde esa fecha (incluye la misma)
  SELECT
    COALESCE(SUM(
      CASE
        WHEN im.old_qty IS NOT NULL AND im.new_qty IS NOT NULL
          THEN GREATEST(im.new_qty - im.old_qty, 0)
        WHEN im.type = 'IN' THEN im.qty
        ELSE 0
      END
    ), 0) AS unidades_entradas
  FROM public.inventory_movements im
  CROSS JOIN ultima_carga uc
  WHERE im.product_id = (SELECT id FROM prod)
    AND im.created_at >= uc.ts
    AND (
      im.type = 'IN'
      OR im.reason ILIKE '%manual%'
      OR im.reason ILIKE '%aument%'
      OR im.reason ILIKE '%actualizaci%'
    )
    AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
    AND COALESCE(im.reason, '') NOT ILIKE '%venta%' -- evita ecos OUT/ADJUST de venta
    AND COALESCE(im.reason, '') NOT ILIKE '%factura%'
),
facturado_despues AS (
  SELECT COALESCE(SUM(si.qty), 0) AS unidades_facturadas
  FROM public.sale_items si
  JOIN public.sales sa ON sa.id = si.sale_id
  CROSS JOIN ultima_carga uc
  WHERE si.product_id = (SELECT id FROM prod)
    AND sa.created_at >= uc.ts
),
stock_hoy AS (
  SELECT COALESCE(SUM(i.qty), 0) AS stock_sistema
  FROM public.inventories i
  WHERE i.product_id = (SELECT id FROM prod)
)
SELECT
  (SELECT ts AT TIME ZONE 'America/Caracas' FROM ultima_carga) AS fecha_ultima_carga_desde_cero,
  (SELECT unidades_entradas FROM cargas_despues) AS uds_cargadas_desde_entonces,
  (SELECT unidades_facturadas FROM facturado_despues) AS uds_facturadas_desde_entonces,
  (SELECT unidades_entradas FROM cargas_despues)
    - (SELECT unidades_facturadas FROM facturado_despues) AS teorico_restante_sin_traslados,
  (SELECT stock_sistema FROM stock_hoy) AS stock_sistema_hoy,
  (SELECT stock_sistema FROM stock_hoy)
    - (
        (SELECT unidades_entradas FROM cargas_despues)
        - (SELECT unidades_facturadas FROM facturado_despues)
      ) AS diferencia_a_investigar;


-- ------------------------------------------------------------
-- 5) Recordatorio pista previa (NO es “nuevo stock”, es restitución)
--    FAC-20260618-04485 — 18-jun-2026 11:15 — Zona Gamer — IN +1
-- ------------------------------------------------------------
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_ve,
  im.type,
  im.qty,
  im.old_qty,
  im.new_qty,
  im.reason,
  COALESCE(sf.name, st.name) AS tienda
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND im.reason ILIKE '%04485%';


-- ============================================================
-- HALLAZGO CONFIRMADO CON DATOS REALES (jul-2026)
-- ============================================================
-- 1) Última vez en CERO (antes de la carga grande):
--    - Zona Gamer: 2026-06-25 09:39 (1→0)
--    - La Isla:    2026-06-25 16:31
--    - Marino:     2026-06-23 10:29
--    - Centro:     2026-07-08 13:12  (posterior; tienda ya recargada)
--
-- 2) Carga del gerente (26-jun-2026) saliendo de cero:
--    - 16:02 Marino     0→5
--    - 16:46 Zona Gamer 0→15   ← “cargué 15”
--    - 16:59 Centro     0→5
--    - 17:02 Marino     4→9 (+5 más)
--    - 17:05 Zona Gamer 5→10 (+5 más)
--    Total aumentos ese día ≈ 15+5+5+5+5 = 35 uds
--
-- 3) Correr BLOQUE 6 abajo: facturas desde 2026-06-26 16:02
-- ============================================================

-- ------------------------------------------------------------
-- 6) FACTURAS A16 desde la carga del 26-jun-2026 (fecha fija)
--    Primer aumento desde cero ese día: 16:02:33
-- ------------------------------------------------------------
SELECT
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha_factura,
  sa.invoice_number,
  s.name AS tienda,
  si.qty AS uds,
  si.price_usd,
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
  AND sa.created_at >= TIMESTAMPTZ '2026-06-26 16:02:33-04'
ORDER BY sa.created_at ASC;

-- 6B) Resumen rápido carga vs facturado (desde ese día)
WITH cargas AS (
  SELECT COALESCE(SUM(im.new_qty - im.old_qty), 0) AS uds_cargadas
  FROM public.inventory_movements im
  JOIN public.products p ON p.id = im.product_id
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND im.created_at >= TIMESTAMPTZ '2026-06-26 16:02:33-04'
    AND im.reason ILIKE '%Aumento%'
),
facturas AS (
  SELECT COALESCE(SUM(si.qty), 0) AS uds_facturadas,
         COUNT(*) AS num_facturas
  FROM public.sale_items si
  JOIN public.products p ON p.id = si.product_id
  JOIN public.sales sa ON sa.id = si.sale_id
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND sa.created_at >= TIMESTAMPTZ '2026-06-26 16:02:33-04'
),
stock AS (
  SELECT COALESCE(SUM(i.qty), 0) AS stock_hoy
  FROM public.inventories i
  JOIN public.products p ON p.id = i.product_id
  WHERE p.sku = 'RF8YA0DK6ZF'
)
SELECT
  (SELECT uds_cargadas FROM cargas) AS uds_cargadas_desde_26jun,
  (SELECT uds_facturadas FROM facturas) AS uds_facturadas_desde_26jun,
  (SELECT num_facturas FROM facturas) AS cantidad_lineas_factura,
  (SELECT uds_cargadas FROM cargas) - (SELECT uds_facturadas FROM facturas) AS teorico_restante,
  (SELECT stock_hoy FROM stock) AS stock_sistema_hoy;
