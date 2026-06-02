# Reporte de situación pre-sucursal

**Proyecto:** POS-TuMovil (Supabase `swsqmsbyikznalrvydny`)  
**Empresa:** Tu Movil Margarita  
**Fecha del reporte:** 2026-06-01  
**Estado:** GO — listo para crear sucursal (pendiente nombre y ejecución)

---

## 1. Objetivo

Documentar el estado exacto del inventario y la integridad de datos **antes** de:

1. Aplicar la migración `create_store_v1_system`
2. Ejecutar `create_store_system` para la 5.ª tienda
3. Validar con `validate_store_inventory`

---

## 2. Respaldos realizados

| Tipo | Ubicación | Detalle |
|------|-----------|---------|
| Código Git | Rama `backup-pre-sucursal` | Pusheada a GitHub |
| Base de datos | `backups/backup_pre_sucursal_20260601_2059.sql` | ~9,91 MB — esquema `public` |
| Snapshot SQL | Ejecutado | 4 tiendas × 712 filas inventario |
| Reporte SQL | `sql/reporte_situacion_pre_sucursal_unificado.sql` | Validado en SQL Editor |

---

## 3. Identidad del tenant

| Campo | Valor |
|-------|--------|
| **company_id** | `aa11bb22-cc33-dd44-ee55-ff6677889900` |
| **company_name** | Tu Movil Margarita |
| **Tiendas activas** | 4 |

### Tiendas actuales

| # | Nombre |
|---|--------|
| 1 | Tu Móvil Centro |
| 2 | Tu Móvil La Isla |
| 3 | Tu Móvil Store |
| 4 | Zona Gamer Margarita |

---

## 4. Conteos globales

| Métrica | Valor |
|---------|-------|
| Tiendas activas | 4 |
| Productos activos | 659 |
| Productos inactivos | 53 |
| Productos total | 712 |
| Filas en `inventories` | 2.848 (712 × 4 tiendas) |
| Ventas históricas (`sales`) | 2.959 |
| Valor inventario (USD, activos) | **155.463,51** |
| Unidades en stock (activos, sistema) | **5.300** |

### Totales por categoría (unidades, productos activos)

| Categoría | Unidades |
|-----------|----------|
| Teléfonos | 532 |
| Accesorios | 3.087 |
| Servicio técnico | 1.678 |
| **Total sistema** | **5.300** |

---

## 5. Inventario por tienda

### 5.1 Filas de inventario (tabla `inventories`)

Cada tienda tiene **712 filas**: 659 productos activos + 53 inactivos (soft delete con `products.active = false`).

| Tienda | Filas total | Filas activos | Filas inactivos | Unidades (solo activos) |
|--------|-------------|---------------|-----------------|-------------------------|
| Tu Móvil Centro | 712 | 659 | 53 | 948 |
| Tu Móvil La Isla | 712 | 659 | 53 | 112 |
| Tu Móvil Store | 712 | 659 | 53 | 899 |
| Zona Gamer Margarita | 712 | 659 | 53 | 3.341 |

> **Nota:** 712 = registros `(tienda, producto)`. No es la suma de unidades en stock.

### 5.2 Unidades por categoría (misma lógica que panel Estadísticas)

Solo `products.active = true`, suma de `inventories.qty`.

| Tienda | Teléfonos | Accesorios | Serv. técnico | Sin categoría | **Total** |
|--------|-----------|------------|---------------|---------------|-----------|
| Tu Móvil Centro | 105 | 351 | 492 | 17 | **965** |
| Tu Móvil La Isla | 59 | 53 | 0 | 17 | **129** |
| Tu Móvil Store | 0 | 8 | 888 | 35 | **931** |
| Zona Gamer Margarita | 368 | 2.675 | 298 | 30 | **3.371** |

### 5.3 Cuadre con el dashboard (Estadísticas)

El panel muestra teléfonos + accesorios + servicio técnico **sin** la fila `uncategorized`. Los totales cuadran:

| Tienda | Dashboard (3 cats.) | sin_categoria | Total SQL |
|--------|---------------------|---------------|-----------|
| Tu Móvil Centro | 948 | 17 | 965 |
| Tu Móvil La Isla | 112 | 17 | 129 |
| Tu Móvil Store | 896 | 35 | 931 |
| Zona Gamer Margarita | 3.341 | 30 | 3.371 |

- Valor USD dashboard: **155.463,51** → SQL sección H: **155.463,51** ✓
- Productos registrados dashboard: **659** → SQL `products_active`: **659** ✓
- Unidades totales dashboard: **5.300** → SQL `TOTAL_UNID`: **5.300** ✓

---

## 6. Integridad de datos

| Verificación | Resultado | Estado |
|--------------|-----------|--------|
| Huecos (productos activos sin fila en alguna tienda) | **0** | ✅ OK |
| Duplicados `(store_id, product_id)` en inventarios | **0** | ✅ OK |
| Filas uniformes entre tiendas activas | 712 en las 4 | ✅ OK |
| Valor USD vs dashboard | Coincide | ✅ OK |

**Veredicto integridad:** sin huecos ni duplicados. Riesgo sobre data actual: **muy bajo**.

---

## 7. Interpretación para la operación

### Qué significa cada número

| Número | Significado |
|--------|-------------|
| **712 filas/tienda** | Catálogo completo con fila de inventario por producto (activo e inactivo) |
| **659 activos/tienda** | Productos visibles en POS y Estadísticas |
| **53 inactivos/tienda** | Productos dados de baja (`active = false`) que conservan fila e historial |
| **948, 112, etc.** | Unidades físicas en stock (`qty`), no cantidad de productos distintos |

### Qué NO hacer

- No usar el frontend de Tiendas para crear la sucursal (flujo acordado: RPC por código).
- No hacer `DELETE` de sucursales (CASCADE peligroso). Si falla: `active = false`.
- No tocar usuarios en esta operación.

---

## 8. Expectativas post-creación (tienda nueva)

| Métrica esperada |
|------------------|
| `validate_store_inventory(nuevo_store_id)` → **status OK** |
| Filas activos ≥ **659** (ideal: **712** si el trigger replica todo el catálogo) |
| Huecos en tienda nueva = **0** |
| Stock inicial = **0** unidades en todos los productos |
| Tiendas activas = **5** |
| Filas totales en `inventories` ≈ **3.560** (712 × 5) o 659 × 5 según trigger |

### Validación post-cambio

Re-ejecutar:

- `sql/snapshot_pre_sucursal.sql`
- `sql/reporte_situacion_pre_sucursal_unificado.sql`

Comparar con este reporte.

---

## 9. Orden de ejecución acordado

1. ~~Backups código y BD~~ ✓
2. ~~Reporte de situación~~ ✓ (este documento)
3. Aplicar `supabase/migrations/20260522100000_create_store_v1_system.sql` en SQL Editor
4. Ejecutar `create_store_system` con:
   - `p_company_id`: `aa11bb22-cc33-dd44-ee55-ff6677889900`
   - `p_name`: *(pendiente — nombre de la sucursal)*
5. Confirmar `validate_store_inventory` = OK
6. Snapshot post-cambio y comparar

---

## 10. Referencias técnicas

| Recurso | Ruta |
|---------|------|
| Migración sucursal | `supabase/migrations/20260522100000_create_store_v1_system.sql` |
| Script Node | `scripts/create-store.js` |
| Plantilla SQL RPC | `sql/crear_sucursal_rpc.sql` |
| Backup BD script | `scripts/backup-db.ps1` |
| Protocolo backup/restore | `sql/BACKUP_RESTORE_PRE_SUCURSAL.md` (rama backup) |
| Reporte SQL unificado | `sql/reporte_situacion_pre_sucursal_unificado.sql` |

---

## 11. Firma / registro

| Campo | Valor |
|-------|--------|
| Reporte generado | 2026-06-01 |
| Ejecutado por | tumovilsystem@gmail.com |
| Herramienta | Supabase SQL Editor + panel Estadísticas |
| Decisión | **GO condicionado** — proceder cuando se defina nombre de sucursal |

---

*Documento generado como parte del protocolo pre-sucursal. Conservar junto al backup `.sql`.*
