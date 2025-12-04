# 🔧 GUÍA: Resolución de Usuarios Huérfanos e Inconsistencias

## 🔴 PROBLEMA IDENTIFICADO

**Síntomas:**
- Usuario existe en `auth.users` (puede hacer login en Supabase Auth)
- Usuario NO aparece en el panel admin (`/usuarios`)
- No se puede crear el usuario desde el panel (error: "email ya registrado")
- No se puede registrar desde el login (error: "email ya existe")

**Causa Raíz:**
1. Usuario se registró directamente en `auth.users` (sin pasar por el panel admin)
2. No se creó el perfil correspondiente en `public.users`
3. La función `create_user_atomic_admin` solo verifica `public.users`, no `auth.users`
4. El panel admin filtra por `company_id`, y sin perfil no hay `company_id`

---

## 📋 PASOS DE RESOLUCIÓN

### **PASO 1: Diagnóstico (Identificar el Problema)**

Ejecuta en **Supabase SQL Editor** el script:
```
diagnosticar_usuarios_huérfanos.sql
```

**Resultado Esperado:**
- Verás una lista de usuarios con problemas:
  - 🔴 **USUARIO HUÉRFANO EN AUTH**: Existe en `auth.users` pero NO en `public.users`
  - 🟡 **PERFIL SIN VINCULAR**: Existe en `public.users` pero sin `auth_user_id`
  - 🟢 **POSIBLE VINCULACIÓN**: Pueden vincularse por email
  - 🔵 **PERFIL SIN COMPANY_ID**: No aparecen en el panel admin

**Anota el email del usuario problemático.**

---

### **PASO 2: Corrección Automática (Recomendado)**

Ejecuta en **Supabase SQL Editor** el script:
```
corregir_usuarios_huérfanos.sql
```

**Este script:**
- ✅ Vincula usuarios de `auth.users` con perfiles en `public.users` por email
- ✅ Crea perfiles faltantes para usuarios en `auth.users`
- ✅ Asigna `company_id` cuando sea posible desde metadata

**Resultado Esperado:**
```
✅ Vinculación completada: X perfiles vinculados
✅ Creación completada: Y perfiles creados
```

---

### **PASO 3: Actualizar Función de Creación (Prevenir Futuros Problemas)**

Ejecuta en **Supabase SQL Editor** el script:
```
fix_create_user_atomic_admin_mejorado.sql
```

**Esta función mejorada:**
- ✅ Detecta si el email existe en `auth.users` y vincula automáticamente
- ✅ Detecta si el email existe en `public.users` sin `auth_user_id` y lo vincula
- ✅ Maneja todos los casos de inconsistencia

**Resultado Esperado:**
- La función ahora maneja inteligentemente los casos edge

---

### **PASO 4: Verificación Manual (Si la Corrección Automática No Funciona)**

Si el usuario problemático aún no aparece, ejecuta manualmente:

```sql
-- 1. Identificar el usuario en auth.users
SELECT id, email, created_at, raw_user_meta_data
FROM auth.users
WHERE email = 'EMAIL_DEL_USUARIO_PROBLEMATICO@example.com';

-- 2. Verificar si existe perfil
SELECT * FROM public.users
WHERE email = 'EMAIL_DEL_USUARIO_PROBLEMATICO@example.com';

-- 3. Si NO existe perfil, crear uno manualmente
-- (Reemplaza los valores según tu caso)
INSERT INTO public.users (
  auth_user_id,
  company_id,
  email,
  name,
  role,
  active,
  created_at,
  updated_at
) VALUES (
  'AUTH_USER_ID_DE_LA_CONSULTA_1',  -- UUID del paso 1
  'COMPANY_ID_DEL_ADMIN',            -- UUID de la compañía
  'EMAIL_DEL_USUARIO_PROBLEMATICO@example.com',
  'Nombre del Usuario',
  'manager',  -- o 'admin', 'cashier'
  true,
  NOW(),
  NOW()
);

-- 4. Si existe perfil pero sin auth_user_id, vincularlo
UPDATE public.users
SET 
  auth_user_id = 'AUTH_USER_ID_DE_LA_CONSULTA_1',
  updated_at = NOW()
WHERE email = 'EMAIL_DEL_USUARIO_PROBLEMATICO@example.com'
  AND auth_user_id IS NULL;
```

---

### **PASO 5: Verificación Final**

1. **En Supabase SQL Editor:**
   ```sql
   -- Verificar que el usuario esté vinculado
   SELECT 
     au.id AS auth_id,
     au.email,
     pu.id AS profile_id,
     pu.name,
     pu.role,
     pu.company_id
   FROM auth.users au
   LEFT JOIN public.users pu ON pu.auth_user_id = au.id
   WHERE au.email = 'EMAIL_DEL_USUARIO_PROBLEMATICO@example.com';
   ```
   
   **Resultado Esperado:**
   - Debe mostrar `auth_id` y `profile_id` (ambos con valores)

2. **En el Panel Admin (`/usuarios`):**
   - Refrescar la página
   - El usuario debe aparecer en la lista correspondiente a su rol
   - Debe poder editarse y gestionarse normalmente

3. **Login del Usuario:**
   - El usuario debe poder hacer login normalmente
   - No debe haber pantalla en blanco ni loop infinito

---

## 🎯 CASOS ESPECÍFICOS

### **Caso A: Usuario se Registró Antes de Ser Creado por Admin**

**Solución:** Ejecutar `corregir_usuarios_huérfanos.sql` o usar la función mejorada `create_user_atomic_admin` que detectará y vinculará automáticamente.

### **Caso B: Admin Creó Usuario pero Usuario se Registró con Email Diferente**

**Solución:** 
1. Verificar ambos emails en `auth.users` y `public.users`
2. Si son diferentes, decidir cuál es el correcto
3. Actualizar manualmente el email en el perfil o en auth.users

### **Caso C: Perfil Existe pero Sin company_id (No Aparece en Panel)**

**Solución:**
```sql
UPDATE public.users
SET company_id = 'COMPANY_ID_CORRECTO'
WHERE email = 'EMAIL_DEL_USUARIO@example.com'
  AND company_id IS NULL;
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Script de diagnóstico ejecutado
- [ ] Usuarios huérfanos identificados
- [ ] Script de corrección ejecutado
- [ ] Función mejorada instalada
- [ ] Usuario aparece en panel admin
- [ ] Usuario puede hacer login
- [ ] No hay errores en consola del navegador
- [ ] Perfil tiene `auth_user_id` vinculado
- [ ] Perfil tiene `company_id` asignado

---

## 🚨 SI NADA FUNCIONA

1. **Verificar RLS Policies:**
   - Asegúrate de que las políticas RLS permitan leer `public.users`
   - Ejecuta `verificar_politica_rls.sql`

2. **Verificar Permisos:**
   - El usuario admin debe tener permisos para crear usuarios
   - Verificar que `is_admin()` retorne `true`

3. **Contactar Soporte:**
   - Si el problema persiste, puede ser un problema de configuración de Supabase
   - Revisar logs de Supabase Dashboard

---

## 📝 NOTAS IMPORTANTES

- ⚠️ **Backup:** Siempre haz backup antes de ejecutar scripts de corrección
- 🔒 **Seguridad:** Los scripts usan `SECURITY DEFINER`, ejecutar con precaución
- 🔄 **Sincronización:** Después de corregir, refrescar el panel admin
- 📊 **Monitoreo:** Ejecutar el diagnóstico periódicamente para detectar nuevos casos



