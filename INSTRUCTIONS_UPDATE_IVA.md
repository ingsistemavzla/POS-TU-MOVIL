# Instrucciones para Actualizar el IVA en Supabase

## Problema Actual
El IVA está hardcodeado como 16% en la función `process_sale` de Supabase, pero el frontend está configurado para usar 0% por defecto.

## Solución

### 1. Ejecutar la Nueva Migración
Necesitas ejecutar la migración `20250827043000_update_process_sale_tax_rate.sql` en tu base de datos de Supabase.

**Pasos:**
1. Ve al Dashboard de Supabase
2. Navega a "SQL Editor"
3. Copia y pega el contenido del archivo `supabase/migrations/20250827043000_update_process_sale_tax_rate.sql`
4. Ejecuta la consulta

### 2. Verificar la Función
Después de ejecutar la migración, la función `process_sale` debería:
- Aceptar un nuevo parámetro `p_tax_rate` (opcional, por defecto 0)
- Usar el IVA dinámico en lugar del hardcodeado 16%
- Calcular correctamente el IVA basado en el parámetro recibido

### 3. Activar el Parámetro en el Frontend
Una vez que la migración esté ejecutada, descomenta esta línea en `src/pages/POS.tsx`:

```typescript
p_tax_rate: getTaxRate() // Pass the current tax rate
```

### 4. Resultado Esperado
- El IVA será 0% por defecto
- El modal de venta completada mostrará 0% de IVA
- Los cálculos serán consistentes entre frontend y backend
- Se podrá cambiar el IVA desde la página de configuración

## Verificación
Para verificar que todo funciona:
1. Ve al POS
2. Agrega productos al carrito
3. Completa una venta
4. Verifica que el modal muestre 0% de IVA
5. Cambia el IVA en configuración y verifica que se actualice
