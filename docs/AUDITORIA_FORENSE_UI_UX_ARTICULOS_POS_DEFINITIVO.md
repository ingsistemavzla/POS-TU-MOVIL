# AUDITORÍA POS-MER-UI-01
## Auditoría forense UI/UX de ARTÍCULOS
### TU MÓVIL POS DEFINITIVO

> **Pantalla:** `/articulos` · `src/pages/ArticulosPage.tsx`  
> **Traducción futura (externa):** ARTÍCULOS POS → MERCANCÍA SERVICE  
> **Tipo:** auditoría factual — sin cambios de código  
> **Fecha:** 2026-09-01

---

## 1. Resumen ejecutivo

**Artículos** es la vista **card-based** del mismo catálogo+inventario que Almacén. Organiza el contenido en un **grid responsive** (1→4 columnas) donde cada tarjeta expone **nombre, SKU, categoría, stock por sucursal, stock total, precio y valor** sin expandir acordeón.

Las acciones de stock usan **Popovers** (editar índigo, transferir morado). La confirmación de edición de stock usa un **AlertDialog verde** dedicado; la transferencia solo **toast** (sin `window.confirm`).

**Diferencia estructural crítica vs Almacén:** Artículos construye el desglose multi-sucursal con `availableStores` de `StoreContext`. Un **manager** solo ve su tienda asignada en las cards; **Almacén** consulta **todas** las tiendas activas vía Supabase.

**Cashier** no accede a `/articulos` (`CashierRouteGuard` → redirección a `/pos`).

---

## 2. Anatomía completa (arriba → abajo)

```
ARTÍCULOS (/articulos)
│
├── [A] Page Header
│   ├── Título + subtítulo (izq.)
│   └── Botón Nuevo Producto (der., solo admin)
│
├── [B] StoreFilterBar
│   └── Contexto KPI por sucursal (no filtra grid)
│
├── [C] ArticlesStatsRow
│   ├── Fila 1: 4 KPIs financieros
│   └── Fila 2: 3 tarjetas fijas por categoría (Teléfonos, Accesorios, Servicio)
│
├── [D] Card filtros
│   ├── Buscador (flex-1)
│   └── Select categoría (md:w-[200px])
│
├── [E] ListPaginationBar (superior)
│
├── [F] Grid de Cards
│   └── Card producto × N (paginado 20)
│       ├── CardHeader (nombre + badge)
│       ├── CardContent (SKU, stock tiendas, total, precio, acciones)
│       └── Popovers anclados a iconos por sucursal
│
├── [G] ListPaginationBar (inferior)
│
└── Overlays
    ├── ProductForm (Dialog crear/editar)
    ├── AlertDialog verde (confirmación stock actualizado)
    └── Dialog (confirmar eliminar producto)
```

### Tabla de bloques

| Bloque | Componente | Archivo | Propósito | Interacción | Permisos |
|--------|------------|---------|-----------|-------------|----------|
| Header | inline | `ArticulosPage.tsx` L501–517 | Identidad pantalla + crear producto | Click Nuevo Producto | Crear: **admin** |
| StoreFilterBar | `StoreFilterBar` | `components/inventory/StoreFilterBar.tsx` | Scope KPIs | Select sucursal | Admin: todas; manager: una |
| KPIs | `ArticlesStatsRow` | `components/inventory/ArticlesStatsRow.tsx` | Resumen financiero | Ninguna | Todos con acceso |
| Filtros | `Card` + Input/Select | `ArticulosPage.tsx` L525–560 | Buscar y filtrar categoría | Texto + select | Todos |
| Grid | `Card` × productos | L580–961 | Exploración visual catálogo | Scroll, popovers | Acciones según rol |
| Paginación | `ListPaginationBar` | `components/ui/ListPaginationBar.tsx` | 20 cards/página | Anterior/Siguiente | Todos |
| ProductForm | `ProductForm` | `components/pos/ProductForm.tsx` | CRUD producto+stock inicial | Dialog modal | Admin (UI) |
| Stock confirm | `AlertDialog` | L997–1029 | Feedback post-edición stock | “Entendido” | Admin |
| Delete confirm | `Dialog` | L1032–1058 | Confirmar desactivar producto | Cancelar/Eliminar | Admin |

---

## 3. Header

| Elemento | Implementación |
|----------|----------------|
| Contenedor | `flex flex-col md:flex-row justify-between items-start md:items-center gap-4` |
| Título | `h1 text-3xl font-bold text-white` — **“Artículos”** |
| Subtítulo | `text-white/70` — *“Vista de tarjetas - Gestión de productos e inventario”* |
| Icono en título | **No hay** icono en el h1 (a diferencia del menú `Grid3x3`) |
| Botón derecha | **Nuevo Producto** — `Button` + `Plus`; **solo si `role === 'admin'`** |
| Acciones adicionales | **No hay** PDF ni “Lista de Inventario” (sí existen en Almacén) |

**Jerarquía:** título blanco dominante; subtítulo explica el paradigma “tarjetas”; única CTA primaria a la derecha (admin).

**Responsive:** en móvil, título y botón apilados; botón no fuerza `w-full` (a diferencia de Almacén que usa `w-full sm:w-auto` en ambos botones).

---

## 4. KPIs — ArticlesStatsRow

**Fuente:** `useInventoryFinancialSummary(selectedStoreId)` — mismo RPC que Almacén.

**Responde a StoreFilterBar:** sí.

### Fila 1 — 4 KPIs (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6`)

| KPI | Label UI | Valor | Color borde | Badge extra |
|-----|----------|-------|-------------|-------------|
| 1 | **Valor Total** | `formatCurrency(total_retail_value)` | emerald | Subtexto: productos + unidades en una línea |
| 2 | **Sin Stock** | `out_of_stock_count` | red | “Atención Inmediata” |
| 3 | **Stock Bajo** | `critical_stock_count` | yellow | “Reabastecer” |
| 4 | **Unidades** | `totalUnits` locale | blue | Sin subtexto |

### Fila 2 — 3 categorías fijas (`md:grid-cols-3`)

Siempre muestra **Teléfonos**, **Accesorios**, **Servicio** (no top-3 dinámico por valor como Almacén):

- Hero: `{N} Unidades` `text-2xl`
- Sub: valor USD • cantidad productos

### Diferencias vs Almacén (`InventoryDashboardHeader`)

| Aspecto | Almacén | Artículos |
|---------|---------|-----------|
| KPIs 4 | Casi idénticos (labels ligeramente distintos) | “Valor Total” vs “Valor Total del Inventario” |
| Categorías | Top 3 por `total_retail_value` dinámico | **3 fijas** por tipo de negocio |
| Búsqueda integrada | **Sí** — Sección 3 del header | **No** — card separada debajo |
| Filtro categoría en header | 3 opciones hardcoded | Card con `PRODUCT_CATEGORIES` completo |
| Skeleton | 4+3 cards en header | 4 cards solo (categorías sin skeleton separado en loading) |

**Interacción KPIs:** ninguna (no click/hover funcional).

---

## 5. Búsqueda y filtros

### Card filtros (`Card` > `CardContent p-4`)

| Control | Clases | Comportamiento |
|---------|--------|----------------|
| Buscador | `flex-1`, `Input pl-10 glass-input`, icono `Search` | Placeholder: *“Buscar por nombre, SKU o código de barras...”* |
| Categoría | `w-full md:w-[200px]` Select | `PRODUCT_CATEGORIES` + “Todas” |
| Debounce | 300 ms `useDebounce` | + `useDeferredValue` → spinner `FilterToolbarSpinner` si pending |
| Filtro servidor | `categoryFilter` en `fetchAllActiveProducts` | Recarga al cambiar categoría |
| Filtro cliente | búsqueda sobre `products` ya cargados | `deferredSearchTerm` |

**No existen en UI:** filtro por estado activo, orden manual, filtro bajo stock, filtro por sucursal en grid.

**Combinación:** categoría (servidor) AND texto (cliente).

**Reset:** manual — borrar texto, categoría “Todas”.

**Empty state:** `Package` icon 12×12 + “No se encontraron productos”.

**Secuencia mental:** KPIs → (opcional) sucursal KPI → buscar → categoría → escanear cards → actuar en card.

---

## 6. Grid principal

| Propiedad | Valor código |
|-----------|--------------|
| Grid | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4` |
| Gap | `gap-4` (16px) |
| Ancho card | Fluido por columna del grid |
| Altura | **Auto** — crece con número de sucursales |
| Paginación | 20 cards (`useClientPagination`) |
| Loading | `ProductCardSkeletonGrid count={8}` |
| Refetch | `opacity-70 transition-opacity duration-150` en grid |
| Hover card | `hover:shadow-lg hover:shadow-green-500/50 transition-shadow` |
| Borde card | `border border-green-500/30` |

### Por qué cards aquí

- **Escaneo por producto completo:** identidad comercial + inventario en un solo bloque visual.
- **Stock multi-sucursal visible** sin segundo clic (ventaja vs tabla Almacén).
- **Menos columnas que interpretar** — apto para gerencia y revisión cualitativa.
- **Costo:** menos productos visibles simultáneamente que una tabla densa.

---

## 7. Anatomía exacta de una card (arriba → abajo)

### Wireframe textual (código real)

```
┌─────────────────────────────────────────┐
│ Pantalla iPhone 13          [Activo]   │  CardHeader pb-3
├─────────────────────────────────────────┤
│ SKU:                    TEST-IP13-001   │  text-sm justify-between
│ Categoría:              [Teléfonos]     │  badge emerald
│                                         │
│ 🏪 Stock por Tienda:                    │  font-semibold + Store icon
│ ┌─────────────────────────────────────┐
│ │ Sucursal A:              8  [✎][⇄]   │  glass-muted-dark p-2
│ │ Sucursal B:    [Sin Stock] [✎]       │  badge red si 0
│ └─────────────────────────────────────┘
│                                         │
│ ┌─ Stock Total ───────────────────────┐ │  bg-accent-primary/10
│ │ 📦 Stock Total              12      │ │  text-2xl bold
│ │ Valor: $7188.00                     │ │
│ └─────────────────────────────────────┘
│                                         │
│ Precio:                    $599.00      │
│ Valor:                     $7188.00     │  ← duplicado con bloque anterior
│                                         │
│ ─────────────────────────────────────  │  border-t (solo admin)
│ [ Editar ]          [ Eliminar ]        │
└─────────────────────────────────────────┘
```

### Tabla de campos

| # | Campo | Visible siempre | Con interacción | Admin | Manager | Formato | Jerarquía |
|---|-------|-----------------|-----------------|-------|---------|---------|-----------|
| 1 | Nombre | Sí | — | Sí | Sí | `text-lg font-bold line-clamp-2` | **Primaria** |
| 2 | Badge Activo/Inactivo | Sí | — | Sí | Sí | shadcn Badge header | Secundaria |
| 3 | SKU | Sí | — | Sí | Sí | mono semibold derecha | Terciaria |
| 4 | Categoría | Sí | — | Sí | Sí | badge outline emerald | Terciaria |
| 5 | Precio venta | Sí | — | Sí | Sí | `$X.XX` semibold | Comercial |
| 6 | Costo | **No** | — | No en card | No | — | — |
| 7 | Stock por tienda | Sí (lista) | Popovers | Sí | Sí* | ver §8 | Inventario |
| 8 | Stock total | Sí | — | Sí | Sí | `text-2xl font-bold` en panel accent | **Inventario hero** |
| 9 | Valor USD | Sí | — | Sí | Sí | stock×precio; **aparece 2 veces** | Comercial |
| 10 | Editar/Eliminar producto | — | Dialog | Sí | **Oculto** | botones footer | Acción catálogo |
| 11 | Iconos stock | Si admin | Popover | Sí | **“Solo lectura”** | 3×3 px icons | Acción inventario |

\*Manager: lista de sucursales limitada a `availableStores` (típicamente **una**).

---

## 8. Stock por sucursal en card

| Pregunta | Respuesta |
|----------|-----------|
| ¿Todas las sucursales siempre? | **Depende del rol.** Admin: todas en `availableStores`. Manager: **solo tienda asignada** (evidencia: `storesData = availableStores` L187, no query global como Almacén) |
| Orden | Alfabético por `store_name` (`buildCatalogWithStock` L221) |
| qty > 0 | `span font-semibold text-emerald-300` |
| qty = 0 | Badge **“Sin Stock”** `text-[9px]` red |
| Stock mínimo | **No mostrado** |
| Separación | `space-y-1` entre filas; cada fila `p-2 glass-muted-dark rounded-lg border emerald-500/20` |
| Editar | Popover índigo — **admin only** |
| Transferir | Popover morado — **admin only**, solo si `qty > 0` |
| Manager | Texto **“Solo lectura”** junto a acciones |

### ¿Por qué se entiende la ubicación sin acordeón?

Cada sucursal es una **fila etiquetada** con nombre + cantidad visible en la misma card. El usuario lee verticalmente “Stock por Tienda” y ve el mapa A=8, B=0 sin expandir.

**Limitación:** manager no ve otras sucursales en esta pantalla aunque existan en BD.

---

## 9. Stock total y valor

### Bloque “Stock Total” (L903–917)

- Contenedor: `p-3 bg-accent-primary/10 rounded-sm shadow-md border border-accent-primary/30`
- Izquierda: icono `Package` + label “Stock Total” `font-semibold`
- Derecha: número `text-2xl font-bold` — `text-status-danger` si 0, else `text-accent-primary`
- Sub línea: `Valor: $X.XX` (`getTotalValue` = `total_stock × sale_price_usd`)

### Sección Precio/Valor (L919–929)

- **Precio:** precio unitario venta
- **Valor:** mismo cálculo que arriba — **redundante**

### Separación semántica

| INFORMACIÓN COMERCIAL | INFORMACIÓN INVENTARIO |
|-----------------------|------------------------|
| Precio unitario | Stock por tienda |
| Valor (×2) | Stock total destacado |
| Nombre, SKU, categoría | Badges Sin Stock |
| Badge Activo/Inactivo | — |

---

## 10. Edición de stock — UX

**Patrón:** **Popover** (no inline, no modal de edición).

### Flujo

| Fase | UX |
|------|-----|
| ANTES | Fila sucursal con qty + botón índigo `Edit` 3×3 |
| CLICK | `openEditPopover` → Popover `w-64 align="end"` |
| CONTROLES | Label “Editar Stock”, nombre tienda, `Input number min=0`, Guardar/Cancelar |
| GUARDAR | RPC `update_store_inventory`; `Loader2` “Actualizando stock…” |
| ÉXITO | Cierra popover + **AlertDialog verde** (`!bg-emerald-700`) con producto, sucursal, nueva qty |
| ERROR | Toast destructive; revierte qty local |
| CANCELAR | Cierra popover |

### Wireframe popover

```
┌─ Editar Stock ─────────────┐
│ Sucursal A                 │
│ Nueva Cantidad [____8____] │
│ [ Guardar ] [ Cancelar ]   │
└────────────────────────────┘
        ↓ éxito
┌─ ✓ Stock actualizado ──────┐  (AlertDialog verde pantalla)
│ iPhone 13                  │
│ Sucursal: A                │
│ Nueva cantidad: 8          │
│        [ Entendido ]       │
└────────────────────────────┘
```

**vs Almacén:** inline input en celda + toast simple (sin AlertDialog).

---

## 11. Transferencia — UX

**Patrón:** **Popover** morado `w-72`.

| Fase | UX |
|------|-----|
| Entry | Icono `ArrowRightLeft` en fila con stock > 0, admin only |
| Origen | Caja `glass-green-dark`: “Desde: **{store_name}**” |
| Destino | Select `availableStores` filtrado (sin origen) |
| Cantidad | Input + texto **“Disponible: {inv.qty} unidades”** |
| Confirmación | **No** `window.confirm` — botón “Transferir” directo |
| Éxito | Toast success + cierra popover + `fetchData` |
| Error | Toast destructive |

### Wireframe

```
┌─ Transferir Stock ─────────┐
│ ┌ Desde: Sucursal A ─────┐ │
│ Tienda Destino [▼]       │
│ Cantidad [__2__]          │
│ Disponible: 8 unidades   │
│ [Transferir] [Cancelar]  │
└──────────────────────────┘
```

### Artículos vs Almacén (transferencia)

| | Artículos | Almacén |
|---|-----------|---------|
| Contenedor | Popover | Inline en celda expandida |
| Confirmación OS | No | `window.confirm` |
| Disponible mostrado | **Sí** explícito | `max` en input |
| Permiso UI | Admin only | Visible todos (backend bloquea) |
| Preview destino qty | No | No |

**Gana Artículos:** disponibilidad legible; UI permisos más honesta; origen destacado.  
**Pierde Artículos:** sin confirmación explícita pre-RPC; popover puede quedar cortado en móvil; menos densidad para muchas transferencias seguidas.

---

## 12. Crear / editar producto

| Entry point | Condición |
|-------------|-----------|
| Nuevo Producto (header) | `admin` |
| Editar (footer card) | `admin` |
| Eliminar (footer card) | `admin` → Dialog |

**Componente:** `ProductForm` — **compartido con Almacén** (`Dialog max-w-4xl max-h-[85vh]`).

Campos: nombre, SKU, barcode, categoría, costo, precio, activo, grid inventario por tienda.

**Post-save:** invalida `productsCache`, `inventoryPageCache`, `invalidateInventoryCatalogMemory`, `fetchData()`, cierra modal.

**Stores en form:** `availableStores` (no todas las tiendas para manager si pudiera abrir — solo admin abre form).

---

## 13. Permisos visuales

| Capacidad | admin | manager | cashier |
|-----------|-------|---------|---------|
| Acceso `/articulos` | Sí | Sí | **No** (redirect `/pos`) |
| Ver cards | Sí | Sí | — |
| Nuevo Producto | **UI sí** | Oculto | — |
| Editar/Eliminar producto | Sí | Oculto | — |
| Costo en card | No | No | — |
| Ver stock por tienda | Todas (`availableStores`) | **Una** asignada | — |
| Editar stock | Popover | **“Solo lectura”** | — |
| Transferir | Popover | Oculto | — |
| Backend edit/transfer | admin | **BLOCKS** | — |

### Inconsistencias

| Issue | Tipo |
|-------|------|
| Manager ve solo 1 sucursal en cards pero KPI puede estar en “todas” si fuera admin — manager no tiene “all” | UI scope |
| Almacén muestra todas las tiendas al manager; Artículos no | **BOTH** — divergencia entre pantallas |
| `isManager` check redundante con `role === 'admin'` en condiciones | Código defensivo |

---

## 14. Densidad y composición (Tailwind)

| Token | Artículos |
|-------|-----------|
| Page | `container mx-auto px-4 py-6 space-y-6 min-h-screen` |
| vs Almacén | Almacén usa `p-6` sin `px-4` extra |
| Card header | `pb-3` |
| Card content | `space-y-4` |
| Store row | `p-2`, `text-sm` |
| Stock total panel | `p-3` |
| Grid gap | `gap-4` |
| Radius | `rounded-lg` filas; `rounded-sm` panel total |
| Typography nombre | `text-lg font-bold` |
| Typography stock total | `text-2xl font-bold` |
| Iconos acción | `h-3 w-3` en botones `p-1.5` |
| Popover edit | `w-64` |
| Popover transfer | `w-72` |
| Footer acciones | `pt-2 border-t`, botones `flex-1` |
| Sticky | **No** |
| Hover | shadow green en card; hover color en icon buttons |

---

## 15. Semántica visual

### A. FUNCIONAL — heredable

| Estado | Implementación |
|--------|----------------|
| Sin stock (tienda) | Badge red “Sin Stock” |
| Sin stock (total) | `text-status-danger` en cifra total |
| Stock positivo | `text-emerald-300` qty; `text-accent-primary` total |
| Activo/Inactivo | Badge default/secondary |
| Éxito stock | AlertDialog emerald + CheckCircle2 |
| Destructivo | `text-red-600` eliminar; Dialog rojo |
| Disabled transfer | `disabled={!transfer?.to \|\| qty <= 0}` |
| Solo lectura | `text-xs text-white/90` manager |

### B. BRANDING — no heredar

- `glass-panel`, `glass-muted-dark`, `glass-input`
- Bordes `green-500/30`, hover `shadow-green-500/50`
- Botones índigo/morado para acciones
- AlertDialog `!bg-emerald-700`
- `brightness-125` en iconos
- `bg-primary-dark` en CTAs

---

## 16. Responsive

| Viewport | Grid | Filtros | Cards | Popovers |
|----------|------|---------|-------|----------|
| Móvil `<md` | 1 col | apilados | full width, cards altas | `align="end"` puede salir viewport |
| Tablet `md` | 2 cols | fila | 2 cards visibles | — |
| Laptop `lg` | 3 cols | fila | 3 cards | — |
| Desktop `xl` | 4 cols | fila | 4 cards | — |

- **Texto largo nombre:** `line-clamp-2` — trunca a 2 líneas.
- **Muchas sucursales:** card crece verticalmente (sin límite/max-height).
- **Botones footer:** `flex-1` — mitad cada uno en admin.
- **Tabla overflow:** N/A — no hay tabla.

---

## 17. Flujo operativo

### Caso A: “¿Qué es, cuánto cuesta y dónde hay iPhone 13?” (A=8, B=4, total=12)

**Admin:**

1. Menú → Artículos (0 clics si ya dentro).
2. (Opcional) Buscar “iPhone” — tecleo.
3. **Una card** muestra: nombre, precio $599, lista A=8, B=4 o badge, Stock Total **12**, Valor.

**Interacciones mínimas: 0** tras cargar (todo visible en card).

**Manager:** ve solo su tienda (ej. A=8) — **no ve B** en la lista de sucursales.

### Caso B: “Transferir 2 de A a B”

**Admin:**

1. Localizar card (búsqueda opcional).
2. Clic icono morado en fila A — 1 clic.
3. Select destino B — 1 interacción.
4. Input cantidad `2` — 1 interacción.
5. Clic “Transferir” — 1 clic.
6. Toast éxito; card refresca.

**~4–5 interacciones** (sin confirm OS).

### Caso C: “Ajustar stock en A a 10”

1. Clic icono índigo en fila A.
2. Cambiar input.
3. Guardar.
4. AlertDialog “Entendido”.

**~4 interacciones**.

---

## 18. Por qué existe Artículos si ya existe Almacén

### Propósito UX (evidencia)

| Necesidad | Cómo la resuelve Artículos |
|-----------|----------------------------|
| **Comprensión holística del producto** | Card = unidad mental “este artículo” con comercial + inventario |
| **Descubrimiento sin expandir** | Stock por sucursal siempre visible |
| **Audiencia gerencial** | Ruta `manager+`; sin cashier; permisos lectura claros |
| **Escaneo visual** | Grid 2–4 productos comparables de un vistazo |
| **Acciones contextuales premium** | Popovers con más espacio que celda inline |

### Qué prioriza diferente

- **Prioriza:** identidad del producto, distribución física, valor comercial.
- **Sacrifica:** densidad (menos SKUs por pantalla), comparación tabular rápida, export PDF, vista global de sucursales para manager.

### Solapamiento

- Mismo `fetchAllActiveProducts`, `buildCatalogWithStock`, cache compartido, mismos RPCs, mismo `ProductForm`.
- KPIs casi duplicados con distinto layout de categorías.

**No es “otra vista” trivial:** es un **modo exploración/card** vs **modo operación/tabular** de Almacén.

---

## 19. Comparación interna POS

| CAPACIDAD | ALMACÉN | ARTÍCULOS | GANADOR |
|-----------|---------|-----------|---------|
| Densidad (SKUs/pantalla) | Alta tabla | Baja cards | **Almacén** |
| Descubrimiento producto completo | Requiere expand | Inmediato | **Artículos** |
| Comparación entre productos | Tabla sortable* | Grid visual | **Almacén** (*sort sin UI) |
| Stock total visible | Columna | Panel destacado | EQUIVALENTE |
| Stock por sucursal | Tras 1 clic | Siempre en card | **Artículos** |
| Multi-sucursal manager | Todas las tiendas | Solo asignada | **Almacén** |
| Precio | Columna | En card | EQUIVALENTE |
| Costo | Columna admin | No en card | **Almacén** |
| Crear producto | Botón todos | Solo admin | **Artículos** (más estricto) |
| Editar catálogo | Iconos admin | Footer admin | EQUIVALENTE |
| Transferencias | Inline + confirm OS | Popover + disponible | Mixto |
| Editar stock | Inline + toast | Popover + AlertDialog | **Artículos** (feedback) |
| PDF inventario | Sí | No | **Almacén** |
| Productos simultáneos | 20 filas | 20 cards | EQUIVALENTE (count) |
| Permisos stock UI | Permisivo | Restrictivo | **Artículos** |
| Mobile | Scroll tabla | 1 col cards | **Artículos** |
| Localizar SKU rápido | Tabla mono | Buscar + card | **Almacén** |
| Comprender un producto | 2 pasos | 1 paso | **Artículos** |

---

## 20. Deuda UX

| Problema | Evidencia |
|----------|-----------|
| Valor duplicado | L915 y L925–928 |
| Manager no ve todas las sucursales | `availableStores` vs query global Almacén |
| Cards muy altas con N tiendas | Sin collapse |
| StoreFilterBar no filtra grid | Igual que Almacén |
| KPI categorías fijas con 0 | Siempre 3 cards aunque categoría vacía |
| Transfer sin confirmación | Solo toast |
| Popover en móvil | `align="end"` puede clip |
| Badge “Stock normal” ausente en card | Solo en KPIs Almacén-style |
| Redundancia Almacén+Artículos | Dos pantallas mantenidas |
| `hover:bg-red-50` en tema oscuro | L949 — contraste pobre en dark UI |

---

## 21. Inventario de componentes

| COMPONENTE | ARCHIVO | FUNCIÓN | ESTADO | COMPARTIDO ALMACÉN | MADUREZ UX |
|------------|---------|---------|--------|-------------------|------------|
| ArticulosPage | `pages/ArticulosPage.tsx` | Orquestación | Activo | Parcial lógica | Alta exploración |
| ArticlesStatsRow | `inventory/ArticlesStatsRow.tsx` | KPIs | Activo | Paralelo InventoryDashboardHeader | Media |
| StoreFilterBar | `inventory/StoreFilterBar.tsx` | Scope KPI | Activo | **Sí** | Media |
| ProductForm | `pos/ProductForm.tsx` | CRUD | Activo | **Sí** | Maduro |
| inventoryCatalogFetch | `utils/inventoryCatalogFetch.ts` | Data | Activo | **Sí** | Maduro |
| inventoryPageCache | `utils/inventoryPageCache.ts` | Cache sesión | Activo | **Sí** | Maduro |
| ProductCardSkeletonGrid | `InventoryLoadingSkeletons.tsx` | Loading | Activo | No (tabla skeleton) | Maduro |
| ListPaginationBar | `ui/ListPaginationBar.tsx` | Paginación | Activo | **Sí** | Maduro |
| Popover edit/transfer | inline ArticulosPage | Acciones stock | Activo | No (inline Almacén) | Bueno admin |
| AlertDialog stock | inline L997–1029 | Confirmación | Activo | No | Fuerte feedback |
| Dialog delete | inline | Confirm delete | Activo | **Sí** | Maduro |

---

## 22. Principios extraíbles

| PRINCIPIO | EVIDENCIA | BENEFICIO | LIMITACIÓN |
|-----------|-----------|-----------|------------|
| Card como unidad de mercancía | Grid de `Card` | Escaneo holístico | Baja densidad |
| Stock ubicación sin acordeón | Lista en card | “Dónde está” inmediato | Card alta |
| Acciones en contexto de sucursal | Iconos por fila tienda | No navegar | Congestión visual |
| Popover para formularios cortos | Edit/transfer w-64/72 | No pierde scroll tabla | Móvil |
| Confirmación rica post-mutación | AlertDialog verde | Confianza | Extra clic |
| Permisos UI explícitos | admin vs “Solo lectura” | Menos errores que Almacén | Duplicar lógica rol |
| Progressive disclosure invertido | Más visible arriba en card | Gerencia feliz | Operarios masivos prefieren tabla |

---

## 23. Contrato visual abstracto

### MUST

1. Una unidad visual = un artículo con identidad + inventario + precio.
2. Stock por ubicación visible **sin segundo nivel** de expansión.
3. Diferenciar qty=0 (badge) vs qty>0 (cifra).
4. Stock total con peso tipográfico mayor que líneas por tienda.
5. Acciones de stock ancladas a la fila de sucursal correspondiente.
6. Paginación para listas largas (~20).
7. Búsqueda por nombre/SKU/código con debounce.

### SHOULD

1. KPIs resumen antes del grid.
2. Popover o panel contextual para editar/transferir (no navegación).
3. Mostrar disponibilidad al transferir.
4. Feedback confirmación distinguible en mutaciones de stock.
5. Grid responsive 1–4 columnas.

### OPTIONAL

1. KPIs por categoría de negocio fijos.
2. AlertDialog celebratorio post-guardado.
3. Valor inventario (stock × precio) en la card.

### DO NOT COPY

1. Valor duplicado en la misma card.
2. `availableStores` limitado para roles que deberían ver red completa.
3. StoreFilterBar que no filtra el grid mostrado.
4. Transfer sin confirmación cuando el riesgo es alto.
5. Estética glass/emerald/neon como requisito funcional.
6. Mantener dos pantallas completas sin diferenciación de rol clara.

---

## 24. Evidencia técnica

| Tema | Ubicación |
|------|-----------|
| Layout página | `ArticulosPage.tsx` L499–517 |
| Grid breakpoints | L580 |
| Card anatomy | L585–958 |
| Popover edit | L643–738 |
| Popover transfer | L740–887 |
| ArticlesStatsRow | `ArticlesStatsRow.tsx` completo |
| storesData = availableStores | `ArticulosPage.tsx` L187 |
| Almacén stores query global | `AlmacenPage.tsx` L146–149 |
| Route guard | `App.tsx` L367–377, `CashierRouteGuard` L148–157 |
| Paginación 20 | `useClientPagination.ts` CLIENT_PAGE_SIZE |

---

## 25. Conclusión

**Artículos** es la experiencia de **exploración y gestión comercial-inventario por unidad**, implementada como grid de cards con disclosure cero para stock por sucursal. Complementa a **Almacén** (tabla densa, expand, PDF, visión multi-tienda universal) pero **no lo reemplaza** — especialmente para managers que necesitan ver stock en otras sucursales (solo Almacén lo hace hoy).

Para reconstruir sin ver la pantalla: imaginar un dashboard KPI, una barra de búsqueda, y un muro de tarjetas verdes donde cada tarjeta es un “ficha de producto” con lista de sucursales, total grande, precio, y botones flotantes índigo/morado en cada sucursal.

---

```
POS-MER-UI-01 = COMPLETE
CODE CHANGES = NONE
```
