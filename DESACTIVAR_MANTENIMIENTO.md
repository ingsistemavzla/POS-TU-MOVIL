# Mantenimiento — estado actual: ENCENDIDO

## Apagar (restaurar login + POS)

En `src/config/maintenance.ts`:

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = false;
export const MAINTENANCE_FORCED_FROM_BUILD = false;
```

Luego commit + push. Al cargar el build nuevo:

- Se limpia `pos_maintenance_mode` del navegador
- El login vuelve a funcionar
- Las rutas del POS se montan otra vez
- No queda bloqueo residual

## Importante

Con `MAINTENANCE_FORCED_FROM_BUILD = true` **no** basta con `window.posMaintenance.disable()` en la consola: hay que redesplegar con ambos flags en `false`.

## Activar de nuevo

Ver `ACTIVAR_MANTENIMIENTO.md`.
