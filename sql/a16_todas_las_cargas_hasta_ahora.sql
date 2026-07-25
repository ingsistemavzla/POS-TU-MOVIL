-- ============================================================================
-- A16 128GB — Todas las CARGAS hasta ahora (día, cantidad, tienda)
-- SKU: RF8YA0DK6ZF
-- Zona: America/Caracas
-- Ejecutar bloque por bloque en Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Stock actual por tienda (referencia)
-- ----------------------------------------------------------------------------
SELECT
  s.name AS tienda,
  i.qty AS stock_actual
FROM public.inventories i
JOIN public.products p ON p.id = i.product_id
JOIN public.stores s ON s.id = i.store_id
WHERE p.sku = 'RF8YA0DK6ZF'
ORDER BY s.name;

SELECT SUM(i.qty) AS stock_total
FROM public.inventories i
JOIN public.products p ON p.id = i.product_id
WHERE p.sku = 'RF8YA0DK6ZF';


-- ----------------------------------------------------------------------------
-- 1) TODAS LAS CARGAS (aumentos de stock que NO son transferencia ni venta)
--    Incluye: salidas de cero, aumentos manuales, IN de mercancía.
--    Excluye: restituciones por cancelación y transferencias entre tiendas.
-- ----------------------------------------------------------------------------
SELECT
  (im.created_at AT TIME ZONE 'America/Caracas')::date AS dia,
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_hora,
  COALESCE(st.name, sf.name, '(sin tienda)') AS tienda,
  COALESCE(im.old_qty, 0) AS estaba_en,
  COALESCE(im.new_qty, 0) AS quedo_en,
  (COALESCE(im.new_qty, 0) - COALESCE(im.old_qty, 0)) AS unidades_cargadas,
  im.type,
  LEFT(im.reason, 120) AS motivo,
  COALESCE(u.name, u.email) AS usuario
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
LEFT JOIN public.users u ON u.id = im.user_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND (COALESCE(im.new_qty, 0) - COALESCE(im.old_qty, 0)) > 0
  AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%cancelaci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%transfer%'
  AND COALESCE(im.type, '') NOT ILIKE '%transfer%'
ORDER BY im.created_at ASC;


-- ----------------------------------------------------------------------------
-- 2) RESUMEN POR DÍA (cuánto se cargó cada día, todas las tiendas)
-- ----------------------------------------------------------------------------
SELECT
  (im.created_at AT TIME ZONE 'America/Caracas')::date AS dia,
  COUNT(*) AS num_cargas,
  SUM(COALESCE(im.new_qty, 0) - COALESCE(im.old_qty, 0)) AS unidades_cargadas_ese_dia
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND (COALESCE(im.new_qty, 0) - COALESCE(im.old_qty, 0)) > 0
  AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%cancelaci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%transfer%'
  AND COALESCE(im.type, '') NOT ILIKE '%transfer%'
GROUP BY 1
ORDER BY 1 ASC;


-- ----------------------------------------------------------------------------
-- 3) RESUMEN POR DÍA + TIENDA
-- ----------------------------------------------------------------------------
SELECT
  (im.created_at AT TIME ZONE 'America/Caracas')::date AS dia,
  COALESCE(st.name, sf.name, '(sin tienda)') AS tienda,
  COUNT(*) AS num_cargas,
  SUM(COALESCE(im.new_qty, 0) - COALESCE(im.old_qty, 0)) AS unidades_cargadas
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND (COALESCE(im.new_qty, 0) - COALESCE(im.old_qty, 0)) > 0
  AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%cancelaci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%transfer%'
  AND COALESCE(im.type, '') NOT ILIKE '%transfer%'
GROUP BY 1, 2
ORDER BY 1 ASC, 2 ASC;


-- ----------------------------------------------------------------------------
-- 4) Solo cargas “grandes” (+5 o más) — las que suelen recordar como “la carga”
-- ----------------------------------------------------------------------------
SELECT
  (im.created_at AT TIME ZONE 'America/Caracas')::date AS dia,
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_hora,
  COALESCE(st.name, sf.name) AS tienda,
  COALESCE(im.old_qty, 0) AS estaba_en,
  COALESCE(im.new_qty, 0) AS quedo_en,
  (COALESCE(im.new_qty, 0) - COALESCE(im.old_qty, 0)) AS unidades_cargadas,
  LEFT(im.reason, 100) AS motivo
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND (COALESCE(im.new_qty, 0) - COALESCE(im.old_qty, 0)) >= 5
  AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%cancelaci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%transfer%'
  AND COALESCE(im.type, '') NOT ILIKE '%transfer%'
ORDER BY im.created_at ASC;


-- ----------------------------------------------------------------------------
-- 5) Solo salidas de CERO (old=0 → new>0) — ciclo “estaba en cero y cargué”
-- ----------------------------------------------------------------------------
SELECT
  (im.created_at AT TIME ZONE 'America/Caracas')::date AS dia,
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha_hora,
  COALESCE(st.name, sf.name) AS tienda,
  COALESCE(im.old_qty, 0) AS estaba_en,
  COALESCE(im.new_qty, 0) AS quedo_en,
  (COALESCE(im.new_qty, 0) - COALESCE(im.old_qty, 0)) AS unidades_cargadas,
  LEFT(im.reason, 100) AS motivo
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND COALESCE(im.old_qty, 0) = 0
  AND COALESCE(im.new_qty, 0) > 0
  AND COALESCE(im.reason, '') NOT ILIKE '%restituci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%cancelaci%'
  AND COALESCE(im.reason, '') NOT ILIKE '%transfer%'
ORDER BY im.created_at ASC;
