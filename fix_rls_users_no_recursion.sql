-- ============================================================================
-- FIX: Infinite Recursion in RLS Policies on public.users
-- ============================================================================
-- OBJETIVO: Eliminar recursión infinita en políticas RLS que causa error 500
--           durante el login
-- ============================================================================
-- PROBLEMA: Las políticas RLS intentan consultar public.users para verificar
--           permisos, creando un bucle infinito (Stack Depth Exceeded)
-- ============================================================================
-- SOLUCIÓN: Crear políticas simples y NO-RECURSIVAS que solo usan auth.uid()
-- ============================================================================

-- ============================================================================
-- PASO 1: Habilitar RLS en public.users (asegurar que esté activo)
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 2: Eliminar TODAS las políticas existentes en public.users
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Iterar sobre todas las políticas existentes
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.users';
    RAISE NOTICE '✅ Política eliminada: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE '✅ Todas las políticas existentes han sido eliminadas';
END $$;

-- ============================================================================
-- PASO 3: Crear Política 1 - SELECT (Read Own Profile)
-- ============================================================================
-- Permite a un usuario leer su propio perfil
-- NO-RECURSIVA: Solo usa auth.uid() directamente
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- ============================================================================
-- PASO 4: Crear Política 2 - UPDATE (Update Own Profile)
-- ============================================================================
-- Permite a un usuario actualizar su propio perfil
-- NO-RECURSIVA: Solo usa auth.uid() directamente
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- ============================================================================
-- PASO 5: Crear Política 3 - SELECT (Read All - Temporary Fix)
-- ============================================================================
-- Permite a TODOS los usuarios autenticados leer perfiles
-- TEMPORAL: Para prevenir que el sistema de login se rompa
-- RAZÓN: Es mejor tener perfiles visibles que un sistema de login roto
--        Podemos restringir esto más tarde
-- NO-RECURSIVA: Solo usa auth.role() que no consulta public.users
CREATE POLICY "users_select_all_authenticated" ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- PASO 6: Crear Política 4 - INSERT (Self Registration)
-- ============================================================================
-- Permite a un usuario crear su propio perfil durante el registro
-- NO-RECURSIVA: Solo usa auth.uid() directamente
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL' AS "Tipo",
  policyname AS "Policy Name",
  cmd AS "Command",
  qual AS "USING Clause",
  with_check AS "WITH CHECK Clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- Verificar que RLS está habilitado
SELECT 
  '✅ RLS STATUS' AS "Tipo",
  tablename AS "Table",
  rowsecurity AS "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'users';


