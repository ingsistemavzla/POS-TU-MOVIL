# Mejoras de rendimiento — bitácora (jul 2026)

Documento para revisar el **lunes** (o siguiente cierre).  
Regla aplicada: **no alterar funcionalidad**; solo optimizaciones elementales/seguras.

Fecha de cierre de esta tanda: **2026-07-15**

---

## Estado general

| Nivel | Estado | Commits |
|-------|--------|---------|
| Bajo (frontend) | Hecho y en `main` | `648a6ba` |
| Medio — polling + PDF | Hecho y en `main` | `348babd` |
| Medio — índices SQL | Script en repo + **aplicado en Supabase** | `d027493` + ejecución manual |
| Alto — alertas de stock unificadas | Hecho + fix límite 1000 | `31c5992`, `2cbcd12` |
| Alto — Historial por día (server) | Hecho: fechas livianas + load por día | `3755394` |
| Alto — Historial día/rango + calendario | Hecho: selector día, rango ≤31d, agrupado por día | `591145a` |
| Alto — Almacén/Artículos catálogo | Hecho: productos paginados + inventario por IDs | `2439e6c` |
| Alto (`process_sale`) | **Pendiente** | — |

---

## 1) Nivel bajo — `648a6ba`

**Qué:**
- Render: `npm ci` + `Cache-Control` largo en `/assets/*`, `no-cache` en `index.html`
- Vite: chunk `pdf-vendor` (jspdf)
- Gestión Web: `loading="lazy"` + `decoding="async"` en miniaturas
- Master Audit: `select('*')` → columnas explícitas en transferencias

**Cómo verificar el lunes:**
- Login y navegación normal
- Gestión Web: miniaturas cargan
- Hard refresh: assets cacheados; deploy nuevo sigue reflejándose (index sin cache largo)

---

## 2) Nivel medio (sin SQL) — `348babd`

**Qué:**
- Pausar `setInterval` de refresco si la pestaña está oculta (Estadísticas, alertas stock, stock negativo, BCV, ActivityDashboard, LiveAlerts)
- PDF dinámico (`import()`) en 4 modales de reporte al exportar

**Cómo verificar el lunes:**
- Con pestaña en segundo plano: no debería martillar la red cada 30–45 s
- Al volver a la pestaña: app sigue normal
- Exportar PDF de un reporte (si el modal tiene export): debe generar igual

**Nota:** `PDFGenerator` como clase en `pdfGenerator.ts` ya no existía antes de estos cambios; el export de esos modales ya venía frágil. No es regresión nueva de esta tanda.

---

## 3) Índices SQL — aplicados en Supabase (2026-07-15)

Script repo: `sql/05_indices_inventory_movements_performance.sql`  
Migración: `supabase/migrations/20260715210000_indexes_inventory_movements_performance.sql`

**Índices creados (verificados con SELECT en pg_indexes):**

| Índice | Tabla |
|--------|--------|
| `idx_inventory_movements_company_created` | inventory_movements |
| `idx_inventory_movements_product_created` | inventory_movements |
| `idx_inventory_movements_company_type_created` | inventory_movements |
| `idx_inventory_movements_store_from_created` | inventory_movements |
| `idx_inventory_movements_store_to_created` | inventory_movements |
| `idx_inventories_company_qty` | inventories |

**Ganancia esperada (estimada, sin EXPLAIN antes/después):**
- Historial / listados: ~5×–20× en esa consulta
- Auditoría por SKU: ~10×–50× si hay mucho volumen
- Alertas por qty: ~2×–10×
- App global: mejora **parcial** (no “todo 10×”)

**Cómo verificar el lunes:**
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_inventory_movements_company_created',
    'idx_inventory_movements_product_created',
    'idx_inventory_movements_company_type_created',
    'idx_inventory_movements_store_from_created',
    'idx_inventory_movements_store_to_created',
    'idx_inventories_company_qty'
  )
ORDER BY indexname;
```
Deben salir **6 filas**.

Abrir **Historial** y **Master Audit** y sentir si carga más fluido con volumen real.

---

## Checklist rápido del lunes

- [ ] App abre y POS vende normal
- [ ] Historial carga sin error (modo un día)
- [ ] Historial: rango de días agrupa por día y respeta máx. 31
- [ ] Almacén y Artículos cargan stock por tienda correctamente
- [ ] Con filtro de categoría: menos datos / lista coherente
- [ ] Alertas de stock en navbar funcionan
- [ ] Los 6 índices siguen listados en Supabase
- [ ] No hay quejas de “desapareció una función”

---

## 4) Nivel alto — alertas unificadas — `31c5992` + fix `2cbcd12`

- Una sola consulta compartida navbar + dashboard (3 rangos: 0 / 1–3 / 3–9)
- Realtime filtrado por `company_id` + debounce 1.5s
- Polling 60s y solo con pestaña visible
- Fix: no llenar el límite ~1000 solo con ceros (paneles bajo/crítico vacíos)

**Verificar:** alertas en navbar y dashboard muestran bajo/crítico/agotado correctamente.

---

## 5) Nivel alto — Historial por día — `3755394`

- `fetchDateKeys()`: solo `created_at` (límite 3000) para armar días
- `fetchMovementsForDay(dateKey)`: filtro servidor `company_id` + rango UTC del día
- Filtros categoría/sucursal/búsqueda en cliente sobre el día cargado

---

## 6) Nivel alto — Historial día / rango + calendario — `591145a`

Archivo: `src/pages/HistorialPage.tsx`

**Qué:**
- Modo **Un día**: selector de días con actividad, calendario, prev/next
- Modo **Rango**: desde–hasta (máx. 31 días), una consulta filtrada en servidor
- En rango: movimientos **agrupados por día** con totales por categoría
- Límite 3000 filas en rango + aviso si trunca
- Misma funcionalidad: búsqueda, sucursal, pestañas Ventas/Aumentos/etc., detalle expandible

**Cómo verificar:**
- Historial → Movimientos → Un día: elige fecha en lista o calendario; carga solo ese día
- Rango de 3–7 días: aparecen bloques por día con totales
- Rango > 31 días: mensaje de acotar (no consulta)
- Filtros de categoría/sucursal/búsqueda siguen igual

---

## 7) Nivel alto — Almacén / Artículos (catálogo) — `2439e6c`

**Commit:** `2439e6c`  
**Padre (revertir a):** `41f96da`

**Archivos:**
- `src/utils/inventoryCatalogFetch.ts` (**nuevo**)
- `src/utils/inventoryPageCache.ts` (scope por categoría, key `v2`)
- `src/pages/AlmacenPage.tsx`
- `src/pages/ArticulosPage.tsx`
- Extra consola: `src/utils/bcvRate.ts`, `src/hooks/useKreceStats.ts`, `src/components/dashboard/KreceAccountsTable.tsx`

**Qué:**
- Productos activos con **paginación por rango** (ya no se truncan en ~1000)
- Categoría filtrada en servidor (Almacén y Artículos)
- Inventario: solo filas de esos `product_id` (sin JOIN pesado a `products`)
- Misma UX: búsqueda/orden/bajo stock en cliente, matriz por sucursal, editar/transferir
- Cache de sesión con scope de categoría (evita mezclar “todas” con una categoría)

**Extra (ruido consola):**
- `bcv_rates` ausente: warning silencioso
- Krece: no pide columnas `initial_amount_usd` inexistentes; inicial mostrado = total − financiado

**Cómo verificar:**
- Abrir Almacén y Artículos: lista y stock por tienda correctos
- Cambiar categoría: recarga y muestra solo esa categoría
- Editar stock / transferir: sigue funcionando
- Con >1000 productos: aparecen todos (antes podían cortarse)

### Reversión (si hace falta deshacer solo este cambio)

**Estado bueno anterior (antes de este commit):** `41f96da`  
(`docs: registrar commit 591145a en bitacora historial dia/rango`)

Opción A — revertir el commit (recomendado, deja historial claro):
```bash
git revert 2439e6c --no-edit
git push origin main
```

Opción B — restaurar solo los archivos de Almacén/Artículos al estado de `41f96da`:
```bash
git checkout 41f96da -- \
  src/pages/AlmacenPage.tsx \
  src/pages/ArticulosPage.tsx \
  src/utils/inventoryPageCache.ts \
  src/utils/bcvRate.ts \
  src/hooks/useKreceStats.ts \
  src/components/dashboard/KreceAccountsTable.tsx \
  docs/MEJORAS_RENDIMIENTO_JUL_2026.md
git rm -f src/utils/inventoryCatalogFetch.ts
git commit -m "revert: restaurar carga Almacen/Articulos previa a catalogo paginado"
git push origin main
```

Tras el push, Render vuelve a desplegar solo. No hay migración SQL en este cambio (solo frontend).

---

## Próximo (cuando se decida — nivel alto restante)

Solo con medición y cuidado (sí pueden tocar lógica si se hacen mal):

1. `process_sale` set-based + auditoría única  
2. (Opcional) paginación de página visible 20 en servidor + RPC de totales  

Regla sugerida: medir p50/p95 y Web Vitals antes de tocar `process_sale`.

---

## Enlaces útiles

- Canvas auditoría: `canvases/auditoria-rendimiento-pos.canvas.tsx` (en carpeta Cursor del proyecto)
- SQL índices: `sql/05_indices_inventory_movements_performance.sql`
