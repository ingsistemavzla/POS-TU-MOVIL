-- ============================================
-- SCRIPT DE PRUEBA DE INTEGRIDAD DEL SISTEMA
-- ============================================
-- Ejecuta estas consultas para verificar que todo funciona correctamente

-- ============================================
-- 1. VERIFICAR FUNCIONES RPC CRÍTICAS
-- ============================================

-- Verificar que process_sale tiene SECURITY DEFINER
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER (Ignora RLS)'
    ELSE '❌ SECURITY INVOKER (Respetaría RLS)'
  END as security_status
FROM pg_proc
WHERE proname IN ('process_sale', 'transfer_inventory', 'update_store_inventory', 'delete_product_with_inventory')
ORDER BY proname;

-- ============================================
-- 2. VERIFICAR POLÍTICAS RLS
-- ============================================

-- Verificar políticas de inventories
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual LIKE '%is_manager%' OR qual LIKE '%get_assigned_store_id%' THEN '✅ Restringe managers'
    ELSE 'Info'
  END as restriction_type
FROM pg_policies
WHERE tablename IN ('inventories', 'stores', 'sales', 'products', 'inventory_movements')
ORDER BY tablename, policyname;

-- ============================================
-- 3. VERIFICAR INTEGRIDAD DE DATOS
-- ============================================

-- Verificar que no hay stock negativo
SELECT 
  store_id,
  product_id,
  qty,
  CASE 
    WHEN qty < 0 THEN '❌ STOCK NEGATIVO'
    ELSE '✅ OK'
  END as status
FROM inventories
WHERE qty < 0
LIMIT 10;

-- Verificar consistencia: Ventas vs Inventario
-- (Esta consulta verifica que las ventas no excedan el stock disponible)
SELECT 
  s.id as sale_id,
  s.store_id,
  si.product_id,
  si.qty as sold_qty,
  i.qty as current_stock,
  CASE 
    WHEN i.qty < 0 THEN '❌ STOCK NEGATIVO DESPUÉS DE VENTA'
    ELSE '✅ OK'
  END as status
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
LEFT JOIN inventories i ON si.product_id = i.product_id AND s.store_id = i.store_id
WHERE s.created_at >= NOW() - INTERVAL '7 days'
  AND i.qty < 0
LIMIT 10;

-- ============================================
-- 4. VERIFICAR RESTRICCIONES DE MANAGERS
-- ============================================

-- Verificar que managers tienen assigned_store_id
SELECT 
  id,
  email,
  role,
  assigned_store_id,
  CASE 
    WHEN role = 'manager' AND assigned_store_id IS NULL THEN '❌ Manager sin tienda asignada'
    WHEN role = 'manager' AND assigned_store_id IS NOT NULL THEN '✅ Manager con tienda asignada'
    ELSE 'N/A'
  END as status
FROM users
WHERE role = 'manager'
ORDER BY created_at DESC;

-- ============================================
-- 5. VERIFICAR PERMISOS DE EJECUCIÓN
-- ============================================

-- Verificar que las funciones están disponibles para authenticated
SELECT 
  p.proname as function_name,
  CASE 
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN '✅ Puede ejecutar'
    ELSE '❌ NO puede ejecutar'
  END as execute_permission
FROM pg_proc p
WHERE p.proname IN ('process_sale', 'transfer_inventory', 'update_store_inventory')
ORDER BY p.proname;

-- ============================================
-- 6. VERIFICAR VALIDACIONES DE STOCK
-- ============================================

-- Verificar que process_sale tiene validación de stock
SELECT 
  prosrc LIKE '%v_current_stock%' as has_stock_check,
  prosrc LIKE '%qty >= v_qty%' as has_atomic_update,
  CASE 
    WHEN prosrc LIKE '%v_current_stock%' AND prosrc LIKE '%qty >= v_qty%' THEN '✅ Validación completa'
    ELSE '❌ Falta validación'
  END as validation_status
FROM pg_proc
WHERE proname = 'process_sale'
LIMIT 1;

-- ============================================
-- 7. RESUMEN DE INTEGRIDAD
-- ============================================

-- Resumen general
SELECT 
  'Funciones RPC con SECURITY DEFINER' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ OK'
    ELSE '❌ Faltan funciones'
  END as status
FROM pg_proc
WHERE proname IN ('process_sale', 'transfer_inventory', 'update_store_inventory', 'delete_product_with_inventory')
  AND prosecdef = true

UNION ALL

SELECT 
  'Políticas RLS activas' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ OK'
    ELSE '❌ Sin políticas'
  END as status
FROM pg_policies
WHERE tablename IN ('inventories', 'stores', 'sales', 'products')

UNION ALL

SELECT 
  'Stock negativo detectado' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK (Sin stock negativo)'
    ELSE '⚠️ ALERTA: Stock negativo encontrado'
  END as status
FROM inventories
WHERE qty < 0

UNION ALL

SELECT 
  'Managers con tienda asignada' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = (SELECT COUNT(*) FROM users WHERE role = 'manager') THEN '✅ OK (Todos tienen tienda)'
    ELSE '⚠️ ALERTA: Algunos managers sin tienda'
  END as status
FROM users
WHERE role = 'manager' AND assigned_store_id IS NOT NULL;





