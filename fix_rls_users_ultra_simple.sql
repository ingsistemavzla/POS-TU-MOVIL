-- ============================================================================
-- CORRECCIÓN ULTRA-SIMPLE: RLS Sin Ninguna Dependencia
-- ============================================================================
-- PROBLEMA: Errores 403 (Forbidden) - RLS bloquea acceso al propio perfil
-- SOLUCIÓN: Política ABSOLUTAMENTE simple que solo verifica auth_user_id
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Eliminar TODAS las políticas SELECT existentes
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
-- PASO 2: Política SELECT - SOLO lectura propia (ULTRA-SIMPLE)
-- ============================================================================
-- SOLO permite leer tu propio perfil por auth_user_id
-- NO consulta auth.users ni public.users dentro de la política
CREATE POLICY "users_select_own_only" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- ============================================================================
-- PASO 3: Política SELECT - Ver usuarios de tu compañía (SIN DEPENDENCIAS)
-- ============================================================================
-- Usar función SECURITY DEFINER que bypass RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id_safe()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Política que usa la función (evita dependencia circular)
CREATE POLICY "users_select_company" ON public.users
  FOR SELECT USING (
    -- Solo si company_id no es NULL
    company_id IS NOT NULL
    AND
    -- Y coincide con el company_id del usuario actual (usando función que bypass RLS)
    company_id = public.get_user_company_id_safe()
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


