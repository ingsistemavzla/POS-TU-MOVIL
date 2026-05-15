# Activar protocolo de mantenimiento

## 1. Flags en `src/config/maintenance.ts`

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = true;
export const MAINTENANCE_FORCED_FROM_BUILD = true;
```

## 2. Rutas en `src/App.tsx`

Descomentar imports `[MANTENIMIENTO]` y usar `AppRouterShell` en lugar de `<BrowserRouter><AppRoutes /></BrowserRouter>` (ver bloque comentado al final de `App.tsx`).

## 3. Opcional: `src/main.tsx`

Descomentar bloque de auto-`enable()` en desarrollo.

## 4. Deploy

```bash
git add -A
git commit -m "chore: activar protocolo mantenimiento frontend"
git push origin main
```

## 5. Desactivar al terminar

Ver `DESACTIVAR_MANTENIMIENTO.md` (poner flags en `false`).

Documentación completa: `REPORTE_PROTOCOLO_MANTENIMIENTO.md`
