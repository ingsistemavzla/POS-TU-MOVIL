# 🔍 AUDITORÍA: Dashboard Data Integrity & Logic Correctness

**Fecha:** 2025-01-27  
**Auditor:** Senior Systems Auditor & React/Supabase Specialist  
**Objetivo:** Verificar integridad de datos y corrección lógica en el Dashboard Principal

---

## 📋 RESUMEN EJECUTIVO

| Estructura | Componente | Estado | Bug Crítico |
|---|---|---|---|
| **Structure 1: Top KPI Cards** | `Dashboard.tsx` | 🔴 **BROKEN** | ❌ NO filtra `status = 'completed'` |
| **Structure 2: Store Performance Table** | `DashboardStoreTable.tsx` | 🟡 **PENDING** | ⚠️ Bug corregido en migración, pero no aplicado |
| **Sincronización de Fechas** | `Dashboard.tsx` ↔ `DashboardStoreTable.tsx` | 🔴 **BROKEN** | ❌ NO comparten `dateRange` state |

---

## 🔴 STRUCTURE 1: TOP KPI CARDS

### **Component:** `src/pages/Dashboard.tsx`

### **1.1. "Total Facturado" Card**

**Data Source:**
- **Hook:** `useDashboardData()` (Línea 29)
- **Query:** `getSalesForPeriod()` → `supabase.from('sales').select('id, total_usd, created_at')` (Línea 163-175)
- **Filtros Aplicados:**
  - ✅ `company_id` (vía RLS)
  - ✅ `created_at >= startDate` y `created_at <= endDate`
  - ❌ **NO filtra `status = 'completed'`** ⚠️ **BUG CRÍTICO**

**Líneas de Código:**
```typescript
// src/hooks/useDashboardData.ts:163-175
let query = supabase
  .from('sales')
  .select('id, total_usd, created_at')
  .gte('created_at', startDate.toISOString())
  .lte('created_at', endDate.toISOString());
// ❌ FALTA: .eq('status', 'completed')
```

**Logic Verdict:** 🔴 **BROKEN**

**Root Cause:**
- La query incluye ventas con `status != 'completed'` (ej: 'pending', 'cancelled', 'refunded')
- Esto infla el "Total Facturado" con ventas que no deberían contarse

**Fix Recommendation:**
```typescript
// src/hooks/useDashboardData.ts:163-175
let query = supabase
  .from('sales')
  .select('id, total_usd, created_at')
  .eq('status', 'completed')  // ✅ AGREGAR ESTE FILTRO
  .gte('created_at', startDate.toISOString())
  .lte('created_at', endDate.toISOString());
```

---

### **1.2. "Ingreso Neto" Card**

**Data Source:**
- **Hook:** `usePaymentMethodsData(selectedPeriod)` (Línea 31)
- **Query:** `supabase.from('sale_payments').select(...)` (Línea 83-96)
- **Filtros Aplicados:**
  - ✅ `sales.company_id = companyId`
  - ✅ `sales.created_at >= startDate` y `sales.created_at <= endDate`
  - ❌ **NO filtra `sales.status = 'completed'`** ⚠️ **BUG CRÍTICO**

**Líneas de Código:**
```typescript
// src/hooks/usePaymentMethodsData.ts:83-96
const result = await (supabase as any)
  .from('sale_payments')
  .select(`
    payment_method,
    amount_usd,
    amount_bs,
    sales!inner(
      company_id,
      created_at
    )
  `)
  .eq('sales.company_id', userProfile.company_id)
  .gte('sales.created_at', startDate.toISOString())
  .lte('sales.created_at', endDate.toISOString());
// ❌ FALTA: .eq('sales.status', 'completed')
```

**Logic Verdict:** 🔴 **BROKEN**

**Root Cause:**
- La query incluye pagos de ventas con `status != 'completed'`
- Esto infla el "Ingreso Neto" con pagos de ventas canceladas/reembolsadas

**Fix Recommendation:**
```typescript
// src/hooks/usePaymentMethodsData.ts:83-96
const result = await (supabase as any)
  .from('sale_payments')
  .select(`
    payment_method,
    amount_usd,
    amount_bs,
    sales!inner(
      company_id,
      created_at,
      status
    )
  `)
  .eq('sales.company_id', userProfile.company_id)
  .eq('sales.status', 'completed')  // ✅ AGREGAR ESTE FILTRO
  .gte('sales.created_at', startDate.toISOString())
  .lte('sales.created_at', endDate.toISOString());
```

---

### **1.3. "Financiamiento Krece" Card**

**Data Source:**
- **Hook:** `useKreceStats(selectedPeriod)` (Línea 30)
- **Query:** `supabase.from('sales').select(...)` (Línea 92-99)
- **Filtros Aplicados:**
  - ✅ `company_id = companyId`
  - ✅ `krece_enabled = true`
  - ✅ `created_at >= startDate` y `created_at < endDate`
  - ❌ **NO filtra `status = 'completed'`** ⚠️ **BUG CRÍTICO**

**Líneas de Código:**
```typescript
// src/hooks/useKreceStats.ts:92-99
const { data, error } = await (supabase as any)
  .from('sales')
  .select('id, total_usd, krece_initial_amount_usd, krece_financed_amount_usd, created_at, bcv_rate_used, krece_initial_percentage')
  .eq('company_id', companyId)
  .eq('krece_enabled', true)
  .gte('created_at', startDate.toISOString())
  .lt('created_at', endDate.toISOString())
  .limit(50);
// ❌ FALTA: .eq('status', 'completed')
```

**Logic Verdict:** 🔴 **BROKEN**

**Root Cause:**
- La query incluye ventas con Krece que tienen `status != 'completed'`
- Esto infla el "Financiamiento Krece" con financiamientos de ventas canceladas

**Fix Recommendation:**
```typescript
// src/hooks/useKreceStats.ts:92-99
const { data, error } = await (supabase as any)
  .from('sales')
  .select('id, total_usd, krece_initial_amount_usd, krece_financed_amount_usd, created_at, bcv_rate_used, krece_initial_percentage')
  .eq('company_id', companyId)
  .eq('krece_enabled', true)
  .eq('status', 'completed')  // ✅ AGREGAR ESTE FILTRO
  .gte('created_at', startDate.toISOString())
  .lt('created_at', endDate.toISOString())
  .limit(50);
```

---

### **1.4. "Ingreso por Krece" Card**

**Data Source:**
- **Hook:** `useKreceStats(selectedPeriod)` (Línea 30)
- **Query:** Mismo que "Financiamiento Krece" (Línea 92-99)
- **Filtros Aplicados:** Mismo problema

**Logic Verdict:** 🔴 **BROKEN** (Mismo bug que "Financiamiento Krece")

---

## 🟡 STRUCTURE 2: STORE PERFORMANCE TABLE

### **Component:** `src/components/dashboard/DashboardStoreTable.tsx`

### **2.1. Data Source**

**RPC Function:**
- **Nombre:** `get_dashboard_store_performance`
- **Hook:** `useDashboardStorePerformance()` (Línea 43)
- **Parámetros:** `startDate`, `endDate` (Líneas 40-41)

**Filtros Aplicados en RPC:**
- ✅ `company_id = v_company_id`
- ✅ `created_at >= p_start_date` y `created_at < p_end_date`
- ✅ **SÍ filtra `status = 'completed'`** (Línea 56 en migración corregida)

**Logic Verdict:** ✅ **SAFE** (Si la migración corregida está aplicada)

---

### **2.2. The "Smoking Gun": Profit > Revenue**

**Anomalía Reportada:**
- Row "Tu Móvil Store": Facturado `$92.80` pero Ganancia `$1,165.00`
- Row "Total General": Facturado `$649.28` pero Ganancia `$1,345.00`

**Cálculo Actual (Bug):**
```sql
-- supabase/migrations/20250105000001_create_legacy_financial_functions.sql:363-364
'estimated_profit', COALESCE(
  sp.total_subtotal - sp.total_cost,  -- ❌ BUG: Usa total_subtotal
  0
),
```

**Cálculo Corregido (Fix):**
```sql
-- supabase/migrations/20250127000002_fix_profit_calculation_bug.sql:106-108
'estimated_profit', COALESCE(
  sp.total_invoiced - sp.total_cost,  -- ✅ FIX: Usa total_invoiced
  0
),
```

**Root Cause:**
- **`total_subtotal`** = Suma de `sale_items.subtotal_usd` (antes de descuentos/impuestos)
- **`total_invoiced`** = `sales.total_usd` (después de descuentos/impuestos)
- Si hay descuentos, `total_subtotal > total_invoiced`
- Por lo tanto: `(total_subtotal - cost) > (total_invoiced - cost)`
- **Resultado:** Profit > Revenue (matemáticamente imposible)

**Ejemplo Matemático:**
```
Venta con descuento:
  - Subtotal items: $1,200.00
  - Descuento: -$100.00
  - Total facturado: $1,100.00
  - Cost: $50.00

Cálculo BUG (total_subtotal - cost):
  Profit = $1,200.00 - $50.00 = $1,150.00 ❌ (Mayor que Revenue)

Cálculo CORRECTO (total_invoiced - cost):
  Profit = $1,100.00 - $50.00 = $1,050.00 ✅ (Menor que Revenue)
```

**Logic Verdict:** 🟡 **PENDING** (Bug corregido en migración, pero necesita verificación)

**Fix Recommendation:**
1. **Verificar si la migración `20250127000002_fix_profit_calculation_bug.sql` está aplicada:**
   ```sql
   -- Ejecutar en Supabase SQL Editor:
   SELECT routine_definition 
   FROM information_schema.routines 
   WHERE routine_name = 'get_dashboard_store_performance';
   ```
2. **Si NO está aplicada, ejecutar la migración:**
   ```bash
   # Aplicar migración manualmente en Supabase SQL Editor
   # O ejecutar: supabase migration up
   ```
3. **Si YA está aplicada, verificar que el cálculo sea correcto:**
   ```sql
   -- Verificar que estimated_profit use total_invoiced:
   SELECT 
     store_name,
     total_invoiced,
     estimated_profit,
     (estimated_profit > total_invoiced) AS profit_exceeds_revenue
   FROM (
     SELECT * FROM jsonb_to_recordset(
       (SELECT get_dashboard_store_performance()::jsonb->'summary')
     ) AS x(
       store_name text,
       total_invoiced numeric,
       estimated_profit numeric
     )
   ) AS stores
   WHERE estimated_profit > total_invoiced;
   ```

---

## 🔴 STRUCTURE 3: SYNCHRONIZATION BUG

### **3.1. Date Range Mismatch**

**Structure 1 (Top KPI Cards):**
- **State:** `selectedPeriod` ('today', 'yesterday', 'thisMonth') (Línea 27)
- **Component:** `Dashboard.tsx`
- **Date Calculation:** `getDateRanges()` → `dates.today`, `dates.yesterday`, `dates.startOfMonth` (Línea 237)

**Structure 2 (Store Performance Table):**
- **State:** `datePreset` ('7days', '30days', 'thismonth', 'custom') (Línea 39)
- **Component:** `DashboardStoreTable.tsx`
- **Date Calculation:** `handleDatePreset()` → `subDays(today, 30)` (Línea 40-41)
- **Default:** `'30days'` (Línea 39)

**Problema:**
- Structure 1 muestra "Hoy" ($0.00) cuando `selectedPeriod = 'today'`
- Structure 2 muestra "Últimos 30 días" ($649.28) cuando `datePreset = '30days'`
- **NO están sincronizados** - Usan diferentes rangos de fechas

**Logic Verdict:** 🔴 **BROKEN**

**Root Cause:**
- `DashboardStoreTable` NO recibe `selectedPeriod` como prop
- `DashboardStoreTable` tiene su propio estado `datePreset` independiente
- No hay comunicación entre los dos componentes

**Fix Recommendation:**
1. **Pasar `selectedPeriod` como prop a `DashboardStoreTable`:**
   ```typescript
   // src/pages/Dashboard.tsx:503
   <DashboardStoreTable selectedPeriod={selectedPeriod} />
   ```

2. **Convertir `selectedPeriod` a `startDate/endDate` en `DashboardStoreTable`:**
   ```typescript
   // src/components/dashboard/DashboardStoreTable.tsx
   interface DashboardStoreTableProps {
     selectedPeriod?: 'today' | 'yesterday' | 'thisMonth';
   }
   
   export const DashboardStoreTable: React.FC<DashboardStoreTableProps> = ({ selectedPeriod }) => {
     // Convertir selectedPeriod a startDate/endDate
     const { startDate, endDate } = useMemo(() => {
       if (selectedPeriod) {
         const dates = getDateRanges(); // Reutilizar función de Dashboard
         switch (selectedPeriod) {
           case 'today':
             return { startDate: dates.today, endDate: dates.todayEnd };
           case 'yesterday':
             return { startDate: dates.yesterday, endDate: dates.yesterdayEnd };
           case 'thisMonth':
             return { startDate: dates.startOfMonth, endDate: dates.todayEnd };
         }
       }
       // Fallback a datePreset si no hay selectedPeriod
       return { startDate, endDate };
     }, [selectedPeriod]);
     
     // ... resto del código
   };
   ```

---

## 📊 TABLA RESUMEN DE HALLAZGOS

| Component | Data Source | Logic Verdict | Root Cause | Fix Status |
|---|---|---|---|---|
| **Total Facturado** | `useDashboardData` → `sales` table | 🔴 **BROKEN** | ❌ NO filtra `status = 'completed'` | ⚠️ **PENDING** |
| **Ingreso Neto** | `usePaymentMethodsData` → `sale_payments` | 🔴 **BROKEN** | ❌ NO filtra `sales.status = 'completed'` | ⚠️ **PENDING** |
| **Financiamiento Krece** | `useKreceStats` → `sales` table | 🔴 **BROKEN** | ❌ NO filtra `status = 'completed'` | ⚠️ **PENDING** |
| **Ingreso por Krece** | `useKreceStats` → `sales` table | 🔴 **BROKEN** | ❌ NO filtra `status = 'completed'` | ⚠️ **PENDING** |
| **Store Performance Table** | `get_dashboard_store_performance` RPC | 🟡 **PENDING** | ⚠️ Bug corregido, pero migración no verificada | ⚠️ **PENDING** |
| **Date Range Sync** | `Dashboard.tsx` ↔ `DashboardStoreTable.tsx` | 🔴 **BROKEN** | ❌ NO comparten `dateRange` state | ⚠️ **PENDING** |

---

## 🎯 PRIORIDAD DE FIXES

### **🔴 CRÍTICO (Alta Prioridad):**

1. **Agregar filtro `status = 'completed'` a todas las queries de ventas:**
   - `useDashboardData.ts` (Línea 163)
   - `usePaymentMethodsData.ts` (Línea 83)
   - `useKreceStats.ts` (Línea 92)

2. **Verificar y aplicar migración de profit calculation:**
   - Verificar si `20250127000002_fix_profit_calculation_bug.sql` está aplicada
   - Si no, aplicarla manualmente

### **🟡 MEDIO (Media Prioridad):**

3. **Sincronizar date ranges entre Dashboard y DashboardStoreTable:**
   - Pasar `selectedPeriod` como prop
   - Convertir a `startDate/endDate` en `DashboardStoreTable`

---

## 📝 VERIFICACIÓN POST-FIX

### **Checklist de Validación:**

- [ ] ✅ "Total Facturado" solo incluye ventas con `status = 'completed'`
- [ ] ✅ "Ingreso Neto" solo incluye pagos de ventas con `status = 'completed'`
- [ ] ✅ "Financiamiento Krece" solo incluye ventas con `status = 'completed'`
- [ ] ✅ "Ingreso por Krece" solo incluye ventas con `status = 'completed'`
- [ ] ✅ `estimated_profit` nunca excede `total_invoiced` en Store Performance Table
- [ ] ✅ `DashboardStoreTable` usa el mismo `dateRange` que los KPI Cards cuando `selectedPeriod` cambia

---

**FIN DEL REPORTE**


