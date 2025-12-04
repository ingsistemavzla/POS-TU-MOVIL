-- ============================================================================
-- DESHABILITAR TRIGGER TEMPORALMENTE
-- ============================================================================
-- OBJETIVO: Deshabilitar el trigger on_auth_user_created temporalmente
--           para permitir el login sin errores del trigger
-- ============================================================================
-- ⚠️ ADVERTENCIA: Solo ejecutar si el trigger está causando el error 500
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar triggers activos
-- ============================================================================
SELECT 
  '🔍 TRIGGERS ACTIVOS' AS "Tipo",
  tgname AS "Trigger Name",
  tgenabled AS "Enabled",
  CASE tgenabled
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '❌ Disabled'
    WHEN 'R' THEN '⚠️ Replica'
    WHEN 'A' THEN '✅ Always'
    ELSE '❓ Unknown'
  END AS "Estado"
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND tgname LIKE '%user%'
ORDER BY tgname;

-- ============================================================================
-- PASO 2: Deshabilitar trigger on_auth_user_created
-- ============================================================================
-- ⚠️ SOLO SI ES NECESARIO
-- ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- ============================================================================
-- PASO 3: Resetear contraseñas (usar reset_password_using_rpc.sql)
-- ============================================================================
-- Ejecutar reset_password_using_rpc.sql aquí

-- ============================================================================
-- PASO 4: Rehabilitar trigger después de resetear
-- ============================================================================
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Tipo",
  tgname AS "Trigger Name",
  CASE tgenabled
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '❌ Disabled'
    ELSE '❓ Unknown'
  END AS "Estado"
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND tgname = 'on_auth_user_created';


