-- ============================================================================
-- CORRECCIÓN FINAL ULTRA-SIMPLE: RLS sin consultas a auth.users
-- ============================================================================
-- PROBLEMA: La política UPDATE consulta auth.users, causando errores 500
-- SOLUCIÓN: Políticas ABSOLUTAMENTE simples sin consultas adicionales
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
-- PASO 3: Política INSERT - Permitir crear perfil (para registro)
-- ============================================================================
-- Permitir INSERT si auth_user_id es NULL (registro nuevo) o coincide con auth.uid()
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (
    auth_user_id IS NULL 
    OR auth_user_id = auth.uid()
  );

-- ============================================================================
-- PASO 4: Política UPDATE - SOLO actualizar tu propio perfil
-- ============================================================================
-- SOLO permite actualizar si auth_user_id ya coincide con auth.uid()
-- Para vincular auth_user_id, usar RPC con SECURITY DEFINER
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth_user_id = auth.uid());

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

-- ============================================================================
-- NOTA IMPORTANTE
-- ============================================================================
-- Esta configuración ULTRA-SIMPLE:
-- ✅ Permite leer tu propio perfil (auth_user_id = auth.uid())
-- ✅ Permite crear perfil durante registro (auth_user_id NULL o coincidente)
-- ✅ Permite actualizar tu perfil (auth_user_id = auth.uid())
--
-- ⚠️  Para vincular auth_user_id después de crear perfil:
--     Usar RPC link_user_profile_by_email (SECURITY DEFINER)
--     O crear el perfil con auth_user_id desde el inicio
-- ============================================================================


