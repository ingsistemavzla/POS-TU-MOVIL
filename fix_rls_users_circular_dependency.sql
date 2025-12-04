-- ============================================================================
-- CORRECCIÓN CRÍTICA: Eliminar Dependencia Circular en RLS de public.users
-- Fecha: 2025-01-27
-- Objetivo: Simplificar política RLS para permitir lectura propia sin dependencia circular
-- ============================================================================
-- 
-- PROBLEMA IDENTIFICADO:
-- La política actual usa: company_id = public.get_user_company_id() OR auth_user_id = auth.uid()
-- Esto crea una dependencia circular: para leer tu perfil, necesitas conocer tu company_id,
-- pero para conocer tu company_id, necesitas leer tu perfil.
--
-- SOLUCIÓN:
-- Simplificar la política para que SOLO permita lectura propia (auth_user_id = auth.uid())
-- Esto elimina la dependencia circular y permite que nuevos usuarios lean su perfil inmediatamente.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Eliminar TODAS las políticas SELECT existentes en public.users
-- ============================================================================
-- Esto asegura que no haya políticas duplicadas o conflictivas
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
        RAISE NOTICE '✅ Política eliminada: %', policy_record.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- PASO 2: Crear política simplificada y atómicamente segura
-- ============================================================================
-- Esta política SOLO permite que un usuario lea su propia fila
-- No requiere conocer company_id, eliminando la dependencia circular
CREATE POLICY "users_select_policy_self_only" ON public.users
  FOR SELECT USING (
    auth_user_id = auth.uid()
  );

-- ============================================================================
-- PASO 3: Verificar que la política se creó correctamente
-- ============================================================================
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'users'
          AND cmd = 'SELECT'
          AND policyname = 'users_select_policy_self_only'
    ) INTO policy_exists;

    IF policy_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ ✅ ✅ POLÍTICA RLS CREADA EXITOSAMENTE ✅ ✅ ✅';
        RAISE NOTICE '';
        RAISE NOTICE '📋 DETALLES DE LA POLÍTICA:';
        RAISE NOTICE '   Nombre: users_select_policy_self_only';
        RAISE NOTICE '   Tabla: public.users';
        RAISE NOTICE '   Operación: SELECT';
        RAISE NOTICE '   Expresión: auth_user_id = auth.uid()';
        RAISE NOTICE '';
        RAISE NOTICE '🔒 SEGURIDAD:';
        RAISE NOTICE '   ✅ Solo permite lectura propia (auth_user_id = auth.uid())';
        RAISE NOTICE '   ✅ Elimina dependencia circular con get_user_company_id()';
        RAISE NOTICE '   ✅ Permite que nuevos usuarios lean su perfil inmediatamente';
        RAISE NOTICE '';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo crear la política RLS';
    END IF;
END $$;

-- ============================================================================
-- PASO 4: Verificar que no hay políticas duplicadas
-- ============================================================================
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'SELECT';

    IF policy_count = 1 THEN
        RAISE NOTICE '✅ Verificación exitosa: Solo existe 1 política SELECT en public.users';
    ELSE
        RAISE WARNING '⚠️ Advertencia: Se encontraron % políticas SELECT en public.users', policy_count;
        RAISE WARNING '   Esto puede causar conflictos. Revisar manualmente.';
    END IF;
END $$;

-- ============================================================================
-- PASO 5: Nota sobre otras políticas (INSERT, UPDATE, DELETE)
-- ============================================================================
-- Las políticas INSERT, UPDATE, DELETE NO se modifican en este script
-- porque no afectan la lectura inicial del perfil durante el login
-- 
-- Si necesitas que usuarios de la misma compañía se vean entre sí,
-- puedes crear una política adicional DESPUÉS de que el usuario haya leído su perfil:
--
-- CREATE POLICY "users_select_policy_same_company" ON public.users
--   FOR SELECT USING (
--     company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
--   );
--
-- NOTA: Esta política adicional requiere que el usuario ya haya leído su perfil,
-- por lo que debe ser una política SECUNDARIA, no la principal.
-- ============================================================================

COMMIT;

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
-- ✅ Todas las políticas SELECT duplicadas eliminadas
-- ✅ Nueva política simplificada creada: users_select_policy_self_only
-- ✅ Dependencia circular eliminada
-- ✅ Nuevos usuarios pueden leer su perfil inmediatamente después del login
-- ============================================================================

