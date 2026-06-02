# Índice SQL — Operación sucursal Tu Móvil Marino

**Producción:** `swsqmsbyikznalrvydny`  
**Fecha:** 2026-06-01 / 2026-06-02  

---

## A. Diagnóstico previo (solo lectura)

| Orden | Archivo / consulta | Ejecutado | Resultado |
|-------|-------------------|-----------|-----------|
| A1 | `sql/snapshot_pre_sucursal.sql` | Sí | 4×712 filas, 0 huecos implícito |
| A2 | `sql/reporte_situacion_pre_sucursal_unificado.sql` | Sí | GO, huecos=0, duplicados=0 |
| A3 | `SELECT EXISTS (... 'create_store_system')` | Sí | `false` → aplicar migración |

---

## B. Migración (una sola vez en producción)

| Archivo | Líneas | Resultado |
|---------|--------|-----------|
| `sql/20260522100000_create_store_v1_system.sql` | 234 | **Success. No rows returned** |
| Copia en migraciones | `supabase/migrations/20260522100000_create_store_v1_system.sql` | Mismo contenido |

**Objetos creados:**

- `public.validate_store_inventory(uuid)`
- `public.create_store_v1(...)` — para admin autenticado (no usado en esta operación)
- `public.create_store_system(...)` — usado en SQL Editor (postgres / service)

**Re-verificación:**

```sql
SELECT EXISTS (
  SELECT 1 FROM pg_proc
  WHERE proname = 'create_store_system'
    AND pronamespace = 'public'::regnamespace
) AS migracion_ya_aplicada;
-- Resultado: true
```

**Trigger verificado:**

```sql
SELECT t.tgname FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'stores' AND NOT t.tgisinternal;
-- Resultado: on_store_created
```

---

## C. Creación sucursal (ejecutado en producción)

**Archivo plantilla:** `sql/EXECUTAR_CREAR_TU_MOVIL_MARINO.sql`

```sql
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
```

**Respuesta (resumen):**

- `success`: true
- `store.id`: `73aae6d8-a396-4443-9c24-c7b03c84d11b`
- `validation.status`: **OK**
- `validation.active_products`: **659**
- `validation.inventory_rows`: **659**

---

## D. Validación post-creación (ejecutado)

```sql
-- 5 tiendas
SELECT id, name, business_name, tax_id, active
FROM stores WHERE active = true ORDER BY name;

-- Filas inventario
SELECT s.name, count(i.id) AS filas_inventario
FROM stores s
LEFT JOIN inventories i ON i.store_id = s.id
WHERE s.active = true
GROUP BY s.id, s.name ORDER BY s.name;

-- Validación explícita
SELECT public.validate_store_inventory('73aae6d8-a396-4443-9c24-c7b03c84d11b'::uuid);
```

**Resultado filas:** Centro 712, La Isla 712, Store 712, Zona Gamer 712, **Marino 659**.

---

## E. Prueba end-to-end (aplicación + RPC existentes)

| Paso | Acción | SQL / sistema | Notas |
|------|--------|---------------|-------|
| E1 | Crear producto | RPC `create_product_v3` (UI Almacén) | SKU `PRU-MARINO-001`, 1 uds Marino |
| E2 | Venta | RPC `process_sale` (POS) | Factura `FAC-20260602-04089` |
| E3 | Anular venta | RPC `delete_sale_and_restore_inventory` (UI Ventas) | Stock repuesto |
| E4 | Desactivar producto | RPC `delete_product` (UI Almacén) | Soft delete |

**No se ejecutó SQL adicional** en fases E1–E4 salvo operación normal de la app.

---

## F. Backup BD (local, no en SQL Editor producción)

| Script | Archivo generado |
|--------|------------------|
| `scripts/backup-db.ps1` | `backups/backup_pre_sucursal_20260601_2059.sql` |

Conexión: `aws-1-us-east-1.pooler.supabase.com:5432`, usuario `postgres.swsqmsbyikznalrvydny`, esquema `-n public`.

---

## G. SQL NO ejecutado en esta operación

| Archivo | Motivo |
|---------|--------|
| `sql/crear_sucursal_rpc.sql` | Plantilla; se usó bloque equivalente en EXECUTAR |
| `create_store_v1` | Alternativa con auth; no necesaria |
| Restore / `psql` restore | No hubo incidente |

---

## H. Cómo re-ejecutar verificación hoy

```sql
-- Una sola tabla
\i reporte no aplica en Editor -- copiar contenido de:
-- sql/reporte_situacion_pre_sucursal_unificado.sql

SELECT public.validate_store_inventory('73aae6d8-a396-4443-9c24-c7b03c84d11b'::uuid);
```

Comparar con `docs/operaciones/ACTA_COMPLETA_SUCURSAL_TU_MOVIL_MARINO.md`.
