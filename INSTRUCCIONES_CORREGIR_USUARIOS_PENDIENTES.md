# 🔧 Instrucciones: Corregir Usuarios Pendientes

## 📋 **PROBLEMA**

Los siguientes usuarios no se pueden crear desde el Admin Panel porque el sistema indica que "ya existen":

1. **tumovilstore2025@gmail.com** (Gerente Tu Móvil Store)
2. **tumovillaisla@gmail.com** (Gerente Tu Móvil La Isla)

---

## 🔍 **PASO 1: DIAGNÓSTICO**

Ejecuta el script SQL: `diagnosticar_usuarios_pendientes.sql`

**Este script verificará:**
- ✅ Si existen en `auth.users`
- ✅ Si existen en `public.users`
- ✅ Si están correctamente vinculados
- ✅ Estado de las tiendas asignadas

**Resultado Esperado:**
El script mostrará el estado actual de cada usuario y qué acción se requiere.

---

## 🛠️ **PASO 2: CORRECCIÓN**

Ejecuta el script SQL: `corregir_usuarios_pendientes.sql`

**Este script:**
1. ✅ Busca los usuarios en `auth.users` y `public.users`
2. ✅ Crea el perfil en `public.users` si existe en `auth.users` pero no en `public.users`
3. ✅ Vincula `auth_user_id` si el perfil existe pero no está vinculado
4. ✅ Asigna `company_id` y `assigned_store_id` si faltan
5. ✅ Actualiza el rol a `manager` si no está definido

**Resultado Esperado:**
- Mensajes de éxito indicando que los usuarios fueron corregidos
- Verificación final mostrando el estado corregido

---

## 📊 **CASOS POSIBLES Y SOLUCIONES**

### **Caso 1: Usuario existe en `auth.users` pero NO en `public.users`**
**Solución:** El script creará automáticamente el perfil en `public.users` y lo vinculará.

### **Caso 2: Usuario existe en `public.users` pero NO está vinculado a `auth.users`**
**Solución:** El script vinculará el `auth_user_id` correctamente.

### **Caso 3: Usuario NO existe en `auth.users`**
**Solución:** El usuario debe registrarse primero desde el login. El script mostrará una advertencia.

### **Caso 4: Usuario existe en ambas tablas pero con datos inconsistentes**
**Solución:** El script actualizará los datos faltantes (`company_id`, `assigned_store_id`, `role`).

---

## ✅ **PASO 3: VERIFICACIÓN**

Después de ejecutar el script de corrección:

1. **Verifica en el Admin Panel:**
   - Los usuarios deberían aparecer en la lista de usuarios
   - Deberían tener el rol `manager` asignado
   - Deberían tener la tienda correcta asignada

2. **Intenta Login:**
   - `tumovilstore2025@gmail.com` / `2677Tele$`
   - `tumovillaisla@gmail.com` / `2677Tele$`

3. **Si aún no funciona:**
   - Verifica que el email esté confirmado en `auth.users`
   - Verifica que `company_id` y `assigned_store_id` estén asignados
   - Ejecuta el script de diagnóstico nuevamente para ver el estado actual

---

## 🚨 **SI EL USUARIO NO EXISTE EN `auth.users`**

Si el diagnóstico muestra que el usuario NO existe en `auth.users`:

1. **Opción A: Registro Manual**
   - El usuario debe ir a la página de registro
   - Ingresar su email y contraseña
   - El trigger automático creará el perfil en `public.users`

2. **Opción B: Crear desde Admin Panel**
   - Si el Admin Panel permite crear usuarios sin registro previo
   - El sistema creará tanto `auth.users` como `public.users`

---

## 📝 **NOTAS IMPORTANTES**

- ⚠️ **No ejecutes los scripts múltiples veces** - Están diseñados para ser idempotentes, pero es mejor verificar primero con el diagnóstico.

- ✅ **Los scripts son seguros** - Solo crean/actualizan datos, no eliminan nada.

- 🔒 **Seguridad:** Los scripts usan `SECURITY DEFINER` implícitamente a través de las funciones RPC, pero las operaciones directas en `public.users` respetan RLS.

---

## 🎯 **RESULTADO ESPERADO**

Después de ejecutar los scripts:

✅ Ambos usuarios deberían:
- Aparecer en la lista de usuarios del Admin Panel
- Poder iniciar sesión con sus credenciales
- Tener el rol `manager` asignado
- Tener su tienda correspondiente asignada
- Estar vinculados correctamente entre `auth.users` y `public.users`

---

**FIN DE LAS INSTRUCCIONES**


