# 🔴 ANÁLISIS CRÍTICO: Estrategia de Blindaje de Inventario
## Modo "Devil's Advocate" - Validación Arquitectónica Pre-Implementación

**Fecha:** 2025-01-28  
**Analista:** Senior PostgreSQL DBA & System Architect  
**Objetivo:** Identificar riesgos fatales antes de implementar blindaje de inventario

---

## ⚠️ RESUMEN EJECUTIVO: RIESGOS IDENTIFICADOS

| # | Riesgo | Severidad | Estado |
|---|--------|-----------|--------|
| 1 | Timeout en trigger con 10K productos | 🟡 MEDIA | **MITIGABLE** con optimización |
| 2 | Race condition en `process_sale` | 🔴 CRÍTICA | **REQUIERE CORRECCIÓN** (falta `FOR UPDATE`) |
| 3 | Atomicidad de movimientos | 🟡 ALTA | **REQUIERE MEJORA** (transacción implícita OK, pero falta validación) |
| 4 | Parámetros incompletos del frontend | 🟡 ALTA | **REQUIERE DECISIÓN** (forzar vs validar) |
| 5 | Sanación de productos con ventas previas | 🔴 CRÍTICA | **REQUIERE LÓGICA** (cálculo de stock teórico) |
| 6 | Validación matemática de movimientos | 🟡 MEDIA | **OPCIONAL** (constraint complejo, mejor en lógica) |
| 7 | Conteo de seguridad post-transacción | 🟢 BUENA | **APROBADA** con mejoras |

---

## 📋 ANÁLISIS DETALLADO POR PREGUNTA

### 1. 🔴 EL RIESGO DEL TRIGGER "ON STORE CREATED"

#### **Escenario de Estrés:**
- 10,000 productos activos
- Nueva sucursal creada
- Trigger intenta: 10,000 INSERT en `inventories` + 10,000 INSERT en `inventory_movements`
- Total: 20,000 operaciones en una transacción sincrónica

#### **Análisis Técnico:**

**✅ POSTGRESQL PUEDE MANEJARLO:**
- PostgreSQL maneja transacciones grandes eficientemente
- `INSERT` en batch es rápido (especialmente con `COPY` o `INSERT ... VALUES (...), (...), (...)`)
- Supabase tiene timeout de 60 segundos por defecto para funciones RPC
- 20,000 INSERTs simples deberían completarse en < 5 segundos

**⚠️ PERO HAY RIESGOS:**

1. **Bloqueo de Tabla `products`:**
   - Si el trigger lee `products` con `SELECT * FROM products WHERE active = true`, puede bloquear lecturas concurrentes
   - **Solución:** Usar `SELECT ... FOR SHARE` o mejor, `SELECT ... FOR KEY SHARE` (lock más ligero)

2. **Timeout en Supabase:**
   - Si hay 50,000 productos, el trigger podría exceder 60s
   - **Solución:** Implementar procesamiento por lotes (batches de 1,000)

3. **Impacto en UX:**
   - El Admin espera respuesta síncrona al crear tienda
   - Si tarda 10 segundos, puede parecer que se colgó

#### **RECOMENDACIÓN ARQUITECTÓNICA:**

```sql
-- OPCIÓN A: Trigger optimizado con batch processing (RECOMENDADA)
CREATE OR REPLACE FUNCTION initialize_inventories_for_new_store()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_size INTEGER := 1000;
  v_total_products INTEGER;
  v_processed INTEGER := 0;
BEGIN
  -- Contar productos activos
  SELECT COUNT(*) INTO v_total_products
  FROM products
  WHERE company_id = NEW.company_id AND active = true;
  
  -- Si hay muchos productos, procesar en batches
  IF v_total_products > 5000 THEN
    -- Procesar en batches para evitar timeout
    FOR v_processed IN 0..v_total_products BY v_batch_size LOOP
      INSERT INTO inventories (company_id, store_id, product_id, qty, min_qty)
      SELECT NEW.company_id, NEW.id, id, 0, 5
      FROM products
      WHERE company_id = NEW.company_id 
        AND active = true
        AND id NOT IN (SELECT product_id FROM inventories WHERE store_id = NEW.id)
      ORDER BY id
      LIMIT v_batch_size
      OFFSET v_processed;
      
      -- Insertar movimientos en batch
      INSERT INTO inventory_movements (company_id, type, product_id, qty, store_to_id, reason, user_id)
      SELECT NEW.company_id, 'ADJUST', product_id, 0, NEW.id, 
             'Inicialización automática de inventario para nueva sucursal', 
             (SELECT id FROM users WHERE company_id = NEW.company_id AND role = 'admin' LIMIT 1)
      FROM inventories
      WHERE store_id = NEW.id AND company_id = NEW.company_id
      ORDER BY product_id
      LIMIT v_batch_size
      OFFSET v_processed;
    END LOOP;
  ELSE
    -- Procesamiento directo para < 5000 productos
    INSERT INTO inventories (company_id, store_id, product_id, qty, min_qty)
    SELECT NEW.company_id, NEW.id, id, 0, 5
    FROM products
    WHERE company_id = NEW.company_id AND active = true;
    
    INSERT INTO inventory_movements (company_id, type, product_id, qty, store_to_id, reason, user_id)
    SELECT NEW.company_id, 'ADJUST', product_id, 0, NEW.id,
           'Inicialización automática de inventario para nueva sucursal',
           (SELECT id FROM users WHERE company_id = NEW.company_id AND role = 'admin' LIMIT 1)
    FROM inventories
    WHERE store_id = NEW.id AND company_id = NEW.company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- OPCIÓN B: Edge Function asíncrona (ALTERNATIVA para > 50K productos)
-- Pro: No bloquea creación de tienda
-- Contra: Complejidad adicional, posible inconsistencia temporal
```

**VEREDICTO:** ✅ **Trigger es seguro** con optimización de batches. Edge Function solo si > 50K productos.

---

### 2. 🔴 CONCURRENCIA EN `process_sale` (Venta Blindada)

#### **Escenario de Estrés:**
- Dos cajas venden el último iPhone (stock = 1) simultáneamente
- Ambas leen `qty = 1` al mismo tiempo
- Ambas pasan validación
- Ambas procesan venta → stock = -1 (INCONSISTENCIA)

#### **Análisis Técnico:**

**❌ PROBLEMA ACTUAL:**
```sql
-- Código actual (VULNERABLE)
SELECT qty INTO v_current_stock
FROM inventories 
WHERE company_id = p_company_id 
  AND store_id = p_store_id 
  AND product_id = v_product_id;

IF COALESCE(v_current_stock, 0) < v_qty THEN
    RAISE EXCEPTION 'Stock insuficiente...';
END IF;

UPDATE inventories 
SET qty = qty - v_qty
WHERE company_id = p_company_id 
  AND store_id = p_store_id 
  AND product_id = v_product_id;
```

**Problema:** Entre `SELECT` y `UPDATE`, otra transacción puede modificar el stock.

**✅ SOLUCIÓN: `SELECT ... FOR UPDATE`**

```sql
-- Código corregido (SEGURO)
SELECT qty INTO v_current_stock
FROM inventories 
WHERE company_id = p_company_id 
  AND store_id = p_store_id 
  AND product_id = v_product_id
FOR UPDATE;  -- ← BLOQUEO DE FILA

IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventario no encontrado para producto %', v_product_id;
END IF;

IF COALESCE(v_current_stock, 0) < v_qty THEN
    RAISE EXCEPTION 'Stock insuficiente...';
END IF;

UPDATE inventories 
SET qty = qty - v_qty
WHERE company_id = p_company_id 
  AND store_id = p_store_id 
  AND product_id = v_product_id;
```

**Explicación:**
- `FOR UPDATE` bloquea la fila hasta que la transacción termine
- La segunda transacción espera hasta que la primera haga COMMIT/ROLLBACK
- Garantiza que la validación y el UPDATE sean atómicos

**⚠️ RIESGO DE DEADLOCK:**
- Si dos ventas modifican productos en orden diferente, puede haber deadlock
- **Mitigación:** Ordenar productos por `product_id` antes de procesar

#### **RECOMENDACIÓN ARQUITECTÓNICA:**

```sql
-- MEJORA: Usar UPDATE con validación en una sola operación
UPDATE inventories 
SET qty = qty - v_qty, updated_at = NOW()
WHERE company_id = p_company_id 
  AND store_id = p_store_id 
  AND product_id = v_product_id
  AND qty >= v_qty  -- ← Validación en WHERE (más eficiente)
RETURNING qty INTO v_new_stock;

IF NOT FOUND THEN
    -- Verificar si existe el inventario
    SELECT qty INTO v_current_stock
    FROM inventories 
    WHERE company_id = p_company_id 
      AND store_id = p_store_id 
      AND product_id = v_product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventario no encontrado para producto %', v_product_id;
    ELSE
        RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', v_current_stock, v_qty;
    END IF;
END IF;
```

**VEREDICTO:** 🔴 **REQUIERE CORRECCIÓN URGENTE**. Falta `FOR UPDATE` o validación en `WHERE`.

---

### 3. 🟡 INTEGRIDAD DE MOVIMIENTOS

#### **Escenario de Estrés:**
- Trigger crea inventario en `inventories` (éxito)
- Trigger intenta crear movimiento en `inventory_movements` (falla por constraint)
- Resultado: Inventario existe pero sin movimiento → **DATA CORRUPTA**

#### **Análisis Técnico:**

**✅ POSTGRESQL GARANTIZA ATOMICIDAD:**
- Todas las operaciones dentro de una función `LANGUAGE plpgsql` están en una transacción implícita
- Si cualquier operación falla, se hace ROLLBACK automático
- **PERO:** Si hay `EXCEPTION` handler que captura el error, puede hacer COMMIT parcial

**❌ PROBLEMA EN CÓDIGO ACTUAL:**
```sql
-- Código vulnerable
BEGIN
    INSERT INTO inventories (...);
    INSERT INTO inventory_movements (...);  -- Si falla aquí...
EXCEPTION
    WHEN OTHERS THEN
        -- Si capturamos el error, la transacción NO se revierte automáticamente
        RETURN json_build_object('error', true, ...);
END;
```

**✅ SOLUCIÓN: NO CAPTURAR EXCEPCIONES CRÍTICAS**

```sql
-- Código seguro
BEGIN
    INSERT INTO inventories (...);
    INSERT INTO inventory_movements (...);
    -- Si falla, PostgreSQL hace ROLLBACK automático
    -- NO capturar excepciones aquí
EXCEPTION
    WHEN OTHERS THEN
        -- Solo capturar para logging, luego RE-RAISE
        RAISE;  -- ← Re-lanzar la excepción para que se haga ROLLBACK
END;
```

#### **RECOMENDACIÓN ARQUITECTÓNICA:**

```sql
-- MEJORA: Validación post-inserción
CREATE OR REPLACE FUNCTION create_product_with_inventory(...)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id uuid;
  v_inventory_count INTEGER;
  v_movement_count INTEGER;
BEGIN
  -- Crear producto
  INSERT INTO products (...) RETURNING id INTO v_product_id;
  
  -- Crear inventarios
  INSERT INTO inventories (...);
  
  -- Crear movimientos
  INSERT INTO inventory_movements (...);
  
  -- VALIDACIÓN POST-INSERCIÓN (antes de COMMIT)
  SELECT COUNT(*) INTO v_inventory_count
  FROM inventories
  WHERE product_id = v_product_id;
  
  SELECT COUNT(*) INTO v_movement_count
  FROM inventory_movements
  WHERE product_id = v_product_id;
  
  -- Si no coinciden, hacer ROLLBACK
  IF v_inventory_count != v_movement_count THEN
    RAISE EXCEPTION 'Inconsistencia detectada: % inventarios vs % movimientos', 
        v_inventory_count, v_movement_count;
  END IF;
  
  RETURN json_build_object('success', true, 'product_id', v_product_id);
  
  -- NO capturar excepciones aquí - dejar que PostgreSQL haga ROLLBACK
END;
$$;
```

**VEREDICTO:** 🟡 **REQUIERE MEJORA**. Transacción implícita es segura, pero falta validación post-inserción.

---

### 4. 🟡 EL WRAPPER `create_product_v3`

#### **Escenario de Estrés:**
- Frontend envía `p_store_inventories` con solo 2 de 5 tiendas
- ¿Debemos ignorar el array y crear para TODAS las tiendas?
- ¿O validar y rechazar si está incompleto?

#### **Análisis Técnico:**

**OPCIÓN A: IGNORAR ARRAY DEL FRONTEND (Forzar todas las tiendas)**
```sql
-- Ignorar p_store_inventories, crear para TODAS las tiendas activas
INSERT INTO inventories (company_id, store_id, product_id, qty, min_qty)
SELECT user_company_id, id, product_record.id, 0, 5
FROM stores
WHERE company_id = user_company_id AND active = true;
```

**Pros:**
- ✅ Garantiza integridad 100%
- ✅ No depende del frontend
- ✅ Previene "productos fantasmas"

**Contras:**
- ❌ Ignora stock inicial que el Admin definió
- ❌ Si Admin quería stock inicial = 10 en Tienda A, se crea con 0

**OPCIÓN B: VALIDAR Y RECHAZAR SI INCOMPLETO**
```sql
-- Validar que el array incluya TODAS las tiendas
DECLARE
  v_expected_stores INTEGER;
  v_received_stores INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_expected_stores
  FROM stores
  WHERE company_id = user_company_id AND active = true;
  
  v_received_stores := jsonb_array_length(p_store_inventories);
  
  IF v_received_stores < v_expected_stores THEN
    RAISE EXCEPTION 'Array de inventarios incompleto. Esperado: %, Recibido: %', 
        v_expected_stores, v_received_stores;
  END IF;
  
  -- Crear inventarios usando el array
  FOR store_inventory IN SELECT * FROM jsonb_array_elements(p_store_inventories) LOOP
    ...
  END LOOP;
END;
```

**Pros:**
- ✅ Respeta stock inicial del Admin
- ✅ Fuerza al frontend a enviar datos completos

**Contras:**
- ❌ Si frontend tiene bug, rechaza creación válida
- ❌ Más complejo

#### **RECOMENDACIÓN ARQUITECTÓNICA:**

**OPCIÓN HÍBRIDA (RECOMENDADA):**

```sql
CREATE OR REPLACE FUNCTION create_product_v3(...)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expected_stores INTEGER;
  v_received_stores INTEGER;
  v_store_map JSONB := '{}'::jsonb;
  v_store_record RECORD;
BEGIN
  -- Contar tiendas activas
  SELECT COUNT(*) INTO v_expected_stores
  FROM stores
  WHERE company_id = user_company_id AND active = true;
  
  -- Crear mapa de inventarios recibidos
  FOR store_inventory IN SELECT * FROM jsonb_array_elements(p_store_inventories) LOOP
    v_store_map := v_store_map || jsonb_build_object(
      (store_inventory->>'store_id'), 
      jsonb_build_object(
        'qty', COALESCE((store_inventory->>'qty')::integer, 0),
        'min_qty', COALESCE((store_inventory->>'min_qty')::integer, 5)
      )
    );
  END LOOP;
  
  -- Crear producto
  INSERT INTO products (...) RETURNING id INTO v_product_id;
  
  -- Crear inventarios para TODAS las tiendas (garantizar integridad)
  FOR v_store_record IN 
    SELECT id FROM stores 
    WHERE company_id = user_company_id AND active = true
  LOOP
    INSERT INTO inventories (company_id, store_id, product_id, qty, min_qty)
    VALUES (
      user_company_id,
      v_store_record.id,
      v_product_id,
      COALESCE((v_store_map->v_store_record.id::text->>'qty')::integer, 0),  -- Usar valor del array si existe
      COALESCE((v_store_map->v_store_record.id::text->>'min_qty')::integer, 5)
    );
  END LOOP;
  
  RETURN json_build_object('success', true, 'product_id', v_product_id);
END;
$$;
```

**Lógica:**
- ✅ Crea inventario para TODAS las tiendas (garantiza integridad)
- ✅ Usa valores del array si existen (respeta stock inicial del Admin)
- ✅ Usa valores por defecto (0, 5) si la tienda no está en el array

**VEREDICTO:** 🟡 **OPCIÓN HÍBRIDA RECOMENDADA**. Garantiza integridad pero respeta stock inicial.

---

### 5. 🔴 EL SCRIPT DE SANACIÓN (DATA FIX)

#### **Escenario de Estrés:**
- Producto "iPhone 15" existe desde hace 3 meses
- Tuvo 5 ventas registradas en `sales` (5 unidades vendidas)
- Pero NO tiene registro en `inventories` (producto fantasma)
- Script de sanación crea inventario con `qty = 0`
- **Resultado:** Stock real = -5, pero sistema muestra 0 → **INCONSISTENCIA GRAVE**

#### **Análisis Técnico:**

**❌ PROBLEMA:**
Si creamos inventario con `qty = 0` sin considerar ventas previas, el stock será incorrecto.

**✅ SOLUCIÓN: Calcular Stock Teórico**

```sql
-- Función para calcular stock teórico basado en historial
CREATE OR REPLACE FUNCTION calculate_theoretical_stock(
  p_company_id uuid,
  p_store_id uuid,
  p_product_id uuid
) RETURNS INTEGER AS $$
DECLARE
  v_initial_stock INTEGER := 0;  -- Desconocido, asumimos 0
  v_sales_out INTEGER := 0;
  v_transfers_in INTEGER := 0;
  v_transfers_out INTEGER := 0;
  v_adjustments INTEGER := 0;
  v_theoretical_stock INTEGER;
BEGIN
  -- Sumar ventas (salidas)
  SELECT COALESCE(SUM(si.qty), 0) INTO v_sales_out
  FROM sale_items si
  INNER JOIN sales s ON s.id = si.sale_id
  WHERE s.company_id = p_company_id
    AND s.store_id = p_store_id
    AND si.product_id = p_product_id;
  
  -- Sumar transferencias entrantes
  SELECT COALESCE(SUM(qty), 0) INTO v_transfers_in
  FROM inventory_movements
  WHERE company_id = p_company_id
    AND store_to_id = p_store_id
    AND product_id = p_product_id
    AND type = 'TRANSFER';
  
  -- Sumar transferencias salientes
  SELECT COALESCE(SUM(qty), 0) INTO v_transfers_out
  FROM inventory_movements
  WHERE company_id = p_company_id
    AND store_from_id = p_store_id
    AND product_id = p_product_id
    AND type = 'TRANSFER';
  
  -- Sumar ajustes
  SELECT COALESCE(SUM(
    CASE WHEN type = 'IN' THEN qty ELSE -qty END
  ), 0) INTO v_adjustments
  FROM inventory_movements
  WHERE company_id = p_company_id
    AND (store_from_id = p_store_id OR store_to_id = p_store_id)
    AND product_id = p_product_id
    AND type IN ('ADJUST', 'IN');
  
  -- Calcular stock teórico
  -- Stock = Inicial + Transferencias In - Transferencias Out - Ventas + Ajustes
  v_theoretical_stock := v_initial_stock + v_transfers_in - v_transfers_out - v_sales_out + v_adjustments;
  
  RETURN GREATEST(v_theoretical_stock, 0);  -- No permitir negativo en creación
END;
$$ LANGUAGE plpgsql;
```

#### **RECOMENDACIÓN ARQUITECTÓNICA:**

```sql
-- Script de sanación con cálculo de stock teórico
CREATE OR REPLACE FUNCTION heal_orphan_products()
RETURNS TABLE(
  product_id uuid,
  store_id uuid,
  calculated_stock integer,
  created boolean
) AS $$
DECLARE
  v_orphan RECORD;
  v_theoretical_stock INTEGER;
BEGIN
  -- Encontrar productos sin inventario
  FOR v_orphan IN
    SELECT DISTINCT p.id as product_id, s.id as store_id, p.company_id
    FROM products p
    CROSS JOIN stores s
    WHERE s.company_id = p.company_id
      AND s.active = true
      AND p.active = true
      AND NOT EXISTS (
        SELECT 1 FROM inventories i
        WHERE i.product_id = p.id
          AND i.store_id = s.id
          AND i.company_id = p.company_id
      )
  LOOP
    -- Calcular stock teórico
    v_theoretical_stock := calculate_theoretical_stock(
      v_orphan.company_id,
      v_orphan.store_id,
      v_orphan.product_id
    );
    
    -- Crear inventario con stock teórico
    INSERT INTO inventories (company_id, store_id, product_id, qty, min_qty)
    VALUES (v_orphan.company_id, v_orphan.store_id, v_orphan.product_id, v_theoretical_stock, 5)
    ON CONFLICT (company_id, store_id, product_id) DO NOTHING;
    
    -- Retornar resultado
    product_id := v_orphan.product_id;
    store_id := v_orphan.store_id;
    calculated_stock := v_theoretical_stock;
    created := true;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**⚠️ ADVERTENCIA:**
- Si el stock teórico es negativo, lo ponemos en 0 (no podemos saber el stock inicial real)
- **Recomendación:** Notificar al Admin para que haga ajuste manual

**VEREDICTO:** 🔴 **REQUIERE LÓGICA DE CÁLCULO**. No podemos poner 0 ciego, debemos calcular stock teórico.

---

### 6. 🟡 DIAGNÓSTICO DE "VALORES FANTASMA" EN STOCK

#### **Pregunta:**
¿Cómo validar que `inventories.qty` = suma de `inventory_movements`?

#### **Análisis Técnico:**

**OPCIÓN A: CONSTRAINT CHECK (Complejo y costoso)**
```sql
-- Constraint que valida en cada INSERT/UPDATE
ALTER TABLE inventories
ADD CONSTRAINT check_stock_matches_movements
CHECK (
  qty = (
    SELECT COALESCE(SUM(
      CASE 
        WHEN type = 'IN' OR type = 'ADJUST' THEN qty
        WHEN type = 'OUT' THEN -qty
        WHEN type = 'TRANSFER' AND store_to_id = inventories.store_id THEN qty
        WHEN type = 'TRANSFER' AND store_from_id = inventories.store_id THEN -qty
        ELSE 0
      END
    ), 0)
    FROM inventory_movements
    WHERE product_id = inventories.product_id
      AND (store_from_id = inventories.store_id OR store_to_id = inventories.store_id)
  )
);
```

**Problemas:**
- ❌ Muy costoso (subquery en cada INSERT/UPDATE)
- ❌ Puede causar deadlocks
- ❌ No funciona bien con transacciones concurrentes

**OPCIÓN B: Función de Validación (Recomendada)**
```sql
-- Función que valida pero no bloquea
CREATE OR REPLACE FUNCTION validate_inventory_integrity(
  p_company_id uuid,
  p_store_id uuid,
  p_product_id uuid
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
  v_calculated_stock INTEGER;
BEGIN
  -- Stock actual
  SELECT qty INTO v_current_stock
  FROM inventories
  WHERE company_id = p_company_id
    AND store_id = p_store_id
    AND product_id = p_product_id;
  
  -- Stock calculado desde movimientos
  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'IN' OR type = 'ADJUST' THEN qty
      WHEN type = 'OUT' THEN -qty
      WHEN type = 'TRANSFER' AND store_to_id = p_store_id THEN qty
      WHEN type = 'TRANSFER' AND store_from_id = p_store_id THEN -qty
      ELSE 0
    END
  ), 0) INTO v_calculated_stock
  FROM inventory_movements
  WHERE company_id = p_company_id
    AND product_id = p_product_id
    AND (store_from_id = p_store_id OR store_to_id = p_store_id);
  
  RETURN v_current_stock = v_calculated_stock;
END;
$$ LANGUAGE plpgsql;
```

**Uso:**
- Ejecutar periódicamente (cron job)
- Validar antes de operaciones críticas
- No bloquea transacciones normales

#### **RECOMENDACIÓN ARQUITECTÓNICA:**

**NO usar CONSTRAINT**, mejor:
1. Validación en función de creación (post-inserción)
2. Job periódico de auditoría
3. Trigger de logging (no bloqueante)

**VEREDICTO:** 🟡 **OPCIONAL**. Constraint es costoso, mejor validación periódica.

---

### 7. 🟢 BLINDAJE DEL PROCESO DE REGISTRO

#### **Pregunta:**
¿Conteo de seguridad post-transacción es la mejor manera?

#### **Análisis Técnico:**

**✅ SÍ, ES UNA BUENA PRÁCTICA**, pero con mejoras:

**Código propuesto (mejorado):**
```sql
CREATE OR REPLACE FUNCTION create_product_v3(...)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id uuid;
  v_expected_inventories INTEGER;
  v_actual_inventories INTEGER;
  v_expected_movements INTEGER;
  v_actual_movements INTEGER;
BEGIN
  -- Contar tiendas activas ANTES de crear producto
  SELECT COUNT(*) INTO v_expected_inventories
  FROM stores
  WHERE company_id = user_company_id AND active = true;
  
  -- Crear producto
  INSERT INTO products (...) RETURNING id INTO v_product_id;
  
  -- Crear inventarios (lógica de creación)
  ...
  
  -- VALIDACIÓN POST-INSERCIÓN (antes de COMMIT implícito)
  SELECT COUNT(*) INTO v_actual_inventories
  FROM inventories
  WHERE product_id = v_product_id AND company_id = user_company_id;
  
  IF v_actual_inventories != v_expected_inventories THEN
    RAISE EXCEPTION 'Inconsistencia detectada: Se esperaban % inventarios, se crearon %', 
        v_expected_inventories, v_actual_inventories;
    -- PostgreSQL hará ROLLBACK automático
  END IF;
  
  -- Validar movimientos (si los creamos)
  IF v_expected_movements > 0 THEN
    SELECT COUNT(*) INTO v_actual_movements
    FROM inventory_movements
    WHERE product_id = v_product_id AND company_id = user_company_id;
    
    IF v_actual_movements != v_expected_movements THEN
      RAISE EXCEPTION 'Inconsistencia detectada: Se esperaban % movimientos, se crearon %', 
          v_expected_movements, v_actual_movements;
    END IF;
  END IF;
  
  RETURN json_build_object('success', true, 'product_id', v_product_id);
END;
$$;
```

**Mejoras:**
1. ✅ Contar ANTES de crear (más eficiente)
2. ✅ Validar DESPUÉS de crear (garantiza integridad)
3. ✅ RAISE EXCEPTION si falla (ROLLBACK automático)
4. ✅ No capturar excepciones (dejar que PostgreSQL maneje)

#### **RECOMENDACIÓN ARQUITECTÓNICA:**

**✅ APROBADA** con las mejoras mencionadas.

**VEREDICTO:** 🟢 **APROBADA**. Conteo de seguridad es correcto, con mejoras sugeridas.

---

## 🎯 CONCLUSIONES Y PLAN DE ACCIÓN

### **RIESGOS CRÍTICOS QUE REQUIEREN CORRECCIÓN INMEDIATA:**

1. 🔴 **Race condition en `process_sale`** → Agregar `FOR UPDATE` o validación en `WHERE`
2. 🔴 **Sanación de productos con ventas previas** → Calcular stock teórico antes de crear inventario

### **RIESGOS ALTOS QUE REQUIEREN MEJORA:**

3. 🟡 **Atomicidad de movimientos** → No capturar excepciones críticas, validar post-inserción
4. 🟡 **Parámetros incompletos** → Opción híbrida: crear para todas las tiendas pero usar valores del array

### **RIESGOS MEDIOS (MITIGABLES):**

5. 🟡 **Timeout en trigger** → Procesamiento por batches si > 5K productos
6. 🟡 **Validación matemática** → Función de validación periódica (no constraint)

### **APROBADO:**

7. 🟢 **Conteo de seguridad** → Implementar con mejoras sugeridas

---

## 📝 PRÓXIMOS PASOS

1. **Implementar correcciones críticas** (puntos 1 y 2)
2. **Implementar mejoras altas** (puntos 3 y 4)
3. **Implementar mitigaciones medias** (puntos 5 y 6)
4. **Implementar conteo de seguridad** (punto 7)
5. **Testing de estrés** con datos reales

**¿Procedemos con la implementación?**





