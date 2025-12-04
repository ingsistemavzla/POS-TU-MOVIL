-- ============================================================================
-- CORRECCIÓN URGENTE: RLS Simple Sin Dependencias Circulares
-- ============================================================================
-- PROBLEMA: Errores 500 en login debido a dependencias circulares en RLS
-- SOLUCIÓN: Políticas SIMPLES que NO consultan public.users dentro de sí mismas
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
-- PASO 2: Política SELECT - Leer tu propio perfil (SIMPLE)
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
-- PASO 3: Política SELECT - Ver usuarios de tu compañía (SIN DEPENDENCIAS CIRCULARES)
-- ============================================================================
-- IMPORTANTE: Esta política NO puede consultar public.users dentro de sí misma
-- Solución: Usar función SECURITY DEFINER que bypass RLS
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
-- La función SECURITY DEFINER bypass RLS, así que no hay dependencia circular
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

