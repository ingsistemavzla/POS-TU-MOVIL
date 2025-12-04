# 📋 DEFINICIÓN EXACTA: Tabla `public.users` - Fuente de Verdad para Permisos

**Fecha:** 2025-01-27  
**Objetivo:** Establecer la estructura exacta de la tabla `users` para implementar RLS (Row Level Security) como fuente de verdad de permisos.

---

## 🗄️ ESTRUCTURA COMPLETA DE LA TABLA `public.users`

### Definición Base (Migración Inicial)

**Archivo:** `supabase/migrations/20250822150200_306f5474-1a01-445e-bba2-bb270dd1f89a.sql`

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

### Columna Agregada Posteriormente

**Archivo:** `supabase/migrations/20250827042900_enforce_store_assignment.sql`

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS assigned_store_id UUID REFERENCES public.stores(id);
```

---

## 📊 COLUMNAS CRÍTICAS PARA PERMISOS

### 1. `id` (UUID)
- **Tipo:** `UUID NOT NULL`
- **Default:** `gen_random_uuid()`
- **Propósito:** Identificador único del perfil de usuario en `public.users`
- **Relación:** NO es el mismo que `auth.users.id`
- **Uso en RLS:** Se usa para vincular con otras tablas (sales, inventory_movements, etc.)

### 2. `auth_user_id` (UUID)
- **Tipo:** `UUID`
- **Nullable:** `YES` (puede ser NULL si el usuario aún no se ha registrado)
- **Relación:** `REFERENCES auth.users(id) ON DELETE CASCADE`
- **Propósito:** Vincula el perfil `public.users` con la autenticación de Supabase
- **Uso en RLS:** Se usa con `auth.uid()` para identificar al usuario autenticado:
  ```sql
  WHERE auth_user_id = auth.uid()
  ```

### 3. `role` (TEXT)
- **Tipo:** `TEXT NOT NULL`
- **Constraint:** `CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier'))`
- **Valores Permitidos:**
  - `'master_admin'` - Administrador maestro (acceso total, todas las compañías)
  - `'admin'` - Administrador de compañía (acceso total dentro de su compañía)
  - `'manager'` - Gerente (acceso limitado a su sucursal asignada)
  - `'cashier'` - Cajero (acceso limitado a su sucursal asignada, solo POS y Almacén)
- **Uso en RLS:** Determina qué políticas aplicar según el rol del usuario

### 4. `assigned_store_id` (UUID)
- **Tipo:** `UUID`
- **Nullable:** `YES` (puede ser NULL para `admin` y `master_admin`)
- **Relación:** `REFERENCES public.stores(id)`
- **Propósito:** Sucursal asignada al usuario (obligatorio para `manager` y `cashier`)
- **Uso en RLS:** Filtra datos por sucursal para roles restringidos:
  ```sql
  WHERE store_id = (SELECT assigned_store_id FROM public.users WHERE auth_user_id = auth.uid())
  ```

### 5. `company_id` (UUID)
- **Tipo:** `UUID NOT NULL`
- **Relación:** `REFERENCES public.companies(id) ON DELETE CASCADE`
- **Propósito:** Compañía a la que pertenece el usuario (multitenancy)
- **Uso en RLS:** Filtra datos por compañía (excepto para `master_admin`):
  ```sql
  WHERE company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  ```

### 6. `active` (BOOLEAN)
- **Tipo:** `BOOLEAN`
- **Default:** `true`
- **Propósito:** Indica si el usuario está activo o desactivado
- **Uso en RLS:** Filtrar usuarios activos:
  ```sql
  WHERE active = true
  ```

---

## 🔍 ÍNDICES EXISTENTES

### Índices Creados para Optimización

```sql
-- Índice para búsquedas por assigned_store_id
CREATE INDEX IF NOT EXISTS users_assigned_store_id_idx 
ON public.users(assigned_store_id);

-- Índice compuesto para búsquedas por rol y company
CREATE INDEX IF NOT EXISTS users_role_company_idx 
ON public.users(role, company_id) 
WHERE active = true;

-- Índice para búsquedas por assigned_store_id (con filtro)
CREATE INDEX IF NOT EXISTS users_assigned_store_idx 
ON public.users(assigned_store_id) 
WHERE assigned_store_id IS NOT NULL;

-- Índice único para evitar duplicados de email por compañía
CREATE UNIQUE INDEX IF NOT EXISTS users_unique_company_email 
ON public.users(company_id, lower(email));
```

---

## 🔐 FUNCIONES HELPER EXISTENTES

### 1. `get_user_company_id()`
```sql
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
```

### 2. `get_assigned_store_id()`
```sql
CREATE OR REPLACE FUNCTION public.get_assigned_store_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT assigned_store_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
```

### 3. `is_admin()`
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'master_admin')
      AND active = true
  );
$$;
```

### 4. `is_master_admin()`
```sql
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role = 'master_admin'
      AND active = true
  );
$$;
```

---

## 📝 RESUMEN EJECUTIVO PARA RLS

### Columnas Clave para Políticas RLS

| Columna | Tipo | Nullable | Uso en RLS |
|---------|------|----------|------------|
| `id` | UUID | NO | Identificador del perfil |
| `auth_user_id` | UUID | SÍ | Vinculación con `auth.uid()` |
| `role` | TEXT | NO | Determina permisos |
| `assigned_store_id` | UUID | SÍ | Filtro por sucursal |
| `company_id` | UUID | NO | Filtro por compañía (multitenancy) |
| `active` | BOOLEAN | SÍ | Filtro de usuarios activos |

### Patrones de Consulta para RLS

**1. Obtener información del usuario autenticado:**
```sql
SELECT role, company_id, assigned_store_id, active
FROM public.users
WHERE auth_user_id = auth.uid()
LIMIT 1;
```

**2. Verificar si es admin:**
```sql
SELECT EXISTS (
  SELECT 1 FROM public.users
  WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'master_admin')
    AND active = true
);
```

**3. Verificar si es master_admin:**
```sql
SELECT EXISTS (
  SELECT 1 FROM public.users
  WHERE auth_user_id = auth.uid()
    AND role = 'master_admin'
    AND active = true
);
```

**4. Obtener sucursal asignada:**
```sql
SELECT assigned_store_id
FROM public.users
WHERE auth_user_id = auth.uid()
LIMIT 1;
```

**5. Obtener compañía del usuario:**
```sql
SELECT company_id
FROM public.users
WHERE auth_user_id = auth.uid()
LIMIT 1;
```

---

## 🎯 MATRIZ DE PERMISOS POR ROL

| Rol | `company_id` | `assigned_store_id` | Acceso a Datos |
|-----|--------------|---------------------|----------------|
| `master_admin` | Cualquiera | NULL | Todas las compañías, todas las sucursales |
| `admin` | Su compañía | NULL | Su compañía, todas las sucursales |
| `manager` | Su compañía | Su sucursal | Su compañía, solo su sucursal (lectura) |
| `cashier` | Su compañía | Su sucursal | Su compañía, solo su sucursal (POS + Almacén lectura) |

---

## ✅ VERIFICACIÓN DE INTEGRIDAD

### Constraint de Roles
```sql
CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier'))
```

### Foreign Keys
- `company_id` → `public.companies(id) ON DELETE CASCADE`
- `auth_user_id` → `auth.users(id) ON DELETE CASCADE`
- `assigned_store_id` → `public.stores(id)`

### Unique Constraints
- `(company_id, lower(email))` - Un email único por compañía

---

## 🚀 PRÓXIMOS PASOS PARA IMPLEMENTAR RLS

1. **Crear políticas SELECT** basadas en `role`, `company_id`, y `assigned_store_id`
2. **Crear políticas INSERT/UPDATE/DELETE** con validaciones de rol
3. **Usar funciones helper** (`get_user_company_id()`, `get_assigned_store_id()`, `is_admin()`, `is_master_admin()`)
4. **Aplicar filtros por `active = true`** en todas las políticas
5. **Eliminar controles de acceso del frontend** una vez que RLS esté implementado

---

**FIN DEL DOCUMENTO**





