# 🚀 GUÍA PASO A PASO: Aplicar Migración de Corrección de Race Condition

## ⚠️ IMPORTANTE: Esta migración corrige el error de Split-Brain sin afectar funcionalidades existentes

**Archivo de migración:** `supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql`

---

## 📋 PREPARACIÓN (5 minutos)

### Paso 1: Verificar que tienes acceso a Supabase

1. Abre tu navegador
2. Ve a: `https://supabase.com/dashboard`
3. Inicia sesión con tu cuenta
4. Selecciona tu proyecto

### Paso 2: Hacer backup (opcional pero recomendado)

Si tienes acceso a la base de datos, puedes hacer un backup antes:

```sql
-- En Supabase SQL Editor, ejecuta:
SELECT * FROM sales ORDER BY created_at DESC LIMIT 10;
-- Verifica que las últimas ventas estén ahí
```

---

## 🎯 OPCIÓN 1: Aplicar mediante Supabase Dashboard (MÁS FÁCIL)

### Paso 1: Abrir SQL Editor

1. En el Dashboard de Supabase, ve a **SQL Editor** (menú lateral izquierdo)
2. Haz clic en **New Query** (botón verde)

### Paso 2: Copiar el código de migración

1. Abre el archivo: `supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql`
2. Selecciona **TODO el contenido** (Ctrl+A)
3. Copia (Ctrl+C)

### Paso 3: Pegar y ejecutar

1. Pega el código en el SQL Editor de Supabase (Ctrl+V)
2. Verifica que el código completo esté pegado (debe tener ~400 líneas)
3. Haz clic en **Run** (botón azul) o presiona `Ctrl+Enter`

### Paso 4: Verificar ejecución exitosa

Deberías ver en la consola:
```
✅ Migración de corrección crítica de race condition completada
   - 🔒 TIMEOUT DE BLOQUEO: lock_timeout = 4000ms...
   - 🔒 BLOQUEO PESIMISTA: SELECT FOR UPDATE...
   ...
```

**Si ves errores:**
- Copia el mensaje de error completo
- Verifica que copiaste TODO el código
- Intenta ejecutar de nuevo

---

## 🎯 OPCIÓN 2: Aplicar mediante Supabase CLI (AUTOMÁTICO)

### Paso 1: Instalar Supabase CLI (solo primera vez)

```bash
npm install -g supabase
```

### Paso 2: Login en Supabase (solo primera vez)

```bash
npx supabase login
```

### Paso 3: Conectar tu proyecto

```bash
# Reemplaza con tu project-ref (lo encuentras en Supabase Dashboard > Settings > General)
npx supabase link --project-ref tu-project-ref-aqui
```

### Paso 4: Aplicar la migración

```bash
# Aplicar todas las migraciones pendientes
npx supabase db push

# O aplicar solo esta migración específica
npx supabase migration up
```

---

## ✅ VERIFICACIÓN POST-MIGRACIÓN (CRÍTICO)

### Test 1: Verificar que la función existe

En Supabase SQL Editor, ejecuta:

```sql
-- Verificar que la función existe y tiene los parámetros correctos
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'process_sale';
```

**Resultado esperado:** Debe mostrar la función `process_sale` con todos sus parámetros.

---

### Test 2: Probar una venta pequeña (TEST EN AMBIENTE DE PRUEBA)

1. **Abre la aplicación en el navegador**
2. **Ve al módulo POS**
3. **Agrega 1 producto al carrito** (producto con stock disponible)
4. **Procesa la venta**
5. **Verifica:**
   - ✅ La venta se procesa correctamente
   - ✅ El stock se descuenta correctamente
   - ✅ Los valores totales son correctos
   - ✅ Se genera el número de factura

---

### Test 3: Verificar descuento de stock

En Supabase SQL Editor, ejecuta:

```sql
-- Antes de la venta, anota el stock
SELECT product_id, qty 
FROM inventories 
WHERE product_id = 'ID_DEL_PRODUCTO_QUE_VAS_A_VENDER'
  AND store_id = 'ID_DE_TU_TIENDA';

-- Después de procesar la venta, verifica que se descontó
SELECT product_id, qty 
FROM inventories 
WHERE product_id = 'ID_DEL_PRODUCTO_QUE_VENDISTE'
  AND store_id = 'ID_DE_TU_TIENDA';
```

**Resultado esperado:** El stock debe haber disminuido en la cantidad vendida.

---

### Test 4: Verificar valores totales

Después de procesar una venta, verifica en la base de datos:

```sql
-- Verificar que los valores se guardaron correctamente
SELECT 
    invoice_number,
    subtotal_usd,
    total_usd,
    total_bs,
    created_at
FROM sales 
ORDER BY created_at DESC 
LIMIT 1;
```

**Resultado esperado:** Los valores deben coincidir con lo que se mostró en el frontend.

---

### Test 5: Verificar reversión de stock (eliminar venta)

1. **En el panel de ventas, encuentra la venta que acabas de crear**
2. **Haz clic en "Eliminar" o "Borrar"**
3. **Confirma la eliminación**
4. **Verifica:**
   - ✅ La venta se elimina
   - ✅ El stock se restaura (vuelve al valor original)
   - ✅ No hay errores en consola

---

## 🔍 VERIFICACIÓN DE QUE EL ERROR SE CORRIGIÓ

### Test de Race Condition (Opcional - Solo si tienes acceso a múltiples usuarios)

1. **Abre la aplicación en 2 navegadores diferentes** (o 2 pestañas en modo incógnito)
2. **Inicia sesión con 2 usuarios diferentes** (o el mismo usuario en ambas)
3. **Ambos usuarios agregan el mismo producto al carrito**
4. **Ambos intentan procesar la venta al mismo tiempo**
5. **Resultado esperado:**
   - ✅ Una venta se procesa exitosamente
   - ✅ La otra venta muestra error "Stock insuficiente" (si el stock no alcanza para ambas)
   - ✅ **NO debe haber stock negativo** (esto era el bug que se corrigió)

---

## 🚨 SI ALGO SALE MAL

### Error: "function already exists"

**Solución:** Esto es normal. La función se reemplaza automáticamente. Continúa.

### Error: "syntax error" o "unexpected token"

**Solución:**
1. Verifica que copiaste TODO el código
2. Asegúrate de que no haya caracteres extraños
3. Intenta ejecutar de nuevo

### Error: "permission denied"

**Solución:**
1. Verifica que estás usando una cuenta con permisos de administrador
2. O solicita a alguien con permisos que ejecute la migración

### Las ventas no funcionan después de la migración

**Solución de emergencia (ROLLBACK):**

```sql
-- ⚠️ SOLO SI ES ABSOLUTAMENTE NECESARIO
-- Esto revierte la función a una versión anterior
-- Contacta al equipo antes de hacer esto

-- Primero, busca la migración anterior de process_sale
-- Luego ejecuta ese código para restaurar
```

---

## ✅ CHECKLIST FINAL

Antes de considerar la migración completa, verifica:

- [ ] La migración se ejecutó sin errores
- [ ] La función `process_sale` existe en la base de datos
- [ ] Puedes procesar una venta nueva
- [ ] El stock se descuenta correctamente
- [ ] Los valores totales son correctos
- [ ] Puedes eliminar una venta
- [ ] El stock se restaura al eliminar una venta
- [ ] No hay errores en la consola del navegador

---

## 📞 SOPORTE

Si encuentras algún problema:

1. **Copia el mensaje de error completo**
2. **Toma captura de pantalla de la consola del navegador**
3. **Anota qué estabas haciendo cuando ocurrió el error**
4. **Contacta al equipo de desarrollo**

---

## 🎉 ÉXITO

Si todos los tests pasan, **¡la migración fue exitosa!**

El error de Split-Brain (stock negativo) está corregido y todas las funcionalidades siguen trabajando correctamente.




