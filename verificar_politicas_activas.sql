-- ============================================================================
-- VERIFICACIÓN: Políticas RLS Activas en public.users
-- ============================================================================
-- Verificar qué políticas están activas y cómo se están evaluando
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR TODAS LAS POLÍTICAS SELECT
-- ============================================================================
SELECT 
  '🔒 POLÍTICAS SELECT' AS "Tipo",
  policyname AS "Nombre",
  cmd AS "Operación",
  qual AS "Condición",
  with_check AS "With Check"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- ============================================================================
-- 2. VERIFICAR SI RLS ESTÁ HABILITADO
-- ============================================================================
SELECT 
  '🔒 RLS STATUS' AS "Tipo",
  tablename AS "Tabla",
  rowsecurity AS "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'users';

-- ============================================================================
-- 3. CONTAR POLÍTICAS POR TIPO
-- ============================================================================
SELECT 
  '📊 CONTEO POLÍTICAS' AS "Tipo",
  cmd AS "Operación",
  COUNT(*) AS "Cantidad"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
GROUP BY cmd
ORDER BY cmd;


