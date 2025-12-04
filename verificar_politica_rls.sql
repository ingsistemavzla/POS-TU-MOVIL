-- ============================================================================
-- VERIFICACIÓN: Política RLS de public.users
-- Fecha: 2025-01-27
-- Objetivo: Verificar que la política se creó correctamente
-- ============================================================================

-- Verificar que solo existe 1 política SELECT
SELECT 
  policyname AS "Nombre de Política",
  cmd AS "Operación",
  schemaname AS "Esquema",
  tablename AS "Tabla"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users' 
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Contar políticas SELECT
SELECT 
  COUNT(*) AS "Total de Políticas SELECT"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users' 
  AND cmd = 'SELECT';

-- Verificar que la política correcta existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND cmd = 'SELECT'
        AND policyname = 'users_select_policy_self_only'
    ) THEN '✅ Política users_select_policy_self_only existe'
    ELSE '❌ Política users_select_policy_self_only NO existe'
  END AS "Estado de la Política";





