# Auditoría de inventario – Trazabilidad absoluta

Este documento describe cómo se garantiza que **ninguna transacción de inventario quede fuera** del historial y del panel de auditoría, y cómo se distingue **ajuste manual: aumento vs disminución**.

## 1. Origen de cada movimiento

Todo cambio de stock pasa por la tabla `inventories`. Las únicas formas de modificar `inventories` son:

| Origen | Cómo se registra en `inventory_movements` | Tipo | Motivo (reason) |
|--------|-------------------------------------------|------|------------------|
| **Venta** (POS) | `process_sale` hace UPDATE en `inventories` y luego INSERT tipo `OUT` con motivo "Venta - Factura: ...". El trigger `audit_inventory_change` también puede insertar una fila tipo `ADJUST` (según dedup). | OUT (+ posible ADJUST del trigger) | Venta - Factura: ... |
| **Ajuste manual** (Almacén) | `update_store_inventory` fija `app.movement_reason = 'Ajuste manual (almacén)'`, luego INSERT/UPDATE en `inventories` → el trigger inserta una fila tipo `ADJUST` con ese motivo + " - Aumento" o " - Disminución". | ADJUST | Ajuste manual (almacén) - Aumento / Disminución |
| **Transferencia** | `transfer_inventory` hace dos UPDATEs (origen y destino) e inserta filas tipo TRANSFER/IN/OUT. El trigger puede insertar ADJUST por cada UPDATE (según dedup). | TRANSFER, IN, OUT | Según RPC |
| **Otros cambios en `inventories`** (ej. creación con qty) | Cualquier UPDATE en `inventories` dispara el trigger → se inserta ADJUST con motivo "Ajuste automático de auditoría - Aumento/Disminución". | ADJUST | Ajuste automático de auditoría - Aumento / Disminución |

Conclusión: **no hay camino** para cambiar `inventories` sin que quede registrado en `inventory_movements` (ya sea por el trigger o por el RPC que hace el cambio).

## 2. Ajuste manual: aumento vs disminución

- **Base de datos (trigger)**  
  La función `audit_inventory_change()` (migración `20250209200000_adjust_reason_aumento_disminucion.sql`) añade al motivo:
  - `" - Aumento"` cuando `v_delta > 0`
  - `" - Disminución"` cuando `v_delta < 0`  

  Así, el campo `reason` siempre deja explícito si el ajuste fue aumento o disminución (manual o automático).

- **Frontend**  
  - **Historial** (`HistorialPage`) y **Panel de Auditoría** (`MasterAuditDashboardPage`) muestran:
    - El **motivo completo** (incluye " - Aumento" o " - Disminución" cuando aplica).
    - Para tipo **ADJUST**, una etiqueta visual **"Aumento"** (verde) o **"Disminución"** (rojo) según el signo de `qty`.
    - La cantidad con signo (+/−) y color (verde/rojo).

Con esto se cumple que tanto en Historial como en Panel de Auditoría se vea de forma explícita si un ajuste fue aumento o disminución.

## 3. Consistencia entre Historial y Panel de Auditoría

- Ambos leen de la misma tabla: `inventory_movements` (con productos, tiendas, usuarios).
- Misma información por movimiento: producto, SKU, tipo, sucursal(es), usuario, **reason completo**, cantidad con signo, fecha/hora con segundos.
- Filtros equivalentes: búsqueda por producto/SKU/razón, filtro por sucursal y por tipo.

Si los datos coinciden en la BD, ambas vistas deben coincidir. Cualquier discrepancia indicaría filtros o rangos de fechas distintos, no un origen de datos diferente.

## 4. Resumen de cumplimiento

| Requisito | Cumplimiento |
|-----------|----------------|
| Ajuste manual identificable como aumento o disminución | ✅ Motivo en BD con " - Aumento"/" - Disminución"; etiqueta y signo en Historial y Panel de Auditoría. |
| Ninguna transacción de inventario fuera de trazabilidad | ✅ Todo cambio de stock pasa por UPDATE/INSERT en `inventories` y queda registrado vía trigger o RPC en `inventory_movements`. |
| Historial y Panel de Auditoría alineados | ✅ Misma tabla, mismos campos y mismo nivel de detalle (reason completo, tipo, qty con signo, fecha con segundos). |
