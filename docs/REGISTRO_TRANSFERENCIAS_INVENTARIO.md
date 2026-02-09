# Registro de transferencias de inventario

## ¿Cómo se registran las transferencias?

Cuando transfieres **4 unidades** del producto X desde **Sucursal 1** hacia **Sucursal 2**, el sistema hace lo siguiente:

### 1. Actualización de inventarios

1. **UPDATE** en `inventories` (sucursal origen): `qty = qty - 4`
2. **UPDATE** en `inventories` (sucursal destino): `qty = qty + 4`

### 2. Trigger de auditoría

El trigger `audit_inventory_change` se ejecuta en cada UPDATE:

- Tras el UPDATE de la sucursal origen → inserta en `inventory_movements` una fila **ADJUST** con `qty = -4`, `store_to_id = sucursal origen`, motivo tipo "Ajuste automático de auditoría - Disminución".
- Tras el UPDATE de la sucursal destino → inserta otra fila **ADJUST** con `qty = +4`, `store_to_id = sucursal destino`, motivo tipo "Ajuste automático de auditoría - Aumento".

### 3. Registros explícitos de transferencia

La función `transfer_inventory` inserta **2 filas** en `inventory_movements` con tipo **TRANSFER**:

| Fila | qty | store_from_id | store_to_id | reason |
|------|-----|---------------|-------------|--------|
| 1 | -4 | Sucursal 1 | Sucursal 2 | "Transferencia a [nombre sucursal 2]" |
| 2 | +4 | Sucursal 1 | Sucursal 2 | "Transferencia desde [nombre sucursal 1]" |

En ambas filas aparecen **origen y destino** (`store_from_id`, `store_to_id`).

---

## ¿Hay una sola fila o varias por transferencia?

**Actualmente NO está unificado** en una sola fila. Una transferencia genera **varias filas** en `inventory_movements`:

- **2 filas ADJUST** (del trigger: salida y entrada por tienda).
- **2 filas TRANSFER** (del RPC: salida y entrada con origen y destino explícitos).

En **Historial** y en **Panel de Auditoría** se muestran **todas** esas filas, porque ambas leen de `inventory_movements`.

---

## ¿Se podría unificar?

Sí. Una opción sería que `transfer_inventory` insertara **una sola fila TRANSFER** con:

- `qty` = cantidad transferida (positiva),
- `store_from_id` = sucursal origen,
- `store_to_id` = sucursal destino,
- `reason` = algo como "Transferencia: Sucursal 1 → Sucursal 2"

y que el trigger **no registre** movimientos cuando el cambio venga de una transferencia (por ejemplo, usando `app.movement_reason` como en los ajustes manuales). Eso implicaría cambios en la función `transfer_inventory` y en el trigger.

Mientras tanto, **ambos paneles muestran lo mismo** que está en la base de datos: varias filas por cada transferencia física.
