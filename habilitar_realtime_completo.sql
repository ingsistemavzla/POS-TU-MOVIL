-- ============================================
-- HABILITAR REALTIME PARA TABLAS
-- ============================================

-- PASO 1: Habilitar Realtime para las tablas necesarias
-- Ejecuta este bloque primero

ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;

-- ============================================
-- PASO 2: Verificar que funcionó
-- Ejecuta este bloque después para confirmar
-- ============================================

SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('inventory_movements', 'inventory_transfers', 'sales')
ORDER BY tablename;

-- ============================================
-- RESULTADO ESPERADO:
-- Deberías ver 3 filas:
-- - inventory_movements
-- - inventory_transfers  
-- - sales
-- ============================================





