# 📚 EXPLICACIÓN: ¿Qué es una Migración SQL y por qué aplicarla?

## 🤔 ¿QUÉ ES UNA MIGRACIÓN SQL?

### **Explicación Simple:**

Una **migración SQL** es un archivo que contiene **instrucciones para cambiar la base de datos**. 

Es como un **"script de actualización"** que modifica la base de datos (tablas, funciones, permisos, etc.) sin perder los datos existentes.

---

## 📁 ¿DÓNDE ESTÁ LA MIGRACIÓN?

**Ubicación:** `supabase/migrations/20250103000001_add_stock_validation_to_process_sale.sql`

Este archivo contiene código SQL que **actualiza la función `process_sale()`** en tu base de datos de Supabase.

---

## 🔍 ¿QUÉ HACE ESTA MIGRACIÓN ESPECÍFICAMENTE?

### **ANTES (Situación Actual):**

La función `process_sale()` en Supabase **NO valida** si hay suficiente stock antes de actualizar el inventario:

```sql
-- CÓDIGO ACTUAL (sin validación):
UPDATE inventories 
SET qty = qty - v_qty  -- ❌ Puede quedar negativo
WHERE product_id = v_product_id;
```

**Problema:** Si dos usuarios venden al mismo tiempo, el stock puede quedar negativo.

---

### **DESPUÉS (Con la Migración):**

La función `process_sale()` **SÍ valida** el stock antes de actualizar:

```sql
-- CÓDIGO MEJORADO (con validación):
-- 1. Verificar stock disponible
SELECT qty INTO v_current_stock FROM inventories WHERE ...;

-- 2. Validar que hay suficiente
IF v_current_stock < v_qty THEN
  RAISE EXCEPTION 'Stock insuficiente...';
END IF;

-- 3. Actualizar SOLO si hay suficiente stock
UPDATE inventories 
SET qty = qty - v_qty
WHERE ... AND qty >= v_qty; -- ✅ Prevenir stock negativo
```

**Solución:** Si no hay suficiente stock, **no permite** la venta y muestra un error.

---

## ⚠️ ¿QUÉ PASA SI NO APLICO LA MIGRACIÓN?

### **Consecuencias:**

1. ❌ **Stock negativo:** El inventario puede quedar con valores negativos
2. ❌ **Ventas duplicadas:** Dos usuarios pueden vender el mismo producto simultáneamente
3. ❌ **Datos incorrectos:** El inventario no reflejará la realidad
4. ❌ **Error en producción:** Cuando muchos usuarios vendan al mismo tiempo, habrá problemas

### **Ejemplo del Problema:**

```
Situación: Producto "iPhone 15" tiene 5 unidades en stock

Usuario A: Intenta vender 3 unidades ✅
Usuario B: Intenta vender 4 unidades ❌ (debería fallar)

SIN LA MIGRACIÓN:
- Usuario A: Venta exitosa → Stock queda en 2
- Usuario B: Venta exitosa → Stock queda en -2 ❌ (NEGATIVO)

CON LA MIGRACIÓN:
- Usuario A: Venta exitosa → Stock queda en 2
- Usuario B: Error "Stock insuficiente" → Stock sigue en 2 ✅
```

---

## 🚀 ¿CÓMO APLICO LA MIGRACIÓN?

### **OPCIÓN 1: Usando Supabase CLI (Recomendado)**

Si tienes Supabase CLI instalado:

```bash
# 1. Ir a la carpeta del proyecto
cd C:\Users\zonna\Downloads\todo-bcv-pos

# 2. Aplicar la migración
npx supabase db push
```

Esto ejecutará **todas las migraciones pendientes** (incluyendo la nueva).

---

### **OPCIÓN 2: Manualmente en Supabase Dashboard**

Si no tienes Supabase CLI instalado:

1. **Ir a Supabase Dashboard:**
   - Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Abrir SQL Editor:**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - Haz clic en **"New query"**

3. **Copiar y Pegar el Código:**
   - Abre el archivo: `supabase/migrations/20250103000001_add_stock_validation_to_process_sale.sql`
   - Copia **todo el contenido** del archivo
   - Pégalo en el SQL Editor de Supabase

4. **Ejecutar:**
   - Haz clic en **"Run"** o presiona `Ctrl + Enter`
   - Espera a que termine (puede tardar unos segundos)

5. **Verificar:**
   - Si ves un mensaje verde **"Success. No rows returned"**, la migración se aplicó correctamente ✅

---

### **OPCIÓN 3: Verificar si ya existe la función actualizada**

Puedes verificar si la función ya tiene la validación:

```sql
-- Ejecutar en Supabase SQL Editor:
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'process_sale' 
  AND pronamespace = 'public'::regnamespace
ORDER BY oid DESC 
LIMIT 1;
```

Busca en el resultado si contiene:
- `SELECT qty INTO v_current_stock`
- `IF v_current_stock < v_qty THEN`
- `AND qty >= v_qty`

Si **NO** aparece, necesitas aplicar la migración.

---

## ✅ VERIFICACIÓN: ¿Se aplicó correctamente?

### **Paso 1: Verificar que la función existe**

```sql
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'process_sale';
```

Debería devolver una fila con `process_sale` y `FUNCTION`.

---

### **Paso 2: Probar con una venta de prueba**

Intenta vender más productos de los que hay en stock. Debería mostrar un error:

```
Error: Stock insuficiente para el producto [Nombre] (SKU: [SKU]). Stock disponible: X, solicitado: Y
```

Si aparece este error, **la migración funcionó correctamente** ✅

---

## 📊 RESUMEN

| Pregunta | Respuesta |
|----------|-----------|
| **¿Qué es una migración SQL?** | Un archivo que actualiza la base de datos |
| **¿Dónde está?** | `supabase/migrations/20250103000001_add_stock_validation_to_process_sale.sql` |
| **¿Qué hace?** | Agrega validación de stock a la función `process_sale()` |
| **¿Por qué es importante?** | Previene stock negativo y race conditions |
| **¿Cómo aplicarla?** | Manualmente en Supabase Dashboard (Opción 2) |
| **¿Qué pasa si no la aplico?** | El inventario puede quedar con valores negativos |

---

## 🎯 CONCLUSIÓN

**DEBES APLICAR LA MIGRACIÓN** porque:

1. ✅ **Protege tus datos:** Previene stock negativo
2. ✅ **Mejora la seguridad:** Valida stock antes de vender
3. ✅ **Evita errores:** Previene problemas en alta concurrencia
4. ✅ **Corrige el problema:** Implementa la mejora que identificamos en la auditoría

**Sin la migración, los cambios en el frontend NO serán suficientes** porque la validación más importante debe estar en el backend (base de datos).

---

¿Necesitas ayuda para aplicarla? Puedo guiarte paso a paso. 🚀

