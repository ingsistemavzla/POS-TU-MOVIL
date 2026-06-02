# Acta completa — Sucursal Tu Móvil Marino y validación en producción

**Proyecto:** POS-TuMovil · Supabase `swsqmsbyikznalrvydny`  
**Empresa:** Tu Movil Margarita  
**company_id:** `aa11bb22-cc33-dd44-ee55-ff6677889900`  
**Fecha operación:** 2026-06-01 / 2026-06-02 (UTC)  
**Estado:** Completado y validado en producción  

Documentos relacionados:

| Documento | Ubicación |
|-----------|-----------|
| Reporte situación pre-operación | `backups/REPORTE_SITUACION_PRE_SUCURSAL.md` |
| Protocolo backup / restore | `backups/PROTOCOLO_RESTAURACION.md` |
| Índice SQL ejecutados | `sql/INDICE_SQL_EJECUTADOS_SUCURSAL_MARINO.md` |
| Rama snapshot código + dump | `backup-pre-sucursal` (GitHub) |

---

## 1. Resumen ejecutivo

Se creó la quinta sucursal **Tu Móvil Marino** en producción mediante RPC `create_store_system` (sin usar el frontend de Tiendas), tras backups de código y base de datos, verificación de integridad (0 huecos, 0 duplicados) y prueba end-to-end (producto, venta, anulación de venta, desactivación de producto). Las cuatro sucursales existentes no sufrieron cambios en inventario ni en totales del dashboard.

---

## 2. Sucursal creada

| Campo | Valor |
|-------|--------|
| **Nombre** | Tu Móvil Marino |
| **ID** | `73aae6d8-a396-4443-9c24-c7b03c84d11b` |
| **Razón social** | zona gamer margarita c.a |
| **RIF** | J-50283376-6 |
| **Activa** | true |
| **created_at** | 2026-06-02T01:27:00.564672+00:00 |

### Sucursales activas (5)

| # | Nombre | ID | RIF |
|---|--------|-----|-----|
| 1 | Tu Móvil Centro | `d1ae400d-f3a2-430c-b256-3f74b35529b4` | J-12345678-9 |
| 2 | Tu Móvil La Isla | `44fa49ac-b6ea-421d-a198-e48e179ae371` | J-50283376-5 |
| 3 | **Tu Móvil Marino** | **`73aae6d8-a396-4443-9c24-c7b03c84d11b`** | **J-50283376-6** |
| 4 | Tu Móvil Store | `bb11cc22-dd33-ee44-ff55-aa6677889900` | J-50283376-5 |
| 5 | Zona Gamer Margarita | `88aef8e3-df42-4706-a919-a993df60e593` | J-50283376-5 |

---

## 3. Línea base ANTES de la operación (2026-06-01)

Métricas validadas con `sql/reporte_situacion_pre_sucursal_unificado.sql` y panel Estadísticas.

| Métrica | Valor |
|---------|--------|
| Tiendas activas | 4 |
| Productos activos | 659 |
| Productos inactivos | 53 |
| Productos total | 712 |
| Filas `inventories` | 2.848 (712 × 4) |
| Ventas (`sales`) | 2.959 |
| Valor inventario USD (activos) | **155.463,51** |
| Unidades stock (activos, sistema) | **5.300** |
| Teléfonos / Accesorios / Serv. técnico (uds) | 532 / 3.087 / 1.678 |
| Huecos inventario (activos sin fila) | **0** |
| Duplicados (store_id, product_id) | **0** |

### Unidades por sucursal (dashboard — 3 categorías visibles)

| Tienda | Teléfonos | Accesorios | Serv. técnico | Total panel* |
|--------|-----------|------------|---------------|--------------|
| Tu Móvil Centro | 105 | 351 | 492 | 948 |
| Tu Móvil La Isla | 59 | 53 | 0 | 112 |
| Tu Móvil Store | 0 | 8 | 888 | 896 |
| Zona Gamer Margarita | 368 | 2.675 | 298 | 3.341 |

\*Sin columna `uncategorized` en UI (17+17+35+30 uds repartidas en SQL).

### Filas inventario por tienda

| Tienda | Filas |
|--------|-------|
| Cada una de las 4 | **712** (659 activos + 53 inactivos) |

**Veredicto pre-operación:** GO — integridad OK.

---

## 4. Respaldos realizados

| Tipo | Detalle |
|------|---------|
| Git | Rama `backup-pre-sucursal` → commit `bd3cc24` (incl. dump ~10 MB) |
| BD | `backups/backup_pre_sucursal_20260601_2059.sql` (~9,91 MB, esquema `public`) |
| Script backup | `scripts/backup-db.ps1` (pooler IPv4 Windows) |
| Reporte + protocolo | `backups/REPORTE_*.md`, `backups/PROTOCOLO_*.md` |

Plan Supabase: **Free** — sin backups automáticos en Dashboard.

---

## 5. Procedimiento ejecutado en producción (orden quirúrgico)

| Paso | Acción | Resultado |
|------|--------|-----------|
| 0 | `SELECT EXISTS (... create_store_system)` | `false` |
| 1 | Ejecutar `sql/20260522100000_create_store_v1_system.sql` | Success |
| 0b | Re-verificar función | `true` |
| 1c | Verificar trigger `on_store_created` | Presente |
| 2 | `create_store_system` → Tu Móvil Marino | `success: true`, validation **OK** 659/659 |
| 3A | Listar 5 tiendas activas | 5 filas |
| 3B | Conteo filas inventario | 4×712 + Marino **659** |
| 3C | `validate_store_inventory(Marino)` | **OK** |

---

## 6. SQL aplicado en producción (resumen)

Ver detalle y copias en `sql/INDICE_SQL_EJECUTADOS_SUCURSAL_MARINO.md`.

1. **Migración (una vez):** `20260522100000_create_store_v1_system.sql`  
   - Funciones: `validate_store_inventory`, `create_store_v1`, `create_store_system`
2. **Creación tienda:** ver `sql/EXECUTAR_CREAR_TU_MOVIL_MARINO.sql` (Paso 2)
3. **Validaciones:** consultas en mismo archivo + reporte unificado

**No ejecutado en producción:** `create_store_v1` (variante con sesión admin; se usó `create_store_system`).

---

## 7. Resultado post-creación (inventario)

| Tienda | Filas inventario |
|--------|------------------|
| Tu Móvil Centro | 712 |
| Tu Móvil La Isla | 712 |
| Tu Móvil Store | 712 |
| Zona Gamer Margarita | 712 |
| **Tu Móvil Marino** | **659** |

`validate_store_inventory`: **659 active_products = 659 inventory_rows**, status **OK**.

Dashboard inicial Marino: **0 unidades** (stock qty=0 en todos los productos).

---

## 8. Prueba end-to-end en producción (2026-06-02)

| Fase | Acción | Resultado |
|------|--------|-----------|
| **A** | Producto `PRU-MARINO-001` / PRUEBA MARINO 2026, 1 uds solo en Marino | Dashboard: 660 prod., Marino Tel. **1**, USD **155.478,51**, uds **5301** |
| **B** | Venta POS Marino `FAC-20260602-04089` (USD 15) | Marino **0**, uds **5300**, USD **155.463,51** |
| **C** | Eliminar venta (`delete_sale_and_restore_inventory`) | Marino **1**, uds **5301**, USD **155.478,51** |
| **D** | Desactivar producto (soft delete) | **659** prod., Marino **0**, USD **155.463,51**, uds **5300** — **= baseline** |

Producto de prueba: desactivado, sin ventas finales asociadas.

---

## 9. Línea base DESPUÉS de prueba (estado producción actual)

| Métrica | Valor | vs pre-operación |
|---------|--------|------------------|
| Tiendas activas | **5** | +1 (Marino) |
| Productos activos | **659** | Igual |
| Unidades global | **5.300** | Igual |
| Valor USD | **155.463,51** | Igual |
| Marino (unidades dashboard) | **0** | Nueva tienda, sin stock cargado |
| 4 tiendas anteriores | Sin cambio en totales | Igual |

---

## 10. Infraestructura técnica confirmada

| Componente | Estado |
|------------|--------|
| Trigger `on_store_created` | Activo |
| RLS / ventas por tienda | Sin regresión en prueba |
| `delete_sale_and_restore_inventory` | Repone stock correctamente |
| `delete_product` | Soft delete (`active = false`) |
| `create_product_v3` | Crea filas en las 5 tiendas |
| Estadísticas vs SQL unificado | Cuadra (valor USD, uds) |

---

## 11. Archivos en repositorio (rama `main` tras commit)

| Archivo | Propósito |
|---------|-----------|
| `supabase/migrations/20260522100000_create_store_v1_system.sql` | Migración oficial |
| `sql/20260522100000_create_store_v1_system.sql` | Copia operativa SQL Editor |
| `sql/EXECUTAR_CREAR_TU_MOVIL_MARINO.sql` | Plantilla ejecución tienda |
| `sql/crear_sucursal_rpc.sql` | Plantilla alternativa |
| `sql/snapshot_pre_sucursal.sql` | Snapshot rápido |
| `sql/reporte_situacion_pre_sucursal.sql` | Reporte por bloques |
| `sql/reporte_situacion_pre_sucursal_unificado.sql` | Reporte una tabla |
| `sql/INDICE_SQL_EJECUTADOS_SUCURSAL_MARINO.md` | Índice de ejecución |
| `scripts/backup-db.ps1` | Backup BD Windows |
| `scripts/create-store.js` | Script Node (service_role) |
| `docs/operaciones/ACTA_COMPLETA_SUCURSAL_TU_MOVIL_MARINO.md` | Este documento |
| `backups/REPORTE_SITUACION_PRE_SUCURSAL.md` | Baseline documentado |
| `backups/PROTOCOLO_RESTAURACION.md` | Restore |

**Dump BD (~10 MB):** solo en rama `backup-pre-sucursal`, no en `main`.

---

## 12. Pendiente operativo (no bloqueante)

- [ ] Asignar usuarios (gerente/cajero) a **Tu Móvil Marino** (`assigned_store_id`)
- [ ] Cargar inventario real en Marino
- [ ] Reset contraseña BD si se compartió en chat (recomendado)

---

## 13. Firmas / registro

| Rol | Registro |
|-----|----------|
| Ejecución SQL / validación | tumovilsystem@gmail.com |
| Herramienta | Supabase SQL Editor + POS web |
| Decisión | GO producción — sucursal Marino activa |

---

*Documento generado para trazabilidad en `main`. Ante auditoría, ejecutar `sql/reporte_situacion_pre_sucursal_unificado.sql` y comparar con tablas de esta acta.*
