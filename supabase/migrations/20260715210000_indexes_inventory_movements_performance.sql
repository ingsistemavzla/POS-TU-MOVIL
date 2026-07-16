-- Índices de rendimiento para inventory_movements e inventories (alertas).
-- Idempotente. No altera funcionalidad: solo acelera lecturas.

-- Historial / listados por empresa
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_created
  ON public.inventory_movements (company_id, created_at DESC);

COMMENT ON INDEX public.idx_inventory_movements_company_created IS
  'Historial y listados: company_id + created_at DESC';

-- Auditoría por producto
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created
  ON public.inventory_movements (product_id, created_at DESC);

COMMENT ON INDEX public.idx_inventory_movements_product_created IS
  'Auditoría por producto: product_id + created_at DESC';

-- Filtro por tipo en Master Audit
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_type_created
  ON public.inventory_movements (company_id, type, created_at DESC);

COMMENT ON INDEX public.idx_inventory_movements_company_type_created IS
  'Master Audit: company_id + type + created_at DESC';

-- Tienda origen
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store_from_created
  ON public.inventory_movements (store_from_id, created_at DESC)
  WHERE store_from_id IS NOT NULL;

COMMENT ON INDEX public.idx_inventory_movements_store_from_created IS
  'Filtro tienda origen en movimientos';

-- Tienda destino
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store_to_created
  ON public.inventory_movements (store_to_id, created_at DESC)
  WHERE store_to_id IS NOT NULL;

COMMENT ON INDEX public.idx_inventory_movements_store_to_created IS
  'Filtro tienda destino en movimientos';

-- Alertas de stock por qty
CREATE INDEX IF NOT EXISTS idx_inventories_company_qty
  ON public.inventories (company_id, qty);

COMMENT ON INDEX public.idx_inventories_company_qty IS
  'Alertas de stock: company_id + qty';
