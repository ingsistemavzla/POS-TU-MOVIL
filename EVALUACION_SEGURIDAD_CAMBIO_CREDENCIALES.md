# 🔒 EVALUACIÓN DE SEGURIDAD: Cambio de Credenciales Usuario Admin

**Fecha:** 2025-01-27  
**Objetivo:** Evaluar el riesgo de cambiar email y contraseña de un usuario con rol `'admin'`

---

## 1️⃣ EVALUACIÓN DE RIESGO: Crear vs. Modificar

### ✅ **VEREDICTO: MODIFICAR es la opción MÁS SEGURA**

### 1.1 Estructura de la Tabla `public.users`

**Archivo:** `supabase/migrations/20250822150200_306f5474-1a01-445e-bba2-bb270dd1f89a.sql` (Líneas 12-22)

```sql
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,  -- ⚠️ CRÍTICO: NOT NULL
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Campo Crítico:** `company_id UUID NOT NULL`
- ⚠️ **OBLIGATORIO** - No puede ser NULL
- ⚠️ **FOREIGN KEY** - Referencia a `public.companies(id)`
- ⚠️ **CASCADE DELETE** - Si se elimina la compañía, se eliminan los usuarios

### 1.2 Riesgo de Crear Nuevo Usuario

**❌ PROBLEMAS al crear un nuevo usuario:**

1. **Pérdida de `company_id`:**
   - Si se crea un nuevo registro en `public.users`, se debe asignar manualmente el `company_id`
   - **RIESGO ALTO:** Si se olvida asignar el `company_id`, el usuario quedará "huérfano" sin empresa
   - **RIESGO ALTO:** El constraint `NOT NULL` impedirá la creación si no se asigna

2. **Pérdida de Relaciones:**
   - El usuario puede tener registros relacionados en otras tablas:
     - `inventory_movements.user_id`
     - `sales.cashier_id`
     - Otras referencias por `public.users.id`
   - **RIESGO ALTO:** Si se crea un nuevo `id`, se pierden todas las relaciones históricas

3. **Pérdida de Historial:**
   - Ventas, movimientos de inventario, y otras operaciones están vinculadas al `id` del usuario
   - **RIESGO MEDIO:** Se pierde el historial de operaciones del usuario

4. **Problemas de RLS (Row Level Security):**
   - Las políticas RLS dependen de `auth_user_id` vinculado correctamente
   - **RIESGO ALTO:** Si el nuevo usuario no se vincula correctamente, puede perder acceso a datos

### 1.3 Ventajas de Modificar Usuario Existente

**✅ VENTAJAS al modificar:**

1. **Preservación de `company_id`:**
   - El `company_id` se mantiene intacto
   - **SEGURO:** No hay riesgo de dejar al usuario sin empresa

2. **Preservación de Relaciones:**
   - Todas las relaciones existentes se mantienen
   - **SEGURO:** El historial de operaciones se preserva

3. **Preservación de Permisos:**
   - El rol `'admin'` se mantiene
   - El acceso a todas las sucursales se mantiene (basado en rol)
   - **SEGURO:** No hay riesgo de pérdida de permisos

4. **Actualización Atómica:**
   - Se actualiza `auth.users` y `public.users` en una sola transacción
   - **SEGURO:** Si falla, se revierte todo (ROLLBACK)

---

## 2️⃣ ANÁLISIS DE SEGURIDAD DEL SCRIPT

### 2.1 Validaciones Implementadas

**✅ Validaciones de Seguridad:**

1. **Validación de Email Actual:**
   ```sql
   WHERE email = v_old_email AND role = 'admin'
   ```
   - Solo actualiza usuarios con rol `'admin'`
   - Previene actualización accidental de otros usuarios

2. **Validación de `company_id`:**
   ```sql
   IF v_company_id IS NULL THEN
     RAISE EXCEPTION '❌ ERROR CRÍTICO: El usuario no tiene company_id asignado.';
   END IF;
   ```
   - **CRÍTICO:** Previene dejar al usuario sin empresa

3. **Validación de `auth_user_id`:**
   ```sql
   IF v_auth_user_id IS NULL THEN
     RAISE EXCEPTION '❌ ERROR: El usuario no tiene auth_user_id vinculado.';
   END IF;
   ```
   - Previene actualización de usuarios sin cuenta de autenticación

4. **Validación de Contraseña:**
   ```sql
   IF length(v_new_password) < 6 THEN
     RAISE EXCEPTION '❌ ERROR: La contraseña debe tener al menos 6 caracteres';
   END IF;
   ```
   - Cumple con requisitos mínimos de seguridad

### 2.2 Actualización de `email_confirmed_at`

**✅ CRÍTICO: Forzar Confirmación de Email**

```sql
email_confirmed_at = NOW()
```

**Razón:**
- Si no se fuerza `email_confirmed_at`, Supabase puede requerir confirmación por correo
- **RIESGO:** El usuario quedaría bloqueado hasta confirmar el nuevo email
- **SOLUCIÓN:** Forzar `NOW()` permite acceso inmediato sin confirmación

### 2.3 Actualización en Ambas Tablas

**✅ Sincronización Completa:**

1. **`auth.users`:**
   - Actualiza `email`
   - Actualiza `encrypted_password` (hash bcrypt)
   - Fuerza `email_confirmed_at = NOW()`

2. **`public.users`:**
   - Actualiza `email` para mantener sincronización
   - Preserva `company_id`, `role`, y todas las demás columnas

---

## 3️⃣ RIESGOS RESIDUALES Y MITIGACIONES

### 3.1 Riesgo: Email Duplicado

**RIESGO:** Si el nuevo email ya existe en otro usuario, la actualización puede fallar.

**MITIGACIÓN:**
- El script valida que el usuario existe antes de actualizar
- Si el email ya existe, PostgreSQL lanzará un error de constraint único
- **RECOMENDACIÓN:** Verificar que el nuevo email no esté en uso antes de ejecutar

### 3.2 Riesgo: Pérdida de Sesión Activa

**RIESGO:** Si el usuario está logueado, perderá la sesión al cambiar credenciales.

**MITIGACIÓN:**
- **ESPERADO:** El usuario debe cerrar sesión y volver a iniciar con las nuevas credenciales
- **RECOMENDACIÓN:** Notificar al usuario antes del cambio

### 3.3 Riesgo: Error en Transacción

**RIESGO:** Si falla la actualización de `auth.users` pero no la de `public.users`, habrá inconsistencia.

**MITIGACIÓN:**
- El script usa un bloque `DO $$` que es una transacción implícita
- Si falla cualquier paso, se revierte todo (ROLLBACK)
- **SEGURO:** No hay riesgo de inconsistencia parcial

---

## 4️⃣ VERIFICACIÓN POST-EJECUCIÓN

### 4.1 Checklist de Verificación

Después de ejecutar el script, verificar:

- [ ] El usuario puede iniciar sesión con el nuevo email
- [ ] El usuario puede iniciar sesión con la nueva contraseña
- [ ] El usuario ve todas las sucursales (rol `'admin'` preservado)
- [ ] El `company_id` se mantiene igual
- [ ] El email en `auth.users` coincide con `public.users`

### 4.2 Query de Verificación

```sql
-- Verificar en auth.users
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL AS "Email Confirmado",
  encrypted_password IS NOT NULL AS "Tiene Contraseña",
  updated_at
FROM auth.users
WHERE email = 'NEW_EMAIL';  -- ⚠️ Cambiar por el nuevo email

-- Verificar en public.users
SELECT 
  id,
  auth_user_id,
  email,
  name,
  role,
  company_id,
  active,
  updated_at
FROM public.users
WHERE email = 'NEW_EMAIL';  -- ⚠️ Cambiar por el nuevo email
```

---

## 5️⃣ CONCLUSIÓN

### ✅ **MODIFICAR es la opción MÁS SEGURA**

**Razones:**
1. ✅ Preserva `company_id` (crítico para multitenancy)
2. ✅ Preserva todas las relaciones y historial
3. ✅ Preserva permisos y acceso a sucursales
4. ✅ Actualización atómica (transacción segura)
5. ✅ Validaciones de seguridad implementadas

**Riesgo Residual:** ⚠️ **BAJO**
- El script incluye validaciones exhaustivas
- Usa transacciones para garantizar consistencia
- Fuerza confirmación de email para evitar bloqueos

**Recomendación:** ✅ **PROCEDER con MODIFICACIÓN**

---

## 📋 INSTRUCCIONES DE USO

1. **Abrir Supabase SQL Editor**
2. **Copiar el script** de `SCRIPT_CAMBIO_CREDENCIALES_ADMIN.sql`
3. **Reemplazar placeholders:**
   - `OLD_EMAIL` → Email actual del usuario
   - `NEW_EMAIL` → Nuevo email (o mismo si solo cambias password)
   - `NEW_PASSWORD` → Nueva contraseña (mínimo 6 caracteres)
4. **Ejecutar el script**
5. **Verificar** que el usuario puede iniciar sesión con las nuevas credenciales

---

**FIN DE LA EVALUACIÓN**








