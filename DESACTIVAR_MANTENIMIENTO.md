# Mantenimiento — estado actual: APAGADO

Flags en `false`. Watchdog de deploy **desactivado** (causaba parpadeo del login).

## Qué hacer ahora

1. Espera el deploy.
2. Cierra pestañas viejas del POS.
3. Abre el sitio de nuevo (Ctrl+F5 una vez).
4. Loguéate — debe entrar **sin** recargar 2–3 veces.

Si aún parpadea: `localStorage.clear(); sessionStorage.clear(); location.href='/'`

## Luego

Cuando confirmes login estable → avisar para Fase B (prender mantenimiento y probar expulsión limpia).
