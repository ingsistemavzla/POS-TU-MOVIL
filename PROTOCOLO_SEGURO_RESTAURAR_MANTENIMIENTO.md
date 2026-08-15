# Protocolo seguro — Restaurar el sistema tras mantenimiento

Documento de garantía operativa. Objetivo: **apagar el bloqueo de login/sesiones** y dejar el POS funcionando otra vez, sin sorpresas.

---

## Estado que se considera “normalidad”

| Condición | Valor esperado |
|-----------|----------------|
| Login | Funciona (Supabase auth real) |
| Sesiones | No se expulsan solas |
| Rutas POS | Dashboard, ventas, almacén, etc. cargan |
| Mensaje “Failed to fetch” en login | Solo si hay fallo de red real, no por mantenimiento |
| Flags en código | Ambos en `false` |

---

## PASO A — Apagado seguro (recomendado, reversible)

Usar esto casi siempre. **No borra el protocolo**; solo lo desactiva.

### 1. Flags (obligatorio)

Archivo: `src/config/maintenance.ts`

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = false;
export const MAINTENANCE_FORCED_FROM_BUILD = false;
```

Con `MAINTENANCE_PROTOCOL_ENABLED = false`:

- `isMaintenanceModeActive()` siempre retorna `false`
- Al arrancar se limpia `localStorage.pos_maintenance_mode`
- Login, AuthContext y rutas operan normales
- Los watchdogs de mantenimiento no expulsan a nadie

### 2. Commit + push + deploy

```bash
git add src/config/maintenance.ts
git commit -m "chore: desactivar protocolo mantenimiento — restaurar login y POS"
git push origin main
```

Esperar a que Render termine el deploy.

### 3. Verificación post-deploy (checklist)

1. Abrir el sitio en ventana privada.
2. Iniciar sesión con un usuario real → debe entrar al dashboard.
3. Confirmar que no aparece el Alert rojo fijo “Failed to fetch” al loguear con credenciales válidas.
4. En una pestaña ya abierta: en ≤ ~20–30 s debería auto-recargar por `build-id` (DeployReloadWatchdog) o refrescar una vez.
5. Consola (F12), opcional:

```javascript
localStorage.removeItem('pos_maintenance_mode')
location.reload()
```

6. Confirmar ventas / dashboard cargan datos.

### 4. Si un cliente sigue bloqueado

```javascript
localStorage.removeItem('pos_maintenance_mode')
sessionStorage.clear()
location.reload()
```

Si aún falla: hard refresh (Ctrl+F5) o borrar caché del sitio.

---

## PASO B — Qué NO hace falta tocar para volver a la normalidad

Con el **Paso A** basta. No es necesario:

- Borrar `MaintenanceSessionWatchdog`, `DeployReloadWatchdog`, `MaintenanceEnforcer`, etc.
- Revertir `App.tsx` / `AuthContext` / `vite.config.ts`
- Quitar `window.posMaintenance`

Ese código **queda inerte** mientras `MAINTENANCE_PROTOCOL_ENABLED = false`.  
`DeployReloadWatchdog` puede seguir activo: solo recarga si hay un **deploy nuevo**; no bloquea login.

---

## PASO C — Reversión total del código (solo si se pide explícitamente)

Usar solo si se quiere **eliminar** el protocolo del repo (no solo apagarlo).

### Opción C1 — Revertir commits de mantenimiento (preferible si el historial es limpio)

Identificar commits recientes de mantenimiento, por ejemplo:

- `chore: activar protocolo mantenimiento...`
- `fix(maintenance): expulsar sesiones...`
- y el commit de cableado/refuerzo si aplica

```bash
git log --oneline --grep=maintenance -20
# Revisar hashes y luego, con cuidado:
# git revert <hash>   # uno por uno, del más nuevo al más viejo
```

**No** usar `reset --hard` en `main` compartido salvo orden explícita.

### Opción C2 — Apagado + dejar código (Paso A)

Es la vía **segura por defecto**.

---

## Activar de nuevo (futuro mantenimiento)

Ver `ACTIVAR_MANTENIMIENTO.md`:

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = true;
export const MAINTENANCE_FORCED_FROM_BUILD = true;
```

Commit + push. Tras el deploy:

- Sesiones se expulsan (watchdog + AuthContext)
- Login bloqueado con “Failed to fetch”
- Pestañas abiertas: auto-reload por `build-id` (~20 s) o refresh

Luego **siempre** cerrar con este documento (Paso A).

---

## Archivos del protocolo (referencia)

| Archivo | Rol |
|---------|-----|
| `src/config/maintenance.ts` | Flags maestros ON/OFF |
| `src/App.tsx` | `AppRouterShell` reactivo |
| `src/main.tsx` | Bootstrap enable si activo |
| `src/contexts/AuthContext.tsx` | Bloqueo auth + expulsión |
| `src/components/auth/Maintenance*.tsx` | UI / enforcer / shell / watchdog |
| `src/components/system/DeployReloadWatchdog.tsx` | Auto-reload tras deploy |
| `vite.config.ts` | Genera `build-id.txt` |
| `ACTIVAR_MANTENIMIENTO.md` | Cómo encender |
| `DESACTIVAR_MANTENIMIENTO.md` | Resumen apagado |
| **Este archivo** | Protocolo seguro completo |

---

## Regla de oro

1. **Para normalidad:** ambos flags `false` → push → verificar login.  
2. **No borrar código** salvo pedido explícito de reversión total.  
3. **Nunca** dejar `FORCED_FROM_BUILD = true` con protocolo “a medias”.  
4. Tras apagar, si alguien sigue fuera: limpiar `pos_maintenance_mode` + recargar.

---

*Última actualización: protocolo de garantía post-mantenimiento (agosto 2026).*
