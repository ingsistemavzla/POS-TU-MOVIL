# 🔍 AUDITORÍA: Flujo de Creación de Productos y Gestión de Stock

**Fecha:** 2025-01-28  
**Auditor:** Senior Backend Developer & Database Architect  
**Objetivo:** Identificar brechas en el flujo de creación de productos y gestión de inventario

---

## 📋 RESUMEN EJECUTIVO

### ✅ **FORTALEZAS IDENTIFICADAS:**
1. ✅ Validación de duplicados a nivel de BD (constraints UNIQUE)
2. ✅ Función RPC transaccional para creación de productos
3. ✅ Stock inicial configurable por tienda al crear producto
4. ✅ Validación de stock en `process_sale` antes de vender

### ⚠️ **BRECHAS CRÍTICAS IDENTIFICADAS:**
1. ❌ **BRECHA #1:** El frontend llama a `create_product_v3` pero la BD tiene `create_product_with_inventory`
2. ❌ **BRECHA #2:** Si se crea una nueva tienda DESPUÉS de crear productos, NO se crean inventarios automáticamente
3. ❌ **BRECHA #3:** `process_sale` falla si no existe registro en `inventories` (NULL = 0, pero UPDATE falla si no existe fila)
4. ⚠️ **BRECHA #4:** No hay validación explícita de duplicados en el frontend antes de llamar al RPC

---

## 🔬 ANÁLISIS DETALLADO

### 1. FLUJO ACTUAL DE CREACIÓN DE PRODUCTOS

#### **Frontend (`src/components/pos/ProductForm.tsx`):**

```typescript
// Línea 247: El frontend llama a 'create_product_v3'
const { data: result, error } = await (supabase as any).rpc('create_product_v3', {
  p_sku: formData.sku.trim(),
  p_barcode: formData.barcode.trim() || null,
  p_name: formData.name.trim(),
  p_category: formData.category.trim() || null,
  p_cost_usd: formData.cost_usd,
  p_sale_price_usd: formData.sale_price_usd,
  p_store_inventories: storeInventories.map(inv => ({
    store_id: inv.store_id,
    qty: inv.qty
  })),
});
```

**Observaciones:**
- ✅ El formulario inicializa inventarios para TODAS las tiendas existentes con `qty: 0` (líneas 106-109)
- ✅ El Admin puede definir stock inicial por tienda antes de crear el producto
- ⚠️ El frontend llama a `create_product_v3` pero la función en BD es `create_product_with_inventory`

#### **Backend (`supabase/migrations/20250826180000_enhance_products_inventory.sql`):**

```sql
-- Línea 81: La función real se llama 'create_product_with_inventory'
CREATE OR REPLACE FUNCTION create_product_with_inventory(
  p_sku text,
  p_barcode text,
  p_name text,
  p_category text,
  p_cost_usd decimal,
  p_sale_price_usd decimal,
  p_tax_rate decimal DEFAULT 16.00,
  p_store_inventories jsonb DEFAULT '[]'::jsonb
)
```

**Flujo de la función:**
1. ✅ Valida que el usuario sea admin
2. ✅ Crea el producto en `products` table
3. ✅ Itera sobre `p_store_inventories` (JSONB array)
4. ✅ Crea registros en `inventories` SOLO para las tiendas especificadas en el array
5. ⚠️ **NO crea inventarios para tiendas que NO están en el array**

---

### 2. PREGUNTA CLAVE #1: ¿Qué pasa con `inventories` al crear un producto?

#### **Respuesta:**

**✅ SÍ, se crean registros en `inventories`, PERO con limitaciones:**

1. **Solo para tiendas especificadas:** La función `create_product_with_inventory` crea inventarios SOLO para las tiendas que el Admin incluye en `p_store_inventories`.

2. **Inicialización en Frontend:** El formulario (`ProductForm.tsx` líneas 106-109) inicializa inventarios para TODAS las tiendas existentes:
   ```typescript
   setStoreInventories(stores.map(store => ({
     store_id: store.id,
     qty: 0,
   })));
   ```
   Esto significa que si hay 3 tiendas, el Admin verá 3 campos de stock (todos en 0 por defecto).

3. **Problema potencial:** Si el Admin modifica el array `storeInventories` antes de enviar (por ejemplo, elimina una tienda), esa tienda NO tendrá inventario.

#### **❌ BRECHA CRÍTICA #2: Nueva tienda creada después de productos existentes**

**Escenario problemático:**
1. Admin crea Producto A cuando existen 2 tiendas (Tienda 1, Tienda 2)
2. Se crean inventarios para Tienda 1 y Tienda 2
3. Admin crea Tienda 3
4. **Producto A NO tiene inventario en Tienda 3**
5. Si un cajero intenta vender Producto A en Tienda 3 → **ERROR**

**Evidencia:**
- No hay trigger o función que cree inventarios automáticamente cuando se crea una nueva tienda
- La función `create_default_store` (línea 2 de `20250826171000_add_store_creation_function.sql`) NO crea inventarios para productos existentes

---

### 3. PREGUNTA CLAVE #2: Validación de Datos

#### **A) Validación de Duplicados:**

**✅ A nivel de Base de Datos:**
```sql
-- Líneas 62-63 de 20250822150200_306f5474-1a01-445e-bba2-bb270dd1f89a.sql
UNIQUE(company_id, sku),
UNIQUE(company_id, barcode)
```

**✅ Comportamiento:**
- Si se intenta crear un producto con SKU duplicado → PostgreSQL lanza error `23505` (unique_violation)
- El frontend captura el error y muestra mensaje descriptivo (líneas 266-267 de `ProductForm.tsx`)

**⚠️ Limitación:**
- No hay validación en el frontend ANTES de llamar al RPC
- El usuario solo se entera del duplicado después de enviar el formulario

#### **B) Stock Inicial:**

**✅ SÍ, el Admin puede definir stock inicial:**
- El formulario muestra un campo de cantidad por cada tienda
- El Admin puede establecer `qty > 0` para cualquier tienda antes de crear el producto
- El stock inicial se envía en `p_store_inventories` al RPC

**✅ Es un solo paso:** Crear producto + definir stock inicial ocurre en la misma transacción

---

### 4. ANÁLISIS DE `process_sale` Y BRECHA #3

#### **Código relevante (`20250115000001_add_inventory_movements_to_process_sale.sql` líneas 175-185):**

```sql
-- Verificar stock disponible
SELECT qty INTO v_current_stock
FROM inventories 
WHERE company_id = p_company_id 
  AND store_id = p_store_id 
  AND product_id = v_product_id;

IF COALESCE(v_current_stock, 0) < v_qty THEN
    RAISE EXCEPTION 'Stock insuficiente...';
END IF;

-- Actualizar inventario
UPDATE inventories 
SET qty = qty - v_qty, updated_at = NOW()
WHERE company_id = p_company_id 
  AND store_id = p_store_id 
  AND product_id = v_product_id;
```

#### **❌ BRECHA CRÍTICA #3: UPDATE falla si no existe fila**

**Problema:**
- Si `SELECT qty` no encuentra fila → `v_current_stock = NULL`
- `COALESCE(v_current_stock, 0)` convierte NULL a 0 → validación pasa si `v_qty = 0`
- Pero `UPDATE` NO crea filas, solo actualiza existentes
- Si no existe fila en `inventories` → `UPDATE` afecta 0 filas → **NO hay error, pero tampoco se descuenta stock**

**Escenario de fallo:**
1. Producto existe pero NO tiene inventario en Tienda X
2. Cajero intenta vender 1 unidad en Tienda X
3. `SELECT qty` → NULL → `COALESCE(NULL, 0) = 0`
4. Validación: `0 < 1` → ✅ Pasa (porque `COALESCE` convierte NULL a 0)
5. `UPDATE inventories` → 0 filas afectadas (no existe la fila)
6. **Venta se procesa pero stock NO se descuenta** → **INCONSISTENCIA DE DATOS**

---

## 🚨 BRECHAS IDENTIFICADAS - RESUMEN

| # | Brecha | Severidad | Impacto |
|---|--------|-----------|---------|
| 1 | Frontend llama `create_product_v3` pero BD tiene `create_product_with_inventory` | 🔴 CRÍTICA | El RPC falla, productos no se crean |
| 2 | Nueva tienda NO crea inventarios para productos existentes | 🟡 ALTA | Productos no vendibles en nueva tienda |
| 3 | `process_sale` permite ventas sin registro en `inventories` | 🔴 CRÍTICA | Inconsistencia de datos, stock no se descuenta |
| 4 | No hay validación de duplicados en frontend | 🟡 MEDIA | UX pobre, usuario solo se entera después de enviar |

---

## 🔧 RECOMENDACIONES

### **PRIORIDAD ALTA (Críticas):**

#### **1. Corregir nombre de función RPC**
- **Opción A:** Renombrar función SQL a `create_product_v3`
- **Opción B:** Cambiar frontend para usar `create_product_with_inventory`
- **Recomendación:** Opción A (mantener convención de versionado)

#### **2. Corregir `process_sale` para manejar inventarios faltantes**
```sql
-- En lugar de solo UPDATE, usar INSERT ... ON CONFLICT
INSERT INTO inventories (company_id, store_id, product_id, qty, min_qty)
VALUES (p_company_id, p_store_id, v_product_id, -v_qty, 5)
ON CONFLICT (company_id, store_id, product_id)
DO UPDATE SET qty = inventories.qty - v_qty, updated_at = NOW();
```

#### **3. Crear trigger para inicializar inventarios al crear nueva tienda**
```sql
CREATE OR REPLACE FUNCTION initialize_inventories_for_new_store()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventories (company_id, store_id, product_id, qty, min_qty)
  SELECT NEW.company_id, NEW.id, id, 0, 5
  FROM products
  WHERE company_id = NEW.company_id AND active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_store_created
AFTER INSERT ON stores
FOR EACH ROW
EXECUTE FUNCTION initialize_inventories_for_new_store();
```

### **PRIORIDAD MEDIA:**

#### **4. Agregar validación de duplicados en frontend**
- Consultar productos existentes antes de enviar formulario
- Mostrar error inmediato si SKU/barcode ya existe

#### **5. Mejorar manejo de errores en `create_product_with_inventory`**
- Validar que `p_store_inventories` incluya TODAS las tiendas activas
- O crear inventarios para todas las tiendas automáticamente (ignorar el array del frontend)

---

## ✅ CONCLUSIÓN

El sistema tiene una **base sólida** con validaciones a nivel de BD y funciones transaccionales, pero presenta **3 brechas críticas** que pueden causar:
1. Fallos en creación de productos (nombre de función incorrecto)
2. Productos no vendibles en nuevas tiendas (falta de inicialización automática)
3. Inconsistencias de datos (ventas sin descuento de stock)

**Recomendación:** Implementar las correcciones de Prioridad Alta antes de producción.





