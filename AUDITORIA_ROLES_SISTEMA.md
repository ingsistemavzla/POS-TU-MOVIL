# 🔒 AUDITORÍA DE ROLES DEL SISTEMA
**Fecha:** 2025-01-27  
**Auditor:** Senior Security Auditor  
**Objetivo:** Mapear roles exactos antes de implementar funcionalidad crítica exclusiva para "Laboratorio/Técnico"

---

## 📋 RESUMEN EJECUTIVO

### ✅ ROLES IDENTIFICADOS EN LA BASE DE DATOS

**Constraint actual en `public.users.role`:**
```sql
CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier'))
```

**Roles técnicos exactos:**
1. **`master_admin`** - Rol maestro (Laboratorio/Técnico) ⚠️ **NIVEL MÁS ALTO**
2. **`admin`** - Administrador Comercial
3. **`manager`** - Gerente de Sucursal
4. **`cashier`** - Cajero

---

## 1️⃣ LA VERDAD EN LA BASE DE DATOS

### 1.1 Constraint de la Columna `role`

**Archivo:** `fix_users_role_constraint.sql` (aplicado)

```sql
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier'));
```

**Estado:** ✅ **CONFIRMADO** - El constraint incluye `master_admin`

### 1.2 Migraciones Históricas

**Migración original** (`20250822150200_306f5474-1a01-445e-bba2-bb270dd1f89a.sql`):
```sql
role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier'))
```
⚠️ **NOTA:** La migración original NO incluía `master_admin`, pero fue corregida posteriormente.

**Migración de invitations** (`20250826200500_create_invitations.sql`):
```sql
role text not null check (role in ('admin','manager','cashier'))
```
⚠️ **NOTA:** Esta tabla también fue actualizada en `fix_users_role_constraint.sql` para incluir `master_admin`.

### 1.3 Roles Ocultos

**❌ NO se encontraron roles ocultos.** Todos los roles están documentados en el constraint.

---

## 2️⃣ LA VERDAD EN EL FRONTEND (TypeScript)

### 2.1 Definición de Tipos

**Archivo:** `src/integrations/supabase/types.ts`

```typescript
users: {
  Row: {
    role: string  // Tipo genérico, no enum estricto
    // ...
  }
}
```

**⚠️ OBSERVACIÓN:** El tipo TypeScript es `string`, no un enum. Esto permite flexibilidad pero requiere validación en runtime.

### 2.2 Uso en el Código

**Identificador del rol maestro:**
- **Nombre técnico:** `'master_admin'` (string literal)
- **Uso en código:** `userProfile?.role === 'master_admin'`

**Ejemplos encontrados:**
```typescript
// src/App.tsx (línea 110)
if (userProfile.role === 'master_admin') {
  return <Navigate to="/master-audit" replace />;
}

// src/pages/EstadisticasPage.tsx (línea 76)
const isMasterAdmin = userProfile?.role === 'master_admin';

// src/components/layout/MainLayout.tsx (línea 40)
roles: ['master_admin'],  // EXCLUSIVO para master_admin
```

### 2.3 Distinción Master vs Admin en Redirecciones

**Archivo:** `src/App.tsx` - Función `RoleBasedRedirect`:

```typescript
// MASTER_ADMIN redirige a panel de auditoría
if (userProfile.role === 'master_admin') {
  return <Navigate to="/master-audit" replace />;
}

// ADMIN redirige a dashboard
if (userProfile.role === 'admin') {
  return <Navigate to="/dashboard" replace />;
}
```

**✅ CONFIRMADO:** Master y Admin tienen redirecciones diferentes:
- **Master:** `/master-audit` (Panel de Auditoría)
- **Admin:** `/dashboard` (Dashboard Comercial)

---

## 3️⃣ JERARQUÍA DE PODER

### 3.1 Función Helper `is_admin()` en SQL

**Archivo:** `supabase/migrations/20250826170000_complete_auth_setup.sql`

```sql
CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role = 'admin'
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
```

**⚠️ PROBLEMA CRÍTICO IDENTIFICADO:**

La función `is_admin()` **SOLO retorna `true` para `role = 'admin'`**, **NO incluye `master_admin`**.

**Impacto:**
- Las funciones RPC que usan `is_admin()` **NO reconocen a `master_admin`** como administrador
- Esto puede causar que `master_admin` sea rechazado en operaciones que requieren permisos de administrador

**Ejemplos de uso problemático:**
```sql
-- En múltiples migraciones:
IF NOT public.is_admin() THEN
  RAISE EXCEPTION 'Permisos insuficientes...';
END IF;
```

### 3.2 Funciones Helper en Frontend

**❌ NO existe función `isMaster()` o `hasRole()` centralizada.**

**Patrón actual:** Comparación directa en cada componente:
```typescript
const isMasterAdmin = userProfile?.role === 'master_admin';
const isAdmin = userProfile?.role === 'admin';
```

### 3.3 Mezcla de Roles

**✅ CONFIRMADO:** El código frontend **SÍ distingue** entre `master_admin` y `admin`:

**Ejemplos de distinción:**

1. **Navegación** (`MainLayout.tsx`):
   - `master_admin`: Solo ve "Panel de Auditoría" y "Estadísticas"
   - `admin`: Ve Dashboard, POS, Almacén, Artículos, Ventas, etc.

2. **Acceso al POS** (`App.tsx` - `POSAccessGuard`):
   ```typescript
   // MASTER_ADMIN NO puede acceder al POS
   if (userProfile?.role === 'master_admin') {
     return <Navigate to="/master-audit" replace />;
   }
   ```

3. **Estadísticas** (`EstadisticasPage.tsx`):
   ```typescript
   // MASTER_ADMIN puede ver todo sin company_id
   const isMasterAdmin = userProfile?.role === 'master_admin';
   if (!isMasterAdmin && !userProfile?.company_id) {
     // ...
   }
   ```

---

## 4️⃣ IDENTIFICADORES ÚNICOS

### 4.1 Master User (Laboratorio/Técnico)

**Identificador técnico:** `'master_admin'` (string literal)

**Características:**
- ✅ Nivel más alto de acceso
- ✅ Puede ver datos de TODAS las compañías (sin filtro `company_id`)
- ✅ Acceso exclusivo a `/master-audit` (Panel de Auditoría)
- ✅ NO puede acceder a POS, Dashboard comercial, gestión de usuarios/tiendas
- ⚠️ **PROBLEMA:** No es reconocido por `is_admin()` en SQL

### 4.2 Admin (Comercial)

**Identificador técnico:** `'admin'` (string literal)

**Características:**
- ✅ Acceso completo a operaciones comerciales
- ✅ Gestión de usuarios, tiendas, productos
- ✅ Acceso a POS, Dashboard, Reportes
- ✅ Limitado a su `company_id`
- ✅ Reconocido por `is_admin()` en SQL

---

## 5️⃣ RECOMENDACIONES CRÍTICAS

### 5.1 Corrección Urgente: Función `is_admin()`

**Problema:** `is_admin()` no reconoce `master_admin`

**Solución propuesta:**
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role IN ('admin', 'master_admin')
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
```

**⚠️ ADVERTENCIA:** Esta solución puede no ser deseable si se quiere mantener `master_admin` y `admin` completamente separados en el backend.

**Alternativa:** Crear función separada:
```sql
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role = 'master_admin'
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
```

### 5.2 Helper Functions en Frontend

**Recomendación:** Crear utilidades centralizadas:

```typescript
// src/utils/roleHelpers.ts
export const isMasterAdmin = (role: string | undefined): boolean => {
  return role === 'master_admin';
};

export const isAdmin = (role: string | undefined): boolean => {
  return role === 'admin';
};

export const isManager = (role: string | undefined): boolean => {
  return role === 'manager';
};

export const isCashier = (role: string | undefined): boolean => {
  return role === 'cashier';
};

export const hasRole = (userRole: string | undefined, ...roles: string[]): boolean => {
  return userRole !== undefined && roles.includes(userRole);
};
```

---

## 6️⃣ CONCLUSIÓN

### ✅ Roles Confirmados

| Rol | Identificador | Nivel | Descripción |
|-----|--------------|-------|-------------|
| **Master Admin** | `'master_admin'` | **MÁXIMO** | Laboratorio/Técnico - Auditoría global |
| Admin | `'admin'` | Alto | Administrador Comercial |
| Manager | `'manager'` | Medio | Gerente de Sucursal |
| Cashier | `'cashier'` | Bajo | Cajero |

### ⚠️ Problemas Identificados

1. **Función `is_admin()` en SQL:** No reconoce `master_admin`
2. **Falta de helpers centralizados:** Comparaciones directas dispersas en el código
3. **Tipos TypeScript:** `role` es `string` genérico, no enum estricto

### ✅ Confirmaciones

1. **Constraint de BD:** Incluye `master_admin` correctamente
2. **Frontend:** Distingue correctamente entre `master_admin` y `admin`
3. **Redirecciones:** Master y Admin tienen destinos diferentes
4. **Navegación:** Master tiene acceso restringido (solo Auditoría)

---

## 📝 PRÓXIMOS PASOS

1. **Decidir política de `is_admin()`:** ¿Debe incluir `master_admin` o mantenerse separado?
2. **Crear helpers centralizados** en frontend para consistencia
3. **Implementar funcionalidad crítica** usando `role === 'master_admin'` como identificador único
4. **Validar en runtime** que el rol existe antes de permitir acceso

---

**FIN DEL REPORTE DE AUDITORÍA**





