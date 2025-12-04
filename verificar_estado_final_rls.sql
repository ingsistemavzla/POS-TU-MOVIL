-- ============================================================================
-- VERIFICACIÓN FINAL: Estado de RLS y Diagnóstico de Errores 500
-- ============================================================================
-- Este script verifica el estado actual y diagnostica posibles causas
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR POLÍTICAS RLS ACTUALES
-- ============================================================================
SELECT 
  '📋 POLÍTICAS RLS' AS "Tipo",
  policyname AS "Nombre",
  cmd AS "Operación",
  qual AS "Condición"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY cmd, policyname;

-- ============================================================================
-- 2. VERIFICAR TRIGGERS (Pueden causar errores 500)
-- ============================================================================
SELECT 
  '🔧 TRIGGERS' AS "Tipo",
  trigger_name AS "Nombre",
  event_manipulation AS "Evento",
  action_timing AS "Timing",
  action_statement AS "Función"
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'users';

-- ============================================================================
-- 3. VERIFICAR FUNCIONES QUE SE EJECUTAN AUTOMÁTICAMENTE
-- ============================================================================
SELECT 
  '⚙️ FUNCIONES' AS "Tipo",
  routine_name AS "Nombre",
  routine_type AS "Tipo",
  security_type AS "Seguridad"
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- ============================================================================
-- 4. VERIFICAR SI RLS ESTÁ HABILITADO
-- ============================================================================
SELECT 
  '🔒 RLS STATUS' AS "Tipo",
  tablename AS "Tabla",
  rowsecurity AS "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'users';

-- ============================================================================
-- 5. DIAGNÓSTICO: Verificar si la política UPDATE tiene problemas
-- ============================================================================
-- La política UPDATE consulta auth.users - esto puede causar problemas
-- si auth.users no es accesible en ese contexto
SELECT 
  '⚠️ DIAGNÓSTICO' AS "Tipo",
  policyname AS "Política",
  CASE 
    WHEN qual LIKE '%SELECT%FROM auth.users%' THEN '⚠️ Consulta auth.users (puede causar 500)'
    WHEN qual LIKE '%SELECT%FROM public.users%' THEN '⚠️ Consulta public.users (circular)'
    ELSE '✅ Sin consultas problemáticas'
  END AS "Problema Potencial"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND cmd = 'UPDATE';


