# 🚨 SOLUCIÓN DE EMERGENCIA: Errores 500 en Login/Registro

## 🔴 PROBLEMA CRÍTICO

Los logs muestran:
- ❌ **Errores 500** en todas las peticiones a `/rest/v1/users`
- ❌ **"Query retornó null sin error - posible bloqueo RLS silencioso"**
- ❌ **"Perfil realmente no existe. Cerrando sesión"**
- ❌ **Pantalla negra** en dashboard
- ❌ **No puede registrar, login, ni eliminar usuarios**

**CAUSA RAÍZ:** Las políticas RLS en `public.users` están causando **dependencias circulares**:
- Las políticas intentan leer `public.users` dentro de la misma política
- Esto causa errores 500 en el servidor
- El frontend no puede acceder a ningún perfil

## ✅ SOLUCIÓN DE EMERGENCIA

### PASO 1: Ejecutar Script de Emergencia (CRÍTICO)

**Ejecuta el script `fix_rls_users_emergency.sql` en Supabase SQL Editor:**

1. Abre Supabase Dashboard → **SQL Editor**
2. Abre el archivo `fix_rls_users_emergency.sql`
3. Copia y pega **TODO** el contenido
4. Ejecuta el script
5. Verifica que muestra mensajes de éxito

**Este script:**
- ✅ Elimina TODAS las políticas RLS conflictivas
- ✅ Crea políticas SIMPLIFICADAS sin dependencias circulares
- ✅ Permite lectura propia sin depender de funciones que leen `public.users`
- ✅ Separa políticas para evitar conflictos

### PASO 2: Verificar que NO hay Errores 500

Después de ejecutar el script, verifica en los logs de Supabase:
- ✅ No debe haber errores 500 en las consultas
- ✅ Las políticas deben estar activas

### PASO 3: Probar Funcionalidad

1. **Intenta iniciar sesión** con un usuario existente
2. **Verifica**:
   - ✅ No aparece error 500
   - ✅ El dashboard carga (no pantalla negra)
   - ✅ Puedes ver tus datos

3. **Intenta registrar** un nuevo usuario
4. **Verifica**:
   - ✅ No aparece error 500
   - ✅ El registro se completa
   - ✅ Puedes iniciar sesión después

5. **Intenta eliminar** un usuario desde el panel admin
6. **Verifica**:
   - ✅ No aparece error 500
   - ✅ El usuario se elimina correctamente

---

## 🔍 DIFERENCIAS DEL SCRIPT DE EMERGENCIA

El script `fix_rls_users_emergency.sql` es diferente porque:

1. **Política SELECT separada en 2:**
   - `users_select_policy_self`: Solo lectura propia (sin dependencias)
   - `users_select_policy_company`: Lectura de compañía (solo si ya tienes perfil)

2. **Sin dependencias circulares:**
   - No usa `get_user_company_id()` en la política principal
   - Lee directamente de `auth.users` para obtener email
   - Solo consulta `public.users` cuando ya tienes perfil

3. **Políticas UPDATE separadas:**
   - `users_update_policy_self`: Para vincular tu propio perfil
   - `users_update_policy_admin`: Para admins gestionar usuarios

---

## ⚠️ SI AÚN HAY ERRORES 500

### Verificar Logs de Supabase

1. Ve a Supabase Dashboard → **Logs** → **Postgres Logs**
2. Busca errores relacionados con:
   - `permission denied`
   - `row-level security policy violation`
   - `function execution error`

### Verificar Políticas Activas

Ejecuta este query:

```sql
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%auth_user_id%' THEN '✅ Usa auth_user_id'
    WHEN qual LIKE '%get_user_company_id%' THEN '⚠️ Usa get_user_company_id (puede causar circular)'
    ELSE '❓ Otra condición'
  END AS "Tipo de Condición"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY cmd, policyname;
```

### Deshabilitar RLS Temporalmente (SOLO PARA DIAGNÓSTICO)

Si necesitas diagnosticar, puedes deshabilitar RLS temporalmente:

```sql
-- ⚠️ SOLO PARA DIAGNÓSTICO - NO USAR EN PRODUCCIÓN
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

**Luego prueba el login/registro.** Si funciona, el problema es definitivamente RLS.

**Después, vuelve a habilitar RLS:**
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

Y ejecuta el script de emergencia nuevamente.

---

## 📋 CHECKLIST DE SOLUCIÓN

- [ ] Ejecutar `fix_rls_users_emergency.sql` en Supabase
- [ ] Verificar que las políticas se crearon (SELECT: 2, INSERT: 1, UPDATE: 2, DELETE: 1)
- [ ] Probar login de usuario existente
- [ ] Probar registro de nuevo usuario
- [ ] Probar eliminación de usuario desde admin
- [ ] Verificar que no hay errores 500 en consola
- [ ] Verificar que el dashboard carga (no pantalla negra)

---

## 🎯 RESULTADO ESPERADO

Después de ejecutar el script de emergencia:
- ✅ **No más errores 500** en las peticiones
- ✅ **Login funciona** correctamente
- ✅ **Registro funciona** correctamente
- ✅ **Dashboard carga** con datos (no pantalla negra)
- ✅ **Eliminación de usuarios** funciona desde admin

---

## 🚀 ACCIÓN INMEDIATA

**EJECUTA `fix_rls_users_emergency.sql` AHORA** - Este es el script crítico que resolverá los errores 500.


