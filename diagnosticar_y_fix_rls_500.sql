-- ============================================================================
-- DIAGNÓSTICO Y CORRECCIÓN: Errores 500 en public.users
-- ============================================================================
-- Este script diagnostica y corrige los errores 500
-- ============================================================================

-- ============================================================================
-- PASO 1: DIAGNÓSTICO - Verificar triggers
-- ============================================================================
SELECT 
  '🔍 DIAGNÓSTICO: Triggers en public.users' AS "Tipo",
  trigger_name AS "Nombre Trigger",
  event_manipulation AS "Evento",
  action_timing AS "Timing",
  action_statement AS "Función"
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'users';

-- ============================================================================
-- PASO 2: DIAGNÓSTICO - Verificar políticas actuales
-- ============================================================================
SELECT 
  '🔍 DIAGNÓSTICO: Políticas RLS actuales' AS "Tipo",
  policyname AS "Nombre",
  cmd AS "Operación",
  CASE 
    WHEN qual LIKE '%get_user_company_id%' THEN '⚠️ Usa get_user_company_id (puede causar circular)'
    WHEN qual LIKE '%SELECT%FROM public.users%' THEN '⚠️ Consulta public.users dentro de política (circular)'
    WHEN qual LIKE '%auth_user_id = auth.uid()%' THEN '✅ Simple (sin dependencias)'
    ELSE '❓ Otra condición'
  END AS "Tipo de Condición"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY cmd, policyname;

-- ============================================================================
-- PASO 3: CORRECCIÓN - Eliminar TODAS las políticas
-- ============================================================================
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🔄 Eliminando TODAS las políticas existentes...';
    
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.users';
    END LOOP;
    
    RAISE NOTICE '✅ Políticas eliminadas';
END $$;

-- ============================================================================
-- PASO 4: CORRECCIÓN - Crear política SELECT ABSOLUTAMENTE MÍNIMA
-- ============================================================================
-- SOLO lectura propia - sin ninguna consulta adicional
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- ============================================================================
-- PASO 5: CORRECCIÓN - Crear política INSERT MÍNIMA
-- ============================================================================
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- ============================================================================
-- PASO 6: CORRECCIÓN - Crear política UPDATE MÍNIMA
-- ============================================================================
-- Permite actualizar tu propio perfil (para vincular auth_user_id)
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (
    auth_user_id = auth.uid()
    OR
    (
      auth_user_id IS NULL
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    )
  );

-- ============================================================================
-- PASO 7: VERIFICACIÓN
-- ============================================================================
SELECT 
  '✅ VERIFICACIÓN' AS "Estado",
  COUNT(*) AS "Políticas Creadas",
  'Debe ser 3 (SELECT, INSERT, UPDATE)' AS "Esperado"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users';

-- ============================================================================
-- NOTA IMPORTANTE
-- ============================================================================
-- Esta configuración MÍNIMA permite:
-- ✅ Usuarios pueden leer su propio perfil
-- ✅ Usuarios pueden crear su perfil durante registro
-- ✅ Usuarios pueden vincular auth_user_id
--
-- ⚠️  NO permite:
-- ❌ Admins ver usuarios de su compañía (usar RPCs con SECURITY DEFINER)
-- ❌ Eliminar usuarios desde frontend (usar RPCs con SECURITY DEFINER)
--
-- Después de verificar que funciona, podemos agregar políticas adicionales
-- de forma incremental.
-- ============================================================================


