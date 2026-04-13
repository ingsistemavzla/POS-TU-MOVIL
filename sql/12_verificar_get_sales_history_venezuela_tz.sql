-- ============================================================================
-- Verificación post-migración: 20260412190000_sales_history_created_at_fmt_venezuela.sql
-- Ejecutar en Supabase → SQL Editor (puede ser como postgres; no requiere JWT).
-- ============================================================================

-- 1) La función existe con la firma esperada (5 args antes de variadic none: uuid, uuid, timestamptz, timestamptz, text, int, int)
SELECT p.proname,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_sales_history_v2';

-- 2) El cuerpo referencia America/Caracas (created_at_fmt)
SELECT CASE
  WHEN pg_get_functiondef(p.oid) LIKE '%America/Caracas%' THEN 'OK: zona Venezuela en la función'
  ELSE 'FALTA: revisar migración'
END AS check_tz
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_sales_history_v2'
LIMIT 1;

-- 3) Prueba matemática independiente del auth: mismo patrón que usa la RPC
--    2024-06-15 18:30 UTC → 14:30 en Caracas (UTC−4)
SELECT to_char(
  ('2024-06-15 18:30:00+00'::timestamptz AT TIME ZONE 'America/Caracas'),
  'DD/MM/YYYY, HH24:MI'
) AS ejemplo_esperado;
-- Debe devolver: 15/06/2024, 14:30

-- 4) Quién puede ejecutar la función
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'get_sales_history_v2';
-- Debe incluir grantee = authenticated y EXECUTE

-- 5) Llamada real: hazla desde la app (Historial de ventas) logueado.
--    En SQL Editor sin JWT, auth.uid() es NULL y la RPC no devuelve filas; es normal.
