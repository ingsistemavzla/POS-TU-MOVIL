# 🔍 ANÁLISIS EXACTO: Cómo el Rol 'admin' Accede a Todas las Sucursales

**Fecha:** 2025-01-27  
**Objetivo:** Entender la lógica exacta de acceso antes de modificar credenciales

---

## 📋 RESPUESTAS DIRECTAS

### 1. UBICACIÓN DEL ROL Y EMPRESA

**Tabla de Perfil:** `public.users`

**Columna de Empresa:** `company_id`

**Estructura Completa:**
```sql
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,  -- ⚠️ COLUMNA DE EMPRESA
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,               -- ⚠️ VINCULACIÓN CON AUTH
  name TEXT NOT NULL,
  email TEXT NOT NULL,                                                          -- ⚠️ EMAIL DUPLICADO
  role TEXT NOT NULL CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier')),  -- ⚠️ ROL AQUÍ
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Archivo de Definición:** `supabase/migrations/20250822150200_306f5474-1a01-445e-bba2-bb270dd1f89a.sql` (Líneas 12-22)

---

### 2. LÓGICA DE ACCESO TOTAL (RLS)

**Tabla Clave:** `public.stores` (sucursales/tiendas)

**Política RLS:** `stores_select_policy`

**Archivo:** `rls_complete_master.sql` (Líneas 137-148)

```sql
CREATE POLICY "stores_select_policy" ON public.stores
  FOR SELECT USING (
    -- Multitenancy: siempre filtrar por company_id
    company_id = public.get_user_company_id()  -- ← Obtiene company_id del usuario autenticado
    AND (
      -- Global admins (master_admin/admin): ven todas las stores de su company
      public.is_global_admin()  -- ← VERIFICA EL ROL, NO EL EMAIL
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
  SELECT role IN ('master_admin', 'admin')  -- ← VERIFICA EL ROL
  FROM public.users
  WHERE auth_user_id = auth.uid()  -- ← USA auth.uid() (ID de autenticación), NO EMAIL
  LIMIT 1;
$$;
```

**Función `get_user_company_id()`:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()  -- ← USA auth.uid() (ID de autenticación), NO EMAIL
  LIMIT 1;
$$;
```

**✅ CONCLUSIÓN CRÍTICA:**
- **NO depende del email** - Usa `auth.uid()` (ID de autenticación)
- **Depende del ROL** - Verifica `role IN ('master_admin', 'admin')`
- **Depende del `company_id`** - Filtra por empresa del usuario
- **Depende de `auth_user_id`** - Vincula `auth.users.id` con `public.users.auth_user_id`

---

### 3. DEPENDENCIA DE DATOS

**¿El email está duplicado en la tabla pública?**

**✅ SÍ** - La columna `email` existe en `public.users`

**Nombre de Columna:** `email`

**Estructura:**
```sql
email TEXT NOT NULL  -- En public.users
```

**¿Debemos actualizar manualmente?**

**✅ SÍ** - Si cambias el email en `auth.users`, DEBES actualizarlo también en `public.users` para mantener sincronización.

**Razón:**
- El frontend puede leer el email desde `public.users` (más rápido que consultar `auth.users`)
- Algunas funciones RPC pueden usar el email de `public.users` para búsquedas
- Mantener sincronización evita inconsistencias

---

## 🔐 FLUJO DE AUTENTICACIÓN Y ACCESO

### Paso 1: Usuario Inicia Sesión
```
Usuario → auth.users (email + password) → auth.uid() generado
```

### Paso 2: Sistema Busca Perfil
```sql
SELECT * FROM public.users 
WHERE auth_user_id = auth.uid()  -- ← USA EL ID, NO EL EMAIL
```

### Paso 3: RLS Evalúa Acceso
```sql
-- Para ver tiendas:
company_id = get_user_company_id()  -- ← Obtiene company_id del perfil
AND is_global_admin()                -- ← Verifica role IN ('master_admin', 'admin')
```

### Paso 4: Resultado
- Si `role = 'admin'` → Ve TODAS las tiendas de su `company_id`
- Si `role = 'manager'` → Ve SOLO su `assigned_store_id`

---

## ⚠️ PUNTOS CRÍTICOS PARA CAMBIO DE CREDENCIALES

### 1. `auth_user_id` DEBE Estar Vinculado
```sql
-- Si cambias el email pero NO actualizas auth_user_id:
-- ❌ RLS NO funcionará porque no puede encontrar el perfil
WHERE auth_user_id = auth.uid()  -- ← Falla si auth_user_id está desactualizado
```

### 2. `company_id` DEBE Preservarse
```sql
-- Si pierdes el company_id:
-- ❌ RLS bloquea acceso porque no puede filtrar por empresa
company_id = get_user_company_id()  -- ← Retorna NULL si no existe
```

### 3. `role` DEBE Preservarse
```sql
-- Si cambias el role:
-- ❌ Pierde acceso a todas las sucursales
role IN ('master_admin', 'admin')  -- ← Solo estos roles ven todas las tiendas
```

### 4. Email DEBE Sincronizarse
```sql
-- Si cambias email en auth.users pero NO en public.users:
-- ⚠️ Inconsistencia de datos (aunque no bloquea acceso)
-- ✅ Mejor práctica: mantener sincronizado
```

---

## 📊 SALIDA REQUERIDA (RESUMEN)

| Pregunta | Respuesta |
|----------|-----------|
| **Nombre de la tabla de perfil** | `public.users` |
| **Nombre de la columna de empresa** | `company_id` |
| **¿El email está duplicado en la tabla pública?** | **SÍ** - Columna `email` |
| **¿Depende del email para acceso?** | **NO** - Depende de `auth.uid()` y `role` |
| **¿Depende del ID para acceso?** | **SÍ** - `auth_user_id` vincula `auth.users.id` con `public.users.auth_user_id` |
| **¿Depende del rol para acceso?** | **SÍ** - `role IN ('master_admin', 'admin')` |

---

## ✅ VEREDICTO FINAL

**El acceso NO depende del email, sino de:**
1. ✅ `auth_user_id` (vinculación entre `auth.users` y `public.users`)
2. ✅ `role` (debe ser `'admin'` o `'master_admin'`)
3. ✅ `company_id` (filtro de multitenancy)

**Al cambiar credenciales:**
- ✅ Cambiar email en `auth.users` es seguro
- ✅ Cambiar email en `public.users` es necesario para sincronización
- ✅ **CRÍTICO:** Preservar `auth_user_id`, `role`, y `company_id`

---

**FIN DEL ANÁLISIS**

