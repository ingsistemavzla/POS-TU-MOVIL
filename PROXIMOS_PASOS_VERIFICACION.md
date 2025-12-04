# ✅ PRÓXIMOS PASOS: Verificación y Pruebas

**Fecha:** 2025-01-27  
**Estado:** Script SQL ejecutado ✅

---

## 📋 PASO 1: Verificar Política RLS

### Ejecutar Script de Verificación

1. Abrir Supabase SQL Editor
2. Ejecutar el script: `verificar_politica_rls.sql`
3. Verificar resultados:
   - ✅ Debe mostrar **1 política SELECT** llamada `users_select_policy_self_only`
   - ✅ No debe haber otras políticas SELECT duplicadas

**Resultado Esperado:**
```
Nombre de Política: users_select_policy_self_only
Operación: SELECT
Esquema: public
Tabla: users

Total de Políticas SELECT: 1

Estado de la Política: ✅ Política users_select_policy_self_only existe
```

---

## 🧪 PASO 2: Probar Login con Nuevo Usuario Gerente

### Crear Usuario de Prueba

1. **Desde Admin Panel:**
   - Ir a `/usuarios` o `/users`
   - Crear nuevo usuario con rol "Gerente" (Manager)
   - Asignar una sucursal
   - Guardar

### Probar Login

1. **Cerrar sesión del admin** (si estás logueado)
2. **Hacer login con el nuevo usuario Gerente:**
   - Email del usuario creado
   - Contraseña asignada
3. **Observar comportamiento:**
   - ✅ NO debe aparecer pantalla en blanco
   - ✅ NO debe haber bucle infinito
   - ✅ Debe cargar el perfil correctamente
   - ✅ Debe redirigir a `/estadisticas` (para Gerente)

---

## 🔍 PASO 3: Verificar Logs de Consola

### Abrir Consola del Navegador

1. Presionar `F12` o `Ctrl+Shift+I`
2. Ir a la pestaña "Console"
3. Buscar los siguientes mensajes:

### Mensajes Esperados (Éxito):

```
🆕 Nuevo usuario detectado - esperando 1 segundo antes de leer perfil (sincronización RLS)
Using cached profile data for user: [uuid]
```

### Mensajes de Advertencia (Si aparecen):

```
⚠️ Query retornó null sin error - posible bloqueo RLS silencioso
🔄 Reintentando después de null silencioso (intento 1/3)
```

**Si aparecen estos mensajes:**
- ✅ Es normal si hay latencia de red
- ✅ El sistema está reintentando automáticamente
- ✅ NO debe cerrar sesión

### Mensajes de Error (Problema):

```
❌ RLS bloqueó el acceso al perfil (403 Forbidden)
Error: No se encontró perfil para el usuario después de todos los intentos. Cerrando sesión.
```

**Si aparecen estos mensajes:**
- ❌ Hay un problema con la política RLS
- ⚠️ Verificar que la política se creó correctamente
- ⚠️ Verificar que `auth_user_id` está correctamente vinculado

---

## 🔧 PASO 4: Verificar Vinculación de auth_user_id

### Si el Login Falla

Ejecutar en Supabase SQL Editor:

```sql
-- Verificar usuarios y su vinculación con auth.users
SELECT 
  u.id,
  u.email,
  u.role,
  u.auth_user_id,
  u.assigned_store_id,
  u.active,
  CASE 
    WHEN u.auth_user_id IS NULL THEN '❌ NO vinculado'
    WHEN EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id
    ) THEN '✅ Vinculado correctamente'
    ELSE '⚠️ auth_user_id no existe en auth.users'
  END AS "Estado de Vinculación"
FROM public.users u
WHERE u.email = 'email_del_usuario@ejemplo.com';  -- Reemplazar con el email del usuario de prueba
```

**Resultado Esperado:**
- `auth_user_id` debe tener un valor UUID
- Estado debe ser "✅ Vinculado correctamente"

---

## 📊 PASO 5: Verificar Política RLS Funciona

### Prueba Manual de la Política

Ejecutar en Supabase SQL Editor (como el usuario de prueba):

```sql
-- Esta query debe retornar 1 fila (el perfil del usuario autenticado)
SELECT 
  id,
  email,
  role,
  assigned_store_id,
  active
FROM public.users
WHERE auth_user_id = auth.uid();
```

**Resultado Esperado:**
- Debe retornar **1 fila** con los datos del usuario autenticado
- Si retorna 0 filas, la política RLS está bloqueando incorrectamente

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Script de verificación ejecutado
- [ ] Solo existe 1 política SELECT en `public.users`
- [ ] Política `users_select_policy_self_only` existe
- [ ] Usuario Gerente creado desde admin panel
- [ ] Login con nuevo usuario Gerente exitoso
- [ ] NO aparece pantalla en blanco
- [ ] NO hay bucle infinito
- [ ] Logs de consola muestran mensajes esperados
- [ ] Usuario redirigido correctamente según su rol
- [ ] `auth_user_id` está correctamente vinculado

---

## 🚨 TROUBLESHOOTING

### Problema: Login sigue fallando

**Solución 1: Verificar Política RLS**
```sql
-- Ver todas las políticas SELECT
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'SELECT';
```

**Solución 2: Verificar auth_user_id**
```sql
-- Verificar vinculación
SELECT id, email, auth_user_id
FROM public.users
WHERE email = 'email_del_usuario@ejemplo.com';
```

**Solución 3: Re-ejecutar Script de Corrección**
- Ejecutar `fix_rls_users_circular_dependency.sql` nuevamente
- Verificar que no hay errores

---

### Problema: Pantalla en blanco

**Solución:**
1. Abrir consola del navegador (F12)
2. Buscar errores en la pestaña "Console"
3. Buscar errores en la pestaña "Network"
4. Verificar que `fetchUserProfile` no está en bucle infinito

---

### Problema: Error 403 (Forbidden)

**Solución:**
1. Verificar que la política RLS permite `auth_user_id = auth.uid()`
2. Verificar que el usuario tiene `auth_user_id` correctamente vinculado
3. Verificar que el usuario está autenticado (`auth.uid()` no es NULL)

---

## 📝 NOTAS FINALES

- ✅ El script SQL se ejecutó correctamente
- ✅ La política RLS debería estar simplificada
- ✅ El frontend tiene mejor manejo de errores y reintentos
- ✅ El delay de 1 segundo para nuevos usuarios está implementado

**Próximo paso crítico:** Probar login con nuevo usuario Gerente y verificar que funciona correctamente.

---

**FIN DE PRÓXIMOS PASOS**





