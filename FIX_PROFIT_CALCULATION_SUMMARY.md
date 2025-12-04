# 🔧 FIX: Critical Profit Calculation Bug

**Fecha:** 2025-01-27  
**Tipo:** SQL Migration Patch  
**Prioridad:** P0 (Crítico)

---

## 🐛 BUG IDENTIFICADO

### **Problema:**
La función `get_dashboard_store_performance` calculaba `estimated_profit` usando `total_subtotal` (suma de `sale_items.subtotal_usd`) pero reportaba revenue como `total_invoiced` (suma de `sales.total_usd`).

### **Causa:**
- `total_subtotal` puede ser **MAYOR** que `total_invoiced` cuando:
  1. Hay descuentos aplicados a nivel de venta (no a nivel de item)
  2. Hay impuestos que se agregan después de los subtotales
  3. Hay diferencias de redondeo entre `sale_items` y `sales.total_usd`

### **Síntoma:**
- UI mostraba: **Profit ($1,165) > Revenue ($92.80)**
- Esto es matemáticamente imposible si ambos usaran la misma base

---

## ✅ SOLUCIÓN APLICADA

### **Archivo:**
`supabase/migrations/20250127000002_fix_profit_calculation_bug.sql`

### **Cambios:**

**1. Línea 363-365: `estimated_profit`**
```sql
-- ANTES (BUG):
'estimated_profit', COALESCE(
  sp.total_subtotal - sp.total_cost,
  0
),

-- DESPUÉS (FIX):
'estimated_profit', COALESCE(
  sp.total_invoiced - sp.total_cost,
  0
),
```

**2. Línea 369-373: `profit_margin_percent`**
```sql
-- ANTES (BUG):
'profit_margin_percent', CASE
  WHEN COALESCE(sp.total_subtotal, 0) > 0
  THEN ((COALESCE(sp.total_subtotal, 0) - COALESCE(sp.total_cost, 0)) / COALESCE(sp.total_subtotal, 0)) * 100
  ELSE 0
END

-- DESPUÉS (FIX):
'profit_margin_percent', CASE
  WHEN COALESCE(sp.total_invoiced, 0) > 0
  THEN ((COALESCE(sp.total_invoiced, 0) - COALESCE(sp.total_cost, 0)) / COALESCE(sp.total_invoiced, 0)) * 100
  ELSE 0
END
```

---

## 🧪 VERIFICACIÓN

### **Garantías Matemáticas:**
1. ✅ **Profit ≤ Revenue:** `estimated_profit = total_invoiced - total_cost` nunca excederá `total_invoiced` (asumiendo `total_cost ≥ 0`)
2. ✅ **Consistencia:** Profit y Revenue usan la misma base (`total_invoiced`)
3. ✅ **Null Safety:** Todos los valores usan `COALESCE` para manejar NULLs

### **Pruebas Recomendadas:**
```sql
-- Verificar que profit nunca exceda revenue
SELECT 
  store_name,
  total_invoiced,
  estimated_profit,
  CASE 
    WHEN estimated_profit > total_invoiced THEN '❌ BUG'
    ELSE '✅ OK'
  END AS validation
FROM (
  SELECT 
    (summary->>'store_name')::text AS store_name,
    (summary->>'total_invoiced')::numeric AS total_invoiced,
    (summary->>'estimated_profit')::numeric AS estimated_profit
  FROM jsonb_array_elements(
    public.get_dashboard_store_performance()::jsonb->'summary'
  ) AS summary
) AS stores
WHERE estimated_profit > total_invoiced;
-- Debe retornar 0 filas
```

---

## 📋 DEPLOYMENT

### **Pasos:**
1. ✅ Ejecutar migration: `supabase/migrations/20250127000002_fix_profit_calculation_bug.sql`
2. ✅ Verificar que no hay errores de sintaxis
3. ✅ Probar con datos reales
4. ✅ Verificar que profit ≤ revenue en todos los casos

### **Rollback:**
Si es necesario revertir, ejecutar la versión anterior de la función desde `20250105000001_create_legacy_financial_functions.sql`

---

## 📊 IMPACTO

- **Componentes Afectados:**
  - `DashboardStoreTable` (src/components/dashboard/DashboardStoreTable.tsx)
  - Cualquier componente que use `useDashboardStorePerformance` hook

- **Cambio Visible:**
  - Los valores de "Ganancia" y "Margen %" en la tabla de rendimiento por sucursal serán más bajos (y correctos)
  - Profit ya no excederá Revenue

---

**FIN DEL FIX**

