# 🔍 REPORTE: Código Muerto Funcional (Legacy Remanentes)

**Fecha:** 2025-01-03  
**Auditor:** Senior Code Detective & Dependency Analyst  
**Alcance:** Detección de código que compila pero pertenece a lógica antigua no conectada al flujo actual

---

## 🛡️ ZONA BLINDADA (Código Activo - NO TOCAR)

### **Páginas Principales:**
- ✅ `src/pages/AlmacenPage.tsx` - **ACTIVO** (Ruta `/almacen`)
- ✅ `src/pages/ArticulosPage.tsx` - **ACTIVO** (Ruta `/articulos`)
- ✅ `src/pages/Dashboard.tsx` - **ACTIVO** (Ruta `/dashboard`)

### **Hooks Activos:**
- ✅ `useInventoryFinancialSummary` - Usado por `ArticlesStatsRow`, `InventoryDashboardHeader`, `InventoryFinancialHeader`
- ✅ `useDashboardStorePerformance` - Usado por `DashboardStoreTable`
- ✅ `useBranchStockMatrix` - Usado por `BranchStockMatrix` (en AlmacenPage)
- ✅ `useStoreSpecificData` - Usado por `StoreSummaryCard` (en Dashboard)

### **RPCs Activas:**
- ✅ `get_inventory_financial_summary` - Llamada desde `useInventoryFinancialSummary`
- ✅ `get_dashboard_store_performance` - Llamada desde `useDashboardStorePerformance`
- ✅ `get_stock_matrix_by_store` - Llamada desde `useBranchStockMatrix`

### **Componentes Activos:**
- ✅ `InventoryDashboardHeader` - Usado en AlmacenPage
- ✅ `ArticlesStatsRow` - Usado en ArticulosPage
- ✅ `BranchStockMatrix` - Usado en AlmacenPage
- ✅ `DashboardStoreTable` - Usado en Dashboard

---

## 👻 CANDIDATOS A ELIMINACIÓN PROFUNDA

| Archivo/Función | ¿Por qué parece legacy? | ¿Quién lo usa hoy? | Nivel de Riesgo |
|-----------------|-------------------------|-------------------|-----------------|
| `src/hooks/useAllStoresData.ts` | Hook que agrega datos de múltiples tiendas manualmente. Reemplazado por `useDashboardStorePerformance` (RPC blindada). | **NADIE** - Solo se define, nunca se importa | 🟢 **BAJO** |
| `src/hooks/useAuthUser.ts` | Wrapper redundante de `useAuth()`. Todos los componentes usan `useAuth()` directamente. | **NADIE** - Solo se define, nunca se importa | 🟢 **BAJO** |
| `src/components/inventory/ProductMatrixCard.tsx` | Componente de visualización de productos por tienda. No se importa en ningún lugar. Reemplazado por `BranchStockMatrix`. | **NADIE** - Solo se define, nunca se importa | 🟢 **BAJO** |
| `src/hooks/useCashRegister.ts` | Hook completamente deshabilitado (retorna valores vacíos). Sistema de cierre de caja temporalmente deshabilitado. | ⚠️ **REFERENCIAS FANTASMA** - Se importa en componentes también deshabilitados | 🟡 **MEDIO** |
| `src/components/cash-register/CashRegisterWidget.tsx` | Componente de cierre de caja. Sistema deshabilitado. | **NADIE** - No se importa en ninguna página activa | 🟡 **MEDIO** |
| `src/components/cash-register/StartShiftModal.tsx` | Modal de inicio de turno. Sistema deshabilitado. | **NADIE** - No se importa en ninguna página activa | 🟡 **MEDIO** |
| `src/components/cash-register/CloseShiftModal.tsx` | Modal de cierre de turno. Sistema deshabilitado. | **NADIE** - No se importa en ninguna página activa | 🟡 **MEDIO** |
| `src/components/cash-register/ClosureReportModal.tsx` | Modal de reporte de cierre. Sistema deshabilitado. | **NADIE** - No se importa en ninguna página activa | 🟡 **MEDIO** |
| `src/utils/cashRegisterUtils.ts` | Utilidades para cierre de caja. Importa tipos de `useCashRegister` (deshabilitado). | ⚠️ **REFERENCIA CIRCULAR** - Solo importa tipos, no se usa | 🟡 **MEDIO** |

---

## 📋 ANÁLISIS DETALLADO

### 🔴 **CATEGORÍA 1: Hooks Legacy No Usados**

#### 1.1 `src/hooks/useAllStoresData.ts`
- **Razón Legacy:** Lógica antigua que hace múltiples queries manuales a Supabase para agregar datos de tiendas.
- **Reemplazo:** `useDashboardStorePerformance` usa RPC `get_dashboard_store_performance` (lógica blindada en backend).
- **Uso Actual:** ❌ **NADIE** - No se importa en ningún archivo.
- **Riesgo:** 🟢 **BAJO** - Eliminación segura.

#### 1.2 `src/hooks/useAuthUser.ts`
- **Razón Legacy:** Wrapper redundante que solo re-exporta `useAuth()` con helpers adicionales.
- **Reemplazo:** Todos los componentes usan `useAuth()` directamente desde `AuthContext`.
- **Uso Actual:** ❌ **NADIE** - No se importa en ningún archivo.
- **Riesgo:** 🟢 **BAJO** - Eliminación segura.

---

### 🔴 **CATEGORÍA 2: Componentes Legacy No Usados**

#### 2.1 `src/components/inventory/ProductMatrixCard.tsx`
- **Razón Legacy:** Componente de visualización de productos por tienda en formato de tarjeta.
- **Reemplazo:** `BranchStockMatrix` (usado en AlmacenPage) muestra la misma información en formato de matriz.
- **Uso Actual:** ❌ **NADIE** - No se importa en ningún archivo.
- **Riesgo:** 🟢 **BAJO** - Eliminación segura.

---

### 🟡 **CATEGORÍA 3: Sistema de Cierre de Caja Deshabilitado**

#### 3.1 `src/hooks/useCashRegister.ts`
- **Estado:** Completamente deshabilitado. Retorna valores vacíos/null.
- **Comentario en código:** "TODO: SISTEMA DE CIERRE DE CAJA TEMPORALMENTE DESHABILITADO"
- **Uso Actual:** ⚠️ Se importa en componentes de cash-register, pero esos componentes también están deshabilitados.
- **Riesgo:** 🟡 **MEDIO** - Si se planea reactivar el sistema, mantener. Si no, eliminar.

#### 3.2 `src/components/cash-register/*.tsx` (4 archivos)
- **Archivos:**
  - `CashRegisterWidget.tsx`
  - `StartShiftModal.tsx`
  - `CloseShiftModal.tsx`
  - `ClosureReportModal.tsx`
- **Estado:** Sistema deshabilitado. Componentes no se importan en ninguna página activa.
- **Uso Actual:** ❌ **NADIE** - No se importan en páginas activas.
- **Riesgo:** 🟡 **MEDIO** - Depende de si se reactivará el sistema de cierre de caja.

#### 3.3 `src/utils/cashRegisterUtils.ts`
- **Estado:** Utilidades para cierre de caja. Solo importa tipos de `useCashRegister` (deshabilitado).
- **Uso Actual:** ⚠️ **REFERENCIA CIRCULAR** - Solo importa tipos, no se usa en ningún lugar.
- **Riesgo:** 🟡 **MEDIO** - Si se elimina el sistema de cierre de caja, eliminar también.

---

## ✅ COMPONENTES ACTIVOS (NO ELIMINAR)

Estos componentes SÍ se usan y están conectados al flujo actual:

- ✅ `src/pages/DeletedProductsPage.tsx` - **ACTIVO** (Ruta `/deleted-products`, usado por master_admin)
- ✅ `src/components/reports/ProductsReportModal.tsx` - **ACTIVO** (Usado en ReportsNew)
- ✅ `src/components/dashboard/TopProductsTable.tsx` - **ACTIVO** (Usado en Dashboard)
- ✅ `src/components/pos/ProductForm.tsx` - **ACTIVO** (Usado en AlmacenPage y ArticulosPage)

---

## 📊 RESUMEN DE IMPACTO

| Categoría | Archivos | Riesgo | Acción Recomendada |
|-----------|----------|--------|-------------------|
| **Hooks Legacy No Usados** | 2 | 🟢 Bajo | ✅ Eliminar |
| **Componentes Legacy No Usados** | 1 | 🟢 Bajo | ✅ Eliminar |
| **Sistema Cierre de Caja** | 6 | 🟡 Medio | ⚠️ Revisar con usuario |
| **TOTAL** | **9 archivos** | - | - |

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### **FASE 1: Eliminación Segura (Riesgo Bajo)**
```bash
# Hooks legacy no usados
rm src/hooks/useAllStoresData.ts
rm src/hooks/useAuthUser.ts

# Componentes legacy no usados
rm src/components/inventory/ProductMatrixCard.tsx
```

### **FASE 2: Revisión con Usuario (Riesgo Medio)**
**Pregunta al usuario:** ¿Se reactivará el sistema de cierre de caja en el futuro?

**Si NO se reactivará:**
```bash
# Eliminar sistema completo de cierre de caja
rm src/hooks/useCashRegister.ts
rm src/utils/cashRegisterUtils.ts
rm -r src/components/cash-register/
```

**Si SÍ se reactivará:**
- Mantener archivos pero documentar que están deshabilitados
- Considerar mover a carpeta `legacy/` o `disabled/`

---

## ✅ VERIFICACIÓN POST-ELIMINACIÓN

Después de eliminar, verificar:
1. ✅ `npm run build` - Build debe completarse sin errores
2. ✅ `npm run dev` - Aplicación debe iniciar correctamente
3. ✅ Navegación - Todas las rutas activas deben funcionar
4. ✅ Imports - No debe haber referencias rotas

---

**Estado:** ✅ **ANÁLISIS COMPLETO**  
**Próximo paso:** Esperar decisión del usuario sobre sistema de cierre de caja.

