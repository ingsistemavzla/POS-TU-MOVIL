-- ============================================================================
-- CORRECCIÓN CRÍTICA: RLS para Permitir Registro y Login
-- ============================================================================
-- PROBLEMA: Las políticas RLS están bloqueando el acceso a public.users
--           causando errores "Database error finding user" y "Database error querying schema"
-- SOLUCIÓN: Crear políticas que permitan:
--           1. Leer tu propio perfil (por auth_user_id o por email durante registro)
--           2. Insertar tu perfil durante registro
--           3. Actualizar tu auth_user_id para vincular
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
        SELECT policyname, cmd
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.users';
        RAISE NOTICE '✅ Política eliminada: % (%)', policy_record.policyname, policy_record.cmd;
    END LOOP;
    
    RAISE NOTICE '✅ Todas las políticas eliminadas';
END $$;

-- ============================================================================
-- PASO 2: Crear política SELECT que permita lectura propia y por email
-- ============================================================================
-- Permite:
-- 1. Leer tu propio perfil por auth_user_id (usuario ya vinculado)
-- 2. Leer tu perfil por email si auth_user_id es NULL (usuario creado por admin)
-- 3. Leer perfiles de tu misma compañía (para admins y navegación)
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (
    -- Caso 1: Leer tu propio perfil por auth_user_id
    auth_user_id = auth.uid()
    OR
    -- Caso 2: Leer tu perfil por email si auth_user_id es NULL (usuario creado por admin)
    (
      auth_user_id IS NULL 
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    )
    OR
    -- Caso 3: Leer perfiles de tu misma compañía (para admins y navegación)
    (
      company_id IS NOT NULL
      AND company_id = (
        SELECT company_id 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1
      )
    )
  );

-- ============================================================================
-- PASO 3: Crear política INSERT para registro
-- ============================================================================
-- Permite:
-- 1. Crear tu propio perfil durante registro (auth_user_id = auth.uid())
-- 2. Admins pueden crear usuarios en su compañía
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
    -- Caso 2: Admin creando usuario en su compañía
    (
      company_id = (
        SELECT company_id 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1
      )
      AND EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role = 'admin'
        LIMIT 1
      )
    )
  );

-- ============================================================================
-- PASO 4: Crear política UPDATE para vincular auth_user_id
-- ============================================================================
-- Permite:
-- 1. Actualizar tu propio perfil (especialmente auth_user_id para vincular)
-- 2. Admins pueden actualizar usuarios de su compañía
CREATE POLICY "users_update_policy" ON public.users
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
    -- Caso 2: Actualizar perfil por email si auth_user_id es NULL (vinculación)
    (
      auth_user_id IS NULL
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    )
    OR
    -- Caso 3: Admin actualizando usuarios de su compañía
    (
      company_id = (
        SELECT company_id 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1
      )
      AND EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role = 'admin'
        LIMIT 1
      )
    )
  );

-- ============================================================================
-- PASO 5: Crear política DELETE (solo admins)
-- ============================================================================
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE USING (
    company_id = (
      SELECT company_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
      LIMIT 1
    )
    AND EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      LIMIT 1
    )
  );

-- ============================================================================
-- PASO 6: Verificación
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
    RAISE NOTICE '   ✅ Usuarios pueden leer su propio perfil (por auth_user_id o email)';
    RAISE NOTICE '   ✅ Usuarios pueden crear su perfil durante registro';
    RAISE NOTICE '   ✅ Usuarios pueden vincular auth_user_id (UPDATE)';
    RAISE NOTICE '   ✅ Usuarios pueden leer perfiles de su compañía';
    RAISE NOTICE '   ✅ Admins pueden gestionar usuarios de su compañía';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- RESUMEN
-- ============================================================================
-- ✅ Políticas RLS corregidas para permitir registro y login
-- ✅ Usuarios pueden leer su perfil por auth_user_id o email
-- ✅ Usuarios pueden crear su perfil durante registro
-- ✅ Usuarios pueden vincular auth_user_id automáticamente
-- ✅ Admins pueden gestionar usuarios de su compañía
-- ============================================================================

