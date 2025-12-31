-- ============================================================================
-- VERIFICACIÓN: Venta que no aparece en historial
-- ============================================================================
-- Venta: FAC-20251231-01610
-- ID: 0400b355-7a2b-486a-8c1e-bc66fb1f0ac9
-- Fecha: 2025-12-31 11:47:11
-- SKU: R92Y60J5AER
-- ============================================================================

-- 1. VERIFICAR QUE LA VENTA EXISTE Y ESTÁ COMPLETA
SELECT 
  s.id,
  s.invoice_number,
  s.created_at,
  s.status,
  s.company_id,
  s.store_id,
  s.total_usd,
  s.total_bs,
  COUNT(si.id) as items_count
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE s.id = '0400b355-7a2b-486a-8c1e-bc66fb1f0ac9'
GROUP BY s.id, s.invoice_number, s.created_at, s.status, s.company_id, s.store_id, s.total_usd, s.total_bs;

-- 2. VERIFICAR ITEMS DE LA VENTA
SELECT 
  si.id,
  si.sale_id,
  si.product_id,
  si.product_sku,
  si.product_name,
  si.qty,
  si.price_usd,
  si.subtotal_usd
FROM sale_items si
WHERE si.sale_id = '0400b355-7a2b-486a-8c1e-bc66fb1f0ac9';

-- 3. VERIFICAR SI LA RPC PUEDE ENCONTRARLA (SIN FILTROS)
-- Simular llamada a get_sales_history_v2 sin filtros
SELECT 
  s.id,
  s.invoice_number,
  s.created_at,
  s.company_id,
  s.store_id,
  s.total_usd
FROM sales s
WHERE s.company_id = (
  SELECT company_id 
  FROM users 
  WHERE auth_user_id = auth.uid() 
  LIMIT 1
)
ORDER BY s.created_at DESC
LIMIT 20;

-- 4. VERIFICAR SI HAY FILTROS DE FECHA QUE LA EXCLUYAN
-- La venta fue creada el 2025-12-31 11:47:11
-- Verificar si hay ventas más recientes
SELECT 
  s.id,
  s.invoice_number,
  s.created_at,
  s.total_usd
FROM sales s
WHERE s.company_id = (
  SELECT company_id 
  FROM users 
  WHERE auth_user_id = auth.uid() 
  LIMIT 1
)
AND s.created_at >= '2025-12-31 00:00:00'
ORDER BY s.created_at DESC
LIMIT 20;

-- 5. VERIFICAR POSICIÓN DE LA VENTA EN EL RANKING TOTAL
WITH ranked_sales AS (
  SELECT 
    s.id,
    s.invoice_number,
    s.created_at,
    ROW_NUMBER() OVER (ORDER BY s.created_at DESC) as position
  FROM sales s
  WHERE s.company_id = (
    SELECT company_id 
    FROM users 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1
  )
)
SELECT 
  position,
  id,
  invoice_number,
  created_at
FROM ranked_sales
WHERE id = '0400b355-7a2b-486a-8c1e-bc66fb1f0ac9';

-- 6. VERIFICAR VENTAS MÁS RECIENTES (ÚLTIMAS 20)
SELECT 
  s.id,
  s.invoice_number,
  s.created_at,
  s.total_usd,
  CASE 
    WHEN s.id = '0400b355-7a2b-486a-8c1e-bc66fb1f0ac9' THEN '⭐ ESTA ES LA VENTA BUSCADA'
    ELSE ''
  END as marker
FROM sales s
WHERE s.company_id = (
  SELECT company_id 
  FROM users 
  WHERE auth_user_id = auth.uid() 
  LIMIT 1
)
ORDER BY s.created_at DESC
LIMIT 20;

