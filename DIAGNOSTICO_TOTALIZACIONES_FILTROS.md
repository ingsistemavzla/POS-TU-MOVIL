# 🔍 DIAGNÓSTICO: Inconsistencias en Totalizaciones con Filtros

## ❌ PROBLEMAS IDENTIFICADOS

### 1. **totalCount solo cuenta la página actual**
**Ubicación**: `src/hooks/useSalesData.ts` línea 220

```typescript
const totalCount = rawSales.length; // ❌ Solo cuenta ventas de esta página
```

**Problema**: 
- Cuando hay paginación, `totalCount` solo muestra el número de ventas en la página actual (15 por defecto)
- No refleja el total real de ventas que cumplen los filtros
- Ejemplo: Si hay 570 ventas pero solo se muestran 15, `totalCount` dice 15, no 570

### 2. **categoryStats se calcula ANTES del filtro de categoría**
**Ubicación**: `src/hooks/useSalesData.ts` líneas 224-261

**Problema**:
- Las estadísticas de categoría se calculan desde `rawSales` (todas las ventas de la página)
- Luego se aplica el filtro de categoría en el frontend (línea 344-352)
- Resultado: Las tarjetas de categoría muestran TODAS las categorías, incluso cuando se filtra por una sola
- Ejemplo: Si filtras por "Teléfonos", las tarjetas siguen mostrando totales de Accesorios y Servicio Técnico

### 3. **totalAmount solo suma la página actual**
**Ubicación**: `src/hooks/useSalesData.ts` línea 213-219

**Problema**:
- `serverTotalAmountUsd` solo suma las ventas de la página actual
- No refleja el total real cuando hay múltiples páginas
- Ejemplo: Si hay 570 ventas con $100,000 total, pero solo se muestran 15 con $2,000, muestra $2,000

### 4. **Filtro de categoría no recalcula categoryStats**
**Ubicación**: `src/hooks/useSalesData.ts` líneas 344-352

**Problema**:
- Cuando se filtra por categoría, solo se filtran las ventas (`sortedSales`)
- Pero `categoryStats` ya fue calculado antes del filtro
- No se recalculan las estadísticas después de filtrar
- Resultado: Las tarjetas muestran datos incorrectos cuando hay filtro de categoría activo

### 5. **Filtros de fecha no afectan categoryStats**
**Ubicación**: `src/hooks/useSalesData.ts` línea 148-156

**Problema**:
- Los filtros de fecha se envían a la RPC (`p_date_from`, `p_date_to`)
- La RPC retorna solo las ventas en ese rango
- Pero `categoryStats` se calcula desde esas ventas filtradas
- **Esto está CORRECTO**, pero el problema es que solo cuenta la página actual

## 🎯 SOLUCIONES REQUERIDAS

### SOLUCIÓN 1: Obtener totalCount real desde el servidor
- La RPC `get_sales_history_v2` necesita retornar el total real de ventas que cumplen los filtros
- O crear una RPC separada que solo cuente: `get_sales_count_v2`

### SOLUCIÓN 2: Recalcular categoryStats después del filtro de categoría
- Si hay filtro de categoría activo, recalcular `categoryStats` solo desde las ventas filtradas
- O mejor: Calcular `categoryStats` DESPUÉS de aplicar el filtro de categoría

### SOLUCIÓN 3: Obtener totalAmount real desde el servidor
- La RPC necesita retornar el total real de todas las ventas que cumplen los filtros
- O crear una RPC separada: `get_sales_total_v2`

### SOLUCIÓN 4: Calcular totales desde TODAS las ventas filtradas (no solo página)
- Hacer una consulta adicional sin paginación para obtener totales
- O modificar la RPC para retornar metadatos con totales

## 📊 FLUJO ACTUAL (INCORRECTO)

```
1. Frontend llama RPC con filtros (fecha, tienda) + paginación (limit=15, offset=0)
2. RPC retorna 15 ventas que cumplen filtros
3. Frontend calcula:
   - totalCount = 15 ❌ (debería ser el total real, ej: 570)
   - totalAmount = suma de 15 ventas ❌ (debería ser suma de todas)
   - categoryStats = desde 15 ventas ❌ (debería ser desde todas)
4. Frontend aplica filtro de categoría (si existe)
5. categoryStats NO se recalcula ❌
```

## ✅ FLUJO CORRECTO (PROPUESTO)

```
1. Frontend llama RPC con filtros (fecha, tienda) + paginación (limit=15, offset=0)
2. RPC retorna:
   - 15 ventas de la página actual
   - metadata: { totalCount: 570, totalAmount: 100000 }
3. Frontend calcula:
   - totalCount = metadata.totalCount ✅
   - totalAmount = metadata.totalAmount ✅
   - categoryStats = desde TODAS las ventas filtradas (consulta adicional sin paginación)
4. Frontend aplica filtro de categoría (si existe)
5. categoryStats se recalcula desde ventas filtradas ✅
```

## 🔧 ACCIONES CORRECTAS A REALIZAR

1. **Modificar RPC `get_sales_history_v2`** para retornar metadatos con totales
2. **Crear consulta adicional** para obtener categoryStats desde todas las ventas filtradas
3. **Recalcular categoryStats** después de aplicar filtro de categoría
4. **Usar totales del servidor** en lugar de calcular desde página actual

