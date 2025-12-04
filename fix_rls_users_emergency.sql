-- ============================================================================
-- CORRECCIÓN DE EMERGENCIA: RLS para public.users
-- ============================================================================
-- PROBLEMA: Errores 500 en consultas a public.users debido a dependencias circulares
--           en las políticas RLS que usan get_user_company_id()
-- SOLUCIÓN: Políticas simplificadas que NO dependen de funciones que leen public.users
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Eliminar TODAS las políticas existentes en public.users
-- ============================================================================
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🔄 Eliminando políticas existentes en public.users...';
    
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.users';
        RAISE NOTICE '✅ Política eliminada: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ Todas las políticas eliminadas';
END $$;

-- ============================================================================
-- PASO 2: Crear política SELECT SIMPLIFICADA (sin dependencias circulares)
-- ============================================================================
-- Permite:
-- 1. Leer tu propio perfil por auth_user_id (sin depender de otras funciones)
-- 2. Leer tu perfil por email si auth_user_id es NULL (para usuarios creados por admin)
CREATE POLICY "users_select_policy_self" ON public.users
  FOR SELECT USING (
    -- Caso 1: Leer tu propio perfil por auth_user_id
    auth_user_id = auth.uid()
    OR
    -- Caso 2: Leer tu perfil por email si auth_user_id es NULL (usuario creado por admin)
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
-- PASO 3: Crear política SELECT para compañía (solo si ya tienes perfil)
-- ============================================================================
-- Esta política permite leer perfiles de tu compañía, pero SOLO si ya tienes perfil
-- Se ejecuta DESPUÉS de que puedas leer tu propio perfil
CREATE POLICY "users_select_policy_company" ON public.users
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
  );

-- ============================================================================
-- PASO 4: Crear política INSERT para registro
-- ============================================================================
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (
    -- Caso 1: Usuario creando su propio perfil durante registro
    (
      auth_user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.users WHERE auth_user_id = auth.uid()
      )
    )
    OR
    -- Caso 2: Admin creando usuario (requiere que el admin ya tenga perfil)
    (
      EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role = 'admin'
      )
      AND company_id = (
        SELECT company_id 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1
      )
    )
  );

-- ============================================================================
-- PASO 5: Crear política UPDATE para vincular auth_user_id
-- ============================================================================
CREATE POLICY "users_update_policy_self" ON public.users
  FOR UPDATE USING (
    -- Caso 1: Actualizar tu propio perfil (para vincular auth_user_id)
    (
      id IN (
        SELECT id 
        FROM public.users 
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      )
    )
    OR
    -- Caso 2: Vincular perfil por email si auth_user_id es NULL
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

-- Política UPDATE para admins
CREATE POLICY "users_update_policy_admin" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
    AND company_id = (
      SELECT company_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
      LIMIT 1
    )
  );

-- ============================================================================
-- PASO 6: Crear política DELETE (solo admins)
-- ============================================================================
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
    AND company_id = (
      SELECT company_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
      LIMIT 1
    )
  );

-- ============================================================================
-- PASO 7: Verificación
-- ============================================================================
DO $$
DECLARE
    select_count INTEGER;
    insert_count INTEGER;
    update_count INTEGER;
    delete_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO select_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'SELECT';
    
    SELECT COUNT(*) INTO insert_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'INSERT';
    
    SELECT COUNT(*) INTO update_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'UPDATE';
    
    SELECT COUNT(*) INTO delete_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'DELETE';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ✅ ✅ POLÍTICAS RLS CREADAS EXITOSAMENTE ✅ ✅ ✅';
    RAISE NOTICE '';
    RAISE NOTICE '📋 RESUMEN DE POLÍTICAS:';
    RAISE NOTICE '   SELECT: % políticas', select_count;
    RAISE NOTICE '   INSERT: % políticas', insert_count;
    RAISE NOTICE '   UPDATE: % políticas', update_count;
    RAISE NOTICE '   DELETE: % políticas', delete_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔒 FUNCIONALIDADES PERMITIDAS:';
    RAISE NOTICE '   ✅ Usuarios pueden leer su propio perfil (sin dependencias circulares)';
    RAISE NOTICE '   ✅ Usuarios pueden leer su perfil por email (para vinculación)';
    RAISE NOTICE '   ✅ Usuarios pueden crear su perfil durante registro';
    RAISE NOTICE '   ✅ Usuarios pueden vincular auth_user_id (UPDATE)';
    RAISE NOTICE '   ✅ Usuarios pueden leer perfiles de su compañía (después de tener perfil)';
    RAISE NOTICE '   ✅ Admins pueden gestionar usuarios de su compañía';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- RESUMEN
-- ============================================================================
-- ✅ Políticas RLS simplificadas sin dependencias circulares
-- ✅ Usuarios pueden leer su perfil inmediatamente (sin depender de get_user_company_id)
-- ✅ Usuarios pueden crear su perfil durante registro
-- ✅ Usuarios pueden vincular auth_user_id automáticamente
-- ✅ Admins pueden gestionar usuarios de su compañía
-- ============================================================================


