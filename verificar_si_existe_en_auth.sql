-- ============================================================================
-- VERIFICACIÓN RÁPIDA: ¿Existe en auth.users?
-- ============================================================================
-- Verifica si el usuario existe en auth.users
-- ============================================================================

SELECT 
  '🔍 AUTH.USERS' AS "Tipo",
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ SÍ EXISTE en auth.users'
    ELSE '❌ NO EXISTE en auth.users'
  END AS "Estado",
  COUNT(*) AS "Cantidad",
  STRING_AGG(id::TEXT, ', ') AS "auth_user_id(s)"
FROM auth.users
WHERE email = 'zonagamermargarita@gmail.com';

-- Si existe, mostrar detalles
SELECT 
  '📋 DETALLES AUTH.USERS' AS "Tipo",
  id AS "auth_user_id",
  email AS "Email",
  email_confirmed_at AS "Email Confirmado",
  created_at AS "Creado",
  last_sign_in_at AS "Último Login"
FROM auth.users
WHERE email = 'zonagamermargarita@gmail.com';


