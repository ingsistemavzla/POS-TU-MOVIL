# 🔒 AUDITORÍA DE SEGURIDAD: Cambio de Credenciales de Usuario de Alto Nivel

**Fecha:** 2025-01-27  
**Auditor:** Sistema de Seguridad  
**Objetivo:** Evaluar el riesgo de pérdida de acceso al cambiar credenciales de un "Gerente de Gerencia" que supervisa TODAS las sucursales

---

## 📋 RESUMEN EJECUTIVO

**VEREDICTO:** ✅ **SEGURO PARA RECREAR** - El acceso multi-sucursal está **ligado al ROL** (`role = 'admin'`), NO al `user_id` específico. Sin embargo, se requiere **cuidado especial** al actualizar el `auth_user_id` en la tabla `public.users`.

**RIESGO IDENTIFICADO:** ⚠️ **MEDIO** - Si el `auth_user_id` no se actualiza correctamente después de recrear el usuario en `auth.users`, el usuario perderá acceso temporalmente hasta que se vincule el nuevo `auth_user_id`.

---

## 1️⃣ ANÁLISIS DE AUTORIZACIÓN (Frontend y RLS)

### 1.1 Lógica Frontend: "Todas las Sucursales" vs "Una Sucursal"

**Archivo:** `src/contexts/StoreContext.tsx` (Líneas 50-74)

```typescript
if (userProfile.role === 'cashier' || userProfile.role === 'manager') {
  // Los cajeros y gerentes solo ven su tienda asignada
  if (userProfile.assigned_store_id) {
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, business_name, tax_id, fiscal_address, phone_fiscal, email_fiscal')
      .eq('id', userProfile.assigned_store_id)
      .eq('active', true)
      .single();
    stores = store ? [store] : [];
  }
} else {
  // Solo administradores ven todas las tiendas
  const { data: allStores, error: allStoresError } = await supabase
    .from('stores')
    .select('id, name, business_name, tax_id, fiscal_address, phone_fiscal, email_fiscal')
    .eq('company_id', company.id)
    .eq('active', true)
    .order('name');
  stores = allStores || [];
}
```

**DECISIÓN:** Basada en `userProfile.role`:
- Si `role === 'admin'` o `role === 'master_admin'` → Ve **TODAS las tiendas** de su `company_id`
- Si `role === 'manager'` o `role === 'cashier'` → Ve **SOLO** su `assigned_store_id`

**✅ CONCLUSIÓN:** El acceso está ligado al **ROL**, no al `user_id`.

---

### 1.2 Políticas RLS (Row Level Security)

**Archivo:** `rls_complete_master.sql` (Líneas 136-148)

#### Política RLS para `public.stores`:

```sql
CREATE POLICY "stores_select_policy" ON public.stores
  FOR SELECT USING (
    -- Multitenancy: siempre filtrar por company_id
    company_id = public.get_user_company_id()
    AND (
      -- Global admins (master_admin/admin): ven todas las stores de su company
      public.is_global_admin()
      OR
      -- Managers/Cashiers: solo su assigned_store
      (public.get_user_store_id() IS NOT NULL AND id = public.get_user_store_id())
    )
  );
```

#### Funciones Auxiliares RLS:

**Archivo:** `rls_complete_master.sql` (Líneas 77-88)

```sql
-- Función: Verificar si el usuario es admin global (master_admin o admin)
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('master_admin', 'admin')
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
```

**Archivo:** `rls_complete_master.sql` (Líneas 38-49)

```sql
-- Función: Obtener assigned_store_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT assigned_store_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
```

**✅ CONCLUSIÓN:** Las políticas RLS verifican el **ROL** (`role IN ('master_admin', 'admin')`) y el `assigned_store_id`, NO un `user_id` específico. El acceso se determina por:
1. `auth.uid()` → Busca en `public.users` donde `auth_user_id = auth.uid()`
2. `role` → Si es `'admin'` o `'master_admin'`, ve todas las tiendas
3. `assigned_store_id` → Si es `'manager'` o `'cashier'`, solo ve su tienda asignada

---

### 1.3 IDs Hardcodeados o Configuraciones Especiales

**Búsqueda realizada:** No se encontraron IDs de usuarios hardcodeados en el código de producción.

**Archivos revisados:**
- `src/contexts/StoreContext.tsx` ✅ Sin IDs hardcodeados
- `src/pages/AlmacenPage.tsx` ✅ Sin IDs hardcodeados
- `src/pages/ArticulosPage.tsx` ✅ Sin IDs hardcodeados
- `src/components/layout/MainLayout.tsx` ✅ Sin IDs hardcodeados

**⚠️ NOTA:** Se encontraron algunos UUIDs hardcodeados en scripts SQL de corrección/migración (ej: `corregir_visibilidad_admin_panel.sql`), pero estos son scripts temporales de mantenimiento, no código de producción.

**✅ CONCLUSIÓN:** No hay IDs de usuarios hardcodeados que otorguen permisos especiales.

---

## 2️⃣ ANÁLISIS DE IDENTIDAD (Tabla de Perfiles)

### 2.1 Tabla Pública de Perfiles

**Tabla:** `public.users`

**Archivo de Definición:** `supabase/migrations/20250822150200_306f5474-1a01-445e-bba2-bb270dd1f89a.sql` (Líneas 12-22)

```sql
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Columna Agregada Posteriormente:**

**Archivo:** `supabase/migrations/20250827042900_enforce_store_assignment.sql`

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS assigned_store_id UUID REFERENCES public.stores(id);
```

---

### 2.2 Campo que Determina la Jerarquía

**Campo Principal:** `role` (TEXT NOT NULL)

**Valores Permitidos:**
- `'master_admin'` - Administrador maestro (acceso total, todas las compañías)
- `'admin'` - Administrador de compañía (acceso total dentro de su compañía, **ve todas las sucursales**)
- `'manager'` - Gerente (acceso limitado a su sucursal asignada)
- `'cashier'` - Cajero (acceso limitado a su sucursal asignada)

**Campo Secundario:** `assigned_store_id` (UUID, nullable)
- **NULL** para `'admin'` y `'master_admin'` → Acceso a todas las sucursales
- **NOT NULL** para `'manager'` y `'cashier'` → Acceso solo a la sucursal asignada

**Constraint:** `CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier'))`

---

### 2.3 Tabla de Relación "Muchos a Muchos"

**❌ NO EXISTE** una tabla de relación `user_branches` o similar.

**Acceso por Rol:**
- El acceso multi-sucursal es **implícito** por tener `role = 'admin'` o `role = 'master_admin'`
- El acceso a una sola sucursal es **explícito** mediante `assigned_store_id` para roles `'manager'` y `'cashier'`

**✅ CONCLUSIÓN:** El acceso es **determinado por el ROL**, no por una tabla de relación. Un usuario con `role = 'admin'` automáticamente ve todas las sucursales de su `company_id`.

---

## 3️⃣ MECANISMO DE ACTUALIZACIÓN

### 3.1 Función de Actualización de Usuario

**Archivo:** `supabase/migrations/20250107000001_update_user_and_reset_password.sql`

**Función RPC:** `public.update_user_profile()`

```sql
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id uuid,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_assigned_store_id uuid DEFAULT NULL,
  p_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
```

**Características:**
- ✅ Actualiza `public.users` (nombre, email, rol, sucursal, estado activo)
- ✅ Actualiza `auth.users` (email) si cambia
- ✅ **NO actualiza `auth_user_id`** - Esto debe hacerse manualmente si se recrea el usuario en `auth.users`

**Validaciones:**
- Solo admins pueden ejecutar la función (`IF NOT public.is_admin()`)
- Protege al último admin activo (no permite cambiar su rol)
- Si se cambia el rol a `'admin'`, automáticamente establece `assigned_store_id = NULL`

---

### 3.2 Función de Restablecimiento de Contraseña

**Archivo:** `supabase/migrations/20250107000001_update_user_and_reset_password.sql`

**Función RPC:** `public.reset_user_password()`

```sql
CREATE OR REPLACE FUNCTION public.reset_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
```

**Características:**
- ✅ Actualiza `auth.users.encrypted_password` directamente usando `crypt()` (bcrypt)
- ✅ **NO requiere re-confirmación de email**
- ✅ Usa `SECURITY DEFINER` para tener permisos de actualización en `auth.users`

**Validaciones:**
- Solo admins pueden ejecutar la función
- Previene que un admin cambie su propia contraseña desde este módulo
- Valida longitud mínima de contraseña (6 caracteres)

---

### 3.3 Mecanismo de Actualización en el Frontend

**Archivo:** `src/pages/Users.tsx` (Líneas 372-422)

```typescript
const updateUser = async (): Promise<boolean> => {
  // ...
  const { data: rpcData, error: rpcError } = await (supabase as any)
    .rpc('update_user_profile', {
      p_user_id: editingUser.id,
      p_name: editingUser.name,
      p_email: editingUser.email,
      p_role: editingUser.role,
      p_assigned_store_id: editingUser.assigned_store_id || null,
      p_active: editingUser.active
    });
  // ...
};
```

**Archivo:** `src/pages/Users.tsx` (Líneas 448-515)

```typescript
const resetPassword = async () => {
  // ...
  const { data: rpcData, error: rpcError } = await (supabase as any)
    .rpc('reset_user_password', {
      p_user_id: targetUser.id,
      p_new_password: newPassword
    });
  // ...
};
```

**✅ CONCLUSIÓN:** El sistema usa **RPC administrativas** (`update_user_profile`, `reset_user_password`) que actualizan directamente en la base de datos. **NO usa** `supabase.auth.updateUser()` del cliente (que requeriría re-confirmación de email).

---

## 🎯 VEREDICTO FINAL

### ✅ **SEGURO PARA RECREAR** - Con Precauciones

**Razón Principal:** El acceso multi-sucursal está **ligado al ROL** (`role = 'admin'`), NO al `user_id` específico.

**Proceso Seguro de Cambio de Credenciales:**

1. **Antes de Recrear:**
   - Anotar el `id` (UUID) del usuario en `public.users` (NO el `auth_user_id`)
   - Anotar el `role`, `company_id`, `assigned_store_id`, y otros datos del perfil

2. **Recrear Usuario en `auth.users`:**
   - Crear nuevo usuario en `auth.users` con el mismo email (o nuevo email)
   - Obtener el nuevo `auth_user_id` (será diferente al anterior)

3. **Actualizar `public.users`:**
   ```sql
   UPDATE public.users
   SET 
     auth_user_id = '<nuevo_auth_user_id>',
     email = '<nuevo_email>',  -- Si cambió
     updated_at = NOW()
   WHERE id = '<id_del_perfil_en_public_users>';
   ```

4. **Verificar:**
   - El `role` debe permanecer como `'admin'` (o `'master_admin'`)
   - El `assigned_store_id` debe ser `NULL` (para acceso a todas las sucursales)
   - El `company_id` debe permanecer igual

**⚠️ RIESGO IDENTIFICADO:**
- Si el `auth_user_id` no se actualiza correctamente, el usuario perderá acceso temporalmente
- Las políticas RLS dependen de `auth.uid()` coincidiendo con `auth_user_id` en `public.users`

**✅ RECOMENDACIÓN:**
- Usar la función `update_user_profile()` para actualizar el email si cambia
- Actualizar manualmente el `auth_user_id` en `public.users` después de recrear el usuario en `auth.users`
- Verificar que el usuario puede iniciar sesión y ve todas las sucursales después del cambio

---

## 📊 TABLAS Y CAMPOS CRÍTICOS

| Tabla | Campo | Tipo | Propósito | Crítico para Acceso |
|-------|-------|------|-----------|---------------------|
| `public.users` | `id` | UUID | Identificador del perfil | ❌ No (solo referencia interna) |
| `public.users` | `auth_user_id` | UUID | Vinculación con `auth.users` | ✅ **SÍ** (RLS lo usa) |
| `public.users` | `role` | TEXT | Determina permisos | ✅ **SÍ** (admin = todas las sucursales) |
| `public.users` | `company_id` | UUID | Multitenancy | ✅ **SÍ** (filtra por compañía) |
| `public.users` | `assigned_store_id` | UUID | Sucursal asignada | ⚠️ Solo para managers/cashiers |
| `auth.users` | `id` | UUID | Identificador de autenticación | ✅ **SÍ** (debe coincidir con `auth_user_id`) |

---

## 🔐 FRAGMENTO DE CÓDIGO CRÍTICO

### Política RLS que Permite Ver "Todas las Tiendas":

**Archivo:** `rls_complete_master.sql` (Líneas 136-148)

```sql
CREATE POLICY "stores_select_policy" ON public.stores
  FOR SELECT USING (
    -- Multitenancy: siempre filtrar por company_id
    company_id = public.get_user_company_id()
    AND (
      -- Global admins (master_admin/admin): ven todas las stores de su company
      public.is_global_admin()  -- ← ESTO VERIFICA: role IN ('master_admin', 'admin')
      OR
      -- Managers/Cashiers: solo su assigned_store
      (public.get_user_store_id() IS NOT NULL AND id = public.get_user_store_id())
    )
  );
```

**Función `is_global_admin()`:**

```sql
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('master_admin', 'admin')  -- ← VERIFICA EL ROL, NO EL USER_ID
  FROM public.users
  WHERE auth_user_id = auth.uid()  -- ← USA auth.uid() PARA BUSCAR EL PERFIL
  LIMIT 1;
$$;
```

---

## ✅ CONCLUSIÓN FINAL

**El acceso multi-sucursal está ligado al ROL (`role = 'admin'`), NO al `user_id` específico.**

**Proceso Seguro:**
1. Recrear usuario en `auth.users` → Obtener nuevo `auth_user_id`
2. Actualizar `public.users.auth_user_id` con el nuevo valor
3. Mantener `role = 'admin'` y `assigned_store_id = NULL`
4. El usuario mantendrá acceso a todas las sucursales

**⚠️ Precauciones:**
- Actualizar `auth_user_id` inmediatamente después de recrear el usuario
- Verificar que el usuario puede iniciar sesión después del cambio
- No cambiar el `role` ni el `company_id` durante el proceso





