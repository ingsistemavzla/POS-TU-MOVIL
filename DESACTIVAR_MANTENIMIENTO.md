# Mantenimiento — estado actual: ENCENDIDO (prueba de expulsión)

## Cómo evaluar si te bota de la sesión

1. Deja **esta pestaña abierta y logueada** (no la cierres).
2. Espera a que Render termine el deploy (~1–3 min).
3. En ≤ **~20–30 s** debería:
   - Auto-recargar por `build-id`, **o**
   - El watchdog detectar mantenimiento y expulsarte
4. Debes quedar en la pantalla de login.
5. Si intentas entrar → Alert **Failed to fetch**.

Si a los **60 s** sigues dentro: haz **un refresh** (Ctrl+F5). Si ahí sí te saca, el bloqueo funciona pero esa pestaña no había tomado el build nuevo.

## Apagar después de la prueba

Seguir: **`PROTOCOLO_SEGURO_RESTAURAR_MANTENIMIENTO.md`**

```ts
export const MAINTENANCE_PROTOCOL_ENABLED = false;
export const MAINTENANCE_FORCED_FROM_BUILD = false;
```

+ commit + push.
