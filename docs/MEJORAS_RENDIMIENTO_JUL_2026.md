# Mejoras de rendimiento — bitácora (jul 2026)

Documento para revisar el **lunes** (o siguiente cierre).  
Regla aplicada: **no alterar funcionalidad**; solo optimizaciones elementales/seguras.

Fecha de cierre de esta tanda: **2026-07-16** (cierre UX + RPC Dashboard + cache reopen)

---

## Estado general

| Nivel | Estado | Commits / notas |
|-------|--------|-----------------|
| Bajo (frontend) | Hecho y en `main` | `648a6ba` |
| Medio — polling + PDF | Hecho y en `main` | `348babd` |
| Medio — índices SQL | **Aplicado en Supabase** | `d027493` |
| Alto — alertas stock | Hecho | `31c5992`, `2cbcd12` |
| Alto — Historial día/rango | Hecho | `3755394`, `591145a` |
| Alto — Almacén/Artículos catálogo | Hecho | `2439e6c` |
| Tanda rápida POS + Stats poll | Hecho | `6d2d237` |
| Índices POS clientes/productos | **Aplicado 7/7** | `d7083be` |
| POS 1 viaje + Dashboard splash UX | Hecho | `ffba8c9` |
| **Tanda 2026-07-16 (local)** | Hecho; **pendiente commit/push** | ver §16 |
| → Stats lotes + cache + splash 4 cards | Frontend | |
| → Dashboard agregación + **RPC** | SQL **aplicado** + frontend + fallback | `sql/13_…` |
| → Dashboard paralelo + Almacén/Artículos reopen | Frontend | |
| Futuro (roadmap) | **Pendiente** | ver §17 |
| `process_sale` | **Pendiente (alto riesgo)** | último en la cola |

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

## 8) Tanda rápida — POS + Estadísticas + cache dashboard

**POS (`POS.tsx`):**
- Debounce búsqueda 300→180 ms
- Límite resultados 100→50
- Evita doble fetch Enter+debounce (mismo término)
- Stock con requestId (no pisa respuestas viejas)
- Invalida término al cambiar tienda

**Estadísticas:**
- Poll 30s→3 min (solo pestaña visible)
- Refresh en segundo plano (no pantalla completa “Cargando…” al volver)
- `useDashboardData` diferido (`enabled` tras inventario) → no bloquea carga inicial

**Dashboard cache:**
- TTL fresca 10 min; stale usable hasta 45 min mientras refresca detrás
- `useDashboardData({ enabled })` para pantallas que no lo necesitan de inmediato

**Commit:** `6d2d237`  
**Reversión:** `git revert 6d2d237 --no-edit` — padre previo: `a67a3db`

---

## 9) Índices POS — clientes + productos (aplicar en Supabase)

Script: `sql/06_indices_pos_customers_products.sql`  
Migración: `supabase/migrations/20260716210000_indexes_pos_customers_products.sql`

**Índices:**
- `idx_customers_company_id_number`
- `idx_products_company_active_created`
- `idx_products_name_trgm` / `sku_trgm` / `barcode_trgm` (requiere `pg_trgm`)
- `idx_products_company_sku` / `barcode` (escáner igualdad exacta)

**Cómo aplicar:** Supabase → SQL Editor → pegar y ejecutar sección B del script (o el archivo completo).  
Verificar sección C: deben salir **7 filas**.

**Estado 2026-07-16:** aplicado y verificado (Paso 4 = 7 filas).  
Nota: varios índices ya existían (p. ej. `idx_customers_company_id_number`, `idx_products_name_trgm`); los faltantes (`sku_trgm`, `barcode_trgm`, `company_active_created`, etc.) se crearon con IF NOT EXISTS. Sin duplicados de cédula (Paso 2 vacío).

**Reversión SQL (si hiciera falta):**
```sql
DROP INDEX IF EXISTS idx_customers_company_id_number;
DROP INDEX IF EXISTS idx_products_company_active_created;
DROP INDEX IF EXISTS idx_products_name_trgm;
DROP INDEX IF EXISTS idx_products_sku_trgm;
DROP INDEX IF EXISTS idx_products_barcode_trgm;
DROP INDEX IF EXISTS idx_products_company_sku;
DROP INDEX IF EXISTS idx_products_company_barcode;
```

---

## 10) POS — producto + stock en 1 consulta

**Archivo:** `src/pages/POS.tsx`

**Qué:**
- Búsqueda con `inventories!left(qty, store_id)` en el mismo SELECT
- Stock de la tienda activa se arma en cliente (sin 2.º round-trip)
- Fallback a 2 consultas si el embed falla
- Escáner barcode también trae stock embebido
- Eliminado doble fetch de stock al cambiar `products` (solo al cambiar tienda)

**Cómo verificar:**
- POS → buscar producto → stock visible sin demora extra
- Escáner → agrega al carrito con stock correcto
- Cambiar tienda (admin) → stock se recalcula

---

## 11) Dashboard — panel instantáneo (sin pantalla “CONECTANDO…”)

**Archivos:** `Dashboard.tsx`, `useDashboardData.ts`, `usePaymentMethodsData.ts`, `useKreceStats.ts`, `App.tsx`, `DashboardInstantFallback.tsx`

**Qué:**
- Nunca bloquea con loader a pantalla completa: muestra el panel al instante (cache o ceros)
- Cifras se recalculan en segundo plano; hint “Actualizando…”
- Krece + métodos de pago se difieren ~200 ms (no compiten con el primer paint)
- Suspense del chunk usa skeleton liviano (no `LoadingScreen`)
- Botón Actualizar sí dispara `refetch`

**Cómo verificar:**
- Login admin → Dashboard aparece de inmediato (sin eternidad en “Cargando datos…”)
- Números se rellenan/actualizan detrás
- 2.ª visita en la sesión: cifras cache casi al instante

**Nota:** Hacer del panel Estadísticas la home del admin es opcional (manager ya entra a Estadísticas). Prioridad: Dashboard instantáneo.

---

## Próximo

Ver **§17 Roadmap futuro** (ordenado por riesgo ↑).  
Esta tanda se considera **cerrada en funcionalidad**; falta solo **commit + push** a `main` cuando se autorice.

---

## 12) Estadísticas — inventario por lotes (como Almacén)

**Archivos:** `EstadisticasPage.tsx`, `inventoryCatalogFetch.ts`

**Qué:**
- Productos activos paginados (`fetchAllActiveProducts`)
- Inventario por `product_id` en chunks (sin JOIN `products!inner` en cada fila)
- Gerente/cajero: filtro `store_id` en servidor
- Mismo cálculo de stats (se rearmó la forma `products` embebida en cliente)

**Cómo verificar:**
- Entrar a Estadísticas: totales por categoría/sucursal coherentes con antes
- Gerente: solo su tienda
- Refresh / volver a la pantalla: menos sensación de cuelga

---

## 13) Dashboard — una descarga de ventas + agregación (paso hacia RPC)

**Archivo:** `src/hooks/useDashboardData.ts`

**Qué:**
- Antes: ~4 consultas globales + **3×N por tienda** + daily + 3 financial = muchas lecturas de `sales`
- Ahora: **1 rango paginado** (desde inicio mes anterior / 30 días) y agregación en memoria:
  - totales hoy/ayer/mes/mes pasado
  - métricas por tienda
  - ventas diarias
  - salud financiera (Krece/Cashea)
- Misma UX y mismos números esperados
- Sin SQL nuevo en Supabase (siguiente nivel sería RPC SQL puro)

**Cómo verificar:**
- Dashboard: Total Facturado / Órdenes / Liquidez / gráfico tiendas coherentes con antes
- Cambiar Hoy / Ayer / Este Mes
- Con varias sucursales: carga más rápida al refrescar

---

## 14) Baseline pre-RPC (captura manual 2026-07-16)

**Empresa / panel:** Dashboard Multitienda — *Tu Movil Margarita*  
**Filtro reportado:** **Hoy**  
**Uso:** comparar **después** del RPC; si algún total diverge de forma material, no activar RPC en prod.

### Dashboard (Hoy)

| Métrica | Valor baseline |
|---------|----------------|
| Total Facturado | **$8,936.90** |
| Total Órdenes | **59** |
| Promedio por Orden | **$151.47** |
| Financiamiento Krece (tarjeta superior) | **$0.00** |
| Venta Bruta | **$8,936.90** (101.4% vs Ayer) |
| Ingreso Neto (Caja) | **$5,524.20** (61.8% del total) |
| Crédito Pendiente | **$3,412.70** (Cashea + Krece) |
| Desglose crédito | Krece **$2,477.85** · Cashea **$934.85** |
| Salud de Liquidez | **61.8%** |
| Financiamiento Krece (bloque) | **$0.00** · 17 transacciones · Ingreso Krece **$0.00** |
| Financiamiento Cashea | **$934.85** · 12 transacciones |
| Ventas Contado | **30** · 50.8% del total |
| Resumen Ejecutivo — Debe haber en Caja | **$5,524.20** |
| Resumen Ejecutivo — Crédito Otorgado Hoy | **$3,412.70** |
| Resumen Ejecutivo — Total Transaccionado | **$8,936.90** |
| Métodos de Pago | *No hay datos de pagos* (esperado / aparte) |
| Resumen por Tienda | Zona Gamer, Store, Marino, La Isla, Centro (gráfico; sin montos exactos en captura) |

**Nota integridad:** el bloque Krece superior en **$0.00** vs crédito Krece **$2,477.85** ya existe en esta captura; el RPC debe **reproducir el mismo comportamiento**, no “arreglar” negocio en esta tanda.

### Estadísticas (panel inventario)

| Métrica | Valor baseline |
|---------|----------------|
| Valor Total Inventario (PVP USD) | **185.693,71** |
| Productos registrados | **750** |
| Unidades totales | **6.222** |
| Tiendas | **5** |
| Teléfonos | **112.089,90** · 163 productos · **596** uds · 60.4% |
| Accesorios | **49.573,50** · 211 productos · **3.663** uds · 26.7% |
| Servicio Técnico | **24.030,31** · 376 productos · **1.963** uds · 12.9% |
| Sin stock | **151** (20.1%) |
| Stock bajo | **512** (410 críticos · 102 bajo mínimo) |

**Por sucursal (unidades):**

| Sucursal | Teléfonos | Accesorios | Servicios | Total |
|----------|-----------|------------|-----------|-------|
| Tu Móvil Centro | 105 | 391 | 476 | 972 |
| Tu Móvil La Isla | 33 | 42 | 0 | 75 |
| Tu Móvil Marino | 91 | 242 | 7 | 340 |
| Tu Móvil Store | 0 | 5 | 1212 | 1217 |
| Zona Gamer Margarita | 367 | 2983 | 268 | 3618 |
| **TOTAL** | **596** | **3663** | **1963** | — |

**Observación UX (2026-07-16):** Estadísticas mitigada en §15–§16 (splash inteligente, 4 cards fijas, cache).

---

## 15) Dashboard RPC + Estadísticas al reabrir

### A) RPC `get_dashboard_sales_summary` — **APLICADO en Supabase (2026-07-16)**

**Archivos:**
- `sql/13_rpc_dashboard_sales_summary.sql`
- `supabase/migrations/20260716220000_rpc_dashboard_sales_summary.sql`
- `src/hooks/useDashboardData.ts` (`USE_DASHBOARD_SALES_RPC = true` + fallback JS)

**Qué:**
- 1 RPC con fechas del cliente → periodos, tiendas, daily, financial health
- Fallback automático si falla
- Verificado vs baseline §14: Facturado / Órdenes / Caja / Crédito / Liquidez **OK**

**Flag de emergencia:** `USE_DASHBOARD_SALES_RPC = false` en `useDashboardData.ts`

### B) Estadísticas — UX de carga

- Splash: min ~0,4 s · max **5 s** · cierra al tener datos
- **4 cards siempre montadas** (placeholders Teléfonos/Accesorios/ST) → sin salto de layout
- Sin banner confuso de “cargando…”; pulse suave en cifras
- Cache session + memoria catálogo (~3 min)
- RPC financiera diferida (`useInventoryFinancialSummary` con `enabled`)

---

## 16) Cierre tanda 2026-07-16 — Dashboard∥ + Almacén/Artículos reopen

**Validación usuario:** se siente la mejora; se posponen mejoras más drásticas.

### Hecho en esta tanda (pendiente commit/push)

| Área | Cambio | SQL |
|------|--------|-----|
| Dashboard ventas | Agregación 1-fetch → RPC + fallback | `13_rpc_…` **aplicado** |
| Dashboard fetch | Vista + stores + RPC en paralelo; categorías en Promise.all | No |
| Dashboard UX | Splash omitido si hay cache | No |
| Estadísticas | Lotes inventario, cache, splash 4 cards, finance diferido | No |
| Almacén / Artículos | **No borrar** session cache al montar; paint pre-paint; stale 30 min; productos∥tiendas | No |
| Catálogo | Memoria compartida `inventoryCatalogFetch` ~3 min | No |
| Bitácora + baseline | §14–§17 | — |

### Archivos tocados (lista para commit)

- `src/hooks/useDashboardData.ts`
- `src/hooks/useInventoryFinancialSummary.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/EstadisticasPage.tsx`
- `src/pages/AlmacenPage.tsx`
- `src/pages/ArticulosPage.tsx`
- `src/utils/inventoryCatalogFetch.ts`
- `src/utils/inventoryPageCache.ts`
- `src/utils/estadisticasPageCache.ts` *(nuevo)*
- `sql/13_rpc_dashboard_sales_summary.sql` *(nuevo)*
- `supabase/migrations/20260716220000_rpc_dashboard_sales_summary.sql` *(nuevo)*
- `docs/MEJORAS_RENDIMIENTO_JUL_2026.md`

### Reglas que se mantuvieron

- No cambiar fórmulas de negocio / integridad de totales
- Fallback si RPC falla
- Cache se invalida en mutaciones de inventario (CRUD/transfer)
- `process_sale` **no tocado**

---

## 17) Roadmap futuro — de menos riesgo a más

Orden sugerido para próximas tandas. **No empezar varias a la vez.**

### Nivel A — Bajo riesgo / bajo-medio impacto (frontend / UX)

| # | Idea | Paneles | Riesgo | Notas |
|---|------|---------|--------|-------|
| A1 | Prefetch catálogo al hover del menú (Almacén/Artículos/Stats) | Inventario | Bajo | Misma API; solo adelanta red |
| A2 | Skeleton/estructura fija en Almacén/Artículos (como Stats 4 cards) | Inventario | Bajo | Solo UX |
| A3 | Diferir bloques secundarios Dashboard (top products, critical stock) tras KPIs | Dashboard | Bajo | KPIs ya vienen del RPC |
| A4 | Reducir logs `console.time` / debug en Stats/Almacén en prod | Varios | Muy bajo | Limpieza |
| A5 | Unificar TTL cache (Dashboard / Stats / Inventario) en un helper | Varios | Bajo | Mantenimiento |

### Nivel B — Medio riesgo / buen impacto (SQL lectura o índices)

| # | Idea | Paneles | Riesgo | Notas |
|---|------|---------|--------|-------|
| B1 | RPC resumen inventario Estadísticas (`get_stats_inventory_summary`) | Estadísticas | Medio | Paridad con cálculo actual; validar vs baseline §14 |
| B2 | Índices adicionales si EXPLAIN lo pide (sales company+status+created_at) | Dashboard/Historial | Bajo-medio | Solo si falta índice real |
| B3 | RPC catálogo liviano Almacén (productos+stock agregado) | Almacén/Artículos | Medio | Sustituye N páginas PostgREST; probar integridad stock |
| B4 | Materialized view / refresh periódico dashboard_stats | Dashboard | Medio | Ops: refresh schedule |

### Nivel C — Más complejo / más impacto (aún sin tocar cobros)

| # | Idea | Paneles | Riesgo | Notas |
|---|------|---------|--------|-------|
| C1 | Edge function o BFF que arme payload Dashboard completo | Dashboard | Medio-alto | Deploy + auth |
| C2 | Paginación servidor real en Almacén (virtualización lista) | Almacén | Medio | UX + API |
| C3 | Worker / React Query con invalidación centralizada | App | Medio | Refactor hooks |
| C4 | Particionar o archivar ventas antiguas | DB | Alto | Migración datos |

### Nivel D — Alto riesgo (dejar para el final, con plan de rollback)

| # | Idea | Riesgo | Notas |
|---|------|--------|-------|
| D1 | Optimizar / reescribir partes de **`process_sale`** | **Muy alto** | Caja, stock, Krece/Cashea, auditoría. Medir primero (latencia p95). Staging + pruebas de venta reales. |
| D2 | Cambiar RLS o SECURITY DEFINER amplios | Alto | Seguridad multi-empresa |
| D3 | Unificar POS + inventario en transacciones nuevas | Alto | Regresión ventas |

**Regla:** medir y documentar baseline **antes** de D1. Preferir A → B → C.

---

## Checklist rápido post-deploy (esta tanda)

- [ ] Commit + push autorizados
- [ ] Deploy Render OK
- [ ] Dashboard Hoy ≈ baseline (tolerar ventas nuevas del día)
- [ ] Estadísticas: 4 cards juntas; reopen rápido
- [ ] Almacén ↔ Artículos: reopen sin skeleton eterno
- [ ] Mutar stock → lista se actualiza
- [ ] POS venta de prueba OK (no tocamos `process_sale`, smoke test igual)

---

Regla sugerida: **medir antes de tocar `process_sale`.**

---

## Enlaces útiles

- Canvas auditoría: `canvases/auditoria-rendimiento-pos.canvas.tsx` (en carpeta Cursor del proyecto)
- SQL índices inventario: `sql/05_indices_inventory_movements_performance.sql`
- SQL índices POS: `sql/06_indices_pos_customers_products.sql`
- SQL Dashboard RPC: `sql/13_rpc_dashboard_sales_summary.sql`
