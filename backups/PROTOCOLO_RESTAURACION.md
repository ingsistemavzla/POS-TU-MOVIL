# Protocolo de restauración — POS Tu Movil Margarita

**Proyecto Supabase:** `swsqmsbyikznalrvydny`  
**Región:** us-east-1 (East US)  
**Plan Supabase:** Free (sin backups automáticos en Dashboard)  
**Fecha de referencia:** 2026-06-01  
**Operación planificada:** Creación de 5.ª sucursal vía `create_store_system`

Documento compañero de:

- `backups/REPORTE_SITUACION_PRE_SUCURSAL.md`
- `backups/backup_pre_sucursal_20260601_2059.sql`
- Rama Git: `backup-pre-sucursal`

---

## 1. Cuándo usar este protocolo

### Árbol de decisión

```
¿Qué falló?
│
├─ Solo código frontend/deploy (Render)
│   └─► Restaurar Git (sección 3). NO tocar BD.
│
├─ Migración aplicada pero create_store falló con EXCEPTION
│   └─► La transacción hizo ROLLBACK → no debería quedar tienda huérfana.
│       Verificar con snapshot (sección 6). Si no hay tienda nueva: no restore.
│
├─ create_store OK pero validate_store_inventory = FALLO (caso raro)
│   └─► NO usar tienda en POS. active = false (sección 5B).
│       Evaluar restore completo si hay inconsistencia en tiendas viejas.
│
├─ Inventario inconsistente en tiendas existentes
│   └─► Restore BD completo (sección 4). Ventana de mantenimiento.
│
└─ Pérdida masiva de datos / corrupción
    └─► Restore BD completo (sección 4) + verificación (sección 6).
```

### Regla de oro

**Restore completo de BD = último recurso.** Sobrescribe todo el esquema `public`. Solo hacerlo con:

- App en **mantenimiento** (sin ventas en curso)
- Backup `.sql` verificado (tamaño ~10 MB, no 0 bytes)
- Hora anotada antes y después

---

## 2. Inventario de respaldos

| Activo | Ubicación | Contenido | Restaura |
|--------|-----------|-----------|----------|
| Código | Rama `backup-pre-sucursal` en GitHub | App + migración sucursal (sin aplicar en prod al momento del backup) | Git checkout |
| BD dump | `backups/backup_pre_sucursal_20260601_2059.sql` | Esquema + datos **`public`** (~9,91 MB) | `psql` |
| Reporte baseline | `backups/REPORTE_SITUACION_PRE_SUCURSAL.md` | Métricas pre-cambio | Comparación manual |
| Snapshot SQL | Resultados de `sql/snapshot_pre_sucursal.sql` | Conteos pre-cambio | Comparación |
| Reporte unificado | `sql/reporte_situacion_pre_sucursal_unificado.sql` | Validación completa | Re-ejecutar post-restore |

### Qué NO incluye el dump

| Excluido | Implicación |
|----------|-------------|
| Esquema `auth` (usuarios Supabase Auth) | Login de usuarios **no** se restaura con este archivo |
| Esquema `storage` (archivos/imágenes) | Imágenes en bucket **no** se restauran |
| Migraciones Supabase internas | Normal en dump `public` |

Para login e imágenes, Supabase mantiene `auth` y `storage` intactos si solo restauras `public`.

---

## 3. Línea base pre-operación (verificar post-restore)

Usar estos números para confirmar que la restauración devolvió el sistema al estado correcto.

| Métrica | Valor baseline |
|---------|----------------|
| **company_id** | `aa11bb22-cc33-dd44-ee55-ff6677889900` |
| Tiendas activas | 4 |
| Productos activos | 659 |
| Productos inactivos | 53 |
| Productos total | 712 |
| Filas `inventories` | 2.848 |
| Filas inventario / tienda | 712 |
| Ventas (`sales`) | 2.959 |
| Valor inventario USD | 155.463,51 |
| Unidades stock (activos) | 5.300 |
| Huecos inventario | 0 |
| Duplicados producto+tienda | 0 |

### Tiendas baseline

1. Tu Móvil Centro  
2. Tu Móvil La Isla  
3. Tu Móvil Store  
4. Zona Gamer Margarita  

### Unidades por tienda (Estadísticas — 3 categorías visibles)

| Tienda | Teléfonos | Accesorios | Serv. técnico | Total panel* |
|--------|-----------|------------|---------------|--------------|
| Tu Móvil Centro | 105 | 351 | 492 | 948 |
| Tu Móvil La Isla | 59 | 53 | 0 | 112 |
| Tu Móvil Store | 0 | 8 | 888 | 896 |
| Zona Gamer Margarita | 368 | 2.675 | 298 | 3.341 |

\*Sin contar `uncategorized` (17+17+35+30 unidades repartidas).

---

## 4. Restauración completa de base de datos

### 4.1 Prerrequisitos

- [ ] PostgreSQL 17 client instalado (`psql.exe` en `C:\Program Files\PostgreSQL\17\bin\`)
- [ ] Database password de Supabase (Settings → Database)
- [ ] Archivo backup copiado y **> 1 MB**
- [ ] Mantenimiento activado en frontend (`VITE_MAINTENANCE_MODE` o flag en Render)
- [ ] Nadie creando ventas en POS

### 4.2 Conexión (Windows — usar pooler IPv4)

La URL directa `db.swsqmsbyikznalrvydny.supabase.co` puede fallar en Windows (solo IPv6).

```
Host:     aws-1-us-east-1.pooler.supabase.com
Puerto:   5432
Usuario:  postgres.swsqmsbyikznalrvydny
Base:     postgres
```

### 4.3 Comando de restauración (PowerShell)

```powershell
cd c:\Users\Dell\Documents\todo-bcv-pos

$env:PGPASSWORD = "TU_DATABASE_PASSWORD"

& "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
  -h aws-1-us-east-1.pooler.supabase.com `
  -p 5432 `
  -U "postgres.swsqmsbyikznalrvydny" `
  -d postgres `
  -v ON_ERROR_STOP=1 `
  -f "backups\backup_pre_sucursal_20260601_2059.sql"
```

**Duración estimada:** 2–10 minutos según conexión.

### 4.4 Si hay errores durante psql

| Error típico | Acción |
|--------------|--------|
| `already exists` en CREATE TABLE | El dump puede usar `CREATE TABLE` sin IF NOT EXISTS. Valorar restore en ventana con BD limpia o contactar soporte Supabase. |
| `permission denied` | Verificar password y usuario pooler. |
| `connection failed` | Usar pooler, no URL directa db.* |
| Archivo 0 bytes | **No restaurar.** Regenerar dump con `scripts/backup-db.ps1`. |

### 4.5 Alternativa: nuevo backup antes de restore

Si necesitas un punto extra antes de restaurar:

```powershell
$env:SUPABASE_DB_PASSWORD = "TU_DATABASE_PASSWORD"
powershell -ExecutionPolicy Bypass -File .\scripts\backup-db.ps1
```

---

## 5. Recuperación parcial (sin restore completo)

### 5A. Tienda nueva creada pero no confiable

Si la 5.ª tienda existe pero no debe usarse:

```sql
-- Identificar tienda nueva
SELECT id, name, active, created_at
FROM stores
ORDER BY created_at DESC
LIMIT 5;

-- Desactivar (NO DELETE — CASCADE peligroso)
UPDATE stores
SET active = false
WHERE id = 'UUID_TIENDA_NUEVA'::uuid;
```

Luego verificar tiendas baseline con `sql/reporte_situacion_pre_sucursal_unificado.sql`.

### 5B. Migración RPC aplicada pero quieres revertir funciones

Solo si **no** hay tienda nueva creada y quieres quitar las RPC:

```sql
DROP FUNCTION IF EXISTS public.create_store_system(uuid, text, text, text, text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.create_store_v1(text, text, text, text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.validate_store_inventory(uuid);
```

Esto **no** afecta datos de tiendas/productos/inventario.

### 5C. Restaurar un solo archivo de código

```powershell
git checkout backup-pre-sucursal -- ruta/al/archivo.tsx
```

### 5D. Volver todo el repo al snapshot de código

```powershell
git fetch origin
git checkout backup-pre-sucursal
# Trabajar desde ahí o crear rama de recuperación:
git checkout -b main-restaurado
```

Para volver deploy en Render: push a `main` solo después de revisión explícita.

---

## 6. Verificación post-restauración

Ejecutar en SQL Editor en este orden:

### Paso 1 — Reporte unificado

```text
sql/reporte_situacion_pre_sucursal_unificado.sql
```

Comparar con baseline (sección 3). Debe coincidir:

- 4 tiendas activas (no 5, si restore es pre-sucursal)
- 712 filas/tienda
- huecos = 0
- valor USD = 155463.51
- ventas = 2959

### Paso 2 — Smoke test aplicación

- [ ] Login admin funciona (auth no se tocó)
- [ ] Panel Estadísticas muestra 4 sucursales y ~155k USD
- [ ] POS carga productos en tienda conocida
- [ ] No hay errores en consola por tiendas faltantes

### Paso 3 — Registrar restauración

Anotar en un archivo de texto:

```
Fecha/hora restore:
Ejecutado por:
Archivo usado: backup_pre_sucursal_20260601_2059.sql
Resultado verificación: OK / FALLÓ
Notas:
```

---

## 7. Restauración de código (Render / frontend)

| Escenario | Acción |
|-----------|--------|
| Deploy malo reciente | Revertir commit en `main` o redeploy commit anterior en Render |
| Cambios locales rotos | `git checkout backup-pre-sucursal` |
| Solo una página | `git checkout backup-pre-sucursal -- src/...` |

Rama de referencia: **`backup-pre-sucursal`** (commit `8b29b3a` aprox.)  
Rama vieja `backup` (commit `6077514`) — **no usar**, desactualizada.

---

## 8. Plan de operación (referencia — qué se va a hacer)

Para contexto al decidir si hace falta restore:

### Fase 1 — Preparación (completada)

- [x] Backup Git `backup-pre-sucursal`
- [x] Dump BD `backup_pre_sucursal_20260601_2059.sql`
- [x] Reporte situación GO (0 huecos, 0 duplicados)
- [x] Este protocolo

### Fase 2 — Ejecución (pendiente)

1. Activar mantenimiento (recomendado, no obligatorio si baja operación)
2. Aplicar migración `20260522100000_create_store_v1_system.sql` (SQL Editor)
3. Ejecutar:

```sql
SELECT public.create_store_system(
  p_company_id     := 'aa11bb22-cc33-dd44-ee55-ff6677889900'::uuid,
  p_name           := 'NOMBRE_NUEVA_SUCURSAL',
  p_address        := NULL,
  p_phone          := NULL,
  p_active         := true
);
```

4. Confirmar en respuesta JSON: `"success": true` y `"validation": { "status": "OK" }`
5. Re-ejecutar reporte unificado — esperar 5 tiendas, nueva con 659 filas activas mínimo

### Fase 3 — Si algo falla durante Fase 2

| Situación | Restore necesario |
|-----------|-------------------|
| Error SQL al aplicar migración (syntax) | No — corregir SQL y reintentar |
| `create_store_system` lanza EXCEPTION | No — ROLLBACK automático, tienda no persiste |
| success=true pero datos viejos inconsistentes | Evaluar 5A primero; restore completo si afecta tiendas baseline |
| Inventario baseline (4 tiendas) cambió sin explicación | **Restore completo** (sección 4) |

---

## 9. Herramientas y rutas

| Recurso | Ruta |
|---------|------|
| Backup BD script | `scripts/backup-db.ps1` |
| Snapshot rápido | `sql/snapshot_pre_sucursal.sql` |
| Reporte detallado | `sql/reporte_situacion_pre_sucursal.sql` |
| Reporte unificado | `sql/reporte_situacion_pre_sucursal_unificado.sql` |
| Plantilla crear sucursal | `sql/crear_sucursal_rpc.sql` (rama backup-pre-sucursal) |
| Migración sucursal | `supabase/migrations/20260522100000_create_store_v1_system.sql` (rama backup-pre-sucursal) |
| Script Node (alternativa) | `scripts/create-store.js` (rama backup-pre-sucursal) |

### Supabase CLI (dump alternativo — requiere Docker en Windows)

```powershell
npx supabase login
npx supabase link --project-ref swsqmsbyikznalrvydny
npx supabase db dump -f backups\backup_manual.sql --linked
```

En este entorno se usó **`pg_dump` vía pooler** porque Docker no estaba disponible.

---

## 10. Limitaciones del plan Free

| Función | Disponible |
|---------|------------|
| Backup diario Dashboard | No |
| Point-in-time recovery | No |
| Restore con un clic | No |
| Dump manual (`pg_dump` / script) | Sí |
| Rama Git en GitHub | Sí |

**Conclusión:** la única red de segurad real es el archivo `.sql` guardado fuera del repo + rama Git.

---

## 11. Checklist rápido de emergencia

Imprimir o tener a mano:

```
□ Mantenimiento ON
□ Password BD a mano (Settings → Database)
□ Archivo: backups/backup_pre_sucursal_20260601_2059.sql existe y > 1 MB
□ psql disponible
□ Ejecutar restore (sección 4.3)
□ Ejecutar reporte unificado
□ Comparar: 4 tiendas, 712 filas, 155463.51 USD, 0 huecos
□ Smoke test login + Estadísticas + POS
□ Mantenimiento OFF
□ Anotar incidente
```

---

## 12. Contactos y accesos

| Recurso | URL / dato |
|---------|------------|
| Supabase Dashboard | https://supabase.com/dashboard/project/swsqmsbyikznalrvydny |
| Database settings | https://supabase.com/dashboard/project/swsqmsbyikznalrvydny/settings/database |
| GitHub repo | https://github.com/ingsistemavzla/POS-TU-MOVIL |
| Rama backup | `backup-pre-sucursal` |

---

## 13. Historial de documentos

| Fecha | Documento | Notas |
|-------|-----------|-------|
| 2026-06-01 | `REPORTE_SITUACION_PRE_SUCURSAL.md` | Baseline GO, 4 tiendas |
| 2026-06-01 | `backup_pre_sucursal_20260601_2059.sql` | Dump public ~9,91 MB |
| 2026-06-01 | Este protocolo | Consolidación backup + restore + plan sucursal |

---

*Conservar este archivo junto al dump SQL en almacenamiento seguro (no solo en el repo local).*
