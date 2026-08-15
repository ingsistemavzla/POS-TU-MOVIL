# Mantenimiento — estado actual: APAGADO (sistema normal)

## Protocolo completo de garantía

Seguir: **`PROTOCOLO_SEGURO_RESTAURAR_MANTENIMIENTO.md`**

## Flags actuales

```ts
// src/config/maintenance.ts
export const MAINTENANCE_PROTOCOL_ENABLED = false;
export const MAINTENANCE_FORCED_FROM_BUILD = false;
```

Login, sesiones y POS deben operar con normalidad tras el deploy de este estado.

## Activar de nuevo

Ver `ACTIVAR_MANTENIMIENTO.md`.
