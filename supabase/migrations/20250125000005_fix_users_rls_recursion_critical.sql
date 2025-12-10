-- ============================================================================
-- MIGRACIÓN CRÍTICA: Corregir recursión infinita en RLS de users
-- ============================================================================
-- Fecha: 2025-01-25
-- Descripción: Elimina TODAS las políticas de users y las recrea con funciones
--              SECURITY DEFINER para evitar recursión infinita
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar TODAS las políticas existentes de users
-- ============================================================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas de SELECT, INSERT, UPDATE, DELETE
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' 
        AND schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users CASCADE';
        RAISE NOTICE 'Eliminada política: %', r.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- PASO 2: Crear funciones SECURITY DEFINER (bypass RLS)
-- ============================================================================

-- Función para obtener el rol del usuario actual (bypass RLS)
CREATE OR REPLACE FUNCTION public.check_user_role_safe()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- SECURITY DEFINER permite bypass RLS
  SELECT role INTO v_role
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(v_role, '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN '';
END;
$$;

-- Función para obtener company_id del usuario actual (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_user_company_id_safe()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- SECURITY DEFINER permite bypass RLS
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN v_company_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- ============================================================================
-- PASO 3: Crear políticas RLS seguras (sin recursión)
-- ============================================================================

-- Política SELECT: Permite ver propio perfil, master_admin ve todos, usuarios ven su company
CREATE POLICY "users_select_safe" ON public.users
  FOR SELECT
  USING (
    -- Condición 1: Usuario puede ver su propio perfil (sin recursión)
    auth_user_id = auth.uid()
    -- Condición 2: Master admin puede ver todos (función SECURITY DEFINER bypass RLS)
    OR public.check_user_role_safe() = 'master_admin'
    -- Condición 3: Usuarios pueden ver otros usuarios de su company (función SECURITY DEFINER bypass RLS)
    OR company_id = public.get_user_company_id_safe()
  );

-- Política INSERT: Permite crear propio perfil o admins crear en su company
CREATE POLICY "users_insert_safe" ON public.users
  FOR INSERT
  WITH CHECK (
    auth_user_id = auth.uid()
    OR (
      company_id = public.get_user_company_id_safe() 
      AND public.check_user_role_safe() IN ('admin', 'master_admin')
    )
  );

-- Política UPDATE: Permite actualizar propio perfil o admins actualizar en su company
CREATE POLICY "users_update_safe" ON public.users
  FOR UPDATE
  USING (
    auth_user_id = auth.uid()
    OR (
      company_id = public.get_user_company_id_safe() 
      AND public.check_user_role_safe() IN ('admin', 'master_admin')
    )
  );

-- Política DELETE: Solo admins pueden eliminar usuarios de su company
CREATE POLICY "users_delete_safe" ON public.users
  FOR DELETE
  USING (
    company_id = public.get_user_company_id_safe() 
    AND public.check_user_role_safe() IN ('admin', 'master_admin')
  );

-- ============================================================================
-- PASO 4: Verificación y logging
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Contar políticas creadas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'users'
  AND schemaname = 'public';
  
  -- Contar funciones creadas
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('check_user_role_safe', 'get_user_company_id_safe')
  AND pronamespace = 'public'::regnamespace;
  
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '   - Políticas RLS creadas: %', policy_count;
  RAISE NOTICE '   - Funciones SECURITY DEFINER creadas: %', function_count;
  RAISE NOTICE '   - RLS habilitado: %', (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users');
END $$;

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================
COMMENT ON FUNCTION public.check_user_role_safe() IS 
'Función SECURITY DEFINER que obtiene el rol del usuario actual sin pasar por RLS. Usada en políticas RLS para evitar recursión infinita.';

COMMENT ON FUNCTION public.get_user_company_id_safe() IS 
'Función SECURITY DEFINER que obtiene el company_id del usuario actual sin pasar por RLS. Usada en políticas RLS para evitar recursión infinita.';

COMMENT ON POLICY "users_select_safe" ON public.users IS 
'Política SELECT segura: permite ver propio perfil, master_admin ve todos, usuarios ven su company. Usa funciones SECURITY DEFINER para evitar recursión.';


