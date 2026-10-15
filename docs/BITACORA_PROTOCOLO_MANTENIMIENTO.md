# Bitácora — Protocolo de mantenimiento (cambios y verificación)

Ver archivo maestro consolidado: **`docs/ARCHIVO_PROTOCOLO_MANTENIMIENTO.md`**

---

## Ciclo ago 2026 — cierre

| Fase | Acción | Estado |
|------|--------|--------|
| A | Apagar → login estable | OK (operador logueado) |
| B | Prender → expulsión | Probado; bugs A/B corregidos |
| Cierre | Documentar + apagar | Hecho en commit de archivo + flags OFF |

### Bugs registrados

1. **Bucle login** por `replace('/?maintenance=1')` en `/` → fix sin reload en login.  
2. **Parpadeo con OFF** por `DeployReloadWatchdog` + rewrite SPA → watchdog desmontado.

### Commits útiles

- `d6a87dc` — evitar bucle expulsión  
- `e9c0580` — quitar DeployReloadWatchdog del App  
- Activaciones/apagados operativos posteriores  

---

## Ciclo oct 2026 — en curso (ON)

| Fase | Acción | Estado |
|------|--------|--------|
| ON | Flags `true`/`true` | `a4a214f` |
| Blindaje datos | AppDataShell + gate Supabase | `4423a2a` |
| Hard refresh deploy | Remontar DeployReloadWatchdog | `c89a733` |
| Restaurar | Esperando orden del operador | Ver `docs/RESTAURAR_POST_MANTENIMIENTO_CICLO_2026-10.md` |

**Al desactivar:** solo flags `false`/`false` + push. No revertir `4423a2a`/`c89a733`.

---

## Cómo usar de aquí en adelante

1. Activar → `ACTIVAR_MANTENIMIENTO.md`  
2. Desactivar → `DESACTIVAR_MANTENIMIENTO.md` + `docs/RESTAURAR_POST_MANTENIMIENTO_CICLO_2026-10.md`  
3. Detalle completo → `docs/ARCHIVO_PROTOCOLO_MANTENIMIENTO.md`
