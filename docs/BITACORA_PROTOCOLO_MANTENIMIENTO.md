# Bitácora — Protocolo de mantenimiento (cambios y verificación)

Registro de lo implementado y del plan de prueba limpia (expulsión de sesión sin bucles).

---

## 1. Qué se construyó (resumen)

| Pieza | Archivo(s) | Función |
|-------|------------|---------|
| Flags ON/OFF | `src/config/maintenance.ts` | Maestro + forzado en deploy |
| Shell de rutas | `src/App.tsx` (`AppRouterShell`) | Mantenimiento → solo login; OFF → POS normal |
| Auth bloqueado | `src/contexts/AuthContext.tsx` | No login; expulsión de sesión |
| UI login | `GlassLoginForm`, `MaintenanceBanner` | Simula “Failed to fetch” |
| Enforcer | `MaintenanceEnforcer.tsx` | Expulsa si hay user en rutas normales |
| Shell login | `MaintenanceLoginShell.tsx` | AuthPage durante mantenimiento |
| Watchdog sesión | `MaintenanceSessionWatchdog.tsx` | Detecta sesión residual y limpia |
| Auto-reload deploy | `DeployReloadWatchdog.tsx` + `vite.config.ts` (`build-id`) | Pestañas toman el build nuevo |
| Docs | `ACTIVAR_…`, `DESACTIVAR_…`, `PROTOCOLO_SEGURO_…`, este archivo | Operación segura |

---

## 2. Bug del bucle (registrado y corregido)

**Síntoma:** parpadeo infinito “Cargando” ↔ Login.

**Causa 1:** al expulsar se hacía `location.replace('/?maintenance=1')` en `/`.  
**Fix:** sin reload si ya estás en login (`d6a87dc`).

**Causa 2 (post-apagado):** `DeployReloadWatchdog` pedía `/build-id.txt`, pero `_redirects` (`/* → index.html`) devolvía HTML ≠ build id → **recargas en bucle** aunque el mantenimiento estuviera OFF.  
**Fix:** watchdog **desmontado de App**; validación anti-HTML si se reactiva; regla explícita en `_redirects` para `/build-id.txt`.

---

## 3. Plan de verificación (este ciclo)

### Fase A — Apagado (ahora)

```ts
MAINTENANCE_PROTOCOL_ENABLED = false
MAINTENANCE_FORCED_FROM_BUILD = false
```

Deploy → comprobar:

- [ ] Login con usuario real funciona
- [ ] Dashboard / POS cargan
- [ ] No hay parpadeo
- [ ] La sesión permanece abierta (no te expulsa)

### Fase B — Prendido (cuando Fase A OK)

```ts
MAINTENANCE_PROTOCOL_ENABLED = true
MAINTENANCE_FORCED_FROM_BUILD = true
```

Deploy → dejar pestaña **logueada** y comprobar:

- [ ] En ≤ ~30–60 s te saca al login **o** auto-reload y quedas en login
- [ ] Login estable (sin bucle carga/login)
- [ ] Intentar entrar → “Failed to fetch”
- [ ] No vuelves al dashboard

### Fase C — Cierre

Volver a Fase A (ambos flags `false`) con  
`PROTOCOLO_SEGURO_RESTAURAR_MANTENIMIENTO.md`.

---

## 4. Commits relevantes (referencia)

- Activación / cableado reactivo + docs
- `fix(maintenance): expulsar sesiones…` (watchdog + build-id)
- `fix(maintenance): evitar bucle infinito…` (`d6a87dc`)
- Apagados / encendidos operativos según pruebas

---

## 5. Regla operativa

1. **Probar normalidad** siempre con flags en `false`.  
2. **Probar expulsión** con flags en `true` y pestaña ya logueada.  
3. Si hay bucle → no insistir: apagar flags y revisar redirect (no reload en login).  
4. Cerrar siempre con el protocolo seguro de restauración.

---

*Actualizado: ciclo de verificación post-fix de bucle (ago 2026).*
