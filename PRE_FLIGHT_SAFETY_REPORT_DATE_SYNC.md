# 🛡️ PRE-FLIGHT SAFETY REPORT: Date Filter Synchronization

**Fecha:** 2025-01-27  
**Tipo:** Impact Analysis - Pre-Implementation  
**Prioridad:** P1 (Alto - UX Fix)

---

## 📋 RESUMEN EJECUTIVO

**Objetivo:** Sincronizar el filtro de fechas entre `DashboardPage` (top cards) y `DashboardStoreTable` (tabla de rendimiento).

**Riesgo:** BAJO - Cambio aislado, no afecta otras páginas.

---

## ✅ FILES TO MODIFY

### **1. `src/pages/Dashboard.tsx`**
- **Línea 22:** Import de `DashboardStoreTable` (ya existe)
- **Línea 503:** Render de `<DashboardStoreTable />` (cambiar a prop-based)
- **Cambio:** Pasar `selectedPeriod` como prop a `DashboardStoreTable`

**Impacto:** Mínimo - Solo agregar prop, no cambiar lógica de datos.

---

### **2. `src/components/dashboard/DashboardStoreTable.tsx`**
- **Línea 38:** Componente actual (sin props)
- **Línea 39:** Estado `datePreset` (remover o hacer opcional)
- **Línea 43-46:** Hook `useDashboardStorePerformance` (ya acepta `startDate`/`endDate`)
- **Cambio:** 
  - Agregar prop opcional `selectedPeriod?: PeriodType`
  - Convertir `selectedPeriod` a `startDate`/`endDate` usando `date-fns`
  - Mantener `datePreset` como fallback si no se pasa prop

**Impacto:** Medio - Cambio en interfaz del componente, pero lógica de datos intacta.

---

## 🔒 FILES SAFE/UNTOUCHED

### **✅ CONFIRMADO: `src/pages/AlmacenPage.tsx`**
- **Verificación:** `grep` no encontró referencias a `DashboardStoreTable`, `useDashboardStorePerformance`, `selectedPeriod`, o `datePreset`
- **Componentes usados:** `InventoryDashboardHeader`, `BranchStockMatrix`, `InventoryFinancialHeader`
- **Estado:** ✅ **100% SEGURO - NO SERÁ MODIFICADO**

---

### **✅ CONFIRMADO: `src/pages/ArticulosPage.tsx`**
- **Verificación:** `grep` no encontró referencias a `DashboardStoreTable`, `useDashboardStorePerformance`, `selectedPeriod`, o `datePreset`
- **Componentes usados:** `ArticlesStatsRow` (propio de Artículos)
- **Estado:** ✅ **100% SEGURO - NO SERÁ MODIFICADO**

---

### **✅ CONFIRMADO: `src/components/inventory/InventoryDashboardHeader.tsx`**
- **Verificación:** No usa `DashboardStoreTable` ni hooks relacionados
- **Dependencias:** `useInventoryFinancialSummary` (RPC diferente)
- **Estado:** ✅ **100% SEGURO - NO SERÁ AFECTADO**

---

### **✅ CONFIRMADO: `src/components/inventory/ArticlesStatsRow.tsx`**
- **Verificación:** No usa `DashboardStoreTable` ni hooks relacionados
- **Dependencias:** `useInventoryFinancialSummary` (RPC diferente)
- **Estado:** ✅ **100% SEGURO - NO SERÁ AFECTADO**

---

### **✅ CONFIRMADO: `src/hooks/useDashboardStorePerformance.ts`**
- **Verificación:** Ya acepta `startDate` y `endDate` como parámetros (líneas 28-29, 67-77)
- **Cambio requerido:** ✅ **NINGUNO** - El hook ya está preparado para recibir fechas
- **Estado:** ✅ **NO REQUIERE MODIFICACIÓN**

---

## 🔄 DATA FLOW CHANGE

### **ANTES (Estado Actual):**

```
DashboardPage:
  └─ selectedPeriod: 'today' | 'yesterday' | 'thisMonth'
     └─ Usado por: Top Cards, Charts, Payment Methods

DashboardStoreTable:
  └─ datePreset: '30days' (FIXED)
     └─ Convierte a: startDate/endDate
        └─ useDashboardStorePerformance({ startDate, endDate })
```

**Problema:** Dos estados independientes, no sincronizados.

---

### **DESPUÉS (Propuesta):**

```
DashboardPage:
  └─ selectedPeriod: 'today' | 'yesterday' | 'thisMonth'
     └─ Pasa como prop a DashboardStoreTable
        └─ DashboardStoreTable convierte selectedPeriod → startDate/endDate
           └─ useDashboardStorePerformance({ startDate, endDate })
```

**Solución:** Un solo estado (`selectedPeriod`) controla ambos componentes.

---

## 📊 LOGIC CHANGE DETAILS

### **Tipo de Cambio:**
- ✅ **Solo el TRIGGER (filtro de fecha)** - NO cambia la lógica de datos
- ✅ **Misma RPC:** `get_dashboard_store_performance` (sin cambios)
- ✅ **Mismo Hook:** `useDashboardStorePerformance` (sin cambios)
- ✅ **Misma Query:** Solo cambia cuándo se ejecuta, no qué se ejecuta

### **Conversión de Período a Fechas:**

```typescript
// Función helper (nueva, en DashboardStoreTable)
const periodToDateRange = (period: 'today' | 'yesterday' | 'thisMonth') => {
  const today = startOfToday();
  
  switch (period) {
    case 'today':
      return {
        startDate: today,
        endDate: today
      };
    case 'yesterday':
      return {
        startDate: subDays(today, 1),
        endDate: subDays(today, 1)
      };
    case 'thisMonth':
      return {
        startDate: startOfMonth(today),
        endDate: endOfMonth(today)
      };
  }
};
```

**Nota:** Esta conversión es puramente de UI → API, no afecta la lógica de negocio.

---

## 🧪 TESTING CHECKLIST

### **Pre-Deployment:**
- [ ] Verificar que `DashboardStoreTable` funciona con prop `selectedPeriod`
- [ ] Verificar que `DashboardStoreTable` funciona sin prop (fallback a '30days')
- [ ] Verificar que Top Cards y Table muestran datos del mismo período
- [ ] Verificar que cambio de período en Dashboard actualiza Table

### **Post-Deployment:**
- [ ] Verificar que Almacén sigue funcionando (sin cambios esperados)
- [ ] Verificar que Artículos sigue funcionando (sin cambios esperados)
- [ ] Verificar que InventoryDashboardHeader sigue funcionando
- [ ] Verificar que no hay errores en consola

---

## ⚠️ RIESGOS IDENTIFICADOS

### **Riesgo 1: Backward Compatibility**
- **Descripción:** Si `DashboardStoreTable` se usa en otro lugar sin prop
- **Mitigación:** Hacer prop opcional con fallback a '30days'
- **Severidad:** BAJA

### **Riesgo 2: Type Mismatch**
- **Descripción:** `selectedPeriod` es `'today' | 'yesterday' | 'thisMonth'` pero `datePreset` es `'7days' | '30days' | 'thismonth' | 'custom'`
- **Mitigación:** Convertir `selectedPeriod` a `startDate/endDate` directamente, no usar `datePreset`
- **Severidad:** BAJA

---

## 📝 DEPENDENCY GRAPH

```
Dashboard.tsx
  ├─ selectedPeriod (state)
  ├─ useDashboardData() ──────────┐
  ├─ useKreceStats(selectedPeriod) │
  ├─ usePaymentMethodsData(selectedPeriod) │
  └─ DashboardStoreTable ──────────┼─→ useDashboardStorePerformance()
                                    │     └─ RPC: get_dashboard_store_performance
                                    │
AlmacenPage.tsx ────────────────────┘
  └─ InventoryDashboardHeader
      └─ useInventoryFinancialSummary()
          └─ RPC: get_inventory_financial_summary (DIFERENTE)

ArticulosPage.tsx ──────────────────┘
  └─ ArticlesStatsRow
      └─ useInventoryFinancialSummary()
          └─ RPC: get_inventory_financial_summary (DIFERENTE)
```

**Conclusión:** ✅ **AISLAMIENTO COMPLETO** - Almacén y Artículos usan RPCs diferentes y componentes diferentes.

---

## ✅ VEREDICTO FINAL

### **SEGURIDAD: ✅ APROBADO PARA IMPLEMENTACIÓN**

1. ✅ **Almacén NO será tocado** - Confirmado por grep
2. ✅ **Artículos NO será tocado** - Confirmado por grep
3. ✅ **InventoryDashboardHeader NO será afectado** - Usa RPC diferente
4. ✅ **Hook NO requiere cambios** - Ya acepta startDate/endDate
5. ✅ **Solo cambia el TRIGGER** - No cambia la lógica de datos

### **IMPACTO:**
- **Alcance:** 2 archivos (Dashboard.tsx, DashboardStoreTable.tsx)
- **Riesgo:** BAJO
- **Tiempo estimado:** 15-30 minutos
- **Rollback:** Fácil (revertir 2 archivos)

---

## 🎯 PLAN DE IMPLEMENTACIÓN

1. **Modificar `DashboardStoreTable.tsx`:**
   - Agregar prop opcional `selectedPeriod?: PeriodType`
   - Crear función `periodToDateRange()`
   - Usar `selectedPeriod` si existe, sino usar `datePreset` (fallback)

2. **Modificar `Dashboard.tsx`:**
   - Pasar `selectedPeriod` como prop: `<DashboardStoreTable selectedPeriod={selectedPeriod} />`

3. **Testing:**
   - Verificar sincronización de fechas
   - Verificar que Almacén/Artículos siguen funcionando

---

**FIN DEL REPORTE**








