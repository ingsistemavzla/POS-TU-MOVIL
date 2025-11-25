# Resumen de Migraciones Pendientes - Gestión de Usuarios

## ⚠️ Estado Actual

**Las siguientes funcionalidades están deshabilitadas hasta que se apliquen las migraciones SQL:**

1. ❌ Editar usuarios (nombre, email, rol, tienda, estado activo)
2. ❌ Restablecer contraseñas de usuarios
3. ❌ Eliminar usuarios con ventas asociadas

## 📋 Migraciones Pendientes

### 1. `20250107000001_update_user_and_reset_password.sql`
**Funcionalidades que habilita:**
- ✅ Editar perfil de usuarios (nombre, email, rol, tienda, estado)
- ✅ Restablecer contraseñas directamente en la base de datos
- ✅ Protección del último administrador

**Funciones SQL que crea:**
- `update_user_profile()` - Actualizar usuarios
- `reset_user_password()` - Restablecer contraseñas
- `delete_user_complete()` (mejorada) - Eliminar usuarios con protección

### 2. `20250107000002_fix_delete_user_with_sales.sql`
**Funcionalidades que habilita:**
- ✅ Eliminar usuarios incluso si tienen ventas asociadas
- ✅ Preservar historial de ventas estableciendo `cashier_id` a NULL

**Cambios en la base de datos:**
- Hace `cashier_id` nullable en la tabla `sales`
- Actualiza foreign key constraint para usar `ON DELETE SET NULL`

## 🚀 Cómo Aplicar las Migraciones

### Cuando Tengas Acceso a Supabase:

#### Opción 1: Supabase Dashboard (Recomendado)
1. Accede a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor** → **New Query**
4. Copia el contenido de cada migración y ejecuta:
   - Primero: `supabase/migrations/20250107000001_update_user_and_reset_password.sql`
   - Segundo: `supabase/migrations/20250107000002_fix_delete_user_with_sales.sql`

#### Opción 2: Supabase CLI
```bash
# Aplicar todas las migraciones
npm run supabase:push

# O específicamente estas migraciones
npx supabase migration up --version 20250107000001
npx supabase migration up --version 20250107000002
```

#### Opción 3: Script Automático (Requiere credenciales)
```bash
# Configurar variables de entorno
export SUPABASE_URL="https://tu-proyecto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"

# Ejecutar script
npm run migrate:users
```

## 📝 Archivos Importantes

- **Migraciones SQL:**
  - `supabase/migrations/20250107000001_update_user_and_reset_password.sql`
  - `supabase/migrations/20250107000002_fix_delete_user_with_sales.sql`

- **Documentación:**
  - `docs/APLICAR_MIGRACIONES_USUARIOS.md` - Guía detallada
  - `docs/RESUMEN_MIGRACIONES_PENDIENTES.md` - Este archivo

- **Scripts:**
  - `scripts/apply-user-management-migrations.js` - Script de aplicación automática

## ✅ Verificación Después de Aplicar

Ejecuta este SQL en Supabase para verificar que todo está correcto:

```sql
-- Verificar funciones
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('update_user_profile', 'reset_user_password', 'delete_user_complete');

-- Verificar que cashier_id es nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'sales' 
  AND column_name = 'cashier_id';
```

Debes ver:
- ✅ 3 funciones listadas
- ✅ `cashier_id` con `is_nullable = YES`

## 🔧 Troubleshooting

### Error: "function does not exist"
- Asegúrate de haber aplicado todas las migraciones en orden
- Verifica que no haya errores al ejecutar los scripts SQL

### Error: "permission denied"
- Las funciones usan `SECURITY DEFINER`, deberían funcionar con permisos normales
- Si persiste, verifica que tengas permisos de administrador en Supabase

### Error: "violates foreign key constraint"
- La migración `20250107000002` corrige esto
- Asegúrate de aplicarla después de la primera migración

## 📞 Soporte

Si tienes problemas al aplicar las migraciones:
1. Revisa los logs en Supabase Dashboard
2. Verifica que la extensión `pgcrypto` esté habilitada
3. Consulta `docs/APLICAR_MIGRACIONES_USUARIOS.md` para más detalles

