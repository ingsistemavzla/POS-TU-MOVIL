# Verificar migración audit_inventory_change (Aumento/Disminución)

## 1. Por qué esta migración no daña nada

- **CREATE OR REPLACE FUNCTION** en PostgreSQL:
  - Reemplaza **solo el código** de la función que tiene el mismo nombre y la misma firma (`audit_inventory_change()`, `RETURNS TRIGGER`).
  - **No borra** la tabla `inventory_movements` ni ninguna otra.
  - **No borra** el trigger. El trigger `trg_audit_inventory_change` sigue existiendo y sigue llamando a esta función por nombre; al reemplazar la función, el trigger usa la versión nueva.
- No se elimina ni se modifica ningún dato; solo se actualiza la lógica que escribe el campo `reason` cuando cambia el inventario.

## 2. Consultas para ejecutar en Supabase (SQL Editor)

### Antes de ejecutar la migración (opcional)

Comprueba que la función y el trigger existen (deberían existir por migraciones anteriores):

```sql
-- Debe devolver 1 fila: función audit_inventory_change
SELECT proname AS nombre_funcion,
       pg_get_function_identity_arguments(oid) AS argumentos
FROM pg_proc
WHERE proname = 'audit_inventory_change';

-- Debe devolver 1 fila: trigger en la tabla inventories
SELECT tgname AS nombre_trigger,
       tgrelid::regclass AS tabla
FROM pg_trigger
WHERE tgname = 'trg_audit_inventory_change';
```

### Después de ejecutar la migración

Vuelve a ejecutar las mismas dos consultas: deben seguir devolviendo 1 fila cada una (la función y el trigger siguen ahí; solo cambió el cuerpo de la función).

Para comprobar que el nuevo motivo se guarda bien, haz un **ajuste de prueba** desde Almacén (aumento o disminución de 1 unidad) y luego:

```sql
SELECT id, type, qty, reason, created_at
FROM inventory_movements
ORDER BY created_at DESC
LIMIT 5;
```

En los movimientos nuevos de tipo `ADJUST` deberías ver en `reason` algo como:
- `Ajuste manual (almacén) - Aumento` o
- `Ajuste manual (almacén) - Disminución` o
- `Ajuste automático de auditoría - Disminución` (ej. tras una venta).
