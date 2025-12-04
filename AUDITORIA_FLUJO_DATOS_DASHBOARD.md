# 🔍 AUDITORÍA: Flujo de Datos del Dashboard

**Fecha:** 2025-01-27  
**Auditor:** Senior Systems Auditor & Data Flow Specialist  
**Objetivo:** Mapear el flujo de datos y detectar inconsistencias en componentes del dashboard

---

## 📊 REPORTE DE COMPONENTES

| Component | Data Source (RPC/Table) | Processing Logic (SQL vs JS) | Critical Findings / Bugs |
|---|---|---|---|
| **DashboardStoreTable** | `RPC: get_dashboard_store_performance` | **SQL Calculation** | 🔴 **BUG CRÍTICO:** Profit usa `total_subtotal` (sale_items) mientras "Facturado" usa `total_invoiced` (sales.total_usd). Pueden diferir por descuentos/impuestos. |
| **DashboardStats (Top Cards)** | `Table: sales` (direct query via `useDashboardData`) | **JS Aggregation** | ⚠️ **SYNC BUG:** No comparte `dateRange` con DashboardStoreTable. Cards usan `selectedPeriod` ('today'/'yesterday'/'thisMonth'), Table usa preset fijo (30 días). |
| **InventoryDashboardHeader** | `RPC: get_inventory_financial_summary` | **SQL Aggregation** | ✅ **OK:** Categorías calculadas en SQL, no hay client-side grouping. Performance aceptable. |
| **ExpandableProductTable (AlmacenPage)** | `Table: products` + `Table: inventories` (JOIN) | **JS Expansion** | ⚠️ **PERFORMANCE RISK:** Carga TODO el inventario en una query, luego expande en memoria. No hay N+1, pero puede ser lento con muchos productos. |

---

## 🔴 HALLAZGO 1: DashboardStoreTable - Profit > Revenue Bug

### **Ubicación:**
- **Componente:** `src/components/dashboard/DashboardStoreTable.tsx`
- **Hook:** `src/hooks/useDashboardStorePerformance.ts`
- **RPC:** `supabase/migrations/20250105000001_create_legacy_financial_functions.sql` (línea 273-399)

### **Análisis del Bug:**

**Línea 363-365 (SQL):**
```sql
'estimated_profit', COALESCE(
  sp.total_subtotal - sp.total_cost,
  0
),
```

**Línea 361 (SQL):**
```sql
'total_invoiced', COALESCE(sp.total_invoiced, 0),
```

**Problema:**
- `estimated_profit` = `total_subtotal - total_cost` (suma de `sale_items.subtotal_usd`)
- `total_invoiced` = `SUM(sales.total_usd)` (total de la venta, puede incluir descuentos/impuestos)

**Causa Raíz:**
- `total_subtotal` puede ser **MAYOR** que `total_invoiced` si:
  1. Hay descuentos aplicados a nivel de venta (no a nivel de item)
  2. Hay impuestos que se agregan después de los subtotales
  3. Hay diferencias de redondeo entre `sale_items` y `sales.total_usd`

**Evidencia:**
- UI muestra: Profit ($1,165) > Billed ($92.80)
- Esto es **matemáticamente imposible** si ambos usaran la misma base

### **Recomendación:**
Usar `total_invoiced` como base para profit:
```sql
'estimated_profit', COALESCE(
  sp.total_invoiced - sp.total_cost,  -- Cambiar de total_subtotal a total_invoiced
  0
),
```

---

## ⚠️ HALLAZGO 2: DashboardStats - Sync Bug (Cards vs Table)

### **Ubicación:**
- **Top Cards:** `src/pages/Dashboard.tsx` (líneas 225-315)
- **Table:** `src/components/dashboard/DashboardStoreTable.tsx` (línea 39)

### **Análisis del Bug:**

**Top Cards (Dashboard.tsx):**
- Usa `useDashboardData()` hook
- Filtra por `selectedPeriod` ('today' | 'yesterday' | 'thisMonth')
- Query directa a tabla `sales` con filtros de fecha dinámicos

**DashboardStoreTable:**
- Usa `useDashboardStorePerformance()` hook
- **Preset fijo:** `'30days'` (línea 39)
- RPC `get_dashboard_store_performance` con rango de 30 días

**Problema:**
1. **Cards muestran "Today: $0"** porque `selectedPeriod = 'today'` y no hay ventas hoy
2. **Table muestra datos de últimos 30 días** porque usa preset fijo
3. **No comparten estado de fecha** - son componentes independientes

**Evidencia:**
- Usuario reporta: "Top Cards muestran $0 pero Table muestra datos"
- Esto es **esperado** si `selectedPeriod = 'today'` y no hay ventas hoy

### **Recomendación:**
1. **Opción A:** Hacer que DashboardStoreTable use el mismo `selectedPeriod` del Dashboard
2. **Opción B:** Agregar selector de período compartido entre ambos componentes

---

## ✅ HALLAZGO 3: InventoryDashboardHeader - Category Breakdown

### **Ubicación:**
- **Componente:** `src/components/inventory/InventoryDashboardHeader.tsx`
- **Hook:** `src/hooks/useInventoryFinancialSummary.ts`
- **RPC:** `get_inventory_financial_summary`

### **Análisis:**

**Línea 44-47 (InventoryDashboardHeader.tsx):**
```typescript
const { data, loading, error } = useInventoryFinancialSummary();
// ...
const totalProducts = data?.category_breakdown.reduce((sum, cat) => sum + (cat.items_count || 0), 0) || 0;
```

**Procesamiento:**
- ✅ **SQL Aggregation:** La RPC `get_inventory_financial_summary` calcula `category_breakdown` en SQL
- ✅ **JS solo suma:** El componente solo suma los `items_count` ya calculados
- ✅ **No hay client-side grouping:** No se hace `reduce/map` para agrupar por categoría

**Performance:**
- ✅ **Aceptable:** Una sola query RPC, procesamiento en SQL (eficiente)

### **Conclusión:**
✅ **NO HAY PROBLEMA** - El código está optimizado correctamente.

---

## ⚠️ HALLAZGO 4: ExpandableProductTable - Stock Loading

### **Ubicación:**
- **Componente:** `src/pages/AlmacenPage.tsx`
- **Líneas:** 93-270 (fetchData function)

### **Análisis:**

**Query Principal (línea 104-108):**
```typescript
const { data: productsData, error: productsError } = await supabase.from('products')
  .select('id, sku, barcode, name, category, cost_usd, sale_price_usd, tax_rate, active, created_at')
  .eq('active', true)
  .order('created_at', { ascending: false });
```

**Query de Inventario (línea 167-170):**
```typescript
const inventoryQuery = supabase.from('inventories')
  .select('product_id, store_id, qty, products!inner(active)')
  .eq('products.active', true);
```

**Procesamiento (línea 189-240):**
- ✅ **No hay N+1:** Se carga TODO el inventario en una query
- ⚠️ **Carga todo en memoria:** Se procesa en JS para crear `stockByProductStore` Map
- ⚠️ **Expansión en memoria:** Cuando se expande un producto, se lee de `storeInventories[productId]` (ya cargado)

**Performance Risk:**
- ⚠️ **Con 1000+ productos:** La query puede ser lenta
- ⚠️ **Con 10+ tiendas:** Se carga inventario de todas las tiendas para todos los productos
- ✅ **No hay N+1:** No se hacen queries adicionales al expandir

### **Recomendación:**
1. **Opción A:** Paginación de productos (cargar 50 a la vez)
2. **Opción B:** Lazy loading de inventario (cargar solo cuando se expande)
3. **Opción C:** Mantener actual (aceptable para < 500 productos)

---

## 📋 RESUMEN EJECUTIVO

### **Bugs Críticos:**
1. 🔴 **DashboardStoreTable:** Profit calculado con `total_subtotal` pero comparado con `total_invoiced` → **FIX REQUERIDO**

### **Bugs de Sincronización:**
2. ⚠️ **DashboardStats:** Cards y Table no comparten `dateRange` → **UX CONFUSO**

### **Riesgos de Performance:**
3. ⚠️ **AlmacenPage:** Carga todo el inventario en memoria → **ACEPTABLE para < 500 productos**

### **Componentes Optimizados:**
4. ✅ **InventoryDashboardHeader:** SQL aggregation correcta

---

## 🎯 PRIORIDADES DE CORRECCIÓN

1. **P0 (Crítico):** Corregir cálculo de Profit en `get_dashboard_store_performance` RPC
2. **P1 (Alto):** Sincronizar `dateRange` entre DashboardStats y DashboardStoreTable
3. **P2 (Medio):** Considerar paginación en AlmacenPage si hay > 500 productos

---

**FIN DEL REPORTE**

