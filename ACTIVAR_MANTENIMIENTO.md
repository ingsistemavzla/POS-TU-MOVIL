# Activar protocolo de mantenimiento

Bloquea login (simula "Failed to fetch"), cierra sesiones activas y deja solo la pantalla de login.

## 1. Flags en `src/config/maintenance.ts`

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = true;
export const MAINTENANCE_FORCED_FROM_BUILD = true;
```

No hace falta tocar `App.tsx`: el `AppRouterShell` ya reacciona solo.

## 2. Deploy

```bash
git add src/config/maintenance.ts
git commit -m "chore: activar protocolo mantenimiento frontend"
git push origin main
```

Tras el deploy, todos los clientes:
- Pierden la sesión (expulsión / watchdog)
- No pueden entrar al POS
- Ven el login; al intentar entrar aparece "Failed to fetch"
- Pestañas abiertas suelen auto-recargar por `build-id` (~20 s)

## 3. Desactivar al terminar (obligatorio)

Seguir el protocolo seguro:

**`PROTOCOLO_SEGURO_RESTAURAR_MANTENIMIENTO.md`**

(ambos flags en `false` + push + checklist de verificación)

Documentación completa: `REPORTE_PROTOCOLO_MANTENIMIENTO.md`
