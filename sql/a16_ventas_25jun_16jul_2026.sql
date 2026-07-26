-- ============================================================================
-- A16 — Ventas 25-jun-2026 → 16-jul-2026 (factura + IMEI + cliente)
-- Pedido gerencia · SKU RF8YA0DK6ZF · America/Caracas
-- ============================================================================

SELECT
  ROW_NUMBER() OVER (ORDER BY sa.created_at ASC) AS n,
  sa.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  st.name AS tienda,
  sa.invoice_number AS factura,
  sa.status AS estado,
  si.qty AS uds,
  NULLIF(btrim(si.imei), '') AS imei,
  COALESCE(c.name, sa.customer_name, '(sin nombre)') AS cliente
FROM public.sale_items si
JOIN public.products p ON p.id = si.product_id
JOIN public.sales sa ON sa.id = si.sale_id
JOIN public.stores st ON st.id = sa.store_id
LEFT JOIN public.customers c ON c.id = sa.customer_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND sa.created_at >= TIMESTAMPTZ '2026-06-25 00:00:00-04'
  AND sa.created_at <  TIMESTAMPTZ '2026-07-17 00:00:00-04'
ORDER BY sa.created_at ASC;

-- Resumen por tienda
SELECT
  st.name AS tienda,
  COUNT(*) AS lineas,
  SUM(si.qty) AS uds
FROM public.sale_items si
JOIN public.products p ON p.id = si.product_id
JOIN public.sales sa ON sa.id = si.sale_id
JOIN public.stores st ON st.id = sa.store_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND sa.created_at >= TIMESTAMPTZ '2026-06-25 00:00:00-04'
  AND sa.created_at <  TIMESTAMPTZ '2026-07-17 00:00:00-04'
  AND sa.status = 'completed'
GROUP BY st.name
ORDER BY uds DESC;
