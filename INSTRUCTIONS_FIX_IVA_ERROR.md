# Instrucciones para Corregir el Error del IVA

## Error Actual
```
Error al procesar la venta: column "subtotal_bs" of relation "sale_items" does not exist
```

## Causa del Error
La función `process_sale` actualizada está intentando insertar en columnas que no existen en la tabla `sale_items`.

## Solución

### 1. Ejecutar la Nueva Migración de Limpieza
Necesitas ejecutar la nueva migración `20250827190000_fix_process_sale_function.sql` que eliminará todas las versiones conflictivas de la función.

**Pasos:**
1. Ve al Dashboard de Supabase
2. Navega a "SQL Editor"
3. Copia y pega el contenido del archivo `supabase/migrations/20250827190000_fix_process_sale_function.sql`
4. Ejecuta la consulta

**IMPORTANTE:** Esta migración primero elimina TODAS las versiones existentes de `process_sale` para evitar conflictos, luego crea la versión correcta.

### 2. Cambios Realizados en la Nueva Migración
- ✅ **Eliminación de conflictos**: Primero elimina TODAS las versiones existentes de `process_sale`
- ✅ **Función única**: Crea solo UNA versión correcta de la función
- ✅ **Columnas correctas**: Solo usa columnas que existen en `sale_items`
- ✅ **IVA dinámico**: Usa el parámetro `p_tax_rate` (por defecto 0%)
- ✅ **Sin ambigüedades**: No hay múltiples versiones que causen conflictos

### 3. Verificar la Función
Después de ejecutar la migración corregida, la función `process_sale` debería:
- ✅ Aceptar el parámetro `p_tax_rate` (opcional, por defecto 0)
- ✅ Usar el IVA dinámico en lugar del hardcodeado 16%
- ✅ Insertar solo en columnas que existen
- ✅ No generar errores de columnas inexistentes

### 4. Resultado Esperado
- ✅ El IVA será 0% por defecto
- ✅ Las ventas se procesarán sin errores
- ✅ El modal de venta completada mostrará 0% de IVA
- ✅ Los cálculos serán consistentes entre frontend y backend

## Verificación
Para verificar que todo funciona:
1. Ve al POS
2. Agrega productos al carrito
3. Completa una venta
4. Verifica que no hay errores
5. Verifica que el modal muestra 0% de IVA
