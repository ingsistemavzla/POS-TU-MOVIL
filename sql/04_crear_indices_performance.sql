-- ============================================================================
-- CREAR ÍNDICES DE PERFORMANCE
-- ============================================================================
-- Fecha: 2025-01-31
-- Descripción: Índices para optimizar consultas frecuentes en paneles
--              de Ventas, Almacén y Artículos
-- ============================================================================
-- IMPORTANTE: Ejecutar después de documentar estado (00_documentar_estado_antes_indices.sql)
-- ============================================================================

-- ============================================================================
-- ÍNDICES PARA PANEL DE VENTAS
-- ============================================================================

-- 1. Ventas por compañía y fecha (consulta más frecuente)
-- Optimiza: Carga inicial del panel de ventas
CREATE INDEX IF NOT EXISTS idx_sales_company_date 
ON sales(company_id, created_at DESC);

COMMENT ON INDEX idx_sales_company_date IS 
'Optimiza consultas de ventas por compañía ordenadas por fecha (Panel de Ventas)';

-- 2. Ventas por tienda y fecha
-- Optimiza: Filtros por tienda en panel de ventas
CREATE INDEX IF NOT EXISTS idx_sales_store_date 
ON sales(store_id, created_at DESC);

COMMENT ON INDEX idx_sales_store_date IS 
'Optimiza consultas de ventas por tienda ordenadas por fecha';

-- 3. Items de venta por sale_id (muy frecuente)
-- Optimiza: Cargar items cuando se expande una venta
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id 
ON sale_items(sale_id);

COMMENT ON INDEX idx_sale_items_sale_id IS 
'Optimiza carga de items cuando se expande una venta (Panel de Ventas)';

-- 4. Ventas por cliente (si se filtra por cliente)
CREATE INDEX IF NOT EXISTS idx_sales_customer_date 
ON sales(customer_id, created_at DESC) 
WHERE customer_id IS NOT NULL;

COMMENT ON INDEX idx_sales_customer_date IS 
'Optimiza consultas de ventas por cliente (solo para ventas con cliente)';

-- ============================================================================
-- ÍNDICES PARA PANEL DE ALMACÉN Y ARTÍCULOS
-- ============================================================================

-- 5. Inventario por producto y tienda (consulta más frecuente)
-- Optimiza: Carga de stock por producto en cada tienda
CREATE INDEX IF NOT EXISTS idx_inventories_product_store 
ON inventories(product_id, store_id);

COMMENT ON INDEX idx_inventories_product_store IS 
'Optimiza consultas de inventario por producto y tienda (Panel Almacén/Artículos)';

-- 6. Inventario por compañía y tienda
-- Optimiza: Filtros por tienda en panel de almacén
CREATE INDEX IF NOT EXISTS idx_inventories_company_store 
ON inventories(company_id, store_id);

COMMENT ON INDEX idx_inventories_company_store IS 
'Optimiza consultas de inventario por compañía y tienda';

-- 7. Productos activos por compañía (siempre se filtra por active=true)
-- Optimiza: Carga de productos activos
CREATE INDEX IF NOT EXISTS idx_products_company_active 
ON products(company_id, active) 
WHERE active = true;

COMMENT ON INDEX idx_products_company_active IS 
'Optimiza consultas de productos activos (Panel Almacén/Artículos)';

-- ============================================================================
-- VERIFICACIÓN POST-CREACIÓN
-- ============================================================================

-- Verificar que se crearon correctamente
SELECT 
    '✅ Índices creados' as verificacion,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN ('sales', 'sale_items', 'inventories', 'products')
ORDER BY tablename, indexname;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- Estos índices mejorarán significativamente el rendimiento de:
-- 1. Panel de Ventas: Carga inicial y expansión de ventas
-- 2. Panel de Almacén: Carga de inventario por producto/tienda
-- 3. Panel de Artículos: Carga de productos activos
--
-- Impacto esperado: 10-15x más rápido en consultas frecuentes
-- Tiempo de creación: 1-3 minutos (depende del tamaño de las tablas)
-- Espacio adicional: ~10-20 MB (insignificante)
-- ============================================================================

