# Desactivar mantenimiento (commit de fin)

Cuando el trabajo de mantenimiento haya terminado, sigue estos pasos.

## Opción A — Recomendada (un commit en el repo)

1. Abre `src/config/maintenance.ts`
2. Cambia:

   ```ts
   export const MAINTENANCE_FORCED_FROM_BUILD = true;
   ```

   por:

   ```ts
   export const MAINTENANCE_FORCED_FROM_BUILD = false;
   ```

3. Commit y push:

   ```bash
   git add src/config/maintenance.ts
   git commit -m "chore: desactivar protocolo de mantenimiento frontend"
   git push origin main
   ```

4. Espera el redeploy en Render (o tu hosting) y prueba login normal.

## Opción B — Solo en Render (sin cambiar código)

En el panel de Render → Environment:

- `VITE_MAINTENANCE_MODE` = `false` o eliminar la variable

Redeploy manual si hace falta.

> Si `MAINTENANCE_FORCED_FROM_BUILD` sigue en `true` en el código, **la opción B no alcanza** — usa la opción A.

## Opción C — Emergencia en un navegador (no despliega para todos)

Consola:

```javascript
window.posMaintenance.disable()
```

Solo afecta esa pestaña hasta recargar; **no sustituye** el commit de desactivación para todos los usuarios.

## Verificación post-apagado

- [ ] Login admin/gerente/cajero funciona
- [ ] Dashboard y POS cargan
- [ ] `window.posMaintenance.status()` → `false` (tras recargar sin flag forzado)

## Documentación completa

Ver `REPORTE_PROTOCOLO_MANTENIMIENTO.md` para revertir el feature por completo.
