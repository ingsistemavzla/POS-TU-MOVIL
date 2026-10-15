# Desactivar protocolo de mantenimiento — restaurar normalidad

## Ciclo actual (oct 2026)

Registro operativo completo:

**`docs/RESTAURAR_POST_MANTENIMIENTO_CICLO_2026-10.md`**

Archivo maestro: **`docs/ARCHIVO_PROTOCOLO_MANTENIMIENTO.md`**

## 1. Flags en `src/config/maintenance.ts`

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = false;
export const MAINTENANCE_FORCED_FROM_BUILD = false;
```

## 2. Deploy

```bash
git add src/config/maintenance.ts
git commit -m "chore: desactivar protocolo mantenimiento — restaurar login y POS"
git push origin main
```

Efecto: login y POS vuelven; gate de datos y shells de mantenimiento quedan inertes.  
`DeployReloadWatchdog` **sigue** (solo hard refresh en deploys; no es mantenimiento).

## 3. Si un navegador quedó raro

```javascript
localStorage.removeItem('pos_maintenance_mode')
sessionStorage.removeItem('pos_deploy_reload_once')
sessionStorage.removeItem('pos_client_build_id')
location.href = '/'
```

## 4. Activar de nuevo

Ver `ACTIVAR_MANTENIMIENTO.md`.
