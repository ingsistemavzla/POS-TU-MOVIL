-- ============================================================================
-- RESET PASSWORD: Usando RPC Function (Método Seguro)
-- ============================================================================
-- OBJETIVO: Resetear contraseñas usando la función RPC existente
--           que maneja correctamente el formato de Supabase
-- ============================================================================
-- USUARIOS:
-- 1. tumovilstore2025@gmail.com
-- 2. tumovillaisla@gmail.com
-- CONTRASEÑA: '2677Tele$'
-- ============================================================================

-- ============================================================================
-- PASO 1: Obtener user_id de public.users
-- ============================================================================
SELECT 
  '🔍 OBTENER USER_ID' AS "Tipo",
  pu.id AS "user_id",
  pu.email AS "Email",
  pu.auth_user_id AS "auth_user_id"
FROM public.users pu
WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY pu.email;

-- ============================================================================
-- PASO 2: Resetear contraseña usando RPC (si existe la función)
-- ============================================================================
-- NOTA: Reemplaza 'USER_ID_1' y 'USER_ID_2' con los IDs obtenidos en el Paso 1
-- Ejemplo de uso:
-- SELECT public.reset_user_password('USER_ID_1', '2677Tele$');
-- SELECT public.reset_user_password('USER_ID_2', '2677Tele$');

-- ============================================================================
-- ALTERNATIVA: Reset directo si RPC no funciona
-- ============================================================================
DO $$
DECLARE
  v_user_record RECORD;
  v_encrypted_password TEXT;
BEGIN
  -- Habilitar pgcrypto
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- Iterar sobre los usuarios
  FOR v_user_record IN
    SELECT pu.id AS user_id, pu.email, pu.auth_user_id
    FROM public.users pu
    WHERE pu.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
  LOOP
    IF v_user_record.auth_user_id IS NOT NULL THEN
      -- Generar hash bcrypt
      v_encrypted_password := crypt('2677Tele$', gen_salt('bf', 10));

      -- Actualizar auth.users
      UPDATE auth.users
      SET
        encrypted_password = v_encrypted_password,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
      WHERE id = v_user_record.auth_user_id;

      RAISE NOTICE '✅ Contraseña reseteada para % (user_id: %)', 
        v_user_record.email, v_user_record.user_id;
    ELSE
      RAISE WARNING '⚠️ Usuario % no tiene auth_user_id vinculado', v_user_record.email;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Tipo",
  au.email AS "Email",
  au.email_confirmed_at IS NOT NULL AS "Email Confirmado",
  au.encrypted_password IS NOT NULL AS "Tiene Contraseña",
  CASE
    WHEN au.encrypted_password LIKE '$2a$%' THEN '✅ Formato bcrypt $2a$'
    WHEN au.encrypted_password LIKE '$2b$%' THEN '✅ Formato bcrypt $2b$'
    WHEN au.encrypted_password LIKE '$2y$%' THEN '✅ Formato bcrypt $2y$'
    ELSE '❌ Formato: ' || LEFT(au.encrypted_password, 10)
  END AS "Formato Hash"
FROM auth.users au
WHERE au.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY au.email;


