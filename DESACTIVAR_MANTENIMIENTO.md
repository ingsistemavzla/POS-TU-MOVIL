# Mantenimiento — estado actual: APAGADO (normalidad)

Sistema restaurado. Login y POS deben operar normal.

## Archivo maestro

**`docs/ARCHIVO_PROTOCOLO_MANTENIMIENTO.md`**

## Flags

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = false;
export const MAINTENANCE_FORCED_FROM_BUILD = false;
```

## Si un navegador quedó raro

```javascript
localStorage.removeItem('pos_maintenance_mode')
sessionStorage.clear()
location.href = '/'
```

## Activar de nuevo

Ver `ACTIVAR_MANTENIMIENTO.md`.
