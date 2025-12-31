# 🔧 CORRECCIÓN: Mensaje "Filtros activos" incorrecto

## ❌ PROBLEMA IDENTIFICADO

El mensaje "⚠️ Filtros activos - Pueden ocultar ventas nuevas" aparecía incluso cuando **NO había filtros activos**.

### Causa del problema

La condición original verificaba estados locales que pueden tener valores por defecto:

```typescript
// ❌ INCORRECTO: Verifica estados locales, no filtros realmente aplicados
{((selectedStoreId && selectedStoreId !== 'all') || 
  selectedCategoryFilter !== 'all' || 
  dateRangePreset !== 'custom' || 
  dateRangeStart || 
  dateRangeEnd) && (
  // Mostrar mensaje
)}
```

**Problemas:**
1. `dateRangePreset` se inicializa como `'custom'`, pero si cambia a otro valor temporalmente, muestra el mensaje
2. `dateRangeStart` y `dateRangeEnd` pueden tener valores residuales aunque no se hayan aplicado filtros
3. No verifica los filtros **realmente aplicados** en `useSalesData`

## ✅ SOLUCIÓN APLICADA

Ahora verifica los filtros **realmente aplicados** que afectan la consulta:

```typescript
// ✅ CORRECTO: Verifica filtros realmente aplicados
{(() => {
  const hasStoreFilter = (filters.storeId && filters.storeId !== 'all') || 
                         (selectedStoreId && selectedStoreId !== 'all');
  const hasCategoryFilter = filters.category && filters.category !== 'all';
  const hasDateFilter = filters.dateFrom || filters.dateTo;
  
  // Solo mostrar advertencia si HAY filtros realmente aplicados
  return hasStoreFilter || hasCategoryFilter || hasDateFilter;
})() && (
  // Mostrar mensaje
)}
```

### Cambios realizados

1. **Verifica `filters.storeId`** en lugar de solo `selectedStoreId`
2. **Verifica `filters.category`** en lugar de solo `selectedCategoryFilter`
3. **Verifica `filters.dateFrom` y `filters.dateTo`** en lugar de `dateRangeStart` y `dateRangeEnd`
4. **No verifica `dateRangePreset`** porque no afecta directamente la consulta

## 📊 Comportamiento esperado

### Sin filtros activos:
- ❌ NO muestra el mensaje "⚠️ Filtros activos"
- ✅ Muestra todas las ventas sin restricciones

### Con filtros activos:
- ✅ Muestra el mensaje "⚠️ Filtros activos"
- ✅ Solo muestra ventas que cumplen los filtros

## 🎯 Filtros que activan el mensaje

1. **Filtro de tienda**: Cuando `filters.storeId !== 'all'` o `selectedStoreId !== 'all'`
2. **Filtro de categoría**: Cuando `filters.category !== 'all'`
3. **Filtro de fecha**: Cuando `filters.dateFrom` o `filters.dateTo` tienen valores

## ✅ Verificación

Después de la corrección:
- Sin filtros: NO debe aparecer el mensaje
- Con filtro de tienda: Debe aparecer el mensaje
- Con filtro de categoría: Debe aparecer el mensaje
- Con filtro de fecha: Debe aparecer el mensaje
- Con múltiples filtros: Debe aparecer el mensaje

