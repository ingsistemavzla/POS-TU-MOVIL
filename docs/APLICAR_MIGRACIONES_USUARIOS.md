# Instrucciones para Aplicar Migraciones de Usuarios

## Migraciones Pendientes

Estas migraciones deben aplicarse en Supabase para habilitar las funcionalidades de gestión de usuarios:

1. **`20250107000001_update_user_and_reset_password.sql`** - Funciones para actualizar usuarios y restablecer contraseñas
2. **`20250107000002_fix_delete_user_with_sales.sql`** - Corrección para eliminar usuarios con ventas asociadas

## Opción 1: Aplicar mediante Supabase Dashboard

### Pasos:

1. Accede a tu proyecto en Supabase: https://supabase.com/dashboard
2. Ve a **SQL Editor** en el menú lateral
3. Abre un **New Query**
4. Copia y pega el contenido completo de cada migración, una por una:

#### Primero: `20250107000001_update_user_and_reset_password.sql`

```sql
-- Copia todo el contenido del archivo
-- supabase/migrations/20250107000001_update_user_and_reset_password.sql
```

#### Segundo: `20250107000002_fix_delete_user_with_sales.sql`

```sql
-- Copia todo el contenido del archivo
-- supabase/migrations/20250107000002_fix_delete_user_with_sales.sql
```

5. Ejecuta cada script haciendo clic en **Run** o presionando `Ctrl+Enter`
6. Verifica que no haya errores en la consola

## Opción 2: Aplicar mediante Supabase CLI

Si tienes acceso a la terminal y las credenciales configuradas:

```bash
# Asegúrate de estar en el directorio del proyecto
cd /ruta/a/todo-bcv-pos

# Aplicar todas las migraciones pendientes
npx supabase db push

# O aplicar migraciones específicas
npx supabase migration up --version 20250107000001
npx supabase migration up --version 20250107000002
```

## Opción 3: Aplicar Manualmente (Si no puedes usar las opciones anteriores)

Si tienes acceso limitado pero puedes ejecutar SQL:

### Paso 1: Aplicar función de actualización de usuarios

Copia y ejecuta solo la función `update_user_profile` desde el archivo de migración.

### Paso 2: Aplicar función de restablecimiento de contraseña

**IMPORTANTE:** Asegúrate de tener la extensión `pgcrypto` habilitada:

```sql
-- Habilitar extensión pgcrypto si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Luego ejecuta la función `reset_user_password`.

### Paso 3: Aplicar corrección para eliminar usuarios con ventas

Ejecuta la migración completa `20250107000002_fix_delete_user_with_sales.sql`.

## Verificación Después de Aplicar

Para verificar que las funciones están creadas correctamente, ejecuta:

```sql
-- Verificar funciones
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'update_user_profile', 
    'reset_user_password', 
    'delete_user_complete'
  );

-- Verificar que cashier_id es nullable en sales
SELECT 
  column_name, 
  is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'sales' 
  AND column_name = 'cashier_id';

-- Verificar constraint en sales.cashier_id
SELECT 
  conname, 
  contype,
  pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.sales'::regclass 
  AND conname = 'sales_cashier_id_fkey';
```

## Funcionalidades Deshabilitadas Temporalmente

Hasta que se apliquen las migraciones, las siguientes funcionalidades no funcionarán:

1. ❌ **Editar usuarios** (nombre, email, rol, tienda, estado activo)
2. ❌ **Restablecer contraseñas** de usuarios
3. ❌ **Eliminar usuarios** con ventas asociadas

## Notas Importantes

- Las migraciones deben aplicarse en orden (primero la 20250107000001, luego la 20250107000002)
- La migración `20250107000002` modifica la estructura de la tabla `sales`, así que asegúrate de tener un backup
- Después de aplicar las migraciones, las funciones estarán disponibles inmediatamente
- No es necesario reiniciar el servidor de Supabase

## Troubleshooting

### Error: "function crypt does not exist"
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Error: "permission denied for schema auth"
Necesitas permisos de administrador en Supabase o usar `SECURITY DEFINER` en las funciones (ya está incluido).

### Error: "could not find function reset_user_password"
La función no ha sido aplicada. Ejecuta la migración completa `20250107000001_update_user_and_reset_password.sql`.

### Error: "violates foreign key constraint sales_cashier_id_fkey"
La migración `20250107000002` corrige esto. Asegúrate de aplicarla después de la primera migración.

