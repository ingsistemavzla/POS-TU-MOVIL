# 🔐 INSTRUCCIONES: Login con Perfil Válido

## 📋 INFORMACIÓN DEL PERFIL VÁLIDO

**Email:** `tumovilcentro4@gmail.com`  
**ID Perfil:** `6bc65d7c-c858-4457-a4cf-0b3670a4a082`  
**ID Auth:** `a0d30702-6fbf-46ae-9144-bd381e73e878`  
**Company ID:** `db66d95b-9a33-4b4b-9157-5e34d5fb610a`  
**Nombre:** Tu Movil Centro

---

## ✅ PASO 1: Verificar el Perfil

Antes de intentar login, ejecuta en Supabase SQL Editor:

```sql
-- Copia y pega el contenido de: VERIFICAR_PERFIL_VALIDO_LOGIN.sql
```

Esto verificará:
- ✅ Que el perfil existe en `public.users`
- ✅ Que existe en `auth.users`
- ✅ Que están correctamente vinculados
- ✅ Que el email coincide
- ✅ Que el usuario está activo
- ✅ Que el email está confirmado

---

## 🔐 PASO 2: Intentar Login

### **Opción A: Desde la Aplicación Web**

1. Abre tu aplicación en el navegador
2. Ve a la página de login
3. Ingresa:
   - **Email:** `tumovilcentro4@gmail.com`
   - **Contraseña:** [La contraseña que se configuró para este usuario]

### **Opción B: Verificar Contraseña en Base de Datos**

Si no conoces la contraseña, puedes verificar si existe en `auth.users`:

```sql
-- ⚠️ NOTA: Las contraseñas están encriptadas, no se pueden leer directamente
-- Pero puedes verificar si el usuario tiene una contraseña configurada

SELECT 
  id,
  email,
  encrypted_password IS NOT NULL AS tiene_password,
  email_confirmed_at IS NOT NULL AS email_confirmado,
  created_at
FROM auth.users
WHERE id = 'a0d30702-6fbf-46ae-9144-bd381e73e878';
```

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### **Problema 1: "Usuario no encontrado"**

**Causa:** El perfil no existe o está en otra empresa.

**Solución:**
```sql
-- Verificar que el perfil existe
SELECT * FROM public.users 
WHERE email = 'tumovilcentro4@gmail.com';
```

---

### **Problema 2: "Email no confirmado"**

**Causa:** El email no está confirmado en `auth.users`.

**Solución:**
```sql
-- Forzar confirmación de email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = 'a0d30702-6fbf-46ae-9144-bd381e73e878';
```

---

### **Problema 3: "Usuario inactivo"**

**Causa:** El usuario está marcado como `active = false` en `public.users`.

**Solución:**
```sql
-- Activar el usuario
UPDATE public.users
SET active = true
WHERE id = '6bc65d7c-c858-4457-a4cf-0b3670a4a082';
```

---

### **Problema 4: "Contraseña incorrecta"**

**Causa:** La contraseña no coincide o no está configurada.

**Solución:** Si necesitas resetear la contraseña, usa la función de reset:

```sql
-- Si tienes una función de reset de contraseña
SELECT reset_user_password(
  '6bc65d7c-c858-4457-a4cf-0b3670a4a082'::uuid,
  'NuevaContraseña123!'
);
```

O manualmente (requiere conocer el hash):
```sql
-- ⚠️ SOLO SI SABES LO QUE HACES
-- Esto requiere generar un hash bcrypt de la contraseña
UPDATE auth.users
SET encrypted_password = crypt('NuevaContraseña123!', gen_salt('bf', 10))
WHERE id = 'a0d30702-6fbf-46ae-9144-bd381e73e878';
```

---

## 📊 CHECKLIST DE VERIFICACIÓN

Antes de intentar login, verifica:

- [ ] El perfil existe en `public.users`
- [ ] El perfil existe en `auth.users`
- [ ] `auth_user_id` está correctamente vinculado
- [ ] El email coincide en ambas tablas
- [ ] El usuario está activo (`active = true`)
- [ ] El email está confirmado (`email_confirmed_at IS NOT NULL`)
- [ ] La contraseña está configurada (`encrypted_password IS NOT NULL`)

---

## 🔍 VERIFICACIÓN POST-LOGIN

Si el login es exitoso, verifica:

1. **Que el usuario puede ver su empresa:**
   ```sql
   SELECT public.get_user_company_id();
   -- Debe retornar: db66d95b-9a33-4b4b-9157-5e34d5fb610a
   ```

2. **Que el usuario tiene el rol correcto:**
   ```sql
   SELECT role FROM public.users 
   WHERE auth_user_id = auth.uid();
   ```

3. **Que el usuario puede ver sus datos:**
   - Verificar que puede acceder al dashboard
   - Verificar que puede ver productos/ventas de su empresa

---

## 📝 NOTAS IMPORTANTES

1. **Empresa:** Este usuario pertenece a la empresa `db66d95b-9a33-4b4b-9157-5e34d5fb610a`
2. **RLS:** El usuario solo verá datos de su empresa (Row Level Security)
3. **Perfil Huérfano:** Ya fue eliminado, no debería causar conflictos
4. **Duplicados:** Si hay otro usuario con el mismo email en otra empresa, no afectará este login

---

## ✅ CONCLUSIÓN

Una vez que:
1. ✅ El perfil huérfano sea eliminado
2. ✅ El perfil válido esté verificado
3. ✅ El usuario esté activo y el email confirmado

El usuario debería poder iniciar sesión sin problemas con:
- **Email:** `tumovilcentro4@gmail.com`
- **Contraseña:** [La contraseña configurada]





