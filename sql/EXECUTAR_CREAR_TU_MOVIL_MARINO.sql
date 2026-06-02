-- =============================================================================
-- CREAR SUCURSAL: Tu Móvil Marino
-- Ejecutar en Supabase SQL Editor (producción)
-- company_id: aa11bb22-cc33-dd44-ee55-ff6677889900
--
-- ORDEN:
--   1) Si es la primera vez: ejecutar TODO el bloque PASO 1 (migración)
--   2) Ejecutar PASO 2 (crear tienda)
--   3) Ejecutar PASO 3 (validación y snapshot)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 0 — ¿Ya existe la migración? (opcional)
-- Si devuelve true, puedes saltar el PASO 1.
-- -----------------------------------------------------------------------------
SELECT EXISTS (
  SELECT 1 FROM pg_proc
  WHERE proname = 'create_store_system'
    AND pronamespace = 'public'::regnamespace
) AS migracion_ya_aplicada;

-- -----------------------------------------------------------------------------
-- PASO 1 — Migración (solo UNA vez; pegar archivo completo si hace falta)
-- Archivo: sql/20260522100000_create_store_v1_system.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- PASO 2 — Crear sucursal
-- -----------------------------------------------------------------------------
SELECT public.create_store_system(
  p_company_id     := 'aa11bb22-cc33-dd44-ee55-ff6677889900'::uuid,
  p_name           := 'Tu Móvil Marino',
  p_address        := NULL,
  p_phone          := NULL,
  p_business_name  := 'zona gamer margarita c.a',
  p_tax_id         := 'J-50283376-6',
  p_fiscal_address := NULL,
  p_phone_fiscal   := NULL,
  p_email_fiscal   := NULL,
  p_active         := true
) AS resultado;

-- -----------------------------------------------------------------------------
-- PASO 3 — Validación
-- -----------------------------------------------------------------------------
SELECT id, name, business_name, tax_id, active, created_at
FROM stores
WHERE name = 'Tu Móvil Marino'
ORDER BY created_at DESC
LIMIT 1;

-- SELECT public.validate_store_inventory('PEGAR_UUID_AQUI'::uuid);

SELECT s.name, count(i.id) AS filas_inventario
FROM stores s
LEFT JOIN inventories i ON i.store_id = s.id
WHERE s.active = true
GROUP BY s.id, s.name
ORDER BY s.name;
