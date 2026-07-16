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
| Alto — alertas de stock unificadas | Hecho y en `main` (consulta única + debounce Realtime) | (ver commit reciente) |
| Alto (`process_sale`, Almacén, Historial UI) | **Pendiente** | — |

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
- [ ] Historial carga sin error
- [ ] Alertas de stock en navbar funcionan
- [ ] Los 6 índices siguen listados en Supabase
- [ ] No hay quejas de “desapareció una función”

---

## 4) Nivel alto (parcial) — alertas unificadas — pendiente documentar commit

Hecho en código (ver commits posteriores a esta bitácora):

- Una sola consulta `qty < 10` compartida navbar + dashboard
- Realtime filtrado por `company_id` + debounce 1.5s
- Polling 60s (antes 45s) y solo con pestaña visible
- Mismos umbrales UI (0 / 1–3 / 3–9)

---

## Próximo (cuando se decida — nivel alto restante)

Solo con medición y cuidado (sí pueden tocar lógica si se hacen mal):

1. `process_sale` set-based + auditoría única  
2. Almacén / Artículos / Historial: no bajar 1000 filas al cliente  

Regla sugerida: medir p50/p95 y Web Vitals antes de tocar alto.

---

## Enlaces útiles

- Canvas auditoría: `canvases/auditoria-rendimiento-pos.canvas.tsx` (en carpeta Cursor del proyecto)
- SQL índices: `sql/05_indices_inventory_movements_performance.sql`
