# AUDITORÍA POS-INV-UI-02
## Auditoría forense UI/UX de ALMACÉN
### TU MÓVIL POS DEFINITIVO

> **Alcance:** `/almacen` · `src/pages/AlmacenPage.tsx`  
> **Tipo:** documentación forense visual/comportamental — sin cambios de código  
> **Fecha:** 2026-09-01

---

## 1. Resumen ejecutivo

**Almacén** es una pantalla de **alta densidad operacional** organizada en columna vertical dentro de `container mx-auto p-6 space-y-6`. Combina: encabezado de página con acciones globales → barra de contexto de sucursal (KPI scope) → dashboard de KPIs y búsqueda (`InventoryDashboardHeader`) → paginación → tabla glass → paginación inferior → tres diálogos modales (`Lista de Inventario`, `ProductForm`, confirmación eliminar).

La unidad visual principal es **una fila de tabla = un producto**. El stock multi-sucursal vive en un **segundo `<tr>` expandible** (no modal) activado por el botón **“Inventario”**. Las acciones de stock (editar, transferir) ocurren **inline** dentro de celdas de sucursal, sin popovers.

---

## 2. Mapa anatómico (arriba → abajo)

```
ALMACÉN (/almacen)
│
├── [A] Page Header
│   ├── Título + subtítulo (izquierda)
│   └── Botones: Lista de Inventario | Nuevo Producto (derecha)
│
├── [B] StoreFilterBar
│   └── Contexto KPI sucursal (no filtra tabla)
│
├── [C] InventoryDashboardHeader
│   ├── Sección 1: Grid 4 KPIs (lg:4 cols)
│   ├── Sección 2: Grid 3 categorías top
│   └── Sección 3: Toolbar búsqueda + categoría
│
├── [D] ListPaginationBar (superior)
│
├── [E] Card tabla (glass-panel-dense)
│   ├── overflow-x-auto
│   └── table.glass-table
│       ├── thead (columnas fijas)
│       └── tbody
│           ├── tr — fila producto
│           └── tr — acordeón inventario (condicional)
│
├── [F] ListPaginationBar (inferior, border-t)
│
└── Modales (overlay, no en flujo)
    ├── Dialog — Lista de Inventario (PDF)
    ├── ProductForm — Dialog crear/editar
    └── Dialog — Confirmar eliminar producto
```

---

## 3. Fase 2 — Header y jerarquía superior

### [A] Page Header (`AlmacenPage.tsx` L548–572)

| Elemento | Detalle |
|----------|---------|
| Contenedor | `flex flex-col md:flex-row justify-between items-start md:items-center gap-4` |
| Izquierda | `h1` **“Almacén”** `text-3xl font-bold` |
| Subtítulo | `text-muted-foreground` — *“Gestión unificada de productos e inventario”* |
| Derecha | `flex flex-col sm:flex-row gap-2 w-full sm:w-auto` |

**Botones (derecha):**

| Botón | Clases | Icono | Rol |
|-------|--------|-------|-----|
| **Lista de Inventario** | `bg-primary-dark text-white` | `Package` | Todos — abre Dialog PDF |
| **Nuevo Producto** | `Button` default | `Plus` | Visible todos; backend valida |

**Jerarquía visual:** el título domina; acciones secundarias alineadas a la derecha en desktop, apiladas full-width en móvil.

**¿Qué ve primero el usuario?** Título “Almacén”, luego (scroll mínimo) la barra verde de sucursal, luego KPIs grandes.

### [B] StoreFilterBar (`StoreFilterBar.tsx`)

| Elemento | Detalle |
|----------|---------|
| Contenedor | `w-full glass-panel rounded-xl p-4 shadow-lg border border-emerald-500/30` |
| Layout | `flex justify-between gap-4 flex-wrap` |
| Izquierda | Icono `Store` emerald + “Información **Almacén** para:” + badge nombre tienda o “Todas las sucursales” |
| Derecha | `Select` `max-w-xs flex-1` — opciones: Todas + cada `availableStores` |

**Peso visual:** barra full-width, borde emerald; comunica contexto pero **no altera la tabla**.

### [C] InventoryDashboardHeader

Ocupa el bloque más alto de la pantalla antes de la tabla (KPIs + categorías + toolbar). Ver Fase 3 y 4.

---

## 4. Fase 3 — KPIs

Fuente: RPC `get_inventory_financial_summary` vía `useInventoryFinancialSummary(selectedStoreId)`.

**Responde a StoreFilterBar:** sí — si `selectedStoreId !== 'all'`, pasa `p_store_id` al RPC.

### Sección 1 — Grid 4 tarjetas (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`)

| # | Nombre UI | Valor principal | Secundario | Icono | Borde izq. | Badge |
|---|-----------|-----------------|------------|-------|------------|-------|
| 1 | Valor Total del Inventario | `formatCurrency(total_retail_value)` `text-2xl font-bold` | “{N} productos registrados” | `DollarSign` emerald | `border-l-emerald-400` | — |
| 2 | Productos Sin Stock | `out_of_stock_count` | “{X}% del total” | `AlertOctagon` red | `border-l-red-400` | “Requiere atención inmediata” (rojo claro) |
| 3 | Stock Bajo | `critical_stock_count` | “{N} críticos” | `AlertTriangle` yellow | `border-l-yellow-400` | “Reabastecimiento recomendado” |
| 4 | Unidades en Stock | `totalUnits` locale string | “Unidades en total” | `Package` blue | `border-l-blue-400` | — |

**Tarjeta base:** `glass-panel rounded-lg shadow-sm border border-white/10` + `CardContent p-5`.

**Estados:** skeleton pulse 4+3 cards mientras `loading`; error → valores 0.

**Interacción:** **ninguna** — no son clickeables, sin hover especial más allá del card.

**Operacionalmente:** orientan al admin sobre valor atrapado, agotados, críticos y volumen físico **antes** de buscar en tabla.

### Sección 2 — Top 3 categorías (`grid-cols-1 md:grid-cols-3 gap-4`)

Por cada categoría (top por `total_retail_value`):

- Icono categoría (Smartphone / Headphones / Wrench / Package) con color temático
- Nombre categoría `text-base font-semibold`
- Badge outline “Stock normal” (emerald) — **fijo**, no calculado por stock real de la categoría
- Valor retail `text-2xl font-bold`
- Líneas: productos, unidades, % del total

Empty: “No hay datos de categorías disponibles” centrado `col-span-3`.

---

## 5. Fase 4 — Buscador y filtros

### Toolbar (Sección 3 de `InventoryDashboardHeader`, L278–311)

| Control | Posición | Clases | Comportamiento |
|---------|----------|--------|----------------|
| Buscador | `flex-1 w-full` | `Input pl-10 glass-input`; icono `Search` absoluto left-3 | Placeholder: *“Buscar por nombre, SKU o código de barras...”* |
| Categoría | `w-full md:w-[180px]` | `Select` glass-input | Opciones: Todas, Teléfonos, Accesorios, Servicio Técnico |

**Debounce:** 300 ms (`useDebounce` en `AlmacenPage`) — tabla `opacity-70` mientras `searchTerm !== debouncedSearchTerm`.

### Filtros en código SIN UI visible

| Estado | Efecto | UI |
|--------|--------|-----|
| `lowStockOnly` | Filtra `total_stock < 5` | **No hay control** — deuda |
| `sortBy` / `sortOrder` | Orden name/price/stock/category | **No hay control** — deuda |
| `categoryFilter` en fetch | Recarga servidor al cambiar | Sí (Select) |

**Secuencia mental:** KPIs → (opcional) cambiar sucursal KPI → buscar texto → filtrar categoría → localizar fila → expandir Inventario → actuar.

**Empty state tabla:** icono `Package` 12×12 opacity-50 + “No se encontraron productos” `p-8 text-center text-muted-foreground`.

**Reset:** no hay botón “limpiar filtros”; usuario borra búsqueda y pone categoría “Todas”.

---

## 6. Fase 5 — Tabla principal

### Contenedor

- `Card` `glass-panel-dense transition-opacity duration-150`
- `CardContent p-0`
- `overflow-x-auto` — **scroll horizontal en pantallas estrechas**
- `table.w-full.glass-table`

### Paginación

- `useClientPagination(filteredProducts, 20)` — **20 productos por página**
- `ListPaginationBar` arriba y abajo: “Mostrando X–Y de Z productos · Página N de M” + Anterior/Siguiente

### Columnas (orden exacto)

| # | Label | Dato | Alineación | Formato | Color / badge | Permisos |
|---|-------|------|------------|---------|---------------|----------|
| 1 | SKU | `product.sku` | left | `font-mono text-sm text-white/90` | — | Todos |
| 2 | Nombre | `product.name` | left | `font-medium text-white` | — | Todos |
| 3 | Categoría | label categoría | left | Badge outline emerald | emerald-300 | Todos |
| 4 | Costo | `cost_usd` | right | `$X.XX` `text-white/75` | — | **admin, master_admin** |
| 5 | Precio | `sale_price_usd` | right | `$X.XX` `font-bold` | — | Todos |
| 6 | Stock Total | `total_stock` | right | entero | **rojo bold** si 0; blanco semibold si >0 | Todos |
| 7 | Estado | `active` | center | Badge | Activo default / Inactivo secondary | Todos |
| 8 | Acciones | botones | center | flex gap-2 | — | Ver todos; Edit/Trash admin |

**thead:** `py-4 px-4`; color neon green (`--color-neon-primary`) vía `.glass-table thead th`.

**Hover fila:** `background rgba(0,255,127,0.1)`.

### Por qué una fila = producto

- Catálogo es entidad `products`; inventario es atributo multi-dimensional (`inventories` por store).
- Mantiene densidad: decenas de productos visibles sin multiplicar filas por sucursal.
- **Siempre visible:** SKU, nombre, categoría, precio, stock total, estado, botón Inventario.
- **Oculto hasta expandir:** desglose por tienda, edición, transferencia, estadísticas del acordeón.

---

## 7. Fase 6 — Fila del producto (ejemplo)

```
Pantalla iPhone 13 | TEST-IP13-001 | Teléfonos | $450.00 | $599.00 | 12 | Activo | [Inventario ▼] [✎] [🗑]
```

| Aspecto | Implementación |
|---------|----------------|
| Tipografía SKU | mono, más pequeña, opacidad 90% |
| Nombre | peso medium, blanco pleno |
| Categoría | pill emerald semitransparente |
| Precio | bold derecha |
| Stock 12 | semibold blanco (si 0 → red-400 bold) |
| Estado | badge shadcn — **no** refleja stock bajo |
| Acciones | `Button variant="ghost" size="sm"` con texto + icono |
| Separación filas | `border-bottom white/8%` |
| Padding celda | `py-4 px-4` (~altura cómoda táctil) |

**Sin estado “fila seleccionada”** persistente — solo hover y fila expandida adicional debajo.

---

## 8. Fase 7 — Acordeón “Inventario”

### Activación

- Botón **“Inventario”** + `ChevronDown` → `toggleExpand(productId)` → añade id a `expandedProducts` Set.
- Expandido: texto **“Ocultar”** + `ChevronUp`.

### Estructura DOM

Segundo `<tr>` inmediatamente bajo la fila principal:

```html
<tr>
  <td colspan={7|8}>  <!-- 8 si canSeeCosts -->
    <div class="glass-muted-dark p-6 border-t border-white/10">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ...
      </div>
    </div>
  </td>
</tr>
```

- **Ancho:** 100% de la tabla (colspan total).
- **Fondo:** `glass-muted-dark` — verde oscuro semitransparente, blur 12px.
- **Separación:** `border-t border-white/10` respecto a la fila superior.

### Secciones internas (grid 2 columnas en md+)

**Columna 1 — Información del producto**

- `h3 text-xl font-bold` — nombre repetido
- Líneas `text-sm text-white/70`: Categoría, SKU, Código de barras (si existe)

**Columna 2 — Estadísticas (`grid grid-cols-2 gap-4`)**

| Celda | Label | Valor |
|-------|-------|-------|
| 1 | Stock Total | `text-2xl font-bold` |
| 2 | Tiendas | count de entradas inventario |
| 3 | Precio USD | `text-2xl` |
| 4 | Valor Total USD | `text-2xl text-emerald-300` (stock × precio) |

**Fila completa (md:col-span-2) — Stock por Tienda**

- Título `h4` + icono `Store` emerald: **“Stock por Tienda”**
- Grid: `grid-cols-2 gap-2`

### Representación textual

```
┌─ FILA TABLA ─────────────────────────────────────────────────────────┐
│ SKU | iPhone 13 | Teléfonos | ... | 12 | Activo | [Ocultar ▲]      │
└────────────────────────────────────────────────────────────────────┘
┌─ PANEL EXPANDIDO (glass-muted-dark) ────────────────────────────────┐
│  [Info producto]          │  [Stock Total: 12] [Tiendas: N]       │
│  Categoría, SKU, barcode  │  [Precio] [Valor total USD]           │
│────────────────────────────────────────────────────────────────────│
│  🏪 Stock por Tienda                                               │
│  ┌─────────────────────┐  ┌─────────────────────┐                │
│  │ Sucursal A          │  │ Sucursal B          │                │
│  │ 8        [✎][⇄]    │  │ 4        [✎][⇄]    │                │
│  └─────────────────────┘  └─────────────────────┘                │
└────────────────────────────────────────────────────────────────────┘
```

---

## 9. Fase 8 — Stock por tienda (celda sucursal)

Cada sucursal: `div.flex.items-center.justify-between.p-3.glass-muted-dark.rounded-lg.border.border-emerald-500/20.shadow-lg`

| Elemento | Detalle |
|----------|---------|
| Nombre | `p.font-medium.text-white` — izquierda |
| Cantidad >0 | `span.font-semibold.text-white` — derecha |
| Cantidad =0 | Badge **“SIN STOCK”** `bg-red-500/20 text-red-300 border red text-xs` |
| Editar | `Button ghost sm` + icono `Edit` — siempre visible (`isReadOnly = false`) |
| Transferir | `Button ghost sm` + `ArrowRightLeft` — solo si `qty > 0` |

**Stock mínimo (`min_qty`):** **no se muestra** en Almacén.

**Identificar ubicación física:** nombre de tienda explícito en cada celda; grid 2 columnas permite comparar sucursales lado a lado. Requiere expandir producto primero.

---

## 10. Fase 9 — Transferencia inline (UX)

### ANTES

Celda muestra: `{nombre tienda}` | `{qty}` | [Edit] | [Transferir]

### AL PULSAR TRANSFERIR (`startTransfer`)

La celda de **origen** reemplaza display por controles inline (`isTransferring = transfer.from === inv.store_id`):

```
[Select destino w-40] [Input qty w-24 min=1 max=inv.qty] [⇄ confirm] [X cancel]
```

- Destino: todas las tiendas excepto origen
- Cantidad default: `0` en estado (usuario debe ingresar)

### CONFIRMACIÓN

`window.confirm` nativo del navegador con:

- Producto, Desde, Hacia, Cantidad
- “Esta acción no se puede deshacer.”

### DURANTE RPC

- Botón transferir `disabled` si `processing`
- Texto “...” junto al icono

### ÉXITO

- Toast success: “Transferencia exitosa” + nombres tiendas
- Limpia estado `transferring`
- `fetchData()` — tabla refresca cantidades

### ERROR

- Toast destructive con mensaje RPC
- Controles permanecen hasta usuario cancele (X)

### Wireframe textual

```
NORMAL:     [Marino:  8]  [✎] [⇄]
TRANSFER:   [Marino: ▼Select destino] [2] [⇄] [X]
CONFIRM:    (diálogo sistema operativo)
SUCCESS:    [Marino:  6]  [✎] [⇄]     (otra celda B: 6)
```

**No muestra** stock destino previo ni preview “quedará en X”.

---

## 11. Fase 10 — Edición de stock inline

### Entry point

Icono `Edit` en celda sucursal → `startEditStock` → `editing: true`, `tempQty: inv.qty`.

### Controles

```
[Input number min=0 w-24] [Save icon] [X cancel]
```

### Guardar

- RPC `update_store_inventory` con qty absoluta
- Toast “Stock actualizado a N unidades”
- Actualización optimista local + `fetchData`

### Cancelar

- Restaura UI sin llamar backend

### Permisos

- UI: visible para **todos** los roles en Almacén
- Backend: `is_admin()` — **manager/cashier reciben error** toast

**Deuda a no heredar:** mostrar editar sin gate UI alineado al permiso real.

---

## 12. Fase 11 — Crear / editar producto

### Entry points

| Acción | Trigger | Condición UI |
|--------|---------|--------------|
| Nuevo | Header “Nuevo Producto” | Botón visible todos |
| Editar | Icono `Edit` en columna Acciones | `admin` \| `master_admin` |
| Eliminar | Icono `Trash2` | mismo → Dialog confirmación |

### ProductForm (`Dialog` `max-w-4xl max-h-[85vh] overflow-y-auto`)

**Campos:**

1. Nombre * (full width, `text-lg`)
2. Fila 3 cols: SKU *, Código barras, Categoría *
3. Fila 3 cols: Costo USD *, Precio venta *, Switch activo + margen %
4. Card **“Inventario por Tienda”** — grid `2/3/4 cols` con input qty por sucursal

**Relación stock:** al crear, inicializa qty 0 por tienda; al editar, carga `inventories` existentes.

**Cierre:** `onSuccess` → invalida cache + `fetchData()` + cierra modal — usuario vuelve a tabla con datos frescos.

**Eliminar producto:** Dialog separado — texto rojo “no se puede deshacer”; botón `variant="destructive"`. Acción = desactivar vía RPC `delete_product` (no hard delete visual en UI).

---

## 13. Fase 12 — Densidad y dimensiones (Tailwind/CSS)

| Token | Valor / clase |
|-------|----------------|
| Page container | `container mx-auto p-6 space-y-6 min-h-screen` |
| Gap vertical secciones | `space-y-6` (24px) |
| KPI grid gap | `gap-4` |
| Tabla celda padding | `py-4 px-4` |
| Acordeón padding | `p-6` |
| Celdas tienda | `p-3`, `rounded-lg` |
| Store grid | `grid-cols-2 gap-2` |
| Acordeón layout | `grid-cols-1 md:grid-cols-2 gap-6` |
| Border radius cards | `rounded-lg`, `rounded-xl` (StoreFilterBar) |
| Shadows | `shadow-lg`, `shadow-sm` en cards KPI |
| Typography título | `text-3xl font-bold` |
| Typography KPI valor | `text-2xl font-bold` |
| Typography acordeón stats | `text-2xl font-bold` |
| Paginación | `py-3 px-1`; botones `size="sm"` |
| Breakpoints | `sm:`, `md:`, `lg:` en headers, KPI grids, acordeón |
| Overflow tabla | `overflow-x-auto` — sin column hide |
| Sticky | **no hay** thead sticky |
| Opacity loading | `opacity-70` en refetch/filtro pendiente |

**CSS global (`index.css`):** `.glass-panel-dense`, `.glass-muted-dark`, `.glass-table` — ver Fase 13.

---

## 14. Fase 13 — Color y estética

### A. COLOR FUNCIONAL (heredable como semántica)

| Uso | Clases / valor |
|-----|----------------|
| Sin stock global (columna) | `text-red-400 font-bold` |
| Sin stock por tienda | Badge red-500/20 |
| KPI agotados | `border-l-red-400`, icon red |
| KPI stock bajo | `border-l-yellow-400` |
| KPI volumen | `border-l-blue-400` |
| Éxito toast | variant `success` |
| Error toast | variant `destructive` |
| Eliminar | `text-status-danger`, `variant="destructive"` |

### B. BRANDING — NO HEREDAR

| Elemento | Detalle |
|----------|---------|
| Glass morphism | `rgba` oscuro + `backdrop-blur(12px)` |
| Bordes emerald | `border-emerald-500/30`, neon `#00FF7F` en thead |
| `bg-primary-dark` | Verde `#00CC66` botones |
| `brightness-125` en iconos | Refuerzo neón |
| Hover fila tabla | `rgba(0,255,127,0.1)` |
| Badges categoría | emerald-300 sobre emerald-500/10 |

---

## 15. Fase 14 — Responsive

| Viewport | Comportamiento verificable |
|----------|---------------------------|
| **Desktop lg+** | KPIs 4 cols; categorías 3 cols; header acciones en fila; acordeón 2 cols |
| **Tablet md** | KPIs 2 cols; toolbar búsqueda + categoría en fila (`md:flex-row`); acordeón 2 cols |
| **Móvil** | KPIs 1 col; header botones full width apilados; tabla scroll horizontal; acordeón 1 col; store grid sigue 2 cols (`grid-cols-2`) |
| Columnas ocultas | **Ninguna** — tabla completa con scroll |
| Acordeón | De 2 columnas info/stats a 1 columna apilada |
| KPIs | Reorganizan grid, no desaparecen |

---

## 16. Fase 15 — Permisos visuales

| Elemento | admin | manager | cashier |
|----------|-------|---------|---------|
| Acceso `/almacen` | Sí | Sí | Sí |
| Columna Costo | Sí | No | No |
| Nuevo Producto (botón) | Visible | Visible | Visible |
| Editar/Eliminar producto (iconos) | Sí | No | No |
| Editar stock (icono) | Visible | Visible | Visible |
| Transferir (icono) | Visible | Visible | Visible |
| StoreFilterBar “Todas” | Sí | No (1 tienda) | No |
| Backend editar/transferir | admin | **bloqueado** | **bloqueado** |

**Inconsistencias documentadas:**

1. cashier/manager ven Edit/Transfer en Almacén → error al ejecutar.
2. `StoreFilterBar` para manager muestra una tienda pero KPI dice “para: {tienda}” mientras tabla es global.
3. `Nuevo Producto` visible a cashier sin gate UI.

---

## 17. Fase 16 — Flujo operativo

### Caso A: “¿Cuántas iPhone 13 y dónde?” (A=8, B=4)

1. Entrar menú **Almacén** (`/almacen`).
2. (Opcional) Buscar “iPhone 13” en toolbar — 1 tecleo + espera debounce.
3. Localizar fila — columna **Stock Total** muestra **12** (0 clics expand).
4. Clic botón **“Inventario”** — 1 clic.
5. Leer grid **Stock por Tienda**: A=8, B=4.

**Total interacciones mínimas:** 1 clic (o 1 búsqueda + 1 clic).

### Caso B: “Transferir 2 de A hacia B”

1. Pasos 1–4 anteriores (producto expandido).
2. En celda sucursal A, clic icono **transferir** (`ArrowRightLeft`) — 1 clic.
3. Select destino → B — 1 interacción.
4. Input cantidad → `2` — 1 interacción.
5. Clic botón confirmar transfer (icono ⇄) — 1 clic.
6. Aceptar `window.confirm` — 1 clic.
7. Toast éxito; tabla refresca A=6, B=6.

**Aproximado:** 6–7 interacciones tras tener producto localizado.

---

## 18. Fase 17 — Por qué funciona

| PRINCIPIO | EVIDENCIA | BENEFICIO | LIMITACIÓN |
|-----------|-----------|-----------|------------|
| **Progressive disclosure** | Acordeón “Inventario” | Lista densa sin ruido | +1 clic por producto |
| **Densidad operacional** | Tabla 8 cols, 20/página | Muchos SKU visibles | Curva aprendizaje |
| **Total primero, detalle después** | Columna Stock Total | Respuesta rápida “¿cuánto hay?” | No dice dónde sin expandir |
| **Acción junto al dato** | Edit/Transfer en celda tienda | Sin navegar a otra pantalla | Celda se congestiona en transfer |
| **Una entidad por fila** | 1 producto = 1 tr | Evita duplicación catálogo | Comparar sucursales entre productos es lento |
| **Feedback inmediato** | Toast + refetch + opacity loading | Confianza post-acción | confirm nativo poco branded |
| **Conservación visual total** | total_stock en fila y acordeón | Refuerza que transfer no pierde unidades | — |

---

## 19. Fase 18 — Qué no funciona

| Problema | Evidencia |
|----------|-----------|
| Selector sucursal engañoso | `StoreFilterBar` no filtra tabla |
| Filtros fantasma | `lowStockOnly`, `sortBy` sin UI |
| Acciones engañosas | Edit/Transfer visibles a cashier |
| Columna “Estado” ambigua | Activo producto ≠ estado stock |
| Badge “Stock normal” en KPI categoría | Texto fijo, no dinámico |
| `BranchStockMatrix` importado sin uso | L47 `AlmacenPage` |
| Sin preview transferencia | No muestra qty destino resultante |
| Sin stock mínimo en UI | `min_qty` en DB, no en pantalla |
| confirm() nativo | Rompe estética glass |
| Tabla sin sticky header | Scroll largo pierde encabezados |
| Categoría KPI badge incorrecto | Siempre “Stock normal” |

---

## 20. Fase 19 — Inventario de componentes

| COMPONENTE | ARCHIVO | FUNCIÓN | ESTADO | REUTILIZADO | DEPENDENCIAS | MADUREZ UX |
|------------|---------|---------|--------|-------------|--------------|------------|
| AlmacenPage | `src/pages/AlmacenPage.tsx` | Orquestación pantalla | Activo | — | Supabase, hooks, utils | Alta operativa, deuda permisos |
| StoreFilterBar | `components/inventory/StoreFilterBar.tsx` | Selector sucursal KPI | Activo | Artículos, Ventas | StoreContext | Media — label engañoso en Almacén |
| InventoryDashboardHeader | `components/inventory/InventoryDashboardHeader.tsx` | KPIs + búsqueda + categoría | Activo | Solo Almacén | useInventoryFinancialSummary | Alta visual, KPI cat. impreciso |
| inventoryCatalogFetch | `utils/inventoryCatalogFetch.ts` | Fetch + buildCatalogWithStock | Activo | Artículos, Estadísticas | supabase | Maduro |
| inventoryPageCache | `utils/inventoryPageCache.ts` | Cache sesión | Activo | Artículos | — | Maduro |
| AlmacenTableSkeleton | `InventoryLoadingSkeletons.tsx` | Loading tabla | Activo | Almacén | Skeleton | Maduro |
| ListPaginationBar | `components/ui/ListPaginationBar.tsx` | Paginación cliente | Activo | Varias páginas | — | Maduro |
| ProductForm | `components/pos/ProductForm.tsx` | Modal CRUD producto+stock | Activo | Artículos, POS | Dialog | Maduro |
| BranchStockMatrix | `components/inventory/BranchStockMatrix.tsx` | Matriz sucursal | **Huérfano** | Ninguno montado | useBranchStockMatrix | N/A |
| Dialog PDF | inline AlmacenPage | Export lista | Activo | Solo Almacén | inventoryListPdfGenerator | Aceptable |
| Dialog delete | inline AlmacenPage | Confirm eliminar | Activo | Solo Almacén | — | Maduro |
| Acordeón inventario | inline AlmacenPage L698–907 | Expansión multi-tienda | Activo | — | — | **Patrón clave** |
| Controles stock inline | inline AlmacenPage | Edit/transfer sin popover | Activo | — | RPCs | Funcional, permisos débiles |

---

## 21. Fase 20 — Contrato visual abstracto

### MUST (principios probados en Almacén)

1. Mostrar **stock total por producto** sin expandir.
2. Permitir **desglose por ubicación física** en un segundo nivel (no en la fila principal).
3. Colocar **acciones de stock junto a la sucursal** afectada.
4. Confirmar operaciones destructivas o de movimiento con **resumen explícito** (producto, origen, destino, cantidad).
5. Refrescar datos tras mutación con **feedback** (toast + recarga).
6. Paginar listas largas (~20 ítems) para rendimiento percibido.
7. Diferenciar visualmente **qty = 0** vs **qty > 0** en sucursal.

### SHOULD

1. Búsqueda con debounce y estado de carga sutil (opacity).
2. KPIs de resumen antes del listado operativo.
3. Skeleton específico de tabla durante carga inicial.
4. Scroll horizontal en tabla ancha en móvil.

### OPTIONAL

1. Top categorías financieras en header.
2. Export PDF de lista de conteo.
3. Estadísticas valor USD en acordeón.

### DO NOT COPY

1. Selector de sucursal que no filtra lo que su etiqueta implica.
2. Controles de filtro/orden en estado sin UI.
3. Botones de escritura visibles sin permiso UI.
4. `window.confirm` nativo como única confirmación.
5. Badge de estado de producto usado donde el usuario espera estado de stock.
6. Importar componentes no usados (`BranchStockMatrix`).
7. Estética glass/emerald/neon como requisito — es branding POS, no lógica inventario.

---

## 22. Evidencia técnica (índice rápido)

| Tema | Archivo:Líneas aprox. |
|------|----------------------|
| Layout página | `AlmacenPage.tsx` 545–572, 574–597 |
| Tabla columnas | `AlmacenPage.tsx` 600–696 |
| Acordeón | `AlmacenPage.tsx` 698–907 |
| Transfer UX | `AlmacenPage.tsx` 341–485, 806–865 |
| Edit stock | `AlmacenPage.tsx` 240–339, 772–805 |
| KPIs | `InventoryDashboardHeader.tsx` 105–311 |
| StoreFilterBar | `StoreFilterBar.tsx` completo |
| Glass CSS | `index.css` 235–355 |
| Paginación 20 | `useClientPagination.ts` CLIENT_PAGE_SIZE=20 |
| ProductForm | `ProductForm.tsx` 402–550 |

---

## 23. Conclusión

**Almacén** es la pantalla de referencia operativa del POS para inventario multi-sucursal en modo **tabla densa + revelación progresiva**. Su fortaleza UX es la separación clara entre **catálogo (fila)** y **ubicación (acordeón)**, con acciones inline contextualizadas. Sus debilidades son de **coherencia permisos/UI** y de **contexto de sucursal** en el selector superior.

Para reconstruir conceptualmente sin ver la pantalla: imaginar un dashboard KPI verde-oscuro glass, una tabla ancha de productos, y un panel expandible bajo cada fila con grid 2×N de sucursales y controles inline.

---

```
POS-INV-UI-02 = COMPLETE
CODE CHANGES = NONE
```
