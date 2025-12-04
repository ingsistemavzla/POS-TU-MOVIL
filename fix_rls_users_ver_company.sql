-- ============================================================================
-- CORRECCIÓN: RLS para ver usuarios de la misma compañía
-- ============================================================================
-- PROBLEMA: Las políticas RLS pueden estar bloqueando la visualización de usuarios
--           de la misma compañía
-- SOLUCIÓN: Crear políticas que permitan ver usuarios de la misma company_id
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Eliminar políticas SELECT existentes (para reemplazarlas)
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
          AND cmd = 'SELECT'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.users';
    END LOOP;
END $$;

-- ============================================================================
-- PASO 2: Política SELECT - Leer tu propio perfil
-- ============================================================================
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR
    (
      auth_user_id IS NULL
      AND email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid() 
        LIMIT 1
      )
    )
  );

-- ============================================================================
-- PASO 3: Política SELECT - Ver usuarios de tu compañía
-- ============================================================================
-- Permite ver usuarios de la misma company_id, pero solo si ya tienes perfil
CREATE POLICY "users_select_company" ON public.users
  FOR SELECT USING (
    -- Solo aplica si ya tienes un perfil vinculado
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
    AND
    -- Y el perfil que intentas leer es de tu misma compañía
    company_id = (
      SELECT company_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
      LIMIT 1
    )
    AND
    -- Y ambos tienen company_id (no NULL)
    company_id IS NOT NULL
  );

COMMIT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT 
  '✅ POLÍTICAS CREADAS' AS "Estado",
  policyname AS "Nombre",
  cmd AS "Operación"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND cmd = 'SELECT'
ORDER BY policyname;


