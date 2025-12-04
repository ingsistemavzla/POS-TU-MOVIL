-- ============================================================================
-- CORRECCIÓN MÍNIMA: RLS Ultra-Simplificado para public.users
-- ============================================================================
-- PROBLEMA: Errores 500 persistentes - posiblemente triggers o funciones fallando
-- SOLUCIÓN: Políticas RLS absolutamente mínimas que NO consultan nada
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Deshabilitar RLS temporalmente para diagnóstico
-- ============================================================================
-- ⚠️ SOLO PARA DIAGNÓSTICO - Comentar después de verificar
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 2: Eliminar TODAS las políticas existentes
-- ============================================================================
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🔄 Eliminando TODAS las políticas existentes en public.users...';
    
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
-- PASO 3: Verificar triggers que puedan estar causando problemas
-- ============================================================================
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Verificando triggers en public.users...';
    
    FOR trigger_record IN
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
          AND event_object_table = 'users'
    LOOP
        RAISE NOTICE '⚠️ Trigger encontrado: % (Evento: %, Timing: %)', 
            trigger_record.trigger_name, 
            trigger_record.event_manipulation,
            trigger_record.action_timing;
    END LOOP;
    
    IF NOT FOUND THEN
        RAISE NOTICE '✅ No se encontraron triggers en public.users';
    END IF;
END $$;

-- ============================================================================
-- PASO 4: Crear política SELECT ULTRA-SIMPLIFICADA
-- ============================================================================
-- SOLO permite lectura propia - sin consultas a otras tablas dentro de la política
CREATE POLICY "users_select_self_only" ON public.users
  FOR SELECT USING (
    auth_user_id = auth.uid()
  );

-- ============================================================================
-- PASO 5: Crear política INSERT ULTRA-SIMPLIFICADA
-- ============================================================================
-- Permite crear tu propio perfil durante registro
CREATE POLICY "users_insert_self" ON public.users
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid()
  );

-- ============================================================================
-- PASO 6: Crear política UPDATE ULTRA-SIMPLIFICADA
-- ============================================================================
-- Permite actualizar tu propio perfil (para vincular auth_user_id)
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE USING (
    auth_user_id = auth.uid()
    OR
    (
      auth_user_id IS NULL
      AND email = (
        SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
      )
    )
  );

-- ============================================================================
-- PASO 7: NO crear política DELETE por ahora (solo para simplificar)
-- ============================================================================
-- Los admins pueden usar funciones RPC con SECURITY DEFINER para eliminar

-- ============================================================================
-- PASO 8: Verificación
-- ============================================================================
DO $$
DECLARE
    select_count INTEGER;
    insert_count INTEGER;
    update_count INTEGER;
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
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ✅ ✅ POLÍTICAS RLS MÍNIMAS CREADAS ✅ ✅ ✅';
    RAISE NOTICE '';
    RAISE NOTICE '📋 RESUMEN DE POLÍTICAS:';
    RAISE NOTICE '   SELECT: % políticas', select_count;
    RAISE NOTICE '   INSERT: % políticas', insert_count;
    RAISE NOTICE '   UPDATE: % políticas', update_count;
    RAISE NOTICE '   DELETE: 0 políticas (usar RPCs con SECURITY DEFINER)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 FUNCIONALIDADES PERMITIDAS:';
    RAISE NOTICE '   ✅ Usuarios pueden leer su propio perfil (auth_user_id = auth.uid())';
    RAISE NOTICE '   ✅ Usuarios pueden crear su perfil durante registro';
    RAISE NOTICE '   ✅ Usuarios pueden actualizar su perfil (incluyendo vincular auth_user_id)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NOTA: Esta es una configuración MÍNIMA para resolver errores 500.';
    RAISE NOTICE '   Después de verificar que funciona, podemos agregar políticas adicionales';
    RAISE NOTICE '   para permitir que admins vean usuarios de su compañía.';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- ============================================================================
-- Ejecuta este query después para verificar:
-- SELECT policyname, cmd FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'users' ORDER BY cmd;


