-- Ejecutar en Supabase SQL Editor ANTES del cambio.
-- Copiar resultados a backups/snapshot_pre_sucursal_YYYYMMDD.txt

-- Conteos de referencia (products usa active, no deleted_at)
SELECT 'stores' AS tabla, count(*)::bigint AS total FROM stores
UNION ALL SELECT 'stores_active', count(*) FROM stores WHERE active = true
UNION ALL SELECT 'products', count(*) FROM products
UNION ALL SELECT 'products_active', count(*) FROM products WHERE active = true
UNION ALL SELECT 'inventories', count(*) FROM inventories
UNION ALL SELECT 'sales', count(*) FROM sales;

-- Tiendas actuales
SELECT id, name, active, created_at FROM stores ORDER BY created_at;

-- Inventario por tienda activa
SELECT s.name, count(i.id) AS filas_inventario
FROM stores s
LEFT JOIN inventories i ON i.store_id = s.id
WHERE s.active = true
GROUP BY s.id, s.name
ORDER BY s.name;
