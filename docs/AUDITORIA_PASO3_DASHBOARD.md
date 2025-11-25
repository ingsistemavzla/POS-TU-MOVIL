# 🔍 AUDITORÍA PASO 3: DASHBOARD
## Reporte de Verificación de Integridad de Datos

**Fecha**: 2025-01-XX  
**Módulo**: Dashboard Principal  
**Estado**: ⚠️ **PROBLEMAS DETECTADOS**

---

## 📋 RESUMEN EJECUTIVO

### 🚨 **HALLAZGOS PRINCIPALES**

Se detectaron **problemas importantes** en el cálculo de "Ingreso Neto" y posibles inconsistencias en la comparación de KPIs. El Dashboard usa múltiples hooks que pueden tener fuentes de datos diferentes.

### ✅ **ASPECTOS CORRECTOS**

- Filtros de fecha aplicados correctamente ANTES de calcular
- Cálculos matemáticos correctos en funciones individuales
- Orden cronológico implementado
- Validaciones de división por cero

---

## 🔍 ANÁLISIS DETALLADO POR ARCHIVO

### 1. `src/hooks/useDashboardData.ts` ✅

#### **Función: `processSalesData()`**

**Líneas 345-374**

✅ **CORRECTO**: 
- Filtro por fecha aplicado ANTES de calcular (líneas 346-353)
  ```typescript
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    return saleDateOnly >= startDateOnly && saleDateOnly <= endDateOnly;
  });
  ```

✅ **CORRECTO**: 
- Sumatorias correctas (líneas 355-357)
  ```typescript
  const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_bs || 0), 0);
  const totalSalesUSD = filteredSales.reduce((sum, sale) => sum + (sale.total_usd || 0), 0);
  const totalOrders = filteredSales.length;
  ```

✅ **CORRECTO**: 
- Validación de división por cero (línea 358)
  ```typescript
  const averageOrderValue = totalOrders > 0 ? totalSalesUSD / totalOrders : 0;
  ```

#### **Función: Cálculo por Tienda**

**Líneas 390-439**

✅ **CORRECTO**: 
- Filtro por tienda aplicado ANTES de calcular (línea 391)
  ```typescript
  const storeSales = (allSales as any[]).filter(sale => sale.store_id === store.id);
  ```

✅ **CORRECTO**: 
- Usa `processSalesData()` que ya filtra por fecha correctamente

---

### 2. `src/hooks/usePaymentMethodsData.ts` ✅

#### **Función: `fetchPaymentMethodsData()`**

**Líneas 33-141**

✅ **CORRECTO**: 
- Filtro por fecha aplicado en la consulta Supabase (líneas 79-81)
  ```typescript
  .eq('sales.company_id', userProfile.company_id)
  .gte('sales.created_at', startDate.toISOString())
  .lte('sales.created_at', endDate.toISOString());
  ```

✅ **CORRECTO**: 
- Agrupación por método de pago correcta (líneas 89-106)
  ```typescript
  (paymentsData as any[]).forEach(payment => {
    const method = payment.payment_method || 'unknown';
    const methodData = methodMap.get(method)!;
    methodData.totalUSD += payment.amount_usd || 0;
    methodData.totalBS += payment.amount_bs || 0;
    methodData.count += 1;
  });
  ```

✅ **CORRECTO**: 
- Cálculo de totales correcto (líneas 109-111)
  ```typescript
  const totalUSD = Array.from(methodMap.values()).reduce((sum, data) => sum + data.totalUSD, 0);
  const totalBS = Array.from(methodMap.values()).reduce((sum, data) => sum + data.totalBS, 0);
  const totalTransactions = Array.from(methodMap.values()).reduce((sum, data) => sum + data.count, 0);
  ```

✅ **CORRECTO**: 
- Cálculo de porcentajes correcto (línea 120)
  ```typescript
  percentage: totalUSD > 0 ? (data.totalUSD / totalUSD) * 100 : 0
  ```

---

### 3. `src/hooks/useKreceStats.ts` ✅

#### **Función: `fetchKreceStats()`**

**Líneas 185-203**

✅ **CORRECTO**: 
- Filtro por período aplicado ANTES de calcular (líneas 176-183)
  ```typescript
  const thisMonthSales = salesStats?.filter((sale: any) => 
    new Date(sale.created_at) >= thisMonth
  ) || [];
  ```

✅ **CORRECTO**: 
- Sumatorias correctas (líneas 188-203)
  ```typescript
  const totalInitialAmountUSD = salesStats?.reduce((sum: number, sale: any) => 
    sum + (sale.krece_initial_amount_usd || 0), 0
  ) || 0;
  
  const totalFinancedAmountUSD = salesStats?.reduce((sum: number, sale: any) => 
    sum + (sale.krece_financed_amount_usd || 0), 0
  ) || 0;
  ```

---

### 4. `src/hooks/useAllStoresData.ts` ✅

#### **Función: `fetchAllStoresData()`**

**Líneas 30-158**

✅ **CORRECTO**: 
- Filtros aplicados en consulta Supabase (líneas 80-83, 103-106)
  ```typescript
  .eq('company_id', userProfile.company_id)
  .eq('store_id', storeId)
  .gte('created_at', startDate.toISOString())
  .lt('created_at', endDate.toISOString());
  ```

✅ **CORRECTO**: 
- Sumatorias correctas (líneas 121, 125-127, 129-130)
  ```typescript
  const totalSales = (salesData as any[]).reduce((sum, sale) => sum + (sale.total_usd || 0), 0);
  const totalUSD = (paymentsData as any[]).reduce((sum, payment) => sum + (payment.amount_usd || 0), 0);
  ```

---

### 5. `src/pages/Dashboard.tsx` ⚠️ **PROBLEMAS DETECTADOS**

#### **KPI 1: Total Facturado** ✅

**Líneas 331-339**

✅ **CORRECTO**: 
- Usa `periodData?.sales` que viene de `filteredData.totalSalesUSD`
- Los datos se filtran correctamente por período

#### **KPI 2: Ingreso Neto** ⚠️ **PROBLEMA**

**Líneas 341-351**

⚠️ **PROBLEMA**: 
- Usa `paymentData?.totalUSD` de `usePaymentMethodsData`
- **PERO** compara con `periodData?.previousSales` que viene de ventas (`totalSalesUSD`)
- **Inconsistencia**: Compara "Ingreso Neto" (pagos) con "Total Facturado" (ventas)

```typescript
change={calculateChange(paymentData?.totalUSD || 0, periodData?.previousSales || 0)}
```

**Problema**: 
- `paymentData?.totalUSD` = suma de `sale_payments.amount_usd` (pagos reales)
- `periodData?.previousSales` = suma de `sales.total_usd` (facturación)
- Son métricas diferentes y no deberían compararse directamente

**Impacto**: 
- El porcentaje de cambio mostrado es incorrecto
- Se está comparando manzanas con naranjas

**Solución Recomendada**: 
- Comparar `paymentData?.totalUSD` con `paymentData?.previousTotalUSD`
- O usar datos del mismo período pero de diferentes años

#### **KPI 3 y 4: Krece** ✅

**Líneas 353-385**

✅ **CORRECTO**: 
- Usan datos de `useKreceStats` que son consistentes
- Las comparaciones son correctas (mes actual vs mes anterior)

---

### 6. `src/components/dashboard/StoreSummaryChart.tsx` ⚠️ **PROBLEMA**

#### **Cálculo de "Ingreso Neto"**

**Línea 205**

⚠️ **PROBLEMA**: 
- Calcula "Ingreso Neto" como `averageOrder * orders`
  ```typescript
  {formatCurrency(storeData.averageOrder * storeData.orders)}
  ```

**Análisis Matemático**:
- `averageOrder = totalSalesUSD / totalOrders`
- `averageOrder * orders = (totalSalesUSD / totalOrders) * totalOrders = totalSalesUSD`

**Problema**: 
- `averageOrder * orders` es igual a `totalSalesUSD` (Total Facturado)
- "Ingreso Neto" debería ser la suma de pagos reales (`sale_payments.amount_usd`), no el total facturado
- En el Dashboard, el "Ingreso Neto" se obtiene de `usePaymentMethodsData` (línea 344)
- Pero en `StoreSummaryChart` se calcula como `averageOrder * orders`, que es el Total Facturado

**Impacto**: 
- La columna "Ingreso Neto" en el resumen por tienda muestra el Total Facturado, no el Ingreso Neto real
- Es confuso porque "Ingreso Neto" y "Total Facturado" muestran el mismo valor

**Solución Recomendada**: 
- Obtener datos de pagos por tienda desde `sale_payments`
- O cambiar el label de "Ingreso Neto" a "Total Facturado" si es la intención

**Archivo**: `src/components/dashboard/StoreSummaryChart.tsx` línea 205

---

## ✅ VALIDACIONES REALIZADAS

### 1. **Aplicación de Filtros**

| Filtro | ¿Se aplica ANTES de calcular? | Archivo | Línea |
|--------|-------------------------------|---------|-------|
| Por Período (hoy/ayer/mes) | ✅ SÍ | `useDashboardData.ts` | 346-353 |
| Por Tienda | ✅ SÍ | `useDashboardData.ts` | 391 |
| Por Fecha (pagos) | ✅ SÍ | `usePaymentMethodsData.ts` | 79-81 |
| Por Fecha (Krece) | ✅ SÍ | `useKreceStats.ts` | 176-183 |

### 2. **Cálculos Matemáticos**

| Cálculo | Fórmula | ¿Es correcta? |
|---------|---------|---------------|
| Total Facturado | `Σ(sales.total_usd)` | ✅ SÍ |
| Promedio por Venta | `totalSalesUSD / totalOrders` | ✅ SÍ (con validación de división por cero) |
| Ingreso Neto (usePaymentMethodsData) | `Σ(sale_payments.amount_usd)` | ✅ SÍ |
| **Ingreso Neto (StoreSummaryChart)** | `averageOrder * orders` | ⚠️ **NO** - Es igual a Total Facturado |
| Financiamiento Krece | `Σ(krece_financed_amount_usd)` | ✅ SÍ |
| Ingreso por Krece | `Σ(krece_initial_amount_usd)` | ✅ SÍ |

### 3. **Consistencia entre Componentes**

| Componente | Fuente de Datos | ¿Es consistente? |
|------------|-----------------|------------------|
| KPI Total Facturado | `useDashboardData` → `totalSalesUSD` | ✅ SÍ |
| KPI Ingreso Neto | `usePaymentMethodsData` → `totalUSD` | ✅ SÍ (datos correctos) |
| KPI Financiamiento Krece | `useKreceStats` → `totalFinancedAmountUSD` | ✅ SÍ |
| KPI Ingreso por Krece | `useKreceStats` → `totalInitialAmountUSD` | ✅ SÍ |
| Resumen por Tienda - Total Facturado | `useDashboardData` → `storeMetrics` | ✅ SÍ |
| **Resumen por Tienda - Ingreso Neto** | `StoreSummaryChart` → `averageOrder * orders` | ⚠️ **NO** - Calculado incorrectamente |

### 4. **Comparaciones de Cambio**

| KPI | Métrica Actual | Métrica Anterior | ¿Es correcto? |
|-----|----------------|------------------|---------------|
| Total Facturado | `totalSalesUSD.today` | `totalSalesUSD.yesterday` | ✅ SÍ |
| **Ingreso Neto** | `paymentData.totalUSD` (hoy) | `periodData.previousSales` (ayer - ventas) | ⚠️ **NO** - Compara pagos vs ventas |
| Financiamiento Krece | `totalFinancedAmountUSD` (hoy) | `lastMonthFinancedAmount` (mes anterior) | ✅ SÍ |
| Ingreso por Krece | `totalInitialAmountUSD` (hoy) | `lastMonthInitialAmount` (mes anterior) | ✅ SÍ |

---

## 🚨 PROBLEMAS IDENTIFICADOS

### **PROBLEMA 1: Cálculo Incorrecto de "Ingreso Neto" en StoreSummaryChart** ⚠️

**Ubicación**: `src/components/dashboard/StoreSummaryChart.tsx` línea 205

**Código Problemático**:
```typescript
// Línea 205: Calcula "Ingreso Neto" como promedio * órdenes
{formatCurrency(storeData.averageOrder * storeData.orders)}
```

**Problema**: 
- `averageOrder * orders` = `(totalSalesUSD / totalOrders) * totalOrders` = `totalSalesUSD`
- Esto es igual al "Total Facturado", no al "Ingreso Neto" real
- "Ingreso Neto" debería ser la suma de pagos reales (`sale_payments.amount_usd`)

**Impacto**: 
- La columna "Ingreso Neto" muestra el mismo valor que "Total Facturado"
- Es confuso y puede llevar a interpretaciones erróneas

**Severidad**: 🟡 **MEDIA** - Funciona matemáticamente, pero conceptualmente incorrecto

**Solución Recomendada**:

**Opción 1: Obtener Ingreso Neto Real desde `sale_payments`**
```typescript
// Modificar useDashboardData.ts para obtener pagos por tienda
// O crear un hook nuevo useStorePaymentsData que obtenga pagos por tienda

// En StoreSummaryChart.tsx, recibir ingresoNetoReal en props
<StoreSummaryChart
  stores={filteredData.storesSummary}
  storeMetrics={filteredData.storeMetrics}
  storePayments={filteredData.storePayments} // Nuevo: pagos por tienda
  selectedPeriod={selectedPeriod}
/>

// Luego usar:
{formatCurrency(storePayments[store.id]?.totalUSD || 0)}
```

**Opción 2: Cambiar el Label (si es intencional)**
```typescript
// Si realmente se quiere mostrar el Total Facturado:
<div className="text-right">Total Facturado</div> // En vez de "Ingreso Neto"
```

### **PROBLEMA 2: Comparación Incorrecta en KPI "Ingreso Neto"** ⚠️

**Ubicación**: `src/pages/Dashboard.tsx` línea 346

**Código Problemático**:
```typescript
// Línea 344: Ingreso Neto actual (de pagos)
value={paymentData?.totalUSD || 0}

// Línea 346: Compara con ventas del período anterior
change={calculateChange(paymentData?.totalUSD || 0, periodData?.previousSales || 0)}
```

**Problema**: 
- `paymentData?.totalUSD` = suma de `sale_payments.amount_usd` (pagos reales del período actual)
- `periodData?.previousSales` = suma de `sales.total_usd` (facturación del período anterior)
- Está comparando pagos con facturación, que son métricas diferentes

**Impacto**: 
- El porcentaje de cambio mostrado no tiene sentido
- Ejemplo: Si hoy se recibieron $5,000 en pagos y ayer se facturaron $4,000, mostrará +25%, pero esto no es una comparación válida

**Severidad**: 🟡 **MEDIA** - Muestra datos incorrectos en la comparación

**Solución Recomendada**:
```typescript
// Opción 1: Comparar con pagos del período anterior
// Necesitar obtener paymentData del período anterior también

// Opción 2: Comparar con ventas del mismo período
change={calculateChange(
  paymentData?.totalUSD || 0, 
  periodData?.sales || 0 // Comparar con ventas del mismo período (para ver diferencia entre facturado y cobrado)
)}
```

---

## ✅ VALIDACIONES CORRECTAS

### 1. **Cálculos de Total Facturado**

✅ **CORRECTO**: 
- Suma `sales.total_usd` filtrado por período
- Filtro por fecha aplicado ANTES de calcular
- Validación de valores nulos

### 2. **Cálculos de Financiamiento Krece**

✅ **CORRECTO**: 
- Suma `krece_financed_amount_usd` filtrado por período
- Comparaciones correctas (mes actual vs mes anterior)

### 3. **Cálculos de Métodos de Pago**

✅ **CORRECTO**: 
- Suma `sale_payments.amount_usd` agrupado por método
- Cálculo de porcentajes correcto
- Filtro por fecha aplicado en la consulta

---

## 📊 COMPARACIÓN CON CONSULTAS SQL

### Consulta SQL de Referencia:

```sql
-- Total Facturado (hoy)
SELECT SUM(total_usd) as total_facturado
FROM sales
WHERE company_id = 'XXX'
  AND DATE(created_at) = CURRENT_DATE;

-- Ingreso Neto (hoy) - Pagos reales
SELECT SUM(amount_usd) as ingreso_neto
FROM sale_payments sp
JOIN sales s ON sp.sale_id = s.id
WHERE s.company_id = 'XXX'
  AND DATE(s.created_at) = CURRENT_DATE;

-- Financiamiento Krece (hoy)
SELECT SUM(krece_financed_amount_usd) as financiamiento_krece
FROM sales
WHERE company_id = 'XXX'
  AND DATE(created_at) = CURRENT_DATE
  AND krece_enabled = true;

-- Ingreso por Krece (hoy) - Iniciales
SELECT SUM(krece_initial_amount_usd) as ingreso_krece
FROM sales
WHERE company_id = 'XXX'
  AND DATE(created_at) = CURRENT_DATE
  AND krece_enabled = true;
```

**Validación Manual Recomendada**:
1. Ejecutar consultas SQL en Supabase
2. Comparar con valores mostrados en los KPIs
3. Verificar que coincidan

---

## 🎯 RECOMENDACIONES

### 🔴 **CORRECCIÓN REQUERIDA**

#### **Problema 1**: Ingreso Neto en StoreSummaryChart

**Solución**: Modificar `useDashboardData.ts` para obtener pagos por tienda:

```typescript
// En useDashboardData.ts, después de obtener ventas por tienda:
// Obtener pagos por tienda
const storePayments = await Promise.all(
  stores.map(async (store) => {
    const { data: paymentsData } = await (supabase as any)
      .from('sale_payments')
      .select('amount_usd')
      .eq('sales.store_id', store.id)
      .eq('sales.company_id', company.id)
      .gte('sales.created_at', startDate.toISOString())
      .lte('sales.created_at', endDate.toISOString());
    
    const totalUSD = (paymentsData || []).reduce((sum: number, p: any) => 
      sum + (p.amount_usd || 0), 0
    );
    
    return {
      storeId: store.id,
      totalUSD
    };
  })
);

// Agregar a storesSummary:
storesSummary.push({
  ...storeData,
  netIncome: storePayments.find(p => p.storeId === store.id)?.totalUSD || 0
});
```

**Prioridad**: 🟡 **MEDIA** - Afecta claridad pero no integridad de datos

#### **Problema 2**: Comparación Incorrecta en KPI Ingreso Neto

**Solución**: Comparar con datos del mismo tipo:

```typescript
// Obtener paymentData del período anterior también
const previousPaymentData = await usePaymentMethodsData(getPreviousPeriod(selectedPeriod));

// Comparar:
change={calculateChange(
  paymentData?.totalUSD || 0, 
  previousPaymentData?.totalUSD || 0
)}
```

**Prioridad**: 🟡 **MEDIA** - Mejora la precisión de la comparación

---

## ✅ CONCLUSIÓN

### **VEREDICTO FINAL: REQUIERE CORRECCIONES MENORES ⚠️**

El Dashboard presenta:
- ✅ Filtros aplicados correctamente ANTES de calcular
- ✅ Cálculos matemáticos correctos en funciones individuales
- ✅ Validaciones adecuadas
- ⚠️ **PROBLEMA 1**: "Ingreso Neto" en StoreSummaryChart calculado como Total Facturado
- ⚠️ **PROBLEMA 2**: Comparación incorrecta en KPI "Ingreso Neto"

**Acción Requerida**: Corregir el cálculo de "Ingreso Neto" en StoreSummaryChart y la comparación en el KPI.

---

## 📝 PRÓXIMOS PASOS

1. ⚠️ **CORRECCIÓN MENOR 1**: Corregir cálculo de Ingreso Neto en StoreSummaryChart
2. ⚠️ **CORRECCIÓN MENOR 2**: Corregir comparación en KPI Ingreso Neto
3. ✅ **PASO 3 COMPLETADO**: Dashboard verificado (con problemas identificados)
4. ⏭️ **PASO 4**: Revisar Productos
5. ⏭️ **PASO 5**: Revisar POS

---

**Auditoría realizada por**: Equipo de Desarrollo  
**Fecha**: 2025-01-XX  
**Estado**: ⚠️ COMPLETADO CON PROBLEMAS MENORES IDENTIFICADOS

