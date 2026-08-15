# Activar protocolo de mantenimiento

## Archivo maestro

**`docs/ARCHIVO_PROTOCOLO_MANTENIMIENTO.md`**

## 1. Flags en `src/config/maintenance.ts`

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = true;
export const MAINTENANCE_FORCED_FROM_BUILD = true;
```

## 2. Deploy

```bash
git add src/config/maintenance.ts
git commit -m "chore: activar protocolo mantenimiento frontend"
git push origin main
```

Efecto: expulsión de sesiones, login bloqueado (“Failed to fetch”), solo pantalla de login.

## 3. Desactivar al terminar (obligatorio)

**`DESACTIVAR_MANTENIMIENTO.md`**  
**`PROTOCOLO_SEGURO_RESTAURAR_MANTENIMIENTO.md`**  
**`docs/ARCHIVO_PROTOCOLO_MANTENIMIENTO.md`**
