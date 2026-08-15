# Reporte: Protocolo de mantenimiento (solo frontend)

> **Archivo maestro actualizado (ago 2026):**  
> [`docs/ARCHIVO_PROTOCOLO_MANTENIMIENTO.md`](docs/ARCHIVO_PROTOCOLO_MANTENIMIENTO.md)  
> Activar/desactivar día a día: `ACTIVAR_MANTENIMIENTO.md` · `DESACTIVAR_MANTENIMIENTO.md`

Documento de referencia técnica para **revertir**, **desactivar** o **mantener** el modo mantenimiento del POS.  
**No usa Supabase** — todo el comportamiento está en el cliente (React/Vite).

---

## 1. Qué hace el protocolo

| Comportamiento | Descripción |
|----------------|-------------|
| Bloqueo de login | Al pulsar **Iniciar Sesión**, simula error **Failed to fetch** (con delay ~1,5 s). |
| UI de login | Pantalla normal (logo, título, inputs); el error aparece **entre** el subtítulo y los campos. |
| Cierre de sesión | Si hay sesión activa y el modo está ON, expulsa al usuario (signOut + limpieza). |
| Sin dashboard | No se montan rutas del POS; solo login (`AuthPage` vía `MaintenanceLoginShell`). |
| Contexto auth | Aunque quede token, `user` / `userProfile` se exponen como `null` si mantenimiento ON. |

---

## 2. Archivos NUEVOS (eliminar al revertir por completo)

| Archivo | Rol |
|---------|-----|
| `src/config/maintenance.ts` | Núcleo: flag, `enable`/`disable`, `blockAuthForMaintenance`, `window.posMaintenance` |
| `src/hooks/useMaintenanceMode.ts` | Hook React + `useSyncExternalStore` para re-render |
| `src/components/auth/MaintenanceBanner.tsx` | Alerta roja "Failed to fetch" (usado en registro) |
| `src/components/auth/MaintenanceEnforcer.tsx` | Cierra sesión si detecta usuario con mantenimiento ON |
| `src/components/auth/MaintenanceLoginShell.tsx` | Envuelve `AuthPage` cuando rutas están bloqueadas |
| `.env.local` | `VITE_MAINTENANCE_MODE=true` (local; en `.gitignore`) |

---

## 3. Archivos MODIFICADOS (restaurar al revertir)

### `src/main.tsx`
- Import de `@/config/maintenance` y `enableMaintenanceMode`.
- En DEV, si mantenimiento activo al arranque, llama `enableMaintenanceMode()`.

**Revertir:** dejar solo `import App` + `createRoot` como antes.

---

### `src/App.tsx`
- Imports: `MaintenanceEnforcer`, `MaintenanceLoginShell`, `useMaintenanceMode`, `isMaintenanceModeActive`.
- Componente `AppRouterShell`: si mantenimiento → rutas `*` → `MaintenanceLoginShell`; si no → `AppRoutes` + `MaintenanceEnforcer`.
- `MaintenanceEnforcer` dentro del router cuando modo normal.

**Revertir:** `BrowserRouter` → `<AppRoutes />` directo, sin `AppRouterShell`.

---

### `src/contexts/AuthContext.tsx`
Cambios principales:
- Imports desde `@/config/maintenance`.
- `useMaintenanceMode()` en el provider.
- `fetchUserProfile`: retorno temprano si mantenimiento (`error: 'maintenance'`).
- `signIn` / `signUp`: `blockAuthForMaintenance()` antes de Supabase.
- `refreshProfile` / `retryProfileFetch`: no ejecutan si mantenimiento.
- `clearBrowserAuthStorage`, `resetAuthState`, `evictSessionForMaintenance`.
- `signOut` refactorizado; conserva `pos_maintenance_mode` en localStorage.
- `useLayoutEffect`: registra `registerMaintenanceSessionEvict`.
- `useEffect`: suscripción a `subscribeMaintenanceMode`.
- `useEffect` auth init: sale si `maintenanceActive`; doble chequeo tras `getSession`.
- `onAuthStateChange`: si mantenimiento, evict y `return` (no carga perfil).
- Provider: `authBlocked` → expone `user`/`session`/`userProfile` como `null` si mantenimiento.
- `useEffect` inicial auth depende de `[maintenanceActive]`.
- Session keep-alive: no refresca si mantenimiento.

**Revertir:** quitar todos los bloques `isMaintenanceModeActive`, `blockAuthForMaintenance`, evict, `authBlocked`, y restaurar `signOut` original.

---

### `src/components/auth/GlassLoginForm.tsx`
- Estado `fetchFailedOverlay`.
- Tras login fallido en mantenimiento: Alert **Failed to fetch** entre subtítulo e inputs.
- Inputs con `opacity-50` cuando hay error de mantenimiento.
- No deshabilita campos al cargar; solo al enviar.

**Revertir:** versión original sin imports de maintenance ni overlay.

---

### `src/components/auth/GlassRegisterForm.tsx`
- `useMaintenanceMode`, `MaintenanceBanner`, `formDisabled` con mantenimiento, `return` temprano en submit.

**Revertir:** quitar imports y lógica de mantenimiento.

---

### `src/pages/AuthCallback.tsx`
- Si mantenimiento ON: `blockAuthForMaintenance`, `signOut`, redirect `/?maintenance=1`.

**Revertir:** solo `getSession` + `navigate('/')`.

---

### `src/utils/clearCache.ts`
- `keysToKeep` incluye `pos_maintenance_mode`.
- `clearAuthCache` no borra `pos_maintenance_mode`.

**Revertir:** quitar referencias a `pos_maintenance_mode`.

---

### `src/vite-env.d.ts`
- Tipos para `VITE_MAINTENANCE_*`.

**Revertir:** quitar bloques `VITE_MAINTENANCE_*` de `ImportMetaEnv`.

---

## 4. Flag en código (producción actual)

En `src/config/maintenance.ts`:

```ts
export const MAINTENANCE_FORCED_FROM_BUILD = true;  // ON en repo
```

**Commit de desactivación:** cambiar a `false` → ver **`DESACTIVAR_MANTENIMIENTO.md`**.

---

## 5. Cómo activar / desactivar (operación)

### Activar en local (desarrollo)

1. **`.env.local`** (reiniciar `npm run dev` después):
   ```env
   VITE_MAINTENANCE_MODE=true
   ```
2. **URL:** `http://localhost:8080/?maintenance=1`
3. **Consola del navegador:**
   ```javascript
   await window.posMaintenance.enable()
   window.posMaintenance.status()  // true
   ```

### Desactivar temporalmente

1. Consola:
   ```javascript
   window.posMaintenance.disable()
   ```
2. O `.env.local`:
   ```env
   VITE_MAINTENANCE_MODE=false
   ```
   Reiniciar dev server.

> **Nota:** Si `VITE_MAINTENANCE_MODE=true` en `.env`, `disable()` solo funciona hasta recargar; al recargar vuelve ON por prioridad del env.

### Desactivar por completo en producción

- No definir `VITE_MAINTENANCE_MODE` en Render/hosting.
- En el navegador del cliente: `localStorage.removeItem('pos_maintenance_mode')` o `window.posMaintenance.clearOverride()`.

---

## 6. API en consola (`window.posMaintenance`)

| Método | Acción |
|--------|--------|
| `await enable()` | ON + cierra sesiones + notifica UI |
| `disable()` | OFF (respeta flag `maintenanceUserDisabled`) |
| `await toggle()` | Alterna |
| `status()` | `true` / `false` |
| `settings()` | Objeto de configuración |
| `clearOverride()` | Quita clave `localStorage` y memoria |

**localStorage:** clave `pos_maintenance_mode` → `'true'` | `'false'`.

---

## 7. Flujo técnico (resumen)

```
main.tsx → bootstrap maintenance (.env / URL / storage)
    ↓
AppRouterShell → maintenanceBlocked ? MaintenanceLoginShell : AppRoutes
    ↓
AuthProvider → evict sesión / authBlocked null / block signIn signUp fetchProfile
    ↓
GlassLoginForm → signIn → blockAuthForMaintenance → Alert "Failed to fetch"
```

---

## 8. Guía rápida: REVERTIR TODO el protocolo

Orden recomendado para quitar la función sin dejar código muerto:

### Paso A — Desactivar ya
```bash
# En .env.local
VITE_MAINTENANCE_MODE=false
```
O borrar `.env.local`. Reiniciar `npm run dev`.

### Paso B — Eliminar archivos nuevos
```text
src/config/maintenance.ts
src/hooks/useMaintenanceMode.ts
src/components/auth/MaintenanceBanner.tsx
src/components/auth/MaintenanceEnforcer.tsx
src/components/auth/MaintenanceLoginShell.tsx
```

### Paso C — Restaurar archivos modificados
Usar git si el proyecto está versionado:
```bash
git checkout -- src/main.tsx src/App.tsx src/contexts/AuthContext.tsx
git checkout -- src/components/auth/GlassLoginForm.tsx
git checkout -- src/components/auth/GlassRegisterForm.tsx
git checkout -- src/pages/AuthCallback.tsx
git checkout -- src/utils/clearCache.ts
git checkout -- src/vite-env.d.ts
```

Si no hay git limpio, quitar manualmente según la sección **3** de este documento.

### Paso D — Limpiar navegador
```javascript
localStorage.removeItem('pos_maintenance_mode')
location.reload()
```

### Paso E — Verificar
- Login admin funciona.
- Dashboard carga tras autenticación.
- Registro funciona.
- No existe `window.posMaintenance` en consola.

---

## 9. Guía rápida: DESHABILITAR sin borrar código (mantener para el futuro)

1. `VITE_MAINTENANCE_MODE=false` o eliminar variable en hosting.
2. `window.posMaintenance.disable()` en cada despliegue no aplica; usar env.
3. No subir `.env.local` con `true` a producción.
4. Documentar en runbook: activar solo con `enable()` o env en ventana de mantenimiento.

---

## 10. Variables de entorno (Vite)

| Variable | Efecto |
|----------|--------|
| `VITE_MAINTENANCE_MODE` | `true` → fuerza ON (prioridad alta) |
| `VITE_MAINTENANCE_MESSAGE` | (reservado; UI usa fijo "Failed to fetch") |
| `VITE_MAINTENANCE_BYPASS_EMAILS` | (definido; actualmente login bloquea a todos) |
| `VITE_MAINTENANCE_LOGIN_ERROR` | Estilo simulado (default `failed_to_fetch`) |
| `VITE_MAINTENANCE_LOGIN_DELAY_MS` | Delay antes del error (default `1500`) |

---

## 11. Resultado UX acordado (estado final)

1. Pantalla de login **igual que producción** (AuthPage completa).
2. Usuario escribe credenciales y pulsa **Iniciar Sesión**.
3. Spinner breve.
4. Aparece banda roja **Failed to fetch** debajo de *Ingresa tus credenciales…* y encima de email/contraseña.
5. Campos visibles, ligeramente atenuados (`opacity-50`).
6. Editar un campo quita el mensaje hasta el siguiente intento.

---

## 12. Commits sugeridos (si versionas)

- `feat: protocolo mantenimiento frontend (login Failed to fetch + cierre sesión)`
- Revert: `revert: eliminar protocolo mantenimiento frontend`

---

## 13. Contacto / notas

- **Alcance:** solo frontend; Supabase Auth sigue operativo en red — el cliente no llama `signInWithPassword` cuando el bloqueo actúa antes.
- **Limitación:** no revoca JWT en otros dispositivos; cada pestaña/navegador se controla por localStorage + env.
- **Archivo generado:** mayo 2026 — alinear con rama actual antes de revertir masivo.

---

*Fin del reporte.*
