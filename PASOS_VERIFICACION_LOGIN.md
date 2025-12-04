# 🔍 PASOS DE VERIFICACIÓN: Login de Nuevos Usuarios

## ✅ PASO 1: Verificar Política RLS (Backend)
**Acción:** Ejecutar en Supabase SQL Editor el script `verificar_politica_rls.sql`

**Resultado Esperado:**
- Debe mostrar 1 política SELECT llamada `users_select_policy_self_only`
- La política debe permitir: `auth_user_id = auth.uid()`

---

## 👤 PASO 2: Crear Usuario Manager (Admin Panel)
**Acción:** 
1. Ir a `/usuarios` como Admin
2. Crear un nuevo usuario Manager:
   - Email: `gerente.test@example.com` (o el que prefieras)
   - Nombre: `Gerente Test`
   - Rol: `Gerente`
   - Tienda: Seleccionar una tienda
   - Contraseña: (se ignora, pero puedes poner una)

**Resultado Esperado:**
- Toast de éxito: "Perfil creado exitosamente"
- El usuario aparece en la lista de Managers
- **IMPORTANTE:** El usuario aún NO puede hacer login (no tiene cuenta en `auth.users`)

---

## 📝 PASO 3: Registrar el Usuario (Página de Registro)
**Acción:**
1. Cerrar sesión del Admin
2. Ir a la página de registro (`/register` o `/auth`)
3. Completar el formulario con:
   - **Email:** El mismo que usaste en el Paso 2 (`gerente.test@example.com`)
   - **Nombre:** Puede ser diferente (el sistema usará el del perfil si existe)
   - **Contraseña:** La que quieras (mínimo 6 caracteres)
   - **Confirmar Contraseña:** La misma

**Resultado Esperado:**
- Registro exitoso
- El sistema detecta el perfil existente y lo vincula
- Redirección a login o directamente al dashboard

---

## 🔐 PASO 4: Login del Usuario (Prueba Crítica)
**Acción:**
1. Hacer login con:
   - Email: `gerente.test@example.com`
   - Contraseña: La que pusiste en el Paso 3

**Resultado Esperado (✅ CORRECTO):**
- Login exitoso
- Redirección a `/estadisticas` (o dashboard según rol)
- **NO** debe haber:
  - ❌ Pantalla en blanco
  - ❌ Loop infinito
  - ❌ Error "Error de identificación"
  - ❌ Cierre automático de sesión

**Resultado Esperado (❌ SI HAY PROBLEMA):**
- Pantalla en blanco
- Loop de login
- Error en consola relacionado con RLS o perfil no encontrado

---

## 🔍 PASO 5: Verificar Consola del Navegador
**Acción:** Abrir DevTools (F12) y revisar la consola durante el login

**Logs Esperados (✅ CORRECTO):**
```
✅ Profile found successfully
✅ User profile loaded
✅ Redirecting to dashboard
```

**Logs de Error (❌ SI HAY PROBLEMA):**
```
❌ Error fetching profile: PGRST301 (403 Forbidden)
❌ No se encontró perfil para el usuario
❌ Retrying fetchUserProfile...
```

---

## 📊 CHECKLIST DE VERIFICACIÓN

- [ ] Política RLS verificada (1 política SELECT correcta)
- [ ] Usuario Manager creado desde admin panel
- [ ] Usuario registrado exitosamente
- [ ] Login exitoso sin pantalla en blanco
- [ ] Login exitoso sin loop infinito
- [ ] Redirección correcta al dashboard
- [ ] Consola sin errores críticos
- [ ] Perfil cargado correctamente (verificar en React DevTools)

---

## 🚨 SI ALGO FALLA

### Error: "Pantalla en blanco" o "Loop infinito"
**Diagnóstico:**
1. Revisar consola del navegador
2. Verificar que la política RLS esté aplicada
3. Verificar que `auth_user_id` esté vinculado en `public.users`

**Solución:**
- Ejecutar nuevamente `fix_rls_users_circular_dependency.sql`
- Verificar que el usuario tenga `auth_user_id` no nulo después del registro

### Error: "Perfil no encontrado"
**Diagnóstico:**
- El `auth_user_id` no se vinculó correctamente durante el registro

**Solución:**
- Verificar en Supabase que el usuario en `public.users` tenga `auth_user_id` = UUID de `auth.users`
- Si está NULL, ejecutar manualmente:
  ```sql
  UPDATE public.users 
  SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'gerente.test@example.com')
  WHERE email = 'gerente.test@example.com';
  ```

---

## ✅ ÉXITO COMPLETO

Si todos los pasos se completan sin errores, significa que:
1. ✅ La política RLS está funcionando correctamente
2. ✅ El flujo de registro vincula perfiles correctamente
3. ✅ El login no tiene race conditions
4. ✅ El sistema es resiliente a errores de red

**El sistema está listo para producción en cuanto a autenticación.**



