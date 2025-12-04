-- ============================================================================
-- CORRECCIÓN DEFINITIVA: RLS Ultra-Simple Sin Ninguna Consulta
-- ============================================================================
-- PROBLEMA: Errores 403 (Forbidden) - RLS bloquea acceso incluso con políticas simples
-- SOLUCIÓN: Política ABSOLUTAMENTE simple que NO consulta nada
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Eliminar TODAS las políticas existentes (SELECT, INSERT, UPDATE, DELETE)
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
        RAISE NOTICE '✅ Política eliminada: %', policy_record.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- PASO 2: Política SELECT - SOLO lectura propia (SIN NINGUNA CONSULTA)
-- ============================================================================
-- Esta es la política MÁS SIMPLE posible
-- Solo verifica auth_user_id = auth.uid() sin ninguna consulta adicional
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- ============================================================================
-- PASO 3: Política SELECT - Ver usuarios de tu compañía
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
    company_id IS NOT NULL
    AND company_id = public.get_user_company_id_safe()
  );

-- ============================================================================
-- PASO 4: Políticas para INSERT, UPDATE, DELETE (Básicas)
-- ============================================================================

-- INSERT: Permitir crear tu propio perfil o admin crear usuarios
CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid()
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'master_admin')
      )
      AND company_id = public.get_user_company_id_safe()
    )
  );

-- UPDATE: Permitir actualizar tu propio perfil o admin actualizar usuarios de su compañía
CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (
    auth_user_id = auth.uid()
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'master_admin')
      )
      AND company_id = public.get_user_company_id_safe()
    )
  );

-- DELETE: Solo admins pueden eliminar usuarios de su compañía
CREATE POLICY "users_delete" ON public.users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'master_admin')
    )
    AND company_id = public.get_user_company_id_safe()
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
ORDER BY cmd, policyname;


