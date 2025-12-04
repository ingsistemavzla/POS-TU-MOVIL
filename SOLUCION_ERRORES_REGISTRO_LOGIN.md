# 🚨 SOLUCIÓN: Errores "Database error finding user" y "Database error querying schema"

## 🔴 PROBLEMA IDENTIFICADO

Los errores ocurren porque las políticas RLS en `public.users` están bloqueando el acceso:
- **"Database error finding user"**: No puede leer el perfil durante el registro
- **"Database error querying schema"**: No puede consultar la tabla durante el login
- **Pantalla negra**: El frontend no puede cargar el perfil del usuario

## ✅ SOLUCIÓN INMEDIATA

### PASO 1: Ejecutar Script de Corrección RLS (CRÍTICO)

**Ejecuta el script `fix_rls_users_registro_login.sql` en Supabase SQL Editor:**

1. Abre Supabase Dashboard → **SQL Editor**
2. Abre el archivo `fix_rls_users_registro_login.sql`
3. Copia y pega todo el contenido
4. Ejecuta el script
5. Verifica que muestra mensajes de éxito

**Este script:**
- ✅ Elimina todas las políticas RLS conflictivas en `public.users`
- ✅ Crea políticas nuevas que permiten:
  - Leer tu propio perfil (por `auth_user_id` o por `email`)
  - Crear tu perfil durante registro
  - Vincular `auth_user_id` automáticamente
  - Leer perfiles de tu compañía (para admins)

### PASO 2: Verificar que las Políticas se Crearon

Ejecuta este query para verificar:

```sql
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Lectura'
    WHEN cmd = 'INSERT' THEN '✅ Creación'
    WHEN cmd = 'UPDATE' THEN '✅ Actualización'
    WHEN cmd = 'DELETE' THEN '✅ Eliminación'
  END AS "Operación"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY cmd;
```

**Debes ver:**
- ✅ `users_select_policy` (SELECT)
- ✅ `users_insert_policy` (INSERT)
- ✅ `users_update_policy` (UPDATE)
- ✅ `users_delete_policy` (DELETE)

### PASO 3: Probar Registro y Login

1. **Intenta registrar** un nuevo usuario
2. **Verifica**:
   - ✅ No aparece el error "Database error finding user"
   - ✅ El registro se completa exitosamente
   - ✅ Puedes iniciar sesión después del registro
   - ✅ El dashboard carga correctamente (no pantalla negra)

3. **Intenta iniciar sesión** con un usuario existente
4. **Verifica**:
   - ✅ No aparece el error "Database error querying schema"
   - ✅ El login funciona correctamente
   - ✅ El dashboard carga con tus datos

---

## 🔍 SI AÚN HAY PROBLEMAS

### Verificar Estado de Usuarios

Ejecuta este query para ver el estado de los usuarios:

```sql
SELECT 
  au.email AS "Email Auth",
  au.id AS "Auth User ID",
  pu.id AS "Profile ID",
  pu.auth_user_id AS "Profile Auth User ID",
  pu.email AS "Email Perfil",
  CASE 
    WHEN pu.id IS NULL THEN '🔴 Sin perfil'
    WHEN pu.auth_user_id IS NULL THEN '🟡 Perfil sin vincular'
    WHEN pu.auth_user_id = au.id THEN '✅ Vinculado'
    ELSE '⚠️ Problema'
  END AS "Estado"
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
ORDER BY au.created_at DESC;
```

### Si Hay Usuarios Sin Vincular

Si aún hay usuarios sin vincular, ejecuta:

```sql
-- Ejecuta: vincular_usuarios_restantes.sql
-- O ejecuta: corregir_registro_usuario_rapido.sql
```

---

## 📋 CHECKLIST DE SOLUCIÓN

- [ ] Ejecutar `fix_rls_users_registro_login.sql` en Supabase
- [ ] Verificar que las 4 políticas se crearon (SELECT, INSERT, UPDATE, DELETE)
- [ ] Probar registro de nuevo usuario
- [ ] Probar login de usuario existente
- [ ] Verificar que no hay errores en consola del navegador
- [ ] Verificar que el dashboard carga correctamente (no pantalla negra)

---

## 🎯 RESULTADO ESPERADO

Después de ejecutar el script:
- ✅ **Registro funciona**: No más "Database error finding user"
- ✅ **Login funciona**: No más "Database error querying schema"
- ✅ **Dashboard carga**: No más pantalla negra
- ✅ **Vinculación automática**: Usuarios creados por admin se vinculan al registrarse

---

## ⚠️ NOTA IMPORTANTE

El script `fix_rls_users_registro_login.sql` es **más completo** que `fix_rls_users_circular_dependency.sql` porque:
- Permite lectura por email (para usuarios creados por admin)
- Permite INSERT durante registro
- Permite UPDATE para vincular `auth_user_id`
- Mantiene seguridad: solo permite acceso a tu propio perfil o perfiles de tu compañía

---

## 🚀 ACCIÓN INMEDIATA

**EJECUTA `fix_rls_users_registro_login.sql` AHORA** - Este es el script crítico que resolverá los errores.


