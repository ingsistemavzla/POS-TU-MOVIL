-- ============================================================================
-- CORRECCIÓN ULTRA-MÍNIMA: RLS para public.users (Sin Dependencias)
-- ============================================================================
-- PROBLEMA: Errores 500 persistentes - políticas RLS causando fallos en servidor
-- SOLUCIÓN: Políticas ABSOLUTAMENTE mínimas sin ninguna consulta adicional
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Eliminar TODAS las políticas existentes
-- ============================================================================
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.users';
    END LOOP;
END $$;

-- ============================================================================
-- PASO 2: Política SELECT - SOLO lectura propia
-- ============================================================================
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- ============================================================================
-- PASO 3: Política INSERT - SOLO crear tu propio perfil
-- ============================================================================
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- ============================================================================
-- PASO 4: Política UPDATE - SOLO actualizar tu propio perfil
-- ============================================================================
-- Permite vincular auth_user_id si el perfil tiene email coincidente
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (
    auth_user_id = auth.uid()
    OR
    (
      auth_user_id IS NULL
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT 
  '✅ Políticas creadas' AS "Estado",
  COUNT(*) AS "Cantidad",
  'Debe ser 3' AS "Esperado"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users';


