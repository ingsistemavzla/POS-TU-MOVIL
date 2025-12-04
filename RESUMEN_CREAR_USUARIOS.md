# 📋 RESUMEN: Cómo Crear Usuarios de Forma Segura

## ✅ MÉTODO MÁS FÁCIL: Panel Admin (Frontend)

### Paso 1: Login como Admin
- Entra al sistema como **Admin** o **Master Admin**

### Paso 2: Ir a Panel de Usuarios
- Click en **"Usuarios"** o **"Users"** en el menú
- Click en **"Crear Usuario"** o **"Nuevo Usuario"**

### Paso 3: Completar Formulario
- **Nombre:** Nombre completo
- **Email:** Email único (ej: `gerente@tienda.com`)
- **Contraseña:** Contraseña segura (mínimo 8 caracteres)
- **Rol:** 
  - `admin` → No necesita tienda
  - `manager` → **DEBE** tener tienda asignada
  - `cashier` → **DEBE** tener tienda asignada
- **Tienda Asignada:** 
  - Si es `admin` → Dejar vacío
  - Si es `manager` o `cashier` → Seleccionar la tienda

### Paso 4: Crear y Verificar
- Click en **"Crear"** o **"Guardar"**
- El usuario aparece en la lista
- El usuario puede hacer login inmediatamente

---

## 🔧 MÉTODO ALTERNATIVO: SQL (Solo si Panel Admin no funciona)

### Paso 1: Verificar Email
```sql
-- Verificar que el email NO existe
SELECT email FROM auth.users WHERE email = 'nuevo_usuario@ejemplo.com';
SELECT email FROM public.users WHERE email = 'nuevo_usuario@ejemplo.com';
```

**Si existe:** NO crear. Usar script de corrección.

---

### Paso 2: Crear Perfil en public.users
```sql
INSERT INTO public.users (
  auth_user_id,  -- NULL (se vinculará después)
  company_id,
  email,
  name,
  role,
  assigned_store_id,
  active
) VALUES (
  NULL,
  'aa11bb22-cc33-dd44-ee55-ff6677889900',  -- ⚠️ Tu company_id
  'nuevo_usuario@ejemplo.com',
  'Nombre Completo',
  'manager',  -- 'admin', 'manager', o 'cashier'
  '88aef8e3-df42-4706-a919-a993df60e593',  -- ⚠️ NULL si es admin
  true
);
```

---

### Paso 3: Usuario Debe Registrarse
- El usuario va a la página de **Registro**
- Usa el **mismo email** que se usó en el paso 2
- Crea su contraseña
- El sistema **vincula automáticamente** el perfil

---

### Paso 4: Verificar
```sql
-- Ejecutar verificar_usuario_creado.sql
-- Reemplazar el email antes de ejecutar
```

---

## ⚠️ REGLAS IMPORTANTES

1. ✅ **Email debe ser único** en todo el sistema
2. ✅ **Manager/Cashier DEBE tener tienda asignada**
3. ✅ **Admin NO debe tener tienda asignada** (NULL)
4. ✅ **Verificar vinculación** después de crear

---

## 🔍 SOLUCIÓN DE PROBLEMAS

### Problema: Usuario Creado pero No Puede Hacer Login

**Causa:** Usuario existe en `public.users` pero NO en `auth.users`

**Solución:**
1. El usuario debe **registrarse** desde la página de registro
2. Usar el **mismo email** que se usó al crear el perfil
3. El sistema vinculará automáticamente

---

### Problema: Usuario Puede Hacer Login pero Ve Pantalla Negra

**Causa:** Usuario existe en `auth.users` pero NO en `public.users`

**Solución:**
1. Ejecutar script de corrección (ver `GUIA_CREAR_USUARIOS_SEGURO.md`)
2. O crear perfil manualmente en `public.users`

---

## 📋 CHECKLIST RÁPIDO

### Antes de Crear:
- [ ] Email no existe en el sistema
- [ ] Tienda asignada existe (si es manager/cashier)
- [ ] Rol es correcto

### Después de Crear:
- [ ] Usuario existe en `public.users`
- [ ] Usuario puede hacer login (o debe registrarse)
- [ ] Usuario ve solo su tienda (si es manager/cashier)

---

## 🚀 ACCIÓN INMEDIATA

1. **Usar Panel Admin** (método más fácil)
2. **Si no funciona**, usar SQL (ver `crear_usuario_seguro.sql`)
3. **Verificar** con `verificar_usuario_creado.sql`
4. **Notificar al usuario** que debe registrarse (si se creó solo el perfil)

---

## 📚 ARCHIVOS DE REFERENCIA

- `GUIA_CREAR_USUARIOS_SEGURO.md` - Guía completa detallada
- `crear_usuario_seguro.sql` - Script SQL para crear usuario
- `verificar_usuario_creado.sql` - Script para verificar usuario


