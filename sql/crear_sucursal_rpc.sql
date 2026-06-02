-- ============================================================================
-- PASO 1: Aplicar migración (una sola vez)
-- Ejecutar el contenido de:
--   supabase/migrations/20260522100000_create_store_v1_system.sql
-- ============================================================================

-- ============================================================================
-- PASO 2: Crear sucursal (editar valores entre comillas)
-- Requiere: trigger on_store_created = true
-- ============================================================================

SELECT public.create_store_system(
  p_company_id     := 'REEMPLAZAR_UUID_EMPRESA'::uuid,
  p_name           := 'Nombre de la nueva sucursal',
  p_address        := 'Dirección opcional',
  p_phone          := NULL,
  p_business_name  := NULL,
  p_tax_id         := NULL,
  p_fiscal_address := NULL,
  p_phone_fiscal   := NULL,
  p_email_fiscal   := NULL,
  p_active         := true
);

-- ============================================================================
-- PASO 3 (opcional): Validar sucursal existente por ID
-- ============================================================================
-- SELECT public.validate_store_inventory('REEMPLAZAR_UUID_SUCURSAL'::uuid);
