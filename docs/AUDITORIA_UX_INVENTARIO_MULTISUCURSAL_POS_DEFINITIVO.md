# AUDITORÍA POS-INV-UX-01
## Modelo funcional UX/UI de Inventario Multi-Sucursal y Transferencias
### TU MÓVIL POS DEFINITIVO

> **Tipo:** auditoría factual — solo comportamiento real del código vigente.  
> **Alcance:** inventario, stock por sucursal, selector de sucursal, transferencias, movimientos, permisos.  
> **Fuera de alcance:** TU MÓVIL SERVICE, cambios de código, diseño de otro producto.  
> **Fecha:** 2026-09-01  
> **Roles en código:** `master_admin`, `admin`, `manager`, `cashier`. **No existe rol `operator`.**

---

## 1. Resumen ejecutivo

TU MÓVIL POS DEFINITIVO gestiona inventario multi-sucursal con **una fila por producto** en las pantallas principales (`/almacen`, `/articulos`). La columna **Stock Total** muestra la **suma global** de todas las sucursales. El desglose **por sucursal** existe, pero requiere **expandir** cada producto (acordeón “Inventario” / sección “Stock por Tienda”).

El **selector global de sucursal** (`StoreContext` + `StoreFilterBar`) aparece en Almacén y Artículos, pero **solo filtra los KPIs financieros** del encabezado (`InventoryDashboardHeader`, `ArticlesStatsRow`). **No filtra** el listado de productos ni las cantidades mostradas en la tabla/tarjetas.

Las **transferencias** no tienen ruta dedicada. Se inician **inline** desde el desglose por tienda de un producto, vía RPC `transfer_inventory`. El backend **solo permite `admin`**; la UI de Almacén muestra botones de transferencia/edición a todos los roles con acceso a la pantalla (inconsistencia UI/backend).

La **trazabilidad** vive en `/historial` (admin): movimientos `inventory_movements` con categorías Ventas / Aumentos / Disminuciones / Transferencias. Cada transferencia genera **dos filas** de movimiento (`TRANSFER`, qty negativo en origen y positivo en destino) más un registro en `inventory_transfers`.

**Modelo mental para el usuario admin:** ve **12** en Stock Total de inmediato; ve **8 y 4** tras **1 clic** por producto en “Inventario”. Puede confundir el selector “Todas las sucursales” con un filtro del catálogo — **no lo es**.

---

## 2. Mapa de archivos

### 2.1 FRONTEND

| Archivo | Responsabilidad | Ruta / pantalla | Relación multi-sucursal |
|---------|-----------------|-----------------|-------------------------|
| `src/pages/AlmacenPage.tsx` | Tabla unificada producto+inventario; edición stock; transferencia inline; PDF lista | `/almacen` | `total_stock` global; acordeón “Stock por Tienda”; RPC `transfer_inventory`, `update_store_inventory` |
| `src/pages/ArticulosPage.tsx` | Misma data en tarjetas; KPIs; transferencia en Popover | `/articulos` | Igual que Almacén; transferencia solo UI `admin` |
| `src/pages/EstadisticasPage.tsx` | Dashboard inventario agregado por tienda/categoría (lectura) | `/estadisticas` | Manager/cashier: inventario filtrado por `assigned_store_id` |
| `src/pages/HistorialPage.tsx` | Movimientos + cierres diarios (snapshots) | `/historial` | Filtro tienda **local** (`storeFilter`), no `StoreContext` |
| `src/pages/MasterAuditDashboardPage.tsx` | Auditoría movimientos/transferencias cross-company | `/master-audit` | Tab Transferencias sobre `inventory_transfers` |
| `src/pages/POS.tsx` | Venta; paso 1 selección tienda de operación | `/pos` | `selectedStore` obligatorio; descuenta stock de tienda activa |
| `src/pages/StoresPage.tsx` | CRUD sucursales | `/stores` | Solo admin |
| `src/contexts/StoreContext.tsx` | Estado global `selectedStoreId` / `availableStores` | Global (Provider en `App.tsx`) | Admin: `'all'` o UUID; cashier/manager: tienda asignada |
| `src/components/inventory/StoreFilterBar.tsx` | Selector “Todas las sucursales” + nombre tienda | Almacén, Artículos, Ventas | Escribe en `StoreContext`; **no filtra catálogo** en inventario |
| `src/components/inventory/InventoryDashboardHeader.tsx` | KPIs + búsqueda/categoría Almacén | `/almacen` | `useInventoryFinancialSummary(selectedStoreId)` |
| `src/components/inventory/ArticlesStatsRow.tsx` | KPIs Artículos | `/articulos` | Igual |
| `src/components/inventory/BranchStockMatrix.tsx` | Matriz stock por sucursal (`useBranchStockMatrix`) | **No montado** (import huérfano en `AlmacenPage`) | Componente existente sin uso en pantalla |
| `src/utils/inventoryCatalogFetch.ts` | `fetchAllActiveProducts`, `fetchInventoriesForProductIds`, `buildCatalogWithStock` | Util compartida Almacén/Artículos/Estadísticas | Calcula `total_stock` y rellena qty=0 por tienda sin registro |
| `src/utils/inventoryPageCache.ts` | Cache sesión listado inventario | Almacén/Artículos | — |
| `src/constants/stockAlerts.ts` | Umbrales alerta stock **global** (0 / 1-2 / 3-4 / ≥5) | Alertas dashboard / filtro “bajo stock” | `GLOBAL_STOCK_STORE_LABEL` |
| `src/hooks/useInventoryFinancialSummary.ts` | RPC `get_inventory_financial_summary` | KPIs encabezado | `p_store_id` null si `'all'` |
| `src/hooks/useBranchStockMatrix.ts` | RPC `get_stock_matrix_by_store` | Solo `BranchStockMatrix` | — |
| `src/App.tsx` | Rutas y guards | — | `CashierRouteGuard` bloquea cashier fuera de `/pos` y `/almacen` |
| `src/components/layout/MainLayout.tsx` | Navegación lateral por rol | — | Almacén: admin/manager/cashier; Historial: admin/master_admin |

### 2.2 BACKEND (RPC / funciones)

| RPC / función | Archivo migración | Responsabilidad multi-sucursal |
|---------------|-------------------|-------------------------------|
| `transfer_inventory` | `20250103000002_create_transfer_inventory_function.sql` | Mueve qty entre `store_id`; crea `inventory_transfers` + 2× `inventory_movements` |
| `update_store_inventory` | `20250826180000_enhance_products_inventory.sql` | UPSERT absoluto `inventories.qty` por producto+tienda; solo `is_admin()` |
| `get_inventory_financial_summary` | (migraciones financieras) | Agregación por company; `p_store_id` opcional |
| `get_stock_matrix_by_store` | (hook referencia) | Matriz sucursal × producto |
| `process_sale` | `20260602120000_require_phone_imei_process_sale.sql` | Descuenta `inventories` de `p_store_id` |
| `delete_sale_and_restore_inventory` | `20250127000001_enhance_delete_sale_with_audit.sql` | Restituye stock en `store_id` de la venta |
| `audit_inventory_change` (trigger) | `20250209160000` + `20250209200000` | INSERT `inventory_movements` tipo `ADJUST` en UPDATE `inventories` |

### 2.3 DATABASE

| Tabla / objeto | Migración base | Multi-sucursal |
|----------------|----------------|----------------|
| `inventories` | `20250822150200_306f5474-...sql` | `UNIQUE (company_id, store_id, product_id)`; `qty >= 0` |
| `inventory_movements` | misma | `store_from_id`, `store_to_id`; tipos IN/OUT/TRANSFER/ADJUST |
| `inventory_transfers` | `20250103000002` | `from_store_id`, `to_store_id`, `quantity`, `transferred_by` |
| `stores` | base | `company_id`, `active` |
| `users.assigned_store_id` | `20250827042900_enforce_store_assignment.sql` | Restringe cashier/manager en contexto y estadísticas |

---

## 3. Inventario — experiencia real

### 3.1 Pantallas y rutas

| Pantalla | Ruta | Roles (acceso) |
|----------|------|----------------|
| **Almacén** | `/almacen` | `cashier`, `manager`, `admin` (`ProtectedRoute requiredRole="cashier"`) |
| **Artículos** | `/articulos` | `manager`, `admin` (cashier bloqueado por `CashierRouteGuard`) |
| **Estadísticas** | `/estadisticas` | `manager`, `admin` |
| **Historial** | `/historial` | `admin`, `master_admin` |

No existe ruta `/inventario` ni `/transferencias`.

### 3.2 Qué representa una fila

**Una fila = un producto activo del catálogo**, no una fila por sucursal. El stock por sucursal es **secundario** (acordeón o lista dentro de tarjeta).

### 3.3 Columnas visibles — Almacén (`AlmacenPage.tsx` L602–612)

| Columna | Contenido |
|---------|-----------|
| SKU | `product.sku` |
| Nombre | `product.name` |
| Categoría | Badge con `getCategoryLabel` |
| Costo | Solo `admin` / `master_admin` |
| Precio | `sale_price_usd` |
| **Stock Total** | `product.total_stock` (suma global) |
| Estado | Badge **Activo/Inactivo** del producto (no estado de stock) |
| Acciones | Expandir Inventario; Editar/Eliminar producto (solo admin/master_admin) |

### 3.4 Columnas equivalentes — Artículos

Tarjeta por producto: SKU, categoría, **Stock por Tienda** (lista), **Stock Total** destacado, precio, valor total.

### 3.5 ¿Qué representa la cantidad?

| Ubicación | Significado |
|-----------|-------------|
| Columna **Stock Total** | **Stock global** — suma de todas las sucursales (`buildCatalogWithStock`, `inventoryCatalogFetch.ts` L224–231) |
| Acordeón **Stock por Tienda** | **Stock local** por `store_id` |
| KPIs del encabezado (`StoreFilterBar` + dashboard header) | Global si `'all'`; **solo sucursal seleccionada** si admin elige una tienda |

**Respuesta directa:** la tabla muestra **global**; el desglose local requiere expandir.

### 3.6 ¿Cómo sabe el usuario dónde está físicamente el producto?

Tras expandir “Inventario”, ve grid **Stock por Tienda** con `store_name` + `qty` por sucursal (`AlmacenPage.tsx` L746–901). Tiendas sin registro en `inventories` aparecen con **qty = 0** (relleno en `buildCatalogWithStock` L211–219).

### 3.7 ¿Visualización simultánea multi-sucursal?

**Sí**, dentro del acordeón expandido de un producto: todas las sucursales activas en paralelo.

### 3.8 Escenario iPhone: A=8, B=4, TOTAL=12

| Qué ve | Cuándo |
|--------|--------|
| **12** en columna Stock Total | Inmediato al cargar `/almacen` |
| **Sucursal A: 8**, **Sucursal B: 4** | Tras **1 clic** en “Inventario” / expandir acordeón |
| **12** también en panel estadísticas del acordeón (“Stock Total”) | Mismo expand |

**No** hay vista de tabla que muestre A, B y Total en la fila principal sin expandir.

### 3.9 Acciones para obtener A, B y Total

| Información | Clics mínimos (admin en Almacén) |
|-------------|----------------------------------|
| Total 12 | 0 (columna Stock Total) |
| A=8, B=4 | 1 expand por producto |
| KPIs financieros por sucursal A solamente | 1 cambio en `StoreFilterBar` (encabezado) — **no cambia** filas del listado |

### 3.10–3.16 Vistas consolidada / por sucursal / “Todas las sucursales”

| Pregunta | Respuesta |
|----------|-----------|
| ¿Vista consolidada? | **Sí** — fila principal + `total_stock` |
| ¿Vista por sucursal? | **Sí** — solo en acordeón expandido |
| ¿Opción “Todas las sucursales”? | **Sí** — `StoreFilterBar` (`StoreFilterBar.tsx` L50–54) |
| ¿Al seleccionarla filtra productos? | **No** — solo KPIs del header |
| ¿Agrupa productos? | **Sí** — un producto = una fila |
| ¿Duplica filas por sucursal? | **No** |
| ¿Suma cantidades en listado? | **Sí** — en columna Stock Total |
| ¿Muestra distribución sin expandir? | **No** |

### 3.17–3.18 Productos sin existencia en una sucursal

**Aparecen con 0** en el acordeón (no desaparecen). Evidencia: `buildCatalogWithStock` inserta `{ store_id, store_name, qty: 0 }` para tiendas faltantes.

### 3.19 Disponible / bajo stock / agotado

| Nivel | Regla (global `total_stock`) | UI Almacén |
|-------|------------------------------|------------|
| Agotado global | `total_stock === 0` | Texto rojo en columna Stock Total (L640–641) |
| Sin stock por tienda | `inv.qty === 0` | Badge **SIN STOCK** en acordeón (L868–871) |
| Bajo stock (filtro) | `total_stock < 5` (`isGlobalNonNormalStock`, `stockAlerts.ts`) | Checkbox/filtro “solo bajo stock” en header |
| Estado columna “Estado” | — | **Activo/Inactivo** del producto, **no** semántica de inventario |

Umbrales alertas globales (`stockAlerts.ts`): 0 agotado; 1–2 crítico; 3–4 bajo; ≥5 normal.

---

## 4. Selector / contexto de sucursal

### 4.1 Tipos de contexto coexistiendo

| Tipo | Implementación | Alcance |
|------|----------------|---------|
| **Sucursal activa global** | `StoreContext.selectedStoreId` | POS, KPIs inventario/ventas |
| **Filtro local de pantalla** | `HistorialPage.storeFilter` | Solo historial movimientos |
| **Sucursal asignada al usuario** | `users.assigned_store_id` | cashier/manager en `StoreContext`, Estadísticas, POS |
| **Origen/destino transferencia** | Estado local `transferring` en Almacén/Artículos | Por operación; origen = fila donde se pulsó transferir |

### 4.2 Selector global — respuestas

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Dónde está? | `StoreFilterBar` en `/almacen`, `/articulos`, `/sales`; wizard paso 1 en `/pos` |
| 2 | Texto/badge | Icono `Store`; “Información {página} para: **Todas las sucursales**” o nombre tienda; `<Select>` lateral |
| 3 | ¿Siempre visible? | En pantallas que montan `StoreFilterBar` — **sí** en Almacén/Artículos/Ventas |
| 4 | ¿Qué cambia al seleccionar? | KPIs financieros; en Ventas sincroniza filtros; **no** listado inventario |
| 5 | Pantallas dependientes | POS (venta), KPIs Almacén/Artículos, filtros Ventas |
| 6 | ¿Inventario listado depende? | **No** |
| 7 | ¿Facturación depende? | **Sí** — `process_sale` usa `p_store_id` de tienda POS |
| 8 | ¿Movimientos dependen? | **No** — Historial usa filtro propio |
| 9 | ¿Transferencias dependen? | **No** — origen/destino elegidos en formulario inline |
| 10 | ¿Admin puede cambiar? | **Sí** — todas las tiendas + “Todas las sucursales” |
| 11 | ¿Operator? | Rol **no existe**. **Cashier:** una tienda asignada, sin selector efectivo multi-tienda |
| 12 | `assigned_store_id` | cashier/manager: `StoreContext` carga solo esa tienda; Estadísticas filtra inventario por ese ID |
| 13 | ¿Riesgo de confusión? | **Sí** — barra dice “Información Almacén para: Sucursal X” pero tabla sigue mostrando stock global |
| 14 | ¿Cómo lo mitiga? | Badge textual en barra; en POS paso dedicado “Tienda de Operación” + badge persistente en checkout |

**Evidencia:** `StoreContext.tsx` L62–105; `StoreFilterBar.tsx` L16–66; `AlmacenPage.tsx` fetch sin `selectedStoreId` (L178–181).

---

## 5. Modelo mental multi-sucursal (simulación iPhone 13)

**Datos:** Sucursal A = 8, Sucursal B = 4, Total = 12.

### Admin en `/almacen`

| Pregunta | Respuesta |
|----------|-----------|
| A. ¿Qué ve al entrar? | Tabla productos; iPhone con **Stock Total 12**; `StoreFilterBar` en “Todas las sucursales” |
| B. ¿Ve 12? | **Sí** — inmediato |
| C. ¿Ve 8 y 4? | **No** hasta expandir |
| D. ¿Solo una sucursal? | **No** en total; desglose requiere expand |
| E. ¿Cómo descubre la otra? | Clic “Inventario” → grid por tienda |
| F. ¿Cuántos clics? | **1** para A y B |
| G. ¿Sucursal activa? | Barra superior KPI (afecta KPIs, no tabla); en POS sí es crítica |
| H. ¿Puede confundir global vs local? | **Sí** — selector sugiere filtro que no aplica al listado |
| I. ¿Qué reduce confusión? | Etiqueta “Stock Total”; sección “Stock por Tienda” con icono `Store` |
| J. Limitaciones | Sin matriz compacta todas las sucursales; `BranchStockMatrix` no usado; manager en Artículos no transfiere |

### Manager en `/articulos`

Ve misma estructura de stock global + desglose, pero **sin** botones transferir/editar stock (UI `admin` only, `ArticulosPage.tsx` L651, L741).

### Cashier en `/almacen`

Acceso lectura navegación; botones editar/transferir **visibles** en Almacén (RLS/RPC rechazarán). Solo `/pos` y `/almacen` permitidos (`CashierRouteGuard`).

---

## 6. Transferencias — flujo real completo

### 6.1 Ruta y punto de entrada

| Campo | Valor |
|-------|-------|
| Ruta dedicada | **No existe** |
| Pantallas | `/almacen` (tabla) o `/articulos` (tarjetas) |
| Inicio | Expandir producto → fila de sucursal origen con `qty > 0` → botón `ArrowRightLeft` |

### 6.2 Pasos UX — Almacén

1. Usuario en `/almacen` → expandir producto (“Inventario”).
2. En sucursal origen con stock → clic icono **transferir** (`startTransfer`, L341–347).
3. UI inline: `<Select>` destino (todas las tiendas excepto origen), `<Input>` cantidad (`max={inv.qty}`, L833).
4. Confirmar → `window.confirm` con resumen producto/origen/destino/cantidad (L408–415).
5. RPC `transfer_inventory` (L433–440).
6. Toast éxito + `fetchData()` recarga catálogo.

### 6.3 Pasos UX — Artículos

Igual lógica RPC; UI en **Popover**; **sin** `window.confirm`; botón transferir solo si `role === 'admin'` (L741).

### 6.4 Respuestas checklist transferencia

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | Origen | Implícito: sucursal de la fila donde se pulsó transferir |
| 2 | Destino | Select “A tienda…” / “Tienda Destino” |
| 3 | Producto | Contexto del acordeón/tarjeta expandida |
| 4 | Cantidad | Input numérico; `max` = stock origen en UI |
| 5 | Varios productos | **No** en una sola operación — una transferencia por producto |
| 6 | Stock origen mostrado | `inv.qty` en la fila |
| 7 | Stock destino mostrado | **No** antes de confirmar |
| 8 | Resultado esperado preview | **No** — solo diálogo confirm Almacén |
| 9 | Cantidad > disponible | UI limita `max`; backend `INSUFFICIENT_STOCK` con mensaje “Disponible: N” |
| 10 | Origen = destino | Backend `SAME_STORE`; destino excluido del Select |
| 11 | Producto no existe en destino | RPC crea fila `inventories` con qty=0 antes de sumar (`20250103000002` L239–255) |
| 12 | Confirmación visual | `window.confirm` (Almacén); Popover botones (Artículos) |
| 13 | Éxito | Toast “Transferencia exitosa” + descripción con nombres tiendas |
| 14 | Error | Toast destructivo con `data.message` o error RPC |
| 15 | Efecto en Inventario | Recarga inmediata; `total_stock` invariante; origen −N, destino +N |
| 16 | Trazabilidad | `inventory_transfers.id`; 2× `inventory_movements` tipo `TRANSFER` |
| 17 | Referencia compartida | Mismo `product_id`, `store_from_id`, `store_to_id`, `company_id`; textos reason enlazados por nombres tienda |

### 6.5 Permiso transferencia

| Capa | Regla |
|------|-------|
| RPC | Solo `role = 'admin'` (`20250103000002` L150–158) |
| RLS `inventory_transfers` INSERT | `admin` o `manager` — **discrepancia** con RPC |
| UI Artículos | Solo `admin` |
| UI Almacén | Botón visible para todos; **backend bloquea** no-admin |

---

## 7. Antes / durante / después (A=8, B=4 → transferir 2 de A a B)

### ANTES (confirmar transferencia)

| Ubicación | Sucursal A | Sucursal B | Total |
|-----------|------------|------------|-------|
| Columna Stock Total | — | — | **12** |
| Acordeón expandido | **8** | **4** | panel “Stock Total” **12** |
| KPI header (`'all'`) | agregado | agregado | coherente con 12 |

### DURANTE (formulario inline abierto)

- Origen fijado (A); usuario elige destino B y cantidad 2.
- Input `max=8`.
- **No** se muestra preview “A quedará en 6, B en 6”.
- Almacén: diálogo confirm textual antes de RPC.

### DESPUÉS (RPC exitoso + `fetchData`)

| Ubicación | A | B | Total |
|-----------|---|---|-------|
| Acordeón | **6** | **6** | **12** |
| Columna Stock Total | — | — | **12** (sin cambio) |
| `inventory_transfers` | 1 fila: A→B, qty=2 | | |
| `inventory_movements` | TRANSFER qty **-2** (origen) | TRANSFER qty **+2** (destino) | 2 filas |

**Información que hace intuitivo el flujo:** total conservado; nombres de tiendas en confirm/toast; recarga automática.

**Gap:** sin preview numérico post-transferencia en destino antes de confirmar.

---

## 8. Movimientos y trazabilidad

### 8.1 Pantalla

**`/historial`** — tab **Movimientos** (`HistorialPage.tsx`).

### 8.2 Respuestas

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Cómo aparece transferencia? | **Dos filas** `type=TRANSFER` (salida negativa, entrada positiva) |
| 2 | ¿Una o dos filas? | **Dos** |
| 3 | OUT vs IN | Ambas categorizadas **TRANSFERENCIAS** (`getMovementCategory` L103–108); qty signo ± |
| 4 | ¿Muestra sucursal? | Expandible: “Desde {A} → Hacia {B}” (`getStoreDisplay` L578–582) |
| 5 | before/after | Si `old_qty`/`new_qty` presentes: “Conciliación: X → Y” (típico en ADJUST) |
| 6 | Actor | `user_name` de join `users` |
| 7 | Fecha | Columna Hora + detalle con segundos |
| 8 | Referencia | `reason` (“Transferencia a/desde …”); **no** link UI a `inventory_transfers.id` |
| 9 | Navegación movimiento → transferencia | **No** — sin drill-down a registro transfer |
| 10 | ¿Reconstruible visualmente? | **Sí** con filtros tab Transferencias + detalle expandible |

### 8.3 Otras fuentes de movimientos

| Origen | Tipo | Categoría UI |
|--------|------|--------------|
| Venta `process_sale` | OUT | VENTAS |
| Anulación venta | IN | TRANSFERENCIAS (por regla `IN`) |
| Ajuste manual `update_store_inventory` | ADJUST (trigger) | AUMENTOS / DISMINUCIONES |
| Transferencia | TRANSFER ×2 | TRANSFERENCIAS |

### 8.4 Master audit

`/master-audit` — tab Transferencias consulta tabla `inventory_transfers` directamente (`MasterAuditDashboardPage.tsx`).

---

## 9. Permisos

> **Nota:** no existe rol `operator`. Se documenta `cashier` como rol operativo de mostrador.

### 9.1 Matriz por rol

| Capacidad | admin | manager | cashier | master_admin |
|-----------|-------|---------|---------|--------------|
| Ver todas sucursales (StoreContext) | Sí | No (asignada) | No | Sí (else branch) |
| Cambiar selector global | Sí | No (1 tienda) | No | Sí |
| Acceso `/almacen` | Sí | Sí | Sí | Ruta permitida; sin ítem nav |
| Acceso `/articulos` | Sí | Sí | No (guard) | No nav |
| Acceso `/historial` | Sí | No | No | Sí |
| Ajustar stock UI | Almacén: botón visible; Artículos: admin only | Almacén: visible; Artículos: oculto | Almacén: visible | — |
| Ajustar stock backend | `update_store_inventory` — **admin** | **Bloqueado** RPC | **Bloqueado** | **Bloqueado** |
| Transferir UI | Almacén: visible; Artículos: admin | Artículos: oculto; Almacén: visible | Almacén: visible | — |
| Transferir backend | **Permitido** | **Bloqueado** RPC | **Bloqueado** | **Bloqueado** |
| Ver movimientos | `/historial` | No ruta | No | `/historial` + master-audit |
| Consultar stock otra sucursal | Sí (RLS company-wide SELECT) | Sí en Almacén (desglose todas) | Sí en Almacén lectura | RLS cross-company lectura |

### 9.2 Capas de control

| Operación | UI HIDES | BACKEND BLOCKS | RLS BLOCKS | RPC VALIDATES |
|-----------|----------|----------------|------------|---------------|
| Transferir (manager) | Artículos sí; Almacén **no** | RPC admin only | INSERT transfer manager permitido* | admin |
| Ajustar stock (manager) | Artículos sí; Almacén **no** | `is_admin()` | UPDATE inventories manager permitido | admin |
| Transferir (cashier) | Almacén **no** | RPC | — | admin |
| Ver inventario otra tienda | — | — | SELECT por `company_id` | — |

\*RLS permite INSERT a manager en `inventory_transfers`, pero RPC rechaza — inconsistencia.

### 9.3 Evidencia permisos

- `transfer_inventory`: `20250103000002` L150–158
- `update_store_inventory`: `20250826180000` — `is_admin()`
- `ArticulosPage.tsx` L651, L741
- `AlmacenPage.tsx` L761, L877 — `isReadOnly = false` siempre
- `MainLayout.tsx` L77–128 — ítems por rol

---

## 10. Patrones UX maduros

| NOMBRE | PROBLEMA | CÓMO FUNCIONA | ARCHIVO | VENTAJA | LIMITACIÓN |
|--------|----------|---------------|---------|---------|------------|
| **Fila única + desglose** | Ver catálogo sin duplicar productos | 1 fila/producto; acordeón multi-tienda | `AlmacenPage`, `buildCatalogWithStock` | Escalable con muchos SKU | Total visible; detalle oculto |
| **Relleno cero por tienda** | Saber ausencia en sucursal | Inserta qty=0 para tiendas sin fila DB | `inventoryCatalogFetch.ts` L211–219 | No oculta sucursales vacías | Lista larga si muchas tiendas |
| **Transferencia atómica RPC** | Consistencia masa inventario | Una RPC: validar, restar, sumar, auditar | `20250103000002` | Conservación total unidades | Solo admin |
| **Confirmación destructiva** | Evitar transferencias accidentales | `window.confirm` con resumen | `AlmacenPage` L408–415 | Claridad origen/destino | Solo Almacén; no Artículos |
| **POS: paso tienda obligatorio** | Venta en sucursal equivocada | Wizard paso 1 + badge tienda | `POS.tsx` | Usuario sabe dónde vende | Separado de pantalla inventario |
| **Historial categorizado** | Mezcla ventas/ajustes/transferencias | Tabs + colores por categoría | `HistorialPage` | Lectura operativa rápida | Transfer = 2 filas puede confundir |
| **Cache + invalidación** | UI obsoleta post-mutación | `invalidateInventoryCatalogMemory` tras transfer/ajuste | `inventoryCatalogFetch`, páginas | Refresco coherente | TTL 3 min memoria |

---

## 11. Limitaciones y deuda

### 11.1 Clasificación de patrones

| Patrón | Clasificación |
|--------|---------------|
| RPC `transfer_inventory` atómica | **MADURO** |
| `buildCatalogWithStock` con ceros | **MADURO** |
| Acordeón stock por tienda | **ACEPTABLE** |
| `StoreFilterBar` sin filtrar listado | **DEUDA** — ambigüedad UX |
| `BranchStockMatrix` importado no usado | **DEUDA** |
| Botones transfer/edit Almacén para cashier/manager | **RIESGOSO** — UI promete acción que RPC niega |
| RLS manager INSERT transfer vs RPC admin | **RIESGOSO** — inconsistencia capas |
| Sin preview stock destino en transferencia | **ACEPTABLE** / deuda menor |
| Columna “Estado” = activo producto, no stock | **DEUDA** — naming confuso |
| `assigned_store_id` no validado en `process_sale` vigente (202606) | **RIESGOSO** — fuera UX inventario pero afecta stock por tienda en venta |
| Historial: `IN` anulación clasificado como TRANSFERENCIAS | **DEUDA** — categorización imperfecta |
| Rol `operator` ausente | N/A — usar `cashier` |

### 11.2 Riesgos explícitos

1. **Selector global engañoso** en inventario: usuario cree que filtra stock visible.
2. **Demasiados clics** para comparar sucursales de muchos productos (1 expand cada uno).
3. **Duplicación semántica** Almacén vs Artículos con reglas permisos distintas.
4. **Lógica permisos en frontend inconsistente** (`isReadOnly = false` + comentarios “RLS determinará”).

---

## 12. Principios funcionales extraíbles

### 12.1 PRINCIPIO PROBADO (respaldado por implementación)

1. **El stock total y el stock por sucursal deben mostrarse con etiquetas distintas** — el POS usa “Stock Total” vs “Stock por Tienda”.
2. **Una transferencia debe validar cantidad ≤ stock origen en backend** — `INSUFFICIENT_STOCK` en RPC.
3. **La masa total de unidades debe conservarse en transferencia** — UPDATE origen y destino en misma función.
4. **Toda mutación de stock debe dejar rastro auditable** — `inventory_movements` + `inventory_transfers`.
5. **El punto de venta debe fijar sucursal antes de vender** — wizard POS paso 1.
6. **Tiendas sin registro de inventario deben mostrarse como 0**, no omitirse — `buildCatalogWithStock`.

### 12.2 PATRÓN ESPECÍFICO DEL POS (no generalizar sin adaptar)

1. Selector `'all'` como string en `selectedStoreId` para admin.
2. Transferencia inline en acordeón de producto (sin módulo dedicado).
3. Dos pantallas paralelas Almacén (tabla) y Artículos (tarjetas) con mismos datos.
4. KPIs financieros desacoplados del listado de stock.

### 12.3 DEUDA QUE NO DEBE REPLICARSE

1. Filtro de sucursal que no filtra lo que la etiqueta implica.
2. Mostrar acciones de escritura sin gate UI alineado al RPC.
3. Componentes huérfanos (`BranchStockMatrix`, `InventoryFinancialHeader`).
4. Discrepancia RLS vs RPC en transferencias.
5. Columna “Estado” que no comunica estado de inventario.

---

## 13. Evidencia técnica (índice)

| Conclusión | Archivo | Función / elemento |
|------------|---------|-------------------|
| Stock total = suma global | `src/utils/inventoryCatalogFetch.ts` | `buildCatalogWithStock` L224–231 |
| Ceros por tienda faltante | mismo | L211–219 |
| Columnas tabla Almacén | `src/pages/AlmacenPage.tsx` | L602–642, L746–901 |
| Transferencia inline | `src/pages/AlmacenPage.tsx` | `startTransfer`, `executeTransfer` L341–485 |
| Transfer solo admin UI Artículos | `src/pages/ArticulosPage.tsx` | L741 |
| StoreContext roles | `src/contexts/StoreContext.tsx` | L62–105 |
| StoreFilterBar | `src/components/inventory/StoreFilterBar.tsx` | completo |
| KPIs usan selectedStoreId | `src/components/inventory/InventoryDashboardHeader.tsx` | L42–43 |
| RPC transfer | `supabase/migrations/20250103000002_create_transfer_inventory_function.sql` | `transfer_inventory` |
| RPC ajuste | `supabase/migrations/20250826180000_enhance_products_inventory.sql` | `update_store_inventory` |
| Movimientos transfer 2 filas | `20250103000002` | L288–330 |
| Historial UI | `src/pages/HistorialPage.tsx` | `getStoreDisplay`, tabs L1014+ |
| Rutas y guards | `src/App.tsx` | L148–157, L357–471 |
| Nav por rol | `src/components/layout/MainLayout.tsx` | L63–136 |
| Umbrales stock global | `src/constants/stockAlerts.ts` | constantes L1–49 |

---

## 14. Conclusión

TU MÓVIL POS DEFINITIVO implementa un modelo **híbrido consolidado/local**: el usuario siempre ve el **total global** por producto y obtiene la **distribución física por sucursal** al expandir. El selector global de sucursal gobierna **contexto financiero y ventas**, no el listado de inventario — diferencia crítica para quien audite o replique el sistema.

Las transferencias son **correctas a nivel de motor** (RPC atómica, auditoría dual, conservación de unidades) pero la **UX de permisos** es irregular entre Almacén y Artículos, y entre UI y backend. El historial en `/historial` permite reconstruir operaciones con filtros por día, tienda y categoría.

Para una referencia funcional hacia otro producto: **heredar** el desglose por sucursal con ceros explícitos, la RPC de transferencia y la separación etiquetada total/local; **no heredar** el desacople selector/listado ni los botones de acción visibles sin permiso real.

---

```
POS-INV-UX-01 AUDIT = COMPLETE
SERVICE CODE CHANGES = NONE
POS CODE CHANGES = NONE
```
