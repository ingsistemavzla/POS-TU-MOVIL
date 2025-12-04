-- ============================================================================
-- FIX: Reset Password Using Supabase-Compatible Format
-- ============================================================================
-- PROBLEMA: El hash generado con crypt() puede no ser compatible con Supabase Auth
-- SOLUCIÓN: Usar el método correcto de Supabase o verificar el formato
-- ============================================================================

-- ============================================================================
-- NOTA IMPORTANTE:
-- Supabase Auth espera un formato específico de hash bcrypt.
-- El método crypt() de pgcrypto genera hashes válidos, pero debemos
-- asegurarnos de que el formato sea correcto.
-- ============================================================================

-- ============================================================================
-- OPCIÓN 1: Usar Supabase Admin API (Recomendado)
-- ============================================================================
-- La mejor forma de resetear contraseñas es usar la API de Supabase:
-- 1. Ir a Supabase Dashboard > Authentication > Users
-- 2. Seleccionar el usuario
-- 3. Click en "Reset Password" o usar "Update User"
-- ============================================================================

-- ============================================================================
-- OPCIÓN 2: Reset Manual con Formato Verificado
-- ============================================================================
-- Si necesitas hacerlo por SQL, este script verifica y corrige el formato
-- ============================================================================

-- Habilitar pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- RESET PASSWORD - tumovilstore2025@gmail.com
-- ============================================================================
DO $$
DECLARE
  v_auth_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Obtener auth_user_id
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'tumovilstore2025@gmail.com'
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE WARNING '⚠️ Usuario tumovilstore2025@gmail.com NO existe en auth.users';
  ELSE
    -- Generar hash bcrypt con formato correcto
    -- Supabase espera formato: $2a$ o $2b$ seguido de cost, salt y hash
    v_encrypted_password := crypt('2677Tele$', gen_salt('bf', 10));

    -- Verificar que el formato sea correcto
    IF v_encrypted_password NOT LIKE '$2%' THEN
      RAISE EXCEPTION 'Error: Hash generado no tiene formato bcrypt válido';
    END IF;

    -- Actualizar auth.users
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      encrypted_password = v_encrypted_password,
      updated_at = NOW()
    WHERE id = v_auth_user_id;

    RAISE NOTICE '✅ Contraseña reseteada para tumovilstore2025@gmail.com';
    RAISE NOTICE '   Hash generado: %', LEFT(v_encrypted_password, 30) || '...';
  END IF;
END $$;

-- ============================================================================
-- RESET PASSWORD - tumovillaisla@gmail.com
-- ============================================================================
DO $$
DECLARE
  v_auth_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Obtener auth_user_id
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'tumovillaisla@gmail.com'
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE WARNING '⚠️ Usuario tumovillaisla@gmail.com NO existe en auth.users';
  ELSE
    -- Generar hash bcrypt con formato correcto
    v_encrypted_password := crypt('2677Tele$', gen_salt('bf', 10));

    -- Verificar que el formato sea correcto
    IF v_encrypted_password NOT LIKE '$2%' THEN
      RAISE EXCEPTION 'Error: Hash generado no tiene formato bcrypt válido';
    END IF;

    -- Actualizar auth.users
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      encrypted_password = v_encrypted_password,
      updated_at = NOW()
    WHERE id = v_auth_user_id;

    RAISE NOTICE '✅ Contraseña reseteada para tumovillaisla@gmail.com';
    RAISE NOTICE '   Hash generado: %', LEFT(v_encrypted_password, 30) || '...';
  END IF;
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
    ELSE '❌ Formato desconocido: ' || LEFT(au.encrypted_password, 10)
  END AS "Formato Hash"
FROM auth.users au
WHERE au.email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com')
ORDER BY au.email;


