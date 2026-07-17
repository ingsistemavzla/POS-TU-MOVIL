-- ============================================================================
-- ÍNDICES POS — clientes + búsqueda de productos
-- ============================================================================
-- Fecha: 2026-07-16
-- Objetivo: acelerar consulta de cliente por cédula y búsqueda ILIKE
--           de productos en POS, SIN cambiar funcionalidad.
--
-- Cómo aplicar:
--   1) Supabase → SQL Editor → sección A (diagnóstico).
--   2) Sección B (CREATE INDEX / EXTENSION).
--   3) Opcional: sección C (verificar índices creados).
--
-- Seguro: IF NOT EXISTS / IF NOT EXISTS extension.
-- NOTA: el índice de clientes NO es UNIQUE (por si hay duplicados legacy).
-- ============================================================================

-- ============================================================================
-- A) DIAGNÓSTICO
-- ============================================================================
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'products')
ORDER BY tablename, indexname;

-- Duplicados de cédula por empresa (si salen filas, el índice UNIQUE fallaría;
-- por eso usamos índice NO único).
SELECT
  company_id,
  id_number,
  COUNT(*) AS cnt
FROM public.customers
WHERE id_number IS NOT NULL
  AND btrim(id_number) <> ''
GROUP BY company_id, id_number
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 50;


-- ============================================================================
-- B) CREAR EXTENSION E ÍNDICES
-- ============================================================================

-- B0) Trigram para ILIKE '%texto%'
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- B1) Cliente POS: .eq('id_number', ...) filtrado por RLS company_id
CREATE INDEX IF NOT EXISTS idx_customers_company_id_number
  ON public.customers (company_id, id_number)
  WHERE id_number IS NOT NULL;

COMMENT ON INDEX idx_customers_company_id_number IS
  'POS: búsqueda de cliente por company_id + id_number';

-- B2) Productos activos por empresa (filtro base del POS)
CREATE INDEX IF NOT EXISTS idx_products_company_active_created
  ON public.products (company_id, created_at DESC)
  WHERE active = true;

COMMENT ON INDEX idx_products_company_active_created IS
  'POS/Almacén: productos activos por empresa';

-- B3) Búsqueda por nombre (ILIKE)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops)
  WHERE active = true;

COMMENT ON INDEX idx_products_name_trgm IS
  'POS: ILIKE por nombre (pg_trgm)';

-- B4) Búsqueda por SKU
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON public.products USING gin (sku gin_trgm_ops)
  WHERE active = true;

COMMENT ON INDEX idx_products_sku_trgm IS
  'POS: ILIKE por SKU (pg_trgm)';

-- B5) Búsqueda por barcode (solo filas con barcode)
CREATE INDEX IF NOT EXISTS idx_products_barcode_trgm
  ON public.products USING gin (barcode gin_trgm_ops)
  WHERE active = true AND barcode IS NOT NULL;

COMMENT ON INDEX idx_products_barcode_trgm IS
  'POS: ILIKE/escáner por barcode (pg_trgm)';

-- B6) Igualdad exacta SKU / barcode (modo escáner)
CREATE INDEX IF NOT EXISTS idx_products_company_sku
  ON public.products (company_id, sku)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_products_company_barcode
  ON public.products (company_id, barcode)
  WHERE active = true AND barcode IS NOT NULL;

COMMENT ON INDEX idx_products_company_sku IS
  'POS escáner: igualdad exacta company_id + sku';
COMMENT ON INDEX idx_products_company_barcode IS
  'POS escáner: igualdad exacta company_id + barcode';


-- ============================================================================
-- C) VERIFICAR
-- ============================================================================
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_customers_company_id_number',
    'idx_products_company_active_created',
    'idx_products_name_trgm',
    'idx_products_sku_trgm',
    'idx_products_barcode_trgm',
    'idx_products_company_sku',
    'idx_products_company_barcode'
  )
ORDER BY indexname;
-- Esperado: 7 filas
