# 📋 GUÍA PASO A PASO: Crear Usuarios de Forma Segura

## ✅ VERIFICACIÓN PREVIA

Antes de crear un usuario, verifica:
- [ ] Tienes permisos de administrador
- [ ] La tienda asignada existe y está activa
- [ ] El email no está en uso
- [ ] El rol es correcto (admin, manager, cashier)

---

## 🎯 MÉTODO RECOMENDADO: Panel Admin (Frontend)

### PASO 1: Acceder al Panel de Usuarios
1. Login como **Admin** o **Master Admin**
2. Navegar a **"Usuarios"** o **"Users"** en el menú
3. Click en **"Crear Usuario"** o **"Nuevo Usuario"**

### PASO 2: Completar Formulario
1. **Nombre:** Nombre completo del usuario
2. **Email:** Email único (no debe existir en el sistema)
3. **Contraseña:** Contraseña segura (mínimo 8 caracteres)
4. **Rol:** Seleccionar rol:
   - `admin` - Administrador (puede ver todo de la compañía)
   - `manager` - Gerente (solo ve su tienda asignada)
   - `cashier` - Cajero (solo ve su tienda asignada)
5. **Tienda Asignada:** 
   - Si es `admin` → Dejar vacío (NULL)
   - Si es `manager` o `cashier` → Seleccionar la tienda

### PASO 3: Crear Usuario
1. Click en **"Crear"** o **"Guardar"**
2. El sistema creará:
   - ✅ Perfil en `public.users`
   - ✅ Usuario en `auth.users` (si el RPC lo hace)
   - ✅ Vinculación automática

### PASO 4: Verificar Creación
1. El usuario debería aparecer en la lista
2. El usuario puede hacer login inmediatamente (si se creó en `auth.users`)
3. Si no puede hacer login, verificar vinculación (ver "Solución de Problemas")

---

## 🔧 MÉTODO ALTERNATIVO: SQL Directo (Solo para Admins Avanzados)

### ⚠️ ADVERTENCIA
Este método requiere conocimiento de SQL y acceso a Supabase SQL Editor.
Solo usar si el panel admin no funciona o necesitas crear usuarios masivamente.

### PASO 1: Verificar que el Email no Existe

```sql
-- Verificar en auth.users
SELECT id, email, created_at
FROM auth.users
WHERE email = 'nuevo_usuario@ejemplo.com';

-- Verificar en public.users
SELECT id, email, auth_user_id, role, assigned_store_id
FROM public.users
WHERE email = 'nuevo_usuario@ejemplo.com';
```

**Si existe en alguna tabla:** NO crear. Usar script de corrección en su lugar.

---

### PASO 2: Crear Usuario con RPC (RECOMENDADO)

**Usar el RPC `create_user_atomic_admin` si existe:**

```sql
SELECT public.create_user_atomic_admin(
  p_email := 'nuevo_usuario@ejemplo.com',
  p_password := 'ContraseñaSegura123!',
  p_name := 'Nombre Completo',
  p_role := 'manager',  -- 'admin', 'manager', o 'cashier'
  p_company_id := 'aa11bb22-cc33-dd44-ee55-ff6677889900',  -- Tu company_id
  p_assigned_store_id := '88aef8e3-df42-4706-a919-a993df60e593'  -- NULL si es admin
);
```

**Si el RPC no existe o falla**, usar el método manual (PASO 3).

---

### PASO 3: Crear Usuario Manualmente (Solo si RPC no funciona)

#### 3.1: Crear Perfil en `public.users`

```sql
INSERT INTO public.users (
  auth_user_id,  -- NULL inicialmente, se vinculará después
  company_id,
  email,
  name,
  role,
  assigned_store_id,
  active,
  created_at,
  updated_at
) VALUES (
  NULL,  -- Se vinculará cuando el usuario se registre
  'aa11bb22-cc33-dd44-ee55-ff6677889900',  -- Tu company_id
  'nuevo_usuario@ejemplo.com',
  'Nombre Completo',
  'manager',  -- 'admin', 'manager', o 'cashier'
  '88aef8e3-df42-4706-a919-a993df60e593',  -- NULL si es admin
  true,
  NOW(),
  NOW()
) RETURNING id;
```

**Guarda el `id` retornado** (será el `public_user_id`).

#### 3.2: El Usuario Debe Registrarse

El usuario debe:
1. Ir a la página de **Registro**
2. Usar el **mismo email** que se usó en el paso 3.1
3. Crear su contraseña
4. El sistema **automáticamente vinculará** el perfil existente

**El `AuthContext` detectará** que existe un perfil con ese email y lo vinculará automáticamente.

---

### PASO 4: Verificar Creación

```sql
-- Verificar vinculación
SELECT 
  au.id AS "auth_user_id",
  pu.id AS "public_user_id",
  pu.auth_user_id AS "public.auth_user_id",
  pu.email AS "Email",
  pu.name AS "Nombre",
  pu.role AS "Rol",
  pu.assigned_store_id AS "Store ID",
  CASE 
    WHEN au.id IS NULL THEN '❌ No existe en auth.users'
    WHEN pu.id IS NULL THEN '❌ No existe en public.users'
    WHEN pu.auth_user_id IS NULL THEN '⚠️ No vinculado - Usuario debe registrarse'
    WHEN pu.auth_user_id = au.id THEN '✅ Correctamente vinculado'
    ELSE '⚠️ Vinculación incorrecta'
  END AS "Estado"
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.email = pu.email OR pu.auth_user_id = au.id
WHERE au.email = 'nuevo_usuario@ejemplo.com' 
   OR pu.email = 'nuevo_usuario@ejemplo.com';
```

---

## 🔍 SOLUCIÓN DE PROBLEMAS

### Problema 1: Usuario Creado pero No Puede Hacer Login

**Síntomas:**
- Usuario existe en `public.users`
- Usuario NO existe en `auth.users`
- Error: "Usuario no encontrado" o "Database error finding user"

**Solución:**
1. El usuario debe **registrarse** desde la página de registro
2. Usar el **mismo email** que se usó al crear el perfil
3. El sistema vinculará automáticamente

**Si aún no funciona:**
- Ejecutar `corregir_usuario_zonagamer.sql` (adaptado para el email del usuario)
- O usar el RPC `link_user_profile_by_email` después de que el usuario se registre

---

### Problema 2: Usuario Existe en `auth.users` pero No en `public.users`

**Síntomas:**
- Usuario puede hacer login
- Error: "Database error querying schema"
- Pantalla negra en dashboard

**Solución:**
1. Ejecutar script de corrección:

```sql
-- Obtener auth_user_id
SELECT id FROM auth.users WHERE email = 'usuario@ejemplo.com';

-- Crear perfil en public.users
INSERT INTO public.users (
  auth_user_id,
  company_id,
  email,
  name,
  role,
  assigned_store_id,
  active
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'usuario@ejemplo.com'),
  'aa11bb22-cc33-dd44-ee55-ff6677889900',  -- Tu company_id
  'usuario@ejemplo.com',
  'Nombre del Usuario',
  'manager',  -- Ajustar según necesidad
  '88aef8e3-df42-4706-a919-a993df60e593',  -- Ajustar según necesidad
  true
);
```

---

### Problema 3: Usuario Existe en Ambos pero No Está Vinculado

**Síntomas:**
- Usuario existe en `auth.users`
- Usuario existe en `public.users`
- `auth_user_id` es NULL en `public.users`
- Usuario no puede hacer login

**Solución:**
1. Ejecutar script de vinculación:

```sql
-- Vincular auth_user_id
UPDATE public.users
SET 
  auth_user_id = (SELECT id FROM auth.users WHERE email = 'usuario@ejemplo.com'),
  updated_at = NOW()
WHERE email = 'usuario@ejemplo.com'
  AND auth_user_id IS NULL;
```

**Si falla por RLS:**
- El usuario debe intentar hacer login/registro
- El `AuthContext` vinculará automáticamente

---

## 📋 CHECKLIST DE CREACIÓN DE USUARIO

### Antes de Crear:
- [ ] Email no existe en `auth.users`
- [ ] Email no existe en `public.users`
- [ ] Tienda asignada existe (si es manager/cashier)
- [ ] Rol es correcto (admin, manager, cashier)

### Después de Crear:
- [ ] Usuario existe en `public.users`
- [ ] Usuario puede hacer login (o debe registrarse)
- [ ] `auth_user_id` está vinculado (después de registro)
- [ ] Usuario ve solo su tienda (si es manager/cashier)
- [ ] Usuario tiene los permisos correctos

---

## 🎯 FLUJO RECOMENDADO COMPLETO

### Para Admin Creando Usuario:

1. **Crear perfil** desde panel admin (o SQL)
2. **Notificar al usuario** que debe registrarse
3. **Usuario se registra** con el mismo email
4. **Sistema vincula automáticamente** el perfil
5. **Usuario puede hacer login** inmediatamente

### Para Usuario Nuevo:

1. **Admin crea perfil** (o usuario se registra directamente)
2. **Usuario se registra** desde página de registro
3. **Sistema crea** `auth.users` y `public.users`
4. **Sistema vincula** automáticamente
5. **Usuario puede hacer login** inmediatamente

---

## ⚠️ REGLAS IMPORTANTES

1. **Email debe ser único** en todo el sistema
2. **Manager/Cashier DEBE tener tienda asignada**
3. **Admin NO debe tener tienda asignada** (NULL)
4. **Contraseña debe ser segura** (mínimo 8 caracteres)
5. **Verificar vinculación** después de crear usuario

---

## 🚀 ACCIÓN INMEDIATA

1. **Usar Panel Admin** (método más seguro)
2. **Si Panel Admin no funciona**, usar RPC `create_user_atomic_admin`
3. **Si RPC no existe**, usar método manual SQL
4. **Verificar creación** con script de verificación
5. **Notificar al usuario** que debe registrarse (si se creó solo el perfil)


