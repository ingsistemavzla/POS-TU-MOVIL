# Instrucciones para Corregir Transferencias de Inventario

## 🔴 Problema Identificado

Los usuarios no pueden transferir productos entre sucursales. El error que aparece es:

```
Could not find the function public.transfer_inventory(...) in the schema cache.
```

## ✅ Solución

Se ha creado una nueva migración SQL que crea la función `transfer_inventory` y todas sus dependencias de forma idempotente.

**Archivo de migración:**
- `supabase/migrations/20250103000002_create_transfer_inventory_function.sql`

## 📋 Pasos para Aplicar la Corrección

### 1. Aplicar la Migración en Supabase

1. **Acceder al SQL Editor de Supabase:**
   - Ir a tu proyecto en Supabase Dashboard
   - Navegar a `SQL Editor` en el menú lateral

2. **Ejecutar la Migración:**
   - Abrir el archivo `supabase/migrations/20250103000002_create_transfer_inventory_function.sql`
   - Copiar todo el contenido
   - Pegarlo en el SQL Editor de Supabase
   - Ejecutar la consulta (botón "Run" o `Ctrl+Enter`)

3. **Verificar que la Función se Creó:**
   ```sql
   SELECT proname, proargnames, prosrc 
   FROM pg_proc 
   WHERE proname = 'transfer_inventory';
   ```
   
   Debe retornar una fila con la función.

### 2. Verificar Dependencias

Asegúrate de que estas tablas existan:
- ✅ `inventory_transfers` (se crea en la migración si no existe)
- ✅ `inventories`
- ✅ `products`
- ✅ `stores`
- ✅ `users`
- ✅ `companies`
- ⚠️ `inventory_movements` (opcional, la función maneja su ausencia)

### 3. Verificar Permisos RLS

La migración crea políticas RLS que permiten:
- **Ver transferencias:** Todos los usuarios de la misma compañía
- **Crear transferencias:** Solo administradores y gerentes
- **Modificar/Eliminar transferencias:** Solo administradores

### 4. Probar la Funcionalidad

1. **En el Frontend:**
   - Ir al módulo de Inventario
   - Seleccionar un producto con stock disponible
   - Hacer clic en "Transferir" (icono de flechas)
   - Seleccionar tienda de destino
   - Especificar cantidad
   - Hacer clic en "Transferir"

2. **Resultado Esperado:**
   - ✅ Mensaje de éxito: "Transferencia exitosa"
   - ✅ El stock se reduce en la tienda de origen
   - ✅ El stock se aumenta en la tienda de destino
   - ✅ Se crea un registro en `inventory_transfers`

### 5. Verificación en Base de Datos (Opcional)

Ejecutar esta consulta para ver las transferencias recientes:

```sql
SELECT 
  it.id,
  p.name as producto,
  s1.name as desde_tienda,
  s2.name as hacia_tienda,
  it.quantity as cantidad,
  u.name as transferido_por,
  it.created_at
FROM inventory_transfers it
JOIN products p ON p.id = it.product_id
JOIN stores s1 ON s1.id = it.from_store_id
JOIN stores s2 ON s2.id = it.to_store_id
JOIN users u ON u.id = it.transferred_by
ORDER BY it.created_at DESC
LIMIT 10;
```

## 🔧 Detalles Técnicos

### Función `transfer_inventory`

**Parámetros:**
- `p_product_id` (uuid): ID del producto a transferir
- `p_from_store_id` (uuid): ID de la tienda de origen
- `p_to_store_id` (uuid): ID de la tienda de destino
- `p_quantity` (integer): Cantidad a transferir
- `p_company_id` (uuid): ID de la compañía
- `p_transferred_by` (uuid): ID del usuario que realiza la transferencia

**Retorno:**
JSON con:
- `error`: boolean indicando si hubo error
- `message`: mensaje descriptivo
- `transfer_id`: ID del registro de transferencia creado
- `product_name`, `from_store`, `to_store`: nombres para referencia
- `quantity`: cantidad transferida
- `new_from_qty`, `new_to_qty`: cantidades finales en ambas tiendas

### Validaciones Implementadas

1. ✅ Verificación de permisos (solo admin/manager)
2. ✅ Validación de cantidad (debe ser > 0)
3. ✅ Verificación de existencia del producto
4. ✅ Verificación de existencia de ambas tiendas
5. ✅ Verificación de que las tiendas sean diferentes
6. ✅ Verificación de existencia de inventario en origen
7. ✅ Verificación de stock suficiente en origen
8. ✅ Creación automática de inventario en destino si no existe

### Características de la Migración

- **Idempotente:** Puede ejecutarse múltiples veces sin errores
- **Segura:** Usa `IF NOT EXISTS` y `CREATE OR REPLACE` donde corresponde
- **Completa:** Crea tabla, índices, políticas RLS, triggers y función principal
- **Robusta:** Maneja errores y casos edge (tablas opcionales)

## ⚠️ Notas Importantes

1. **Permisos:** Solo usuarios con rol `admin` o `manager` pueden transferir inventario
2. **Transacciones:** La función maneja todo en una sola transacción SQL
3. **Auditoría:** Cada transferencia se registra en `inventory_transfers`
4. **Movimientos:** Si existe la tabla `inventory_movements`, también se registran los movimientos
5. **Stock Negativo:** La función previene transferencias que resultarían en stock negativo

## 🐛 Troubleshooting

### Si la función aún no se encuentra después de aplicar la migración:

1. **Verificar esquema:**
   ```sql
   SELECT nspname FROM pg_namespace WHERE nspname = 'public';
   ```

2. **Verificar si la función existe:**
   ```sql
   \df public.transfer_inventory
   ```

3. **Limpiar caché de Supabase:**
   - Esperar unos minutos
   - Refrescar el navegador
   - Cerrar y reabrir la conexión

4. **Re-ejecutar la creación de la función:**
   ```sql
   -- Solo la parte de CREATE OR REPLACE FUNCTION
   -- (copiar desde la línea que dice "CREATE OR REPLACE FUNCTION public.transfer_inventory")
   ```

### Si aparecen errores de permisos:

Verificar que el usuario tenga el rol correcto:
```sql
SELECT id, name, role, company_id 
FROM users 
WHERE auth_user_id = auth.uid();
```

### Si aparece error de tabla no encontrada:

Verificar que existan las tablas dependientes:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('inventories', 'products', 'stores', 'users', 'companies');
```

## ✅ Checklist de Verificación Post-Migración

- [ ] La migración se ejecutó sin errores
- [ ] La función `transfer_inventory` existe (verificación SQL)
- [ ] La tabla `inventory_transfers` existe
- [ ] Las políticas RLS están activas
- [ ] Se puede transferir inventario desde el frontend
- [ ] El stock se actualiza correctamente en ambas tiendas
- [ ] Se crea el registro en `inventory_transfers`
- [ ] Los mensajes de error son claros y útiles

## 📝 Commit y Deploy

Después de aplicar la migración en Supabase:

1. **Commit de los cambios:**
   ```bash
   git add supabase/migrations/20250103000002_create_transfer_inventory_function.sql
   git add docs/INSTRUCCIONES_TRANSFERENCIA_INVENTARIO.md
   git commit -m "fix: crear función transfer_inventory para transferencias entre sucursales"
   git push origin main
   ```

2. **Nota:** Esta corrección es principalmente de base de datos, no requiere redeploy del frontend, pero el commit documenta la solución para futuras referencias.

