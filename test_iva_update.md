# Prueba de Actualización de IVA

## Problema
El IVA no se refleja en el POS cuando se cambia en la configuración del sistema.

## Solución Implementada

### 1. Hook useSystemSettings Mejorado
- Se agregó un log para debuggear el IVA actual
- Se mejoró la función `updateSettings` para forzar una actualización
- Se agregó un `setTimeout` para asegurar que los datos se refresquen

### 2. Página de Configuración Mejorada
- Se agregó una llamada a `fetchSettings()` después de guardar
- Se mejoró el mensaje de confirmación

### 3. Componente POS Mejorado
- Se agregó un efecto para detectar cambios en el IVA
- Se agregó el objeto `settings` al hook para detectar cambios

### 4. Migración de Base de Datos
- Se habilitó real-time para la tabla `system_settings`
- Se creó un trigger para notificar cambios
- Se agregaron los permisos necesarios

## Pasos para Probar

1. **Abrir el POS** y agregar algunos productos al carrito
2. **Verificar el IVA actual** en la consola del navegador (debe mostrar 16% por defecto)
3. **Ir a Configuración** y cambiar el IVA a un valor diferente (ej: 20%)
4. **Guardar la configuración**
5. **Volver al POS** y verificar que el IVA se haya actualizado
6. **Verificar en la consola** que el log muestre el nuevo valor del IVA

## Logs de Debug

Los siguientes logs deberían aparecer en la consola:

```
Current tax rate from settings: 16
SaleCompletionModal - Current tax rate: 16
```

Después del cambio:
```
Current tax rate from settings: 20
SaleCompletionModal - Current tax rate: 20
```

## Archivos Modificados

1. `src/hooks/useSystemSettings.ts` - Hook mejorado
2. `src/pages/SettingsPage.tsx` - Página de configuración
3. `src/pages/POS.tsx` - Componente POS
4. `src/components/pos/SaleCompletionModal.tsx` - Modal de venta
5. `supabase/migrations/20250101000009_fix_system_settings_realtime.sql` - Migración

## Notas Importantes

- El IVA se actualiza inmediatamente después de guardar la configuración
- Los cambios se reflejan en todos los componentes que usan `getTaxRate()`
- Se mantiene un log para debuggear y verificar que los cambios funcionan
- La migración debe ejecutarse en la base de datos para habilitar real-time



