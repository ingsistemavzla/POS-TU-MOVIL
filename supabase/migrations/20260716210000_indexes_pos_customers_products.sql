-- Índices POS: clientes + búsqueda productos (pg_trgm)
-- Idempotente. Aplicar también vía sql/06_indices_pos_customers_products.sql en SQL Editor si se prefiere.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_customers_company_id_number
  ON public.customers (company_id, id_number)
  WHERE id_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_company_active_created
  ON public.products (company_id, created_at DESC)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON public.products USING gin (sku gin_trgm_ops)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_products_barcode_trgm
  ON public.products USING gin (barcode gin_trgm_ops)
  WHERE active = true AND barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_company_sku
  ON public.products (company_id, sku)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_products_company_barcode
  ON public.products (company_id, barcode)
  WHERE active = true AND barcode IS NOT NULL;
