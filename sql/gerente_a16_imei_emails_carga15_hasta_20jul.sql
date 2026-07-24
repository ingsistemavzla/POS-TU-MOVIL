-- ============================================================================
-- GERENTE A16 — IMEI + emails + facturas (carga 15 uds → 20 jul 2026)
-- ============================================================================
-- Producto: samsung galaxy a16 128gb/4+4
-- SKU:     RF8YA0DK6ZF
--
-- Contexto operativo (ya documentado):
--   2026-06-26 ~16:46 Caracas — Zona Gamer carga 0→15 (“cargué 15”)
--   Ventana pedida: desde ESA carga hasta fin del 20-jul-2026 (Caracas)
--
-- Qué responde:
--   1) Confirmar la carga de 15
--   2) Listado de ventas A16 en la ventana: factura, IMEI, email cliente, status
--   3) Solo anuladas / reversos (para cruzar con el email registrado)
--   4) Lista compacta de IMEIs y emails (para cruzar con proveedor)
--   5) Resumen: cuántos con IMEI, con email, anulados
--
-- IMPORTANTE — “emails de los equipos”:
--   En el POS solo existe customers.email (correo del CLIENTE en la venta).
--   Correos de cuenta Google/Samsung de fábrica o del proveedor NO están en
--   esta base; esos hay que pedirlos al proveedor (como ya está haciendo
--   gerencia) y cruzarlos con la columna imei de este reporte.
--
-- Ejecutar bloque por bloque en Supabase → SQL Editor.
-- ============================================================================

-- Parámetros de ventana (Caracas = UTC-4)
-- Inicio: carga Zona Gamer 0→15 el 26-jun-2026 ~16:46
-- Fin:    20-jul-2026 23:59:59 Caracas
-- Si la hora exacta de la carga difiere, ajusta v_desde abajo.

-- ----------------------------------------------------------------------------
-- 1) CONFIRMAR LA CARGA DE 15 (Zona Gamer / aumentos ese día)
-- ----------------------------------------------------------------------------
SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_carga,
  COALESCE(st.name, sf.name) AS tienda,
  im.old_qty,
  im.new_qty,
  (im.new_qty - COALESCE(im.old_qty, 0)) AS unidades_cargadas,
  im.type,
  LEFT(im.reason, 100) AS motivo
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND im.created_at >= TIMESTAMPTZ '2026-06-26 16:00:00-04'
  AND im.created_at <  TIMESTAMPTZ '2026-06-27 00:00:00-04'
  AND (
    im.reason ILIKE '%Aumento%'
    OR im.reason ILIKE '%manual%'
    OR im.type = 'IN'
    OR (COALESCE(im.old_qty, 0) = 0 AND COALESCE(im.new_qty, 0) > 0)
  )
ORDER BY im.created_at ASC;


-- ----------------------------------------------------------------------------
-- 2) REPORTE PRINCIPAL — ventas A16 desde carga 15 hasta 20-jul-2026
--    Una fila por línea de venta (normalmente 1 IMEI = 1 unidad)
-- ----------------------------------------------------------------------------
SELECT
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha_venta,
  sa.invoice_number AS factura,
  sa.status AS estado_factura,
  CASE
    WHEN sa.status IS DISTINCT FROM 'completed'
      THEN 'REVISAR — no completed (posible anulación/reverso)'
    ELSE 'OK venta'
  END AS alerta,
  s.name AS tienda,
  si.qty AS uds,
  NULLIF(btrim(si.imei), '') AS imei,
  CASE
    WHEN si.imei IS NULL OR btrim(si.imei) = '' THEN 'SIN IMEI'
    ELSE 'CON IMEI'
  END AS imei_ok,
  c.name AS cliente,
  NULLIF(btrim(c.email), '') AS email_cliente,
  CASE
    WHEN c.email IS NULL OR btrim(c.email) = '' THEN 'SIN EMAIL EN POS'
    ELSE 'CON EMAIL EN POS'
  END AS email_ok,
  c.phone AS telefono_cliente,
  c.id_number AS cedula_cliente,
  COALESCE(u.name, u.email) AS cajero,
  sa.id AS sale_id,
  si.id AS sale_item_id
FROM public.sale_items si
JOIN public.products p ON p.id = si.product_id
JOIN public.sales sa ON sa.id = si.sale_id
JOIN public.stores s ON s.id = sa.store_id
LEFT JOIN public.customers c ON c.id = sa.customer_id
LEFT JOIN public.users u ON u.id = sa.cashier_id
WHERE p.sku = 'RF8YA0DK6ZF'
  -- Desde la carga de 15 (Zona Gamer ~16:46 del 26-jun). Ajusta si hace falta.
  AND sa.created_at >= TIMESTAMPTZ '2026-06-26 16:46:00-04'
  AND sa.created_at <= TIMESTAMPTZ '2026-07-20 23:59:59.999-04'
ORDER BY sa.created_at ASC, sa.invoice_number, si.id;


-- ----------------------------------------------------------------------------
-- 3) SOLO FACTURAS ANULADAS / REVERSADAS / NO completed
--    Cruzar: ¿el IMEI y el email de ESA factura coinciden con lo que se
--    registró al momento? (aparecen aquí con el valor guardado en sale_items
--    / customers al cerrar la venta; si se anuló, el dato histórico queda).
-- ----------------------------------------------------------------------------
SELECT
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha_venta,
  sa.invoice_number AS factura,
  sa.status AS estado_factura,
  s.name AS tienda,
  NULLIF(btrim(si.imei), '') AS imei_en_factura,
  NULLIF(btrim(c.email), '') AS email_cliente_en_factura,
  c.name AS cliente,
  c.phone AS telefono,
  COALESCE(u.name, u.email) AS cajero,
  'Comparar IMEI+email con registro de proveedor / correo enviado' AS instruccion
FROM public.sale_items si
JOIN public.products p ON p.id = si.product_id
JOIN public.sales sa ON sa.id = si.sale_id
JOIN public.stores s ON s.id = sa.store_id
LEFT JOIN public.customers c ON c.id = sa.customer_id
LEFT JOIN public.users u ON u.id = sa.cashier_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND sa.created_at >= TIMESTAMPTZ '2026-06-26 16:46:00-04'
  AND sa.created_at <= TIMESTAMPTZ '2026-07-20 23:59:59.999-04'
  AND sa.status IS DISTINCT FROM 'completed'
ORDER BY sa.created_at ASC;


-- ----------------------------------------------------------------------------
-- 4) LISTA COMPACTA PARA CRUZAR CON PROVEEDOR
--    (IMEI + email POS + factura + estado) — exportar a Excel/CSV
-- ----------------------------------------------------------------------------
SELECT
  ROW_NUMBER() OVER (ORDER BY sa.created_at, si.id) AS n,
  NULLIF(btrim(si.imei), '') AS imei,
  NULLIF(btrim(c.email), '') AS email_en_pos,
  sa.invoice_number AS factura,
  sa.status AS estado,
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  s.name AS tienda
FROM public.sale_items si
JOIN public.products p ON p.id = si.product_id
JOIN public.sales sa ON sa.id = si.sale_id
JOIN public.stores s ON s.id = sa.store_id
LEFT JOIN public.customers c ON c.id = sa.customer_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND sa.created_at >= TIMESTAMPTZ '2026-06-26 16:46:00-04'
  AND sa.created_at <= TIMESTAMPTZ '2026-07-20 23:59:59.999-04'
ORDER BY sa.created_at ASC, si.id;


-- ----------------------------------------------------------------------------
-- 5) RESUMEN PARA CERRAR EL CASO A16 (ventana)
-- ----------------------------------------------------------------------------
WITH base AS (
  SELECT
    si.qty,
    sa.status,
    NULLIF(btrim(si.imei), '') AS imei,
    NULLIF(btrim(c.email), '') AS email
  FROM public.sale_items si
  JOIN public.products p ON p.id = si.product_id
  JOIN public.sales sa ON sa.id = si.sale_id
  LEFT JOIN public.customers c ON c.id = sa.customer_id
  WHERE p.sku = 'RF8YA0DK6ZF'
    AND sa.created_at >= TIMESTAMPTZ '2026-06-26 16:46:00-04'
    AND sa.created_at <= TIMESTAMPTZ '2026-07-20 23:59:59.999-04'
)
SELECT
  COALESCE(SUM(qty), 0) AS uds_en_lineas_venta,
  COALESCE(SUM(qty) FILTER (WHERE status = 'completed'), 0) AS uds_completed,
  COALESCE(SUM(qty) FILTER (WHERE status IS DISTINCT FROM 'completed'), 0) AS uds_no_completed_anuladas,
  COUNT(*) AS lineas,
  COUNT(*) FILTER (WHERE imei IS NOT NULL) AS lineas_con_imei,
  COUNT(*) FILTER (WHERE imei IS NULL) AS lineas_sin_imei,
  COUNT(*) FILTER (WHERE email IS NOT NULL) AS lineas_con_email_pos,
  COUNT(*) FILTER (WHERE email IS NULL) AS lineas_sin_email_pos,
  COUNT(DISTINCT imei) FILTER (WHERE imei IS NOT NULL) AS imeis_unicos
FROM base;

-- Lectura sugerida del resumen:
--   • Si uds_completed ≈ 15 (o menos si quedó stock) → cuadra con la carga de 15
--   • lineas_sin_imei > 0 → faltan IMEI en POS (no se puede cruzar con proveedor)
--   • lineas_sin_email_pos > 0 → el POS no tiene correo de cliente; pedir a proveedor
--     o revisar si la venta fue “Cliente General” sin email
--   • uds_no_completed_anuladas > 0 → usar bloque 3: el IMEI/email de ESA factura
--     deben coincidir con el registro del momento (no con una venta posterior)
