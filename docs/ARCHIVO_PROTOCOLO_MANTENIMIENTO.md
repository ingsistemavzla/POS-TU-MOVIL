# Archivo maestro — Protocolo de mantenimiento POS Tu Móvil

Documento único de archivo operativo. Consolida activación, desactivación, bugs corregidos y estado del código.

**Estado al cerrar este ciclo:** mantenimiento **APAGADO** → sistema en **normalidad**.

---

## 1. Objetivo del protocolo

Durante una ventana de mantenimiento (solo frontend):

1. Expulsar a quien esté logueado.
2. Bloquear nuevos logins (simula error **Failed to fetch**).
3. Mostrar solo la pantalla de login (sin POS/dashboard).
4. Al terminar: restaurar login, sesiones y rutas **sin dejar bloqueos residuales ni bucles**.

No modifica Supabase ni la base de datos: es control de UI/auth en el cliente.

---

## 2. Cómo ACTIVAR

Archivo: `src/config/maintenance.ts`

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = true;
export const MAINTENANCE_FORCED_FROM_BUILD = true;
```

```bash
git add src/config/maintenance.ts
git commit -m "chore: activar protocolo mantenimiento frontend"
git push origin main
```

Esperar deploy Render.

**Efecto esperado**

| Qué | Resultado |
|-----|-----------|
| Sesiones abiertas | Expulsión (AuthContext + watchdog). Puede requerir un refresh si la pestaña aún tiene JS viejo. |
| Login | Alert “Failed to fetch” |
| POS | No monta rutas; solo `MaintenanceLoginShell` |
| Parpadeo | No debe haber bucle carga↔login |

Guía corta: `ACTIVAR_MANTENIMIENTO.md`

---

## 3. Cómo DESACTIVAR (restaurar normalidad)

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = false;
export const MAINTENANCE_FORCED_FROM_BUILD = false;
```

```bash
git add src/config/maintenance.ts
git commit -m "chore: desactivar protocolo mantenimiento — restaurar login y POS"
git push origin main
```

Con protocolo OFF:

- `isMaintenanceModeActive()` siempre `false`
- Se limpia `localStorage.pos_maintenance_mode` al arrancar
- Login y POS operan normales

**Si un navegador sigue raro**

```javascript
localStorage.removeItem('pos_maintenance_mode')
sessionStorage.clear()
location.href = '/'
```

Guía corta: `DESACTIVAR_MANTENIMIENTO.md`  
Protocolo detallado: `PROTOCOLO_SEGURO_RESTAURAR_MANTENIMIENTO.md`

---

## 4. Inventario de archivos (código)

| Archivo | Rol | Notas |
|---------|-----|--------|
| `src/config/maintenance.ts` | Flags + API `window.posMaintenance` | **Único interruptor de producción** |
| `src/App.tsx` | `AppRouterShell` reactivo | Cableado permanente |
| `src/main.tsx` | Bootstrap enable si activo | Solo si protocolo ON |
| `src/contexts/AuthContext.tsx` | Bloqueo signIn + evict | Sin reload si ya en login |
| `src/components/auth/MaintenanceLoginShell.tsx` | Auth durante mantenimiento | |
| `src/components/auth/MaintenanceEnforcer.tsx` | Expulsa en rutas normales | |
| `src/components/auth/MaintenanceSessionWatchdog.tsx` | Limpia sesión residual | Sin bucle en `/` |
| `src/components/auth/MaintenanceBanner.tsx` | UI error | |
| `src/components/auth/GlassLoginForm.tsx` | Muestra Failed to fetch | |
| `src/hooks/useMaintenanceMode.ts` | Hook React | |
| `src/components/system/DeployReloadWatchdog.tsx` | Auto-reload por build-id | **NO montado** (ver §5) |
| `vite.config.ts` | Genera `VITE_BUILD_ID` / `build-id.txt` | Listo si se reactiva watchdog |
| `public/_redirects` | Incluye `/build-id.txt` | Evitar rewrite SPA |

---

## 5. Bugs encontrados y resolución (archivo)

### Bug A — Bucle carga ↔ login al expulsar

- **Causa:** `location.replace('/?maintenance=1')` aunque ya estabas en `/`.
- **Fix:** si path es login/auth/`?maintenance=`, solo limpiar sesión, **sin** reload.
- **Commit ref:** `d6a87dc`

### Bug B — Parpadeo aunque mantenimiento OFF

- **Causa:** `DeployReloadWatchdog` fetch `/build-id.txt` → rewrite `/* → index.html` devolvía HTML ≠ id → `reload()` en bucle.
- **Fix:** **desmontar** watchdog de `App.tsx`; validar que remote no sea HTML; regla `_redirects` para `/build-id.txt`.
- **Commit ref:** `e9c0580`

### Limitación conocida

Pestañas con **JS anterior al deploy** no ejecutan el protocolo nuevo hasta **un** refresh (o nueva pestaña). No hay forma de inyectar código nuevo en un bundle viejo sin recarga.

---

## 6. Ciclo de verificación realizado (ago 2026)

| Fase | Qué se hizo | Resultado |
|------|-------------|-----------|
| A | Apagar → login normal | Confirmado por operador (sesión abierta) |
| B | Prender → prueba expulsión | En curso / a cerrar con este apagado |
| Cierre | Apagar + documentar archivo | Este documento + flags `false` |

Checklist vivo: `docs/BITACORA_PROTOCOLO_MANTENIMIENTO.md`

---

## 7. Documentos relacionados

| Documento | Uso |
|-----------|-----|
| **Este archivo** (`docs/ARCHIVO_PROTOCOLO_MANTENIMIENTO.md`) | Archivo maestro |
| `ACTIVAR_MANTENIMIENTO.md` | Pasos cortos ON |
| `DESACTIVAR_MANTENIMIENTO.md` | Estado actual + OFF |
| `PROTOCOLO_SEGURO_RESTAURAR_MANTENIMIENTO.md` | Restauración segura detallada |
| `REPORTE_PROTOCOLO_MANTENIMIENTO.md` | Reporte técnico original |
| `docs/BITACORA_PROTOCOLO_MANTENIMIENTO.md` | Bitácora de pruebas/bugs |

---

## 8. Reglas de oro

1. Producción: **solo** cambiar los dos flags + push.  
2. No borrar el código del protocolo salvo pedido explícito de reversión total.  
3. No remontar `DeployReloadWatchdog` hasta confirmar que `/build-id.txt` se sirve como texto plano (no HTML).  
4. Tras OFF, verificar login en ventana privada.  
5. Nunca dejar `FORCED_FROM_BUILD = true` “a medias”.

---

## 9. Estado al publicar este archivo

```ts
MAINTENANCE_PROTOCOL_ENABLED = false
MAINTENANCE_FORCED_FROM_BUILD = false
```

→ Login, sesiones y POS en **normalidad**.

---

*Archivo consolidado — cierre operativo protocolo mantenimiento (agosto 2026).*
