# Restaurar post-mantenimiento — ciclo oct 2026

**Estado al registrar:** mantenimiento **ENCENDIDO** en prod.  
**Acción pendiente:** cuando el operador diga **desactivar / restaurar**, ejecutar §2. No adelantar.

---

## 1. Baseline “antes del mantenimiento” (objetivo operativo)

Antes de activar el protocolo el sistema estaba en **normalidad**:

| Ítem | Valor |
|------|--------|
| `MAINTENANCE_PROTOCOL_ENABLED` | `false` |
| `MAINTENANCE_FORCED_FROM_BUILD` | `false` |
| Login / POS / paneles | Operativos |
| Carga de datos Store/BCV/Supabase | Normal |
| Commit en `origin/main` justo antes del ON | `9ee83ef` (ya en main; el ON fue `a4a214f`) |
| Tip: prod “limpia” previa al ciclo de flags | `28155fe` (sin protocolo ON) |

**No** se debe hacer `git revert` de los commits de blindaje del ciclo. Con flags en `false` quedan **inertes** y el comportamiento operativo vuelve al de antes.

---

## 2. Cómo restaurar (cuando lo indiquen)

Solo tocar flags + deploy:

```ts
// src/config/maintenance.ts
export const MAINTENANCE_PROTOCOL_ENABLED = false;
export const MAINTENANCE_FORCED_FROM_BUILD = false;
```

```bash
git add src/config/maintenance.ts
git commit -m "chore: desactivar protocolo mantenimiento — restaurar login y POS"
git push origin main
```

Esperar deploy Render. El `DeployReloadWatchdog` hará hard refresh en clientes que ya lo tengan (~20 s).

### Checklist post-deploy

- [ ] Login funciona (no “Failed to fetch” de mantenimiento)
- [ ] Entra al POS / dashboard
- [ ] Paneles cargan datos (Almacén, Carrito, etc.)
- [ ] `window.posMaintenance?.status()` → `false`
- [ ] Si un navegador quedó raro:

```javascript
localStorage.removeItem('pos_maintenance_mode')
sessionStorage.removeItem('pos_deploy_reload_once')
sessionStorage.removeItem('pos_client_build_id')
location.href = '/'
```

---

## 3. Commits de este ciclo (referencia; no revertir al apagar)

| Commit | Qué hizo |
|--------|----------|
| `a4a214f` | Activó flags (`true` / `true`) |
| `4423a2a` | Cero datos en UI: `AppDataShell` + gate Supabase |
| `c89a733` | Remontó `DeployReloadWatchdog` (hard refresh en deploy) |

Al apagar: **solo** nuevo commit de flags `false`/`false`.  
Lo de `4423a2a` / `c89a733` **permanece** (apagado = transparente; watchdog sigue útil en cada deploy).

---

## 4. Qué debe quedar activo tras restaurar (sin ser “mantenimiento”)

| Pieza | Tras OFF |
|-------|----------|
| Flags protocolo | `false` / `false` |
| `AppRouterShell` rutas normales | Sí |
| `AppDataShell` monta Store/BCV | Sí (porque no hay bloqueo) |
| Gate Supabase | Inerte (`isMaintenanceModeActive()` = false) |
| `DeployReloadWatchdog` | **Sigue montado** (hard refresh en futuros deploys) |
| `MaintenanceSessionWatchdog` / Enforcer | Inertes con protocolo OFF |

---

## 5. Frase disparadora para el chat

Cuando el operador diga algo como:

> desactiva el mantenimiento / restaura / vuelve a la normalidad

→ ejecutar §2 exactamente y reportar commit + push + checklist.
