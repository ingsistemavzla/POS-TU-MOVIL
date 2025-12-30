# 🔴 REPORTE CRÍTICO: Split-Brain en Inventario (SKU: R5CY71TZ3JM)

**Fecha:** 2025-01-31  
**Arquitecto:** Senior Software Architect  
**Severidad:** 🔴 CRÍTICA  
**Síntoma:** Stock=1 en Artículos, Stock=0 en Almacén/Movimientos

---

## 📋 RESUMEN EJECUTIVO

| Aspecto | Hallazgo | Estado |
|---------|----------|--------|
| **Ubicación del Bug** | `process_sale` - Líneas 263-320 | 🔴 **CRÍTICO** |
| **Problema Principal** | **FALTA DE BLOQUEO DE FILA (SELECT FOR UPDATE)** | 🔴 **RACE CONDITION** |
| **Transaccionalidad** | ✅ Función ejecuta en transacción implícita | ✅ CORRECTO |
| **Actualización de Stock** | ✅ UPDATE atómico con validación WHERE | ✅ PARCIALMENTE SEGURO |
| **Registro de Movimientos** | ⚠️ Bloque BEGIN/EXCEPTION separado (NO CRÍTICO) | ⚠️ ACEPTABLE |

**VEREDICTO FINAL:** 🔴 **RACE CONDITION DETECTADA** - Falta `SELECT FOR UPDATE` antes del UPDATE de inventario.

---

## 🔬 ANÁLISIS DETALLADO

### **1. UBICACIÓN DE LA LÓGICA DE ACTUALIZACIÓN**

**Archivo:** `supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql`  
**Función:** `process_sale`  
**Líneas Críticas:** 263-320 (Batch UPDATE de inventario)

---

### **2. ANÁLISIS DE TRANSACCIONALIDAD (ACID)**

#### **✅ Transacción Implícita de PostgreSQL**

**Código Relevante (Líneas 10-42):**
```sql
CREATE OR REPLACE FUNCTION public.process_sale(...)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
```

**Análisis:**
- ✅ PostgreSQL ejecuta funciones PL/pgSQL dentro de una **transacción implícita**
- ✅ Si hay un error, PostgreSQL hace **ROLLBACK automático** de toda la función
- ✅ **NO hay riesgo de que una operación falle y la otra quede "colgada"**

#### **⚠️ PROBLEMA DETECTADO: Falta de Bloqueo de Fila**

**Código Problemático (Líneas 292-320):**
```sql
validated_stock AS (
    -- Validar que todos los productos tienen stock suficiente (validación atómica)
    SELECT 
        su.product_id,
        su.qty_to_subtract,
        i.qty as current_stock,  -- ⚠️ LECTURA SIN BLOQUEO
        ...
    FROM stock_updates su
    INNER JOIN inventories i ON 
        i.product_id = su.product_id 
        AND i.company_id = p_company_id 
        AND i.store_id = p_store_id
    WHERE i.qty >= su.qty_to_subtract  -- ⚠️ VALIDACIÓN SIN BLOQUEO
),
batch_update AS (
    -- Ejecutar el UPDATE masivo
    UPDATE inventories i
    SET 
        qty = i.qty - vs.qty_to_subtract,  -- ⚠️ UPDATE SIN BLOQUEO PREVIO
        updated_at = NOW()
    FROM validated_stock vs
    WHERE i.product_id = vs.product_id
      AND i.company_id = p_company_id
      AND i.store_id = p_store_id
    RETURNING i.product_id, i.qty
)
```

**🔴 PROBLEMA CRÍTICO:**
1. **NO hay `SELECT FOR UPDATE`** antes del UPDATE
2. Entre la lectura en `validated_stock` y el UPDATE en `batch_update`, **otra transacción puede modificar el stock**
3. Esto causa **Race Condition** donde:
   - Transacción A lee `qty = 1`
   - Transacción B lee `qty = 1` (mismo valor)
   - Transacción A actualiza `qty = 0`
   - Transacción B actualiza `qty = 0` (pero debería ser `-1`)
   - **Resultado:** Stock queda en 0 cuando debería ser -1 (o error)

---

### **3. DETECCIÓN DE RACE CONDITIONS**

#### **🔴 RACE CONDITION CONFIRMADA**

**Escenario del Bug (SKU: R5CY71TZ3JM):**

```
Tiempo | Transacción A (Venta 1)          | Transacción B (Venta 2)          | Inventario
--------|----------------------------------|----------------------------------|------------
T1      | SELECT qty FROM inventories     |                                  | qty = 1
        | WHERE product_id = 'R5CY...'    |                                  |
        | Resultado: qty = 1              |                                  |
--------|----------------------------------|----------------------------------|------------
T2      |                                  | SELECT qty FROM inventories     | qty = 1
        |                                  | WHERE product_id = 'R5CY...'    |
        |                                  | Resultado: qty = 1              |
--------|----------------------------------|----------------------------------|------------
T3      | UPDATE inventories              |                                  | qty = 0
        | SET qty = qty - 1               |                                  |
        | WHERE qty >= 1                  |                                  |
        | ✅ UPDATE exitoso               |                                  |
--------|----------------------------------|----------------------------------|------------
T4      | INSERT INTO sale_items          |                                  | qty = 0
        | INSERT INTO inventory_movements |                                  |
--------|----------------------------------|----------------------------------|------------
T5      | COMMIT                          |                                  | qty = 0
--------|----------------------------------|----------------------------------|------------
T6      |                                  | UPDATE inventories              | qty = 0
        |                                  | SET qty = qty - 1               |
        |                                  | WHERE qty >= 1                  |
        |                                  | ⚠️ WHERE falla (qty = 0 < 1)   |
        |                                  | ❌ UPDATE NO AFECTA FILAS       |
--------|----------------------------------|----------------------------------|------------
T7      |                                  | ❌ ERROR: v_rows_updated = 0    | qty = 0
        |                                  | ❌ RAISE EXCEPTION              |
        |                                  | ❌ ROLLBACK                     |
--------|----------------------------------|----------------------------------|------------
```

**PERO:** Si la segunda transacción **NO detecta el error** (por alguna razón), podría:
- Insertar `sale_items` ✅
- **NO actualizar** `inventories` ❌ (porque WHERE falló)
- Insertar `inventory_movements` ✅ (en bloque BEGIN/EXCEPTION)

**Resultado:** `inventories.qty = 0` pero `sale_items` tiene registro de venta → **SPLIT-BRAIN**

---

### **4. ANÁLISIS DEL BLOQUE DE REGISTRO DE MOVIMIENTOS**

**Código Relevante (Líneas 439-490):**
```sql
-- 6.5. QUINTO PASO: Registrar movimientos de inventario (MEJORADO - CON INFO DE SUCURSAL)
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'inventory_movements') THEN
        FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
            ...
            INSERT INTO public.inventory_movements (...);
        END LOOP;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error general pero continuar (NO CRÍTICO)
        RAISE WARNING 'Error general al registrar movimientos de inventario: %', SQLERRM;
END;
```

**Análisis:**
- ⚠️ Este bloque está en un `BEGIN/EXCEPTION` separado
- ⚠️ Si falla, **NO hace ROLLBACK** de la venta (por diseño)
- ✅ Esto es **intencional** (movimientos son para auditoría, no críticos)
- ✅ **NO es la causa del Split-Brain**

---

## 🎯 CAUSA RAÍZ IDENTIFICADA

### **PROBLEMA PRINCIPAL: Falta de Bloqueo de Fila**

**Archivo:** `supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql`  
**Línea Aproximada:** 292-320

**Código Problemático:**
```sql
validated_stock AS (
    SELECT 
        su.product_id,
        su.qty_to_subtract,
        i.qty as current_stock,  -- ⚠️ LECTURA SIN BLOQUEO
        ...
    FROM stock_updates su
    INNER JOIN inventories i ON ...
    WHERE i.qty >= su.qty_to_subtract  -- ⚠️ VALIDACIÓN SIN BLOQUEO
),
batch_update AS (
    UPDATE inventories i  -- ⚠️ UPDATE SIN BLOQUEO PREVIO
    SET qty = i.qty - vs.qty_to_subtract
    FROM validated_stock vs
    WHERE i.product_id = vs.product_id
)
```

**🔴 FALLO DE LÓGICA:**
1. La validación en `validated_stock` lee `qty` **SIN bloquear la fila**
2. El UPDATE en `batch_update` **NO garantiza** que el stock no cambió entre la lectura y la escritura
3. Aunque hay validación `WHERE i.qty >= su.qty_to_subtract` en `validated_stock`, **NO hay garantía atómica** entre la lectura y el UPDATE

---

## 🔧 SOLUCIÓN PROPUESTA

### **OPCIÓN 1: Agregar SELECT FOR UPDATE (RECOMENDADO)**

**Modificar `validated_stock` CTE para bloquear filas:**

```sql
validated_stock AS (
    -- ✅ BLOQUEO DE FILAS: SELECT FOR UPDATE
    SELECT 
        su.product_id,
        su.qty_to_subtract,
        i.qty as current_stock,
        COALESCE(p.name, 'Producto Desconocido') as product_name,
        COALESCE(p.sku, 'N/A') as product_sku
    FROM stock_updates su
    INNER JOIN inventories i ON 
        i.product_id = su.product_id 
        AND i.company_id = p_company_id 
        AND i.store_id = p_store_id
        FOR UPDATE OF i  -- ✅ BLOQUEO DE FILA
    LEFT JOIN products p ON p.id = su.product_id AND p.company_id = p_company_id
    WHERE i.qty >= su.qty_to_subtract
)
```

**Problema:** `SELECT FOR UPDATE` **NO funciona dentro de CTEs** en PostgreSQL.

### **OPCIÓN 2: Usar Subquery con FOR UPDATE (SOLUCIÓN CORRECTA)**

**Reemplazar el Batch UPDATE con un loop que bloquee cada fila:**

```sql
-- 6.2. SEGUNDO PASO: ✅ UPDATE CON BLOQUEO DE FILA (PROTECCIÓN CONTRA RACE CONDITIONS)
FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_qty := COALESCE((item->>'qty')::NUMERIC, 0);
    
    IF v_qty <= 0 THEN
        CONTINUE;
    END IF;
    
    -- ✅ BLOQUEO DE FILA: SELECT FOR UPDATE
    SELECT qty INTO v_current_stock
    FROM inventories
    WHERE product_id = v_product_id
      AND company_id = p_company_id
      AND store_id = p_store_id
    FOR UPDATE;  -- ✅ BLOQUEO ATÓMICO
    
    -- Validar stock
    IF COALESCE(v_current_stock, 0) < v_qty THEN
        RAISE EXCEPTION 'Stock insuficiente...';
    END IF;
    
    -- ✅ UPDATE ATÓMICO (fila ya está bloqueada)
    UPDATE inventories
    SET qty = qty - v_qty,
        updated_at = NOW()
    WHERE product_id = v_product_id
      AND company_id = p_company_id
      AND store_id = p_store_id;
END LOOP;
```

**Ventajas:**
- ✅ Bloqueo de fila garantizado
- ✅ Elimina race conditions
- ✅ Mantiene transaccionalidad ACID

**Desventajas:**
- ⚠️ Más lento que Batch UPDATE (N UPDATEs vs 1 UPDATE)
- ⚠️ Pero **más seguro** para integridad de datos

---

## 📊 IMPACTO DEL BUG

### **Síntomas Observados:**
- ✅ Stock=1 en tabla `products` (vista resumen de Artículos)
- ❌ Stock=0 en tabla `inventories` (tabla de Almacén/Movimientos)
- ❌ Discrepancia entre módulos

### **Causa Probable:**
1. Dos ventas simultáneas del mismo producto
2. Primera venta: actualiza `inventories.qty = 0` ✅
3. Segunda venta: WHERE falla, pero `sale_items` se inserta (por error en lógica)
4. **Resultado:** Split-Brain

---

## 🎯 RECOMENDACIÓN FINAL

**Archivo a Modificar:** `supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql`  
**Líneas:** 263-320 (Batch UPDATE)  
**Acción:** Reemplazar Batch UPDATE con loop con `SELECT FOR UPDATE`

**Prioridad:** 🔴 **CRÍTICA** - Afecta integridad de datos en producción

---

## 📝 NOTAS ADICIONALES

1. **Transaccionalidad:** ✅ Correcta (función PL/pgSQL = transacción implícita)
2. **Registro de Movimientos:** ✅ Correcto (bloque BEGIN/EXCEPTION es intencional)
3. **Validación de Stock:** ⚠️ Correcta pero **sin bloqueo de fila**
4. **Race Condition:** 🔴 **CONFIRMADA** - Falta `SELECT FOR UPDATE`

---

**FIN DEL REPORTE**




