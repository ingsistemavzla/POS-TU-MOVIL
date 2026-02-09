# Changelog — 09/02/2026 (cierre de sesión)

## Cambios realizados

### Panel de Cierres (Historial)
- **Botón "Capturar snapshot ahora"** — Los admins pueden ejecutar snapshot manual sin esperar al cron (00:00).
- **Migración** `20250209210000_request_inventory_snapshot.sql` — RPC wrapper que verifica `is_admin()` antes de llamar a `capture_inventory_snapshots`.
- **Layout resumen por día**:
  - Izquierda: Fecha.
  - Centro: Badges (Teléfonos azul, Accesorios verde, Servicio técnico ámbar) con iconos.
  - Derecha: Total y USD en línea, botón "Ver detalles".
- **Detalle expandible** — Al hacer clic en "Ver detalles" se muestra la tabla por sucursal y categoría.

### Colores categorías en Cierres
- Teléfonos: azul (Smartphone).
- Accesorios: verde (Headphones).
- Servicio técnico: ámbar (Wrench).

### Historial y Panel Auditoría (anteriores)
- Tabla con resumen + acordeón "Ver detalles".
- Filtros: Ventas (verde), Aumentos (azul), Disminución (rojo), Transferencias (amarillo).
- Panel forense en master_admin con todos los datos de la transacción.
- Migración `20250209200000_adjust_reason_aumento_disminucion.sql` — Motivo con " - Aumento" o " - Disminución".

---

## Últimos 10 cambios sistemáticos (trazabilidad)

1. **Migración `20250209200000_adjust_reason_aumento_disminucion.sql`** — Trigger `audit_inventory_change` añade al motivo " - Aumento" o " - Disminución" según el signo de la cantidad.

2. **Migración `20250209210000_request_inventory_snapshot.sql`** — Nueva RPC `request_inventory_snapshot` que verifica `is_admin()` y llama a `capture_inventory_snapshots` para snapshot manual.

3. **Filtros por categoría (Historial y Panel Auditoría)** — Sustitución de filtros IN/OUT/ADJUST/TRANSFER por: Ventas (OUT), Aumentos (ADJUST qty>0), Disminuciones (ADJUST qty<0), Transferencias (TRANSFER, IN).

4. **Historial: tabla con acordeón "Ver detalles"** — Tabla con fila resumen + fila expandible con motivo, sucursal, conciliación. Admin no ve el usuario que realizó.

5. **Panel Auditoría: panel forense expandible** — Al expandir: producto, SKU, sucursales, administrador que realizó, motivo completo, conciliación (old_qty → new_qty), IDs de movimiento/usuario/producto.

6. **Panel Auditoría: filtro por categoría en fetch** — `fetchMovements` aplica filtros en backend (VENTAS → type=OUT, AUMENTOS → type=ADJUST y qty>0, etc.).

7. **Historial: filtro por sucursal** — Desplegable para filtrar por sucursal (store_from_id o store_to_id).

8. **Historial: búsqueda incluye razón** — Campo `reason` incluido en la búsqueda junto a producto y SKU.

9. **Panel Cierres: botón "Capturar snapshot ahora"** — Llama a RPC `request_inventory_snapshot` (solo admins).

10. **Panel Cierres: resumen expandible por día** — Totales por categoría en resumen; detalle por sucursal al expandir.

---

*Punto de restauración para continuar el proyecto.*
