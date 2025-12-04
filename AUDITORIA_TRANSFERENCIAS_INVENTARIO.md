# 🔍 AUDITORÍA FORENSE: Transferencias de Inventario entre Sucursales
## Análisis de Seguridad y Ley de Conservación de Inventario

**Fecha:** 2025-01-28  
**Auditor:** Senior Database Auditor & Backend Specialist  
**Función Auditada:** `public.transfer_inventory()`  
**Archivo:** `supabase/migrations/20250103000002_create_transfer_inventory_function.sql`

---

## 📋 RESUMEN EJECUTIVO

| Aspecto | Estado | Veredicto |
|---------|--------|-----------|
| **Ubicación de Lógica** | ✅ Backend RPC único | **SEGURO** |
| **Integridad Transaccional** | ⚠️ Transacción implícita con EXCEPTION handler problemático | **HÍBRIDO** |
| **Concurrencia** | ❌ Sin bloqueo de filas | **INSEGURO** |
| **Validación de Destino** | ✅ Crea inventario automáticamente | **SEGURO** |
| **Ley de Conservación** | ⚠️ Vulnerable a race conditions | **EN RIESGO** |

**VEREDICTO FINAL:** 🟡 **HÍBRIDO** (Transaccional pero sin bloqueo de concurrencia)

---

## 🔬 ANÁLISIS DETALLADO POR PREGUNTA

### 1. ✅ UBICACIÓN DE LA LÓGICA

#### **Pregunta:**
¿La transferencia se hace en una sola función RPC (Backend) o son dos llamadas separadas desde el Frontend?

#### **Respuesta:**

**✅ ES UNA FUNCIÓN RPC ÚNICA EN EL BACKEND**

**Evidencia:**
- **Backend:** Función `public.transfer_inventory()` (líneas 112-358)
- **Frontend:** Una sola llamada RPC desde `AlmacenPage.tsx` y `ArticulosPage.tsx`:
  ```typescript
  const { data, error } = await (supabase as any).rpc('transfer_inventory', {
    p_product_id: productId,
    p_from_store_id: fromStoreId,
    p_to_store_id: toStoreId,
    p_quantity: quantity,
    p_company_id: companyId,
    p_transferred_by: userId
  });
  ```

**Veredicto:** ✅ **SEGURO** - No hay riesgo de que se descuente de origen y falle al sumar al destino porque todo está en una sola transacción.

---

### 2. ⚠️ INTEGRIDAD TRANSACCIONAL (Atomicidad)

#### **Pregunta:**
¿Usa `BEGIN ... COMMIT` explícito o confía en la transacción implícita de Postgres? ¿Qué pasa si falla el paso de "Sumar al destino"?

#### **Análisis del Código:**

```sql
CREATE OR REPLACE FUNCTION public.transfer_inventory(...)
RETURNS json
LANGUAGE plpgsql  -- ← Transacción implícita
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Validaciones
  -- 2. SELECT inventario origen (línea 209)
  -- 3. SELECT inventario destino (línea 233)
  -- 4. INSERT inventario destino si no existe (línea 241)
  -- 5. UPDATE origen (restar) (línea 258)
  -- 6. UPDATE destino (sumar) (línea 264)
  -- 7. INSERT registro transferencia (línea 270)
  -- 8. INSERT movimientos (líneas 291, 312)
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(  -- ← PROBLEMA: Retorna JSON en lugar de RAISE
      'error', true,
      'message', 'Error al transferir inventario: ' || SQLERRM,
      'code', SQLSTATE
    );
END;
$$;
```

#### **Problema Identificado:**

**❌ EXCEPTION HANDLER PROBLEMÁTICO:**

1. **Transacción Implícita:** ✅ PostgreSQL crea una transacción automáticamente
2. **Pero:** El `EXCEPTION` handler captura TODOS los errores y retorna JSON
3. **Consecuencia:** Si falla el paso 6 (UPDATE destino), el handler captura el error y retorna JSON exitosamente
4. **Resultado:** La transacción NO se revierte automáticamente porque la función termina "exitosamente" (retorna JSON)

**Escenario de Falla:**
```
1. UPDATE origen (restar) → ✅ Éxito
2. UPDATE destino (sumar) → ❌ Falla (ej: constraint violation)
3. EXCEPTION captura el error
4. Retorna JSON con error
5. Transacción hace COMMIT (porque no hubo RAISE)
6. Resultado: Stock restado de origen pero NO sumado a destino → **FUGAS DE INVENTARIO**
```

#### **Solución Requerida:**

```sql
EXCEPTION
  WHEN OTHERS THEN
    -- RE-RAISE la excepción para que PostgreSQL haga ROLLBACK
    RAISE EXCEPTION 'Error al transferir inventario: %', SQLERRM;
    -- O mejor aún, no capturar excepciones críticas
END;
```

**Veredicto:** ⚠️ **HÍBRIDO** - Transacción implícita es correcta, pero el EXCEPTION handler puede causar COMMIT parcial.

---

### 3. ❌ CONCURRENCIA (El Riesgo del "Doble Gasto")

#### **Pregunta:**
¿Existe algún `SELECT ... FOR UPDATE` o bloqueo en el stock de origen? ¿Si un Admin transfiere 5 unidades y un Cajero vende esas 5 al mismo tiempo, el código actual lo impide?

#### **Análisis del Código:**

```sql
-- Línea 209: SELECT sin bloqueo
SELECT id, qty INTO v_from_inventory_id, v_from_qty
FROM public.inventories
WHERE product_id = p_product_id 
  AND store_id = p_from_store_id 
  AND company_id = p_company_id;

-- Línea 224: Validación de stock
IF v_from_qty < p_quantity THEN
  RETURN json_build_object('error', true, ...);
END IF;

-- Línea 258: UPDATE sin validación en WHERE
UPDATE public.inventories
SET qty = qty - p_quantity,
    updated_at = NOW()
WHERE id = v_from_inventory_id;  -- ← No valida qty >= p_quantity
```

#### **Problema Identificado:**

**❌ RACE CONDITION CRÍTICA:**

**Escenario de Falla:**
```
Tiempo | Admin (Transferencia)          | Cajero (Venta)
-------|--------------------------------|------------------
T1     | SELECT qty → 10                |
T2     |                                | SELECT qty → 10
T3     | IF 10 >= 5 → OK                |
T4     |                                | IF 10 >= 5 → OK
T5     | UPDATE qty = 10 - 5 = 5        |
T6     |                                | UPDATE qty = 10 - 5 = 5
T7     | COMMIT                         |
T8     |                                | COMMIT
Resultado: Stock final = 5, pero se transfirieron 5 y se vendieron 5 (total = 10 unidades "fantasma")
```

**Problemas:**
1. ❌ No hay `SELECT ... FOR UPDATE` → No bloquea la fila
2. ❌ El `UPDATE` no valida `qty >= p_quantity` en el `WHERE`
3. ❌ Dos transacciones pueden leer el mismo stock y ambas pasar la validación

#### **Solución Requerida:**

```sql
-- OPCIÓN A: SELECT ... FOR UPDATE (Bloqueo de fila)
SELECT id, qty INTO v_from_inventory_id, v_from_qty
FROM public.inventories
WHERE product_id = p_product_id 
  AND store_id = p_from_store_id 
  AND company_id = p_company_id
FOR UPDATE;  -- ← Bloquea la fila hasta COMMIT

-- OPCIÓN B: UPDATE con validación en WHERE (Más eficiente)
UPDATE public.inventories
SET qty = qty - p_quantity,
    updated_at = NOW()
WHERE id = v_from_inventory_id
  AND qty >= p_quantity  -- ← Validación en WHERE
RETURNING qty INTO v_new_qty;

IF NOT FOUND THEN
  RAISE EXCEPTION 'Stock insuficiente o inventario no encontrado';
END IF;
```

**Veredicto:** ❌ **INSEGURO** - Permite race conditions que pueden causar stock negativo o "doble gasto".

---

### 4. ✅ VALIDACIÓN DE DESTINO (El Agujero Negro)

#### **Pregunta:**
¿Qué hace la función si el producto NO EXISTE en la sucursal de destino? ¿Crea el inventario automáticamente? ¿Falla y cancela todo?

#### **Análisis del Código:**

```sql
-- Línea 233: Intentar obtener inventario de destino
SELECT id, qty INTO v_to_inventory_id, v_to_qty
FROM public.inventories
WHERE product_id = p_product_id 
  AND store_id = p_to_store_id 
  AND company_id = p_company_id;

-- Línea 240: Si no existe, crearlo automáticamente
IF v_to_inventory_id IS NULL THEN
  INSERT INTO public.inventories (
    product_id,
    store_id,
    company_id,
    qty,
    min_qty
  ) VALUES (
    p_product_id,
    p_to_store_id,
    p_company_id,
    0,  -- ← Stock inicial = 0
    0   -- ← Min stock = 0
  ) RETURNING id INTO v_to_inventory_id;
  v_to_qty := 0;
END IF;

-- Línea 264: Sumar al destino
UPDATE public.inventories
SET qty = qty + p_quantity,
    updated_at = NOW()
WHERE id = v_to_inventory_id;
```

#### **Análisis:**

**✅ COMPORTAMIENTO CORRECTO:**

1. ✅ Si el inventario de destino NO existe, lo crea automáticamente
2. ✅ Lo crea con `qty = 0` y luego suma la cantidad transferida
3. ✅ No hay riesgo de "productos desaparecidos"
4. ✅ La transferencia completa exitosamente

**Ejemplo:**
- Producto "iPhone 15" existe en Tienda A pero NO en Tienda B (nueva)
- Admin transfiere 5 unidades de A → B
- Función crea inventario en B con `qty = 0`
- Luego suma 5 → `qty = 5`
- ✅ Transferencia exitosa, stock conservado

**Veredicto:** ✅ **SEGURO** - Maneja correctamente el caso de inventario inexistente en destino.

---

## 🚨 VIOLACIONES DE LA LEY DE CONSERVACIÓN DE INVENTARIO

### **Ley de Conservación:**
**Stock Total = Suma de todos los inventarios por producto = Constante**

### **Vulnerabilidades Identificadas:**

#### **1. Race Condition (CRÍTICA)**
- **Problema:** Dos operaciones simultáneas pueden leer el mismo stock
- **Impacto:** Stock puede bajar a negativo o "doble gasto"
- **Ejemplo:** Transferencia de 5 + Venta de 5 = Stock final incorrecto

#### **2. EXCEPTION Handler (ALTA)**
- **Problema:** Captura errores y retorna JSON sin hacer ROLLBACK
- **Impacto:** Si falla el UPDATE destino, el origen ya fue restado → **Fuga de inventario**
- **Ejemplo:** UPDATE origen exitoso, UPDATE destino falla → Stock desaparece

#### **3. Falta de Validación en UPDATE (MEDIA)**
- **Problema:** UPDATE no valida `qty >= p_quantity` en WHERE
- **Impacto:** Puede restar más de lo disponible si hay race condition
- **Ejemplo:** Stock = 3, transferencia de 5 → Stock = -2

---

## 📊 VEREDICTO FINAL

### **CATEGORÍA: 🟡 HÍBRIDO**

**Justificación:**
- ✅ **Fortalezas:**
  - Lógica centralizada en backend (RPC único)
  - Transacción implícita de PostgreSQL
  - Crea inventario de destino automáticamente
  - Validaciones básicas (cantidad > 0, tiendas diferentes)

- ⚠️ **Debilidades:**
  - **EXCEPTION handler problemático** → Puede causar COMMIT parcial
  - **Sin bloqueo de concurrencia** → Vulnerable a race conditions
  - **UPDATE sin validación en WHERE** → Puede restar más de lo disponible

### **RIESGO DE FUGAS DE INVENTARIO: 🟡 MEDIO-ALTO**

**Escenarios donde puede fallar:**
1. Transferencia concurrente con venta → Stock incorrecto
2. Error en UPDATE destino → Stock desaparece (fuga)
3. Múltiples transferencias simultáneas → Stock negativo

---

## 🔧 RECOMENDACIONES CRÍTICAS

### **PRIORIDAD ALTA (Implementar Inmediatamente):**

#### **1. Corregir EXCEPTION Handler**
```sql
EXCEPTION
  WHEN OTHERS THEN
    -- RE-RAISE para que PostgreSQL haga ROLLBACK automático
    RAISE EXCEPTION 'Error al transferir inventario: % (Código: %)', SQLERRM, SQLSTATE;
END;
```

#### **2. Agregar Bloqueo de Concurrencia**
```sql
-- Opción A: SELECT ... FOR UPDATE
SELECT id, qty INTO v_from_inventory_id, v_from_qty
FROM public.inventories
WHERE product_id = p_product_id 
  AND store_id = p_from_store_id 
  AND company_id = p_company_id
FOR UPDATE;  -- ← Bloquea la fila

-- Opción B: UPDATE con validación en WHERE (MEJOR)
UPDATE public.inventories
SET qty = qty - p_quantity,
    updated_at = NOW()
WHERE id = v_from_inventory_id
  AND qty >= p_quantity  -- ← Validación atómica
RETURNING qty INTO v_new_from_qty;

IF NOT FOUND THEN
  RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', 
    (SELECT qty FROM inventories WHERE id = v_from_inventory_id), 
    p_quantity;
END IF;
```

#### **3. Validación Post-Transferencia (Opcional pero Recomendada)**
```sql
-- Al final de la función, antes de RETURN
DECLARE
  v_total_stock_before INTEGER;
  v_total_stock_after INTEGER;
BEGIN
  -- Calcular stock total antes
  SELECT SUM(qty) INTO v_total_stock_before
  FROM inventories
  WHERE product_id = p_product_id AND company_id = p_company_id;
  
  -- ... (lógica de transferencia) ...
  
  -- Calcular stock total después
  SELECT SUM(qty) INTO v_total_stock_after
  FROM inventories
  WHERE product_id = p_product_id AND company_id = p_company_id;
  
  -- Validar conservación
  IF v_total_stock_after != v_total_stock_before THEN
    RAISE EXCEPTION 'Violación de conservación de inventario: Antes: %, Después: %', 
      v_total_stock_before, v_total_stock_after;
  END IF;
END;
```

---

## 📝 CONCLUSIÓN

La función `transfer_inventory` tiene una **base sólida** (lógica centralizada, transaccional), pero presenta **vulnerabilidades críticas** de concurrencia y manejo de errores que pueden causar **fugas de inventario**.

**Recomendación:** Implementar las correcciones de Prioridad Alta antes de producción.

**¿Procedemos con la implementación de las correcciones?**





