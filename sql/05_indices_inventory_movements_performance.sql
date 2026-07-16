-- ============================================================================
-- ÍNDICES NIVEL MEDIO — inventory_movements (+ apoyo alertas)
-- ============================================================================
-- Fecha: 2026-07-15
-- Objetivo: acelerar Historial, Master Audit y auditorías por SKU
--           SIN cambiar funcionalidad (solo lectura más rápida).
--
-- Cómo aplicar:
--   1) En Supabase → SQL Editor, ejecutar PRIMERO la sección A (diagnóstico).
--   2) Luego ejecutar la sección B (CREATE INDEX IF NOT EXISTS).
--   3) Opcional: sección C (EXPLAIN) para confirmar uso de índices.
--
-- Seguro: IF NOT EXISTS no falla si ya existen.
-- Tiempo típico: segundos a pocos minutos según volumen.
-- ============================================================================

-- ============================================================================
-- A) DIAGNÓSTICO — ¿qué índices ya hay en inventory_movements?
-- ============================================================================
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'inventory_movements'
ORDER BY indexname;

-- Inventories (alertas de stock)
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'inventories'
  AND indexname ILIKE '%qty%'
ORDER BY indexname;


-- ============================================================================
-- B) CREAR ÍNDICES FALTANTES (idempotente)
-- ============================================================================

-- B1) Historial / listados recientes por empresa (consulta más frecuente)
--     HistorialPage: ORDER BY created_at DESC LIMIT 1000 + RLS company_id
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_created
  ON public.inventory_movements (company_id, created_at DESC);

COMMENT ON INDEX idx_inventory_movements_company_created IS
  'Historial y listados: company_id + created_at DESC';

-- B2) Auditoría por producto (SKU / forense A16, Master Audit filtro producto)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created
  ON public.inventory_movements (product_id, created_at DESC);

COMMENT ON INDEX idx_inventory_movements_product_created IS
  'Auditoría por producto: product_id + created_at DESC';

-- B3) Filtro por tipo (VENTAS/OUT, ADJUST, TRANSFER/IN) en Master Audit
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_type_created
  ON public.inventory_movements (company_id, type, created_at DESC);

COMMENT ON INDEX idx_inventory_movements_company_type_created IS
  'Master Audit: company_id + type + created_at DESC';

-- B4) Filtro por tienda origen (parcial; ignora NULL)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store_from_created
  ON public.inventory_movements (store_from_id, created_at DESC)
  WHERE store_from_id IS NOT NULL;

COMMENT ON INDEX idx_inventory_movements_store_from_created IS
  'Filtro tienda origen en movimientos';

-- B5) Filtro por tienda destino (parcial; ignora NULL)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store_to_created
  ON public.inventory_movements (store_to_id, created_at DESC)
  WHERE store_to_id IS NOT NULL;

COMMENT ON INDEX idx_inventory_movements_store_to_created IS
  'Filtro tienda destino en movimientos';

-- B6) Alertas de stock (qty bajo / crítico / cero) por empresa
--     StockNotificationContext / useDashboardStockAlerts
CREATE INDEX IF NOT EXISTS idx_inventories_company_qty
  ON public.inventories (company_id, qty);

COMMENT ON INDEX idx_inventories_company_qty IS
  'Alertas de stock: filtrar por company_id y rangos de qty';


-- ============================================================================
-- C) VERIFICACIÓN — índices nuevos presentes
-- ============================================================================
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_inventory_movements_company_created',
    'idx_inventory_movements_product_created',
    'idx_inventory_movements_company_type_created',
    'idx_inventory_movements_store_from_created',
    'idx_inventory_movements_store_to_created',
    'idx_inventories_company_qty'
  )
ORDER BY tablename, indexname;


-- ============================================================================
-- D) EXPLAIN de ejemplo (opcional — reemplaza el UUID de compañía)
-- ============================================================================
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT id, type, qty, created_at
-- FROM public.inventory_movements
-- WHERE company_id = '00000000-0000-0000-0000-000000000000'
-- ORDER BY created_at DESC
-- LIMIT 1000;
--
-- Debe preferir Index Scan / Index Only Scan sobre
-- idx_inventory_movements_company_created (no Seq Scan).
