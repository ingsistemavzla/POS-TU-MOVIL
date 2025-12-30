# 🔍 AUDITORÍA: Inventory Stock Logic - `get_inventory_financial_summary`

**Fecha:** 2025-01-27  
**Auditor:** Senior Inventory Systems Auditor  
**Función Auditada:** `get_inventory_financial_summary`  
**Archivo:** `supabase/migrations/20250105000001_create_legacy_financial_functions.sql`

---

## 📋 RESUMEN EJECUTIVO

| Aspecto | Hallazgo | Estado |
|---|---|---|
| **Multi-Store Logic** | ✅ Suma cantidades de TODAS las tiendas | ✅ CORRECTO |
| **Low Stock Threshold** | 🔴 **HARDCODED `qty <= 5`** (NO usa `min_qty`) | 🔴 **LOGIC FLAW** |
| **Low Stock Scope** | 🔴 **Por fila individual** (NO suma global) | 🔴 **LOGIC FLAW** |
| **Out of Stock Definition** | ✅ `qty = 0` con `active = true` | ✅ CORRECTO |
| **Category Grouping** | ✅ SQL `GROUP BY category` | ✅ CORRECTO |
| **Value Basis** | ✅ Usa `cost_usd` para `total_cost_value` | ✅ CORRECTO |

**VEREDICTO FINAL:** 🔴 **LOGIC FLAW DETECTED** - El cálculo de "Low Stock" tiene errores críticos.

---

## 🔬 ANÁLISIS DETALLADO

### **1. MULTI-STORE LOGIC: ¿Suma cantidades de todas las tiendas?**

**Código Relevante (Líneas 44-59):**
```sql
WITH joined_data AS (
  SELECT 
    COALESCE(p.category, 'Sin Categoría') AS category,
    inv.qty,  -- ⚠️ Esta es la cantidad POR TIENDA (cada fila = 1 tienda)
    p.cost_usd,
    p.sale_price_usd,
    inv.product_id,
    inv.qty * p.cost_usd AS cost_value,
    inv.qty * p.sale_price_usd AS retail_value,
    inv.qty * (p.sale_price_usd - p.cost_usd) AS profit_value
  FROM public.inventories inv
  INNER JOIN public.products p ON inv.product_id = p.id
  WHERE inv.company_id = v_company_id
    AND p.active = true
  -- ⚠️ NO hay filtro por store_id - Incluye TODAS las tiendas
)
```

**Código de Agregación (Líneas 72-83):**
```sql
global_stats AS (
  SELECT 
    COALESCE(SUM(cost_value), 0) AS total_cost,
    COALESCE(SUM(retail_value), 0) AS total_retail,
    COALESCE(SUM(qty), 0) AS total_items,  -- ✅ SUMA todas las tiendas
    COUNT(DISTINCT product_id) AS unique_products,
    COUNT(DISTINCT CASE WHEN qty = 0 THEN product_id END) AS out_of_stock_count,
    COUNT(DISTINCT CASE WHEN qty > 0 AND qty <= 5 THEN product_id END) AS critical_stock_count
  FROM joined_data
)
```

**Respuesta:** ✅ **SÍ, suma cantidades de TODAS las tiendas**

**Evidencia:**
- `joined_data` NO filtra por `store_id` → Incluye todas las tiendas
- `SUM(qty)` agrega todas las filas (todas las tiendas)
- `total_items = 32` es la suma global de todas las tiendas

**Ejemplo:**
```
Producto A:
  - Tienda 1: qty = 10
  - Tienda 2: qty = 5
  - Tienda 3: qty = 0
  
Resultado en joined_data: 3 filas
total_items = 10 + 5 + 0 = 15 ✅ CORRECTO
```

**Verdict:** ✅ **SAFE** - La suma multi-tienda funciona correctamente.

---

### **2. "LOW STOCK" DEFINITION: ¿Cuál es el umbral?**

**Código Relevante (Línea 81):**
```sql
COUNT(DISTINCT CASE WHEN qty > 0 AND qty <= 5 THEN product_id END) AS critical_stock_count
```

**Hallazgos:**

1. **Umbral:** 🔴 **HARDCODED `qty <= 5`**
   - NO usa `inv.min_qty` de la tabla `inventories`
   - El umbral está fijo en 5 unidades

2. **Scope:** 🔴 **Por fila individual (NO suma global)**
   - Evalúa `qty` de cada fila (cada tienda) por separado
   - NO suma `qty` de todas las tiendas antes de evaluar

**Problema Crítico:**

**Escenario de Prueba:**
```
Producto A:
  - Tienda 1: qty = 10 (OK)
  - Tienda 2: qty = 3 (Low Stock según lógica actual)
  
Resultado:
  - joined_data tiene 2 filas:
    - Fila 1: qty = 10 → NO cuenta (qty > 5)
    - Fila 2: qty = 3 → SÍ cuenta (qty <= 5)
  - critical_stock_count = 1 ✅ (Correcto para esta tienda)
  
PERO:
  - Si el usuario espera "Low Stock" basado en SUMA GLOBAL:
    - Suma global = 10 + 3 = 13
    - Con min_qty = 10 → NO debería ser Low Stock
    - Con min_qty = 15 → SÍ debería ser Low Stock
```

**Lógica Actual (INCORRECTA):**
- Evalúa cada tienda por separado
- Si UNA tienda tiene `qty <= 5`, cuenta como "Low Stock"
- NO considera la suma global ni `min_qty`

**Lógica Esperada (CORRECTA):**
- Sumar `qty` de todas las tiendas por producto
- Comparar suma global con `min_qty` del producto
- Si `suma_global <= min_qty AND suma_global > 0` → Low Stock

**Verdict:** 🔴 **LOGIC FLAW DETECTED**

---

### **3. "OUT OF STOCK" DEFINITION: ¿Cómo cuenta productos sin stock?**

**Código Relevante (Línea 80):**
```sql
COUNT(DISTINCT CASE WHEN qty = 0 THEN product_id END) AS out_of_stock_count
```

**Filtros Aplicados:**
- ✅ Línea 58: `AND p.active = true` → Solo productos activos
- ✅ Línea 80: `qty = 0` → Solo productos con cantidad cero

**Análisis:**

**Escenario de Prueba:**
```
Producto A:
  - Tienda 1: qty = 10
  - Tienda 2: qty = 0
  
Resultado:
  - joined_data tiene 2 filas:
    - Fila 1: qty = 10 → NO cuenta (qty != 0)
    - Fila 2: qty = 0 → SÍ cuenta (qty = 0)
  - out_of_stock_count = 1 ✅ (Correcto: Producto A está sin stock en Tienda 2)
```

**Problema Potencial:**

**Escenario Problemático:**
```
Producto A:
  - Tienda 1: qty = 10 (Tiene stock)
  - Tienda 2: qty = 0 (Sin stock)
  
Lógica Actual:
  - out_of_stock_count = 1 (Cuenta Producto A porque tiene qty = 0 en Tienda 2)
  
Pregunta: ¿Es correcto contar como "Out of Stock" si tiene stock en otra tienda?
  - Depende del contexto:
    - Si es vista GLOBAL: ✅ Correcto (hay al menos una tienda sin stock)
    - Si es vista POR TIENDA: ❌ Incorrecto (debería mostrar solo la tienda específica)
```

**Verdict:** ⚠️ **AMBIGUO** - La lógica es correcta para vista global, pero puede ser confusa.

**Recomendación:** 
- Si el usuario espera "Out of Stock" solo cuando TODAS las tiendas tienen `qty = 0`, la lógica actual es incorrecta.
- Si el usuario espera "Out of Stock" cuando AL MENOS UNA tienda tiene `qty = 0`, la lógica actual es correcta.

---

### **4. CATEGORY GROUPING: ¿Viene de SQL o client-side?**

**Código Relevante (Líneas 60-70, 91-110):**
```sql
category_stats AS (
  -- CTE 2: Agregación por categoría (GROUP BY category)
  SELECT 
    category AS category_name,
    COALESCE(SUM(cost_value), 0) AS sum_cost,
    COALESCE(SUM(retail_value), 0) AS sum_retail,
    COALESCE(SUM(profit_value), 0) AS profit_potential,
    COUNT(DISTINCT product_id) AS product_count,
    COALESCE(SUM(qty), 0) AS count_items
  FROM joined_data
  GROUP BY category  -- ✅ SQL GROUP BY
),
-- ...
'category_breakdown', (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category_name', cs.category_name,
      'total_cost_value', cs.sum_cost,
      'total_retail_value', cs.sum_retail,
      -- ...
    )
    ORDER BY cs.sum_retail DESC
  ), '[]'::jsonb)
  FROM category_stats cs
  CROSS JOIN global_stats gs
)
```

**Respuesta:** ✅ **Viene directamente de SQL `GROUP BY category`**

**Evidencia:**
- Línea 70: `GROUP BY category` en SQL
- Línea 91-110: `category_breakdown` se construye desde `category_stats` (SQL)
- NO hay manipulación client-side en `useInventoryFinancialSummary.ts`

**Verdict:** ✅ **SAFE** - El agrupamiento por categoría es correcto y eficiente.

---

### **5. VALUE BASIS: ¿Usa `cost_usd` o `sale_price_usd`?**

**Código Relevante (Líneas 52-54, 75-76):**
```sql
-- En joined_data:
inv.qty * p.cost_usd AS cost_value,
inv.qty * p.sale_price_usd AS retail_value,

-- En global_stats:
COALESCE(SUM(cost_value), 0) AS total_cost,
COALESCE(SUM(retail_value), 0) AS total_retail,

-- En resultado final:
'total_cost_value', gs.total_cost,  -- ✅ Usa cost_usd
'total_retail_value', gs.total_retail,  -- Usa sale_price_usd (valor de venta potencial)
```

**Respuesta:** ✅ **Usa `cost_usd` para `total_cost_value`**

**Evidencia:**
- `total_cost_value` = `SUM(qty * cost_usd)` ✅ CORRECTO
- `total_retail_value` = `SUM(qty * sale_price_usd)` ✅ CORRECTO (valor de venta potencial)

**Verdict:** ✅ **SAFE** - Usa `cost_usd` correctamente para valor de inventario.

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### **PROBLEMA 1: Low Stock Threshold Hardcoded**

**Línea 81:**
```sql
COUNT(DISTINCT CASE WHEN qty > 0 AND qty <= 5 THEN product_id END) AS critical_stock_count
```

**Issues:**
1. ❌ Umbral hardcoded a `5` (NO usa `min_qty` de la tabla)
2. ❌ Evalúa por fila individual (NO suma global)
3. ❌ No considera `inv.min_qty` que puede variar por producto/tienda

**Fix Recomendado:**
```sql
-- Opción A: Usar min_qty de la tabla (más preciso)
COUNT(DISTINCT CASE 
  WHEN qty > 0 AND qty <= inv.min_qty 
  THEN product_id 
END) AS critical_stock_count

-- Opción B: Sumar globalmente y comparar con min_qty
WITH product_totals AS (
  SELECT 
    product_id,
    SUM(qty) AS total_qty,
    MIN(min_qty) AS min_qty  -- O MAX, dependiendo de la lógica de negocio
  FROM joined_data
  GROUP BY product_id
)
SELECT 
  COUNT(DISTINCT CASE 
    WHEN total_qty > 0 AND total_qty <= min_qty 
    THEN product_id 
  END) AS critical_stock_count
FROM product_totals
```

---

### **PROBLEMA 2: Out of Stock Logic Ambiguo**

**Línea 80:**
```sql
COUNT(DISTINCT CASE WHEN qty = 0 THEN product_id END) AS out_of_stock_count
```

**Issue:**
- Cuenta productos con `qty = 0` en AL MENOS UNA tienda
- NO distingue entre "sin stock en todas las tiendas" vs "sin stock en una tienda"

**Fix Recomendado:**
```sql
-- Opción A: Solo contar si TODAS las tiendas tienen qty = 0
WITH product_totals AS (
  SELECT 
    product_id,
    SUM(qty) AS total_qty,
    COUNT(DISTINCT store_id) AS store_count,
    COUNT(DISTINCT CASE WHEN qty = 0 THEN store_id END) AS zero_stock_stores
  FROM joined_data
  GROUP BY product_id
)
SELECT 
  COUNT(DISTINCT CASE 
    WHEN total_qty = 0 OR zero_stock_stores = store_count
    THEN product_id 
  END) AS out_of_stock_count
FROM product_totals

-- Opción B: Mantener lógica actual pero documentar claramente
-- "Productos con stock cero en al menos una tienda"
```

---

## 📊 TABLA RESUMEN DE HALLAZGOS

| Pregunta | Respuesta | Estado |
|---|---|---|
| **¿Suma cantidades de todas las tiendas?** | ✅ SÍ - `SUM(qty)` agrega todas las tiendas | ✅ CORRECTO |
| **¿Low Stock threshold?** | 🔴 HARDCODED `qty <= 5` (NO usa `min_qty`) | 🔴 **LOGIC FLAW** |
| **¿Low Stock evalúa suma global?** | 🔴 NO - Evalúa por fila individual | 🔴 **LOGIC FLAW** |
| **¿Out of Stock usa `qty = 0`?** | ✅ SÍ - `qty = 0` | ✅ CORRECTO |
| **¿Out of Stock filtra `active = true`?** | ✅ SÍ - Línea 58 | ✅ CORRECTO |
| **¿Category grouping viene de SQL?** | ✅ SÍ - `GROUP BY category` | ✅ CORRECTO |
| **¿Value basis usa `cost_usd`?** | ✅ SÍ - `total_cost_value` usa `cost_usd` | ✅ CORRECTO |

---

## ✅ VEREDICTO FINAL

### **ESTADO GENERAL:** 🔴 **LOGIC FLAW DETECTED**

**Razones:**
1. ✅ Multi-store logic: CORRECTO (suma todas las tiendas)
2. 🔴 Low Stock threshold: HARDCODED (debería usar `min_qty`)
3. 🔴 Low Stock scope: Por fila individual (debería sumar globalmente)
4. ⚠️ Out of Stock logic: AMBIGUO (depende del contexto esperado)
5. ✅ Category grouping: CORRECTO (SQL `GROUP BY`)
6. ✅ Value basis: CORRECTO (usa `cost_usd`)

**Impacto:**
- **Low Stock Count** puede ser incorrecto si:
  - El umbral real del producto es diferente a 5
  - El usuario espera evaluación basada en suma global
- **Out of Stock Count** puede ser confuso si:
  - El usuario espera solo productos sin stock en TODAS las tiendas

---

## 🔧 RECOMENDACIONES

### **PRIORIDAD ALTA:**

1. **Corregir Low Stock Logic:**
   - Usar `min_qty` de la tabla `inventories`
   - Sumar `qty` globalmente por producto antes de evaluar
   - Comparar suma global con `min_qty`

2. **Clarificar Out of Stock Logic:**
   - Documentar si cuenta "al menos una tienda" o "todas las tiendas"
   - Considerar agregar `out_of_stock_all_stores` vs `out_of_stock_any_store`

### **PRIORIDAD MEDIA:**

3. **Agregar validación de datos:**
   - Verificar que `min_qty` no sea NULL
   - Manejar casos donde `min_qty = 0`

---

**FIN DEL REPORTE**








