-- ============================================================================
-- FIX RLS: web_product_metadata + admin_activity_log
-- ============================================================================
-- Fecha: 2026-07-18
-- Alerta Supabase: rls_disabled_in_public (Critical)
--
-- Contexto:
--   Estas 2 tablas estaban en public SIN ENABLE ROW LEVEL SECURITY.
--   web_product_metadata: el script original creó POLICIES pero olvidó
--     ALTER TABLE ... ENABLE ROW LEVEL SECURITY (sin eso las policies no aplican).
--   admin_activity_log: log interno; el frontend no lo consulta directo.
--
-- Cómo aplicar (Supabase → SQL Editor):
--   1) Ejecutar sección A (diagnóstico).
--   2) Ejecutar sección B (fix).
--   3) Ejecutar sección C (verificar).
--   4) Probar Gestión Web + catálogo público.
--
-- Seguro: no toca sales/inventories/products. Catálogo web usa RPC SECURITY DEFINER.
-- ============================================================================

-- ============================================================================
-- A) DIAGNÓSTICO
-- ============================================================================
SELECT c.relname AS tabla, c.relrowsecurity AS rls_activo
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('web_product_metadata', 'admin_activity_log')
ORDER BY 1;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('web_product_metadata', 'admin_activity_log')
ORDER BY 1, 2;


-- ============================================================================
-- B) FIX
-- ============================================================================

-- B1) web_product_metadata — activar RLS
ALTER TABLE public.web_product_metadata ENABLE ROW LEVEL SECURITY;

-- Policies (idempotente: drop + create por si el script original no llegó a crearlas)
DROP POLICY IF EXISTS "web_product_metadata_select_policy" ON public.web_product_metadata;
CREATE POLICY "web_product_metadata_select_policy" ON public.web_product_metadata
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = web_product_metadata.product_id
        AND p.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "web_product_metadata_insert_policy" ON public.web_product_metadata;
CREATE POLICY "web_product_metadata_insert_policy" ON public.web_product_metadata
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = web_product_metadata.product_id
        AND p.company_id = public.get_user_company_id()
        AND public.is_admin()
    )
  );

DROP POLICY IF EXISTS "web_product_metadata_update_policy" ON public.web_product_metadata;
CREATE POLICY "web_product_metadata_update_policy" ON public.web_product_metadata
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = web_product_metadata.product_id
        AND p.company_id = public.get_user_company_id()
        AND public.is_admin()
    )
  );

DROP POLICY IF EXISTS "web_product_metadata_delete_policy" ON public.web_product_metadata;
CREATE POLICY "web_product_metadata_delete_policy" ON public.web_product_metadata
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = web_product_metadata.product_id
        AND p.company_id = public.get_user_company_id()
        AND public.is_admin()
    )
  );

-- B2) admin_activity_log — activar RLS (API deny-all salvo SELECT admin)
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_activity_log_select_admin ON public.admin_activity_log;
CREATE POLICY admin_activity_log_select_admin
  ON public.admin_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'master_admin')
        AND (
          admin_activity_log.user_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.users u2
            WHERE u2.id = admin_activity_log.user_id
              AND (u.company_id = u2.company_id OR u.role = 'master_admin')
          )
        )
    )
  );

-- Sin policies INSERT/UPDATE/DELETE → la API del cliente no escribe.
-- Los RPC SECURITY DEFINER (p.ej. borrado de usuarios) siguen pudiendo actualizar.


-- ============================================================================
-- C) VERIFICACIÓN
-- ============================================================================
SELECT c.relname AS tabla, c.relrowsecurity AS rls_activo
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('web_product_metadata', 'admin_activity_log')
ORDER BY 1;
-- Esperado: rls_activo = true en ambas

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('web_product_metadata', 'admin_activity_log')
ORDER BY 1, 2;

-- Si admin_activity_log falla por columna distinta a user_id:
--   1) Comenta el bloque CREATE POLICY admin_activity_log_select_admin
--   2) Deja solo: ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
--   (sin policies = nadie accede por API; igualmente cierra el aviso crítico)
