# Mantenimiento — estado actual: APAGADO

El protocolo **no afecta** login, rutas ni transacciones mientras:

```ts
// src/config/maintenance.ts
export const MAINTENANCE_PROTOCOL_ENABLED = false;
export const MAINTENANCE_FORCED_FROM_BUILD = false;
```

## Limpiar navegador (local)

En consola (F12):

```javascript
localStorage.removeItem('pos_maintenance_mode')
location.reload()
```

## Activar de nuevo

Ver **`ACTIVAR_MANTENIMIENTO.md`**.
