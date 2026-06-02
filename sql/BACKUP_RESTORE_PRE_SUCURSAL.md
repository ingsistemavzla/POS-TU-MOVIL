# Backup y restore — antes de crear sucursal

Proyecto Supabase producción: `swsqmsbyikznalrvydny`  
Fecha de referencia: 2026-05-22

---

## 1. Backup del código (Git)

### Rama creada

| Rama | Propósito |
|------|-----------|
| `backup-pre-sucursal` | Snapshot del código **antes** de aplicar migración / crear tienda |
| `main` | Rama de trabajo y deploy (Render) |
| `backup` (antigua) | Rama vieja en commit `6077514` — **no** refleja el estado actual |

### Comandos útiles

```powershell
# Ver el snapshot de backup
git checkout backup-pre-sucursal

# Volver a trabajar en main
git checkout main

# Restaurar un archivo desde el backup sin cambiar de rama
git checkout backup-pre-sucursal -- ruta/al/archivo

# Restaurar todo el repo al estado del backup (destructivo en working tree)
git checkout backup-pre-sucursal
git checkout -B main-restaurado
```

### Push al remoto (recomendado)

```powershell
git push -u origin backup-pre-sucursal
```

---

## 2. Backup de la base de datos (Supabase)

### Opción A — Dashboard (si plan Pro)

1. [Supabase Dashboard](https://supabase.com/dashboard/project/swsqmsbyikznalrvydny) → **Database** → **Backups**
2. Confirmar que existe backup reciente o usar **Download backup**
3. En Pro también está **Point-in-time recovery (PITR)** — anotar la hora exacta antes del cambio

### Opción B — `pg_dump` manual (funciona en cualquier plan)

1. Dashboard → **Project Settings** → **Database**
2. Copiar **Connection string** (URI) con contraseña de `postgres`
3. Usar **Session mode** o conexión directa (puerto `5432`), no solo pooler de lectura

```powershell
# Instalar cliente PostgreSQL si no lo tienes (incluye pg_dump)
# Windows: https://www.postgresql.org/download/windows/

$env:DATABASE_URL = "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.swsqmsbyikznalrvydny.supabase.co:5432/postgres"

$fecha = Get-Date -Format "yyyyMMdd_HHmm"
pg_dump $env:DATABASE_URL `
  --format=custom `
  --no-owner `
  --no-acl `
  --file "backups\backup_pre_sucursal_$fecha.dump"

# Alternativa legible (SQL plano, archivos más grandes)
pg_dump $env:DATABASE_URL `
  --format=plain `
  --no-owner `
  --no-acl `
  --file "backups\backup_pre_sucursal_$fecha.sql"
```

**Importante:** guardar el `.dump` o `.sql` **fuera** del repo (no commitear contraseñas ni dumps).

### Opción C — Supabase CLI

```powershell
npx supabase login
npx supabase link --project-ref swsqmsbyikznalrvydny
npx supabase db dump -f backups\backup_pre_sucursal.sql
```

---

## 3. Snapshot lógico (verificación rápida, no sustituye pg_dump)

Ejecutar en **SQL Editor** y guardar resultados en un archivo de texto:

```sql
-- Conteos de referencia
SELECT 'stores' AS tabla, count(*) FROM stores
UNION ALL SELECT 'products', count(*) FROM products WHERE deleted_at IS NULL
UNION ALL SELECT 'inventories', count(*) FROM inventories
UNION ALL SELECT 'sales', count(*) FROM sales;

-- Tiendas actuales
SELECT id, name, active, created_at FROM stores ORDER BY created_at;

-- Inventario por tienda (debe ser uniforme entre tiendas activas)
SELECT s.name, count(i.id) AS filas_inventario
FROM stores s
LEFT JOIN inventories i ON i.store_id = s.id
WHERE s.active = true
GROUP BY s.id, s.name
ORDER BY s.name;
```

Guardar como `backups/snapshot_pre_sucursal_YYYYMMDD.txt`.

---

## 4. Protocolo de restore

### Cuándo usar restore completo

- La migración o `create_store_system` dejó datos inconsistentes
- Conteos de inventario no cuadran y no hay fix seguro
- Se borró/modificó data crítica por error

### Restore con `pg_restore` (formato custom `.dump`)

```powershell
# PELIGRO: sobrescribe datos. Hacer solo en ventana de mantenimiento.

$env:DATABASE_URL = "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.swsqmsbyikznalrvydny.supabase.co:5432/postgres"

pg_restore `
  --clean `
  --if-exists `
  --no-owner `
  --no-acl `
  -d $env:DATABASE_URL `
  backups\backup_pre_sucursal_YYYYMMDD_HHMM.dump
```

### Restore con SQL plano

```powershell
psql $env:DATABASE_URL -f backups\backup_pre_sucursal_YYYYMMDD.sql
```

### Restore vía Dashboard (Pro)

1. **Database** → **Backups** → elegir backup anterior al cambio
2. Restaurar o usar PITR a timestamp **5–10 min antes** de la operación

### Restore solo de código

```powershell
git checkout backup-pre-sucursal
# o revertir commits específicos en main
git revert <commit-hash>
```

---

## 5. Checklist antes de crear la sucursal

- [ ] Rama `backup-pre-sucursal` pusheada a origin
- [ ] `pg_dump` o backup Dashboard completado y archivo guardado en lugar seguro
- [ ] Snapshot SQL (conteos + tiendas) guardado
- [ ] Hora anotada: `____:____` (Venezuela / UTC)
- [ ] Frontend en mantenimiento o sin usuarios creando ventas (opcional pero recomendado)
- [ ] Contraseña DB y service_role disponibles solo para quien ejecuta

---

## 6. Checklist después de crear la sucursal

```sql
-- Debe devolver status OK
SELECT * FROM validate_store_inventory('<NUEVO_STORE_ID>');

-- Repetir conteos del snapshot; inventories debe crecer por tienda nueva
SELECT s.name, count(i.id) FROM stores s
LEFT JOIN inventories i ON i.store_id = s.id
GROUP BY s.id, s.name;
```

Si `validate_store_inventory` ≠ OK: **no** usar la tienda en POS; evaluar `active = false` en la tienda nueva y restore si hace falta.

---

## 7. Orden de operación acordado

1. Backups (este documento) ✓
2. Aplicar `supabase/migrations/20260522100000_create_store_v1_system.sql` en SQL Editor
3. Ejecutar `create_store_system` (script o RPC)
4. Validar `validate_store_inventory`
5. Snapshot post-cambio y comparar con pre-cambio
