# INSTRUCCIONES PARA CORREGIR EL PROCESO DE VENTAS

## PASO 1: Ejecutar el SQL en Supabase

1. Ve al **SQL Editor** de Supabase Dashboard
2. Copia y pega el contenido completo del archivo `NEW_SIMPLE_PROCESS_SALE.sql`
3. Ejecuta el script
4. Verifica que no haya errores

## PASO 2: Probar la funcionalidad

### Prueba 1: Pago Único
1. Agrega productos al carrito
2. Selecciona un método de pago (ej: Efectivo USD)
3. Haz clic en "Procesar Venta"
4. Debería funcionar sin errores

### Prueba 2: Pagos Mixtos
1. Agrega productos al carrito
2. Activa "Pagos Mixtos"
3. Selecciona múltiples métodos de pago
4. Asigna montos a cada método (debe sumar el total)
5. Haz clic en "Procesar Venta"
6. Debería funcionar sin errores

## CAMBIOS REALIZADOS

### Backend (SQL):
- ✅ Eliminé todas las versiones anteriores de la función `process_sale`
- ✅ Creé una nueva función simplificada y robusta
- ✅ Corregí el manejo de strings vacíos usando `NULLIF()` y `COALESCE()`
- ✅ Mejoré la validación de parámetros

### Frontend (TypeScript):
- ✅ Simplifiqué la función `processSale()`
- ✅ Mejoré las validaciones antes de enviar datos
- ✅ Corregí la lógica de pagos mixtos
- ✅ Agregué validación para montos en pagos mixtos

## CORRECCIONES CLAVE

### 1. Manejo de Strings Vacíos:
```sql
-- ANTES (causaba error):
v_qty := COALESCE((v_item->>'qty')::integer, 0)

-- DESPUÉS (corregido):
v_qty := CASE 
  WHEN (v_item->>'qty') IS NULL OR (v_item->>'qty') = '' OR (v_item->>'qty') = 'null' THEN 0
  ELSE COALESCE(NULLIF(v_item->>'qty', '')::integer, 0)
END;
```

### 2. Validaciones Mejoradas:
- ✅ Validación de carrito vacío
- ✅ Validación de método de pago
- ✅ Validación de pagos mixtos
- ✅ Validación de stock
- ✅ Validación de totales

### 3. Lógica de Pagos Mixtos:
- ✅ Validación de que los montos sumen el total
- ✅ Validación de que no haya montos vacíos o cero
- ✅ Mejor manejo de errores

## SOLUCIÓN AL ERROR ORIGINAL

El error `invalid input syntax for type integer: ""` se debía a que:
1. El frontend enviaba strings vacíos en algunos campos
2. El procedimiento almacenado intentaba convertir strings vacíos a enteros directamente
3. PostgreSQL fallaba al intentar convertir `""` a `integer`

**Solución**: Usar `NULLIF()` para convertir strings vacíos a `NULL` antes de la conversión a entero.

## PRUEBAS RECOMENDADAS

1. **Pago único con efectivo USD**
2. **Pago único con Zelle**
3. **Pago único con Binance**
4. **Pagos mixtos: Efectivo USD + Zelle**
5. **Pagos mixtos: Binance + Pago Móvil**
6. **Venta con Krece habilitado**

## SI SIGUEN LOS ERRORES

Si después de aplicar estos cambios sigues teniendo problemas:

1. **Verifica que el SQL se ejecutó correctamente** en Supabase
2. **Limpia el caché del navegador** (Ctrl+F5)
3. **Revisa la consola del navegador** para errores específicos
4. **Verifica que no haya múltiples versiones** de la función en Supabase

## CONTACTO

Si necesitas ayuda adicional, proporciona:
- El error exacto que aparece
- Los pasos que seguiste
- Una captura de pantalla del error


