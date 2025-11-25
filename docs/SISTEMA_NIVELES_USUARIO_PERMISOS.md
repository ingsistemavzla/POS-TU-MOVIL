# 🔐 Sistema de Niveles de Usuario y Permisos - Documentación Completa

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Niveles de Usuario](#niveles-de-usuario)
3. [Jerarquía y Permisos](#jerarquía-y-permisos)
4. [Ciclo de Vida del Usuario](#ciclo-de-vida-del-usuario)
5. [Aplicación de Permisos](#aplicación-de-permisos)
6. [Restricciones por Tienda](#restricciones-por-tienda)
7. [Políticas de Seguridad (RLS)](#políticas-de-seguridad-rls)
8. [Funciones SQL de Validación](#funciones-sql-de-validación)
9. [Protección de Rutas](#protección-de-rutas)
10. [Navegación por Roles](#navegación-por-roles)
11. [Ejemplos de Implementación](#ejemplos-de-implementación)

---

## 📊 Resumen Ejecutivo

El sistema implementa un modelo de **3 niveles de usuario** con jerarquía de permisos y restricciones basadas en roles y asignación de tiendas. La seguridad se aplica tanto en **frontend** (React) como en **backend** (Supabase RLS).

### Características Principales:
- ✅ **3 Roles:** Admin, Manager, Cashier
- ✅ **Jerarquía de Permisos:** Admin (3) > Manager (2) > Cashier (1)
- ✅ **Restricción por Tienda:** Managers y Cashiers limitados a su tienda asignada
- ✅ **Seguridad Multi-Capa:** Frontend + Backend (RLS)
- ✅ **Aislamiento por Empresa:** Todos los datos filtrados por `company_id`

---

## 👥 Niveles de Usuario

### 1. **ADMIN** (Administrador)
**Nivel:** 3 (Máximo)

**Descripción:**
- Usuario con acceso completo al sistema
- Puede gestionar todas las tiendas de la empresa
- Control total sobre usuarios, productos, inventario y reportes

**Características:**
- ✅ Acceso a todas las tiendas
- ✅ Gestión de usuarios (crear, editar, eliminar)
- ✅ Gestión de tiendas (crear, editar, eliminar)
- ✅ Acceso completo a reportes y configuraciones
- ✅ Puede realizar transferencias entre cualquier tienda
- ✅ Puede eliminar ventas
- ✅ Ve alertas de stock negativo

**Asignación de Tienda:**
- No requiere `assigned_store_id` (puede ser `null`)
- Puede trabajar con cualquier tienda de la empresa

---

### 2. **MANAGER** (Gerente)
**Nivel:** 2 (Intermedio)

**Descripción:**
- Usuario con permisos de gestión operativa
- Limitado a su tienda asignada
- Puede gestionar productos, inventario y ventas de su tienda

**Características:**
- ✅ Acceso limitado a su tienda asignada (`assigned_store_id`)
- ✅ Gestión de productos (crear, editar)
- ✅ Gestión de inventario (ver, editar)
- ✅ Visualización de ventas de su tienda
- ✅ Gestión de clientes
- ✅ Dashboard de su tienda
- ❌ NO puede gestionar usuarios
- ❌ NO puede gestionar tiendas
- ❌ NO puede ver reportes globales
- ❌ NO puede transferir inventario entre tiendas
- ❌ NO puede eliminar ventas

**Asignación de Tienda:**
- **REQUIERE** `assigned_store_id` (no puede ser `null`)
- Solo ve datos de su tienda asignada

---

### 3. **CASHIER** (Cajero)
**Nivel:** 1 (Básico)

**Descripción:**
- Usuario con permisos mínimos para operaciones de punto de venta
- Limitado exclusivamente a su tienda asignada
- Solo puede realizar ventas

**Características:**
- ✅ Acceso al módulo POS (Punto de Venta)
- ✅ Realizar ventas en su tienda asignada
- ✅ Ver productos disponibles
- ✅ Ver clientes
- ❌ NO puede ver dashboard
- ❌ NO puede gestionar productos
- ❌ NO puede gestionar inventario
- ❌ NO puede ver ventas históricas
- ❌ NO puede gestionar clientes
- ❌ NO puede acceder a reportes
- ❌ NO puede ver configuraciones

**Asignación de Tienda:**
- **REQUIERE** `assigned_store_id` (no puede ser `null`)
- Solo puede realizar ventas en su tienda asignada

---

## 🎯 Jerarquía y Permisos

### Matriz de Permisos

| Funcionalidad | Admin | Manager | Cashier |
|--------------|-------|---------|---------|
| **Dashboard** | ✅ | ✅ (Solo su tienda) | ❌ |
| **POS (Punto de Venta)** | ✅ | ✅ | ✅ |
| **Productos** | ✅ | ✅ | ❌ |
| **Inventario** | ✅ | ✅ (Solo su tienda) | ❌ |
| **Ventas** | ✅ | ✅ (Solo su tienda) | ❌ |
| **Clientes** | ✅ | ✅ | ❌ |
| **Tiendas** | ✅ | ❌ | ❌ |
| **Usuarios** | ✅ | ❌ | ❌ |
| **Reportes** | ✅ | ❌ | ❌ |
| **Configuración** | ✅ | ❌ | ❌ |
| **Transferencias de Inventario** | ✅ | ❌ | ❌ |
| **Eliminar Ventas** | ✅ | ❌ | ❌ |
| **Alertas de Stock Negativo** | ✅ | ❌ | ❌ |

### Implementación de Jerarquía

```typescript
// src/components/auth/ProtectedRoute.tsx
const roleHierarchy = { 
  admin: 3,    // Nivel máximo
  manager: 2,  // Nivel intermedio
  cashier: 1   // Nivel básico
};

// Verificación de permisos
const userRoleLevel = roleHierarchy[userProfile.role] || 0;
const requiredRoleLevel = roleHierarchy[requiredRole];

if (userRoleLevel < requiredRoleLevel) {
  // Acceso denegado
}
```

---

## 🔄 Ciclo de Vida del Usuario

### 1. **Registro (Sign Up)**

**Flujo:**
```
Usuario → Registro → Crear Auth User → Crear Company → Crear User Profile (role: 'admin')
```

**Proceso:**
1. Usuario ingresa email, password, nombre de empresa y nombre de usuario
2. Se crea el usuario en Supabase Auth
3. Se crea la empresa (`companies` table)
4. Se crea el perfil de usuario con `role: 'admin'` automáticamente
5. Se crea una tienda por defecto ("Tienda Principal") en el primer login

**Código:**
```typescript
// src/contexts/AuthContext.tsx - signUp()
const signUp = async (email, password, companyName, userName) => {
  // 1. Crear auth user
  const { data: authData } = await supabase.auth.signUp({ email, password });
  
  // 2. Crear company
  const { data: companyData } = await supabase
    .from('companies')
    .insert({ name: companyName, plan: 'basic' });
  
  // 3. Crear user profile con role 'admin'
  const { data: userData } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      company_id: companyData.id,
      name: userName,
      email: email,
      role: 'admin',  // Primer usuario siempre es admin
      active: true
    });
};
```

---

### 2. **Invitación de Usuarios (Admin)**

**Flujo:**
```
Admin → Crear Invitación → Usuario acepta → Crear User Profile (role según invitación)
```

**Proceso:**
1. Admin crea una invitación con email, role y tienda asignada (opcional)
2. Usuario recibe email con magic link
3. Al hacer clic, se crea su cuenta en Supabase Auth
4. El sistema detecta la invitación pendiente
5. Se crea automáticamente el perfil de usuario con el role y tienda de la invitación

**Código:**
```typescript
// src/contexts/AuthContext.tsx - fetchUserProfile()
// Si no existe perfil, busca invitación pendiente
if (!effectiveProfile && email) {
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending')
    .single();
  
  if (invitation) {
    // Crear perfil desde invitación
    const { data: createdProfile } = await supabase
      .from('users')
      .insert({
        auth_user_id: userId,
        company_id: invitation.company_id,
        role: invitation.role,  // Role de la invitación
        assigned_store_id: invitation.assigned_store_id,
        active: true
      });
  }
}
```

---

### 3. **Inicio de Sesión (Sign In)**

**Flujo:**
```
Usuario → Login → Verificar Credenciales → Cargar Perfil → Cargar Company → Redirigir según Role
```

**Proceso:**
1. Usuario ingresa email y password
2. Supabase Auth valida credenciales
3. Se obtiene la sesión
4. Se carga el perfil de usuario desde `users` table
5. Se carga la información de la empresa
6. Se verifica si requiere configuración de contraseña
7. Redirección según role:
   - **Cashier:** → `/pos`
   - **Manager/Admin:** → `/dashboard`

**Código:**
```typescript
// src/contexts/AuthContext.tsx - signIn()
const signIn = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  // El onAuthStateChange se encarga de cargar el perfil
};

// src/App.tsx - RoleBasedRedirect
const RoleBasedRedirect = () => {
  const { userProfile } = useAuth();
  
  if (userProfile?.role === 'cashier') {
    return <Navigate to="/pos" replace />;
  }
  
  return <Navigate to="/dashboard" replace />;
};
```

---

### 4. **Gestión de Sesión**

**Características:**
- **Refresh Automático:** Cada 30 minutos
- **Cache de Perfil:** 5 minutos
- **Keep-Alive:** Mantiene la sesión activa
- **Timeout:** 15 segundos para carga inicial

**Código:**
```typescript
// src/contexts/AuthContext.tsx
useEffect(() => {
  // Refresh de sesión cada 30 minutos
  const keepAliveInterval = setInterval(async () => {
    const { data: { session } } = await supabase.auth.refreshSession();
    setSession(session);
  }, 30 * 60 * 1000);
  
  // Limpieza de cache cada 10 minutos
  const cacheCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [userId, cached] of profileCacheRef.current.entries()) {
      if ((now - cached.timestamp) > CACHE_DURATION) {
        profileCacheRef.current.delete(userId);
      }
    }
  }, 10 * 60 * 1000);
}, [session]);
```

---

### 5. **Cierre de Sesión (Sign Out)**

**Flujo:**
```
Usuario → Logout → Limpiar Cache → Limpiar Estado → Cerrar Sesión Supabase → Redirigir a Login
```

**Proceso:**
1. Usuario hace clic en "Cerrar Sesión"
2. Se detiene el keep-alive de sesión
3. Se limpia el cache de perfiles
4. Se limpia el estado local (user, userProfile, company, session)
5. Se cierra la sesión en Supabase Auth
6. Redirección a página de login

**Código:**
```typescript
// src/contexts/AuthContext.tsx - signOut()
const signOut = async () => {
  // Detener keep-alive
  sessionKeepAlive.stop();
  
  // Limpiar cache
  profileCacheRef.current.clear();
  
  // Limpiar estado
  setUserProfile(null);
  setCompany(null);
  setUser(null);
  setSession(null);
  
  // Cerrar sesión Supabase
  await supabase.auth.signOut();
};
```

---

## 🛡️ Aplicación de Permisos

### Frontend (React)

#### 1. **Protección de Rutas**

```typescript
// src/App.tsx
<Route path="dashboard" element={
  <ProtectedRoute requiredRole="manager">
    <Dashboard />
  </ProtectedRoute>
} />

<Route path="stores" element={
  <ProtectedRoute requiredRole="admin">
    <StoresPage />
  </ProtectedRoute>
} />
```

#### 2. **Verificación de Permisos en Componentes**

```typescript
// src/pages/InventoryPage.tsx
const canEdit = userProfile?.role === 'admin' || userProfile?.role === 'manager';
const canTransfer = userProfile?.role === 'admin' && store.qty > 0;

{canEdit && (
  <Button onClick={handleEdit}>Editar</Button>
)}

{canTransfer && (
  <Button onClick={handleTransfer}>Transferir</Button>
)}
```

#### 3. **Filtrado de Datos por Role**

```typescript
// src/hooks/useSalesData.ts
if (userProfile?.role === 'manager' && userProfile?.assigned_store_id) {
  query = query.eq('store_id', userProfile.assigned_store_id);
}
```

---

### Backend (Supabase RLS)

#### Políticas Row Level Security (RLS)

Todas las tablas tienen RLS habilitado y políticas basadas en:
- `company_id`: Aislamiento por empresa
- `role`: Permisos según rol
- `assigned_store_id`: Restricción por tienda

**Ejemplo - Política de Productos:**
```sql
-- SELECT: Todos los usuarios de la empresa pueden ver productos
CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT USING (company_id = public.get_user_company_id());

-- INSERT/UPDATE: Solo admin y manager pueden crear/editar
CREATE POLICY "products_insert_policy" ON public.products
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );
```

---

## 🏪 Restricciones por Tienda

### Concepto

Los usuarios **Manager** y **Cashier** están limitados a trabajar solo con datos de su tienda asignada (`assigned_store_id`).

### Implementación

#### 1. **En Consultas de Datos**

```typescript
// src/hooks/useSalesData.ts
if (userProfile?.role === 'manager' && userProfile?.assigned_store_id) {
  query = query.eq('store_id', userProfile.assigned_store_id);
}
```

#### 2. **En Funciones SQL**

```sql
-- supabase/migrations/20250827042900_enforce_store_assignment.sql
CREATE OR REPLACE FUNCTION process_sale(...)
AS $$
DECLARE
    v_role TEXT;
    v_assigned_store UUID;
BEGIN
    SELECT role, assigned_store_id INTO v_role, v_assigned_store
    FROM public.users WHERE auth_user_id = auth.uid();
    
    -- Si no es admin, validar tienda asignada
    IF v_role IS DISTINCT FROM 'admin' THEN
        IF p_store_id IS DISTINCT FROM v_assigned_store THEN
            RETURN jsonb_build_object('success', false, 'error', 'STORE_NOT_ALLOWED');
        END IF;
    END IF;
END;
$$;
```

#### 3. **En Dashboard**

```typescript
// src/pages/Dashboard.tsx
const getFilteredData = () => {
  if (userProfile?.role === 'admin') {
    return dashboardData; // Todos los datos
  }
  
  // Manager: Solo datos de su tienda
  if (userProfile?.role === 'manager' && userProfile?.assigned_store_id) {
    return {
      ...dashboardData,
      stores: dashboardData.stores.filter(
        s => s.id === userProfile.assigned_store_id
      )
    };
  }
  
  return null;
};
```

---

## 🔒 Políticas de Seguridad (RLS)

### Funciones Auxiliares SQL

```sql
-- Obtener company_id del usuario actual
CREATE FUNCTION public.get_user_company_id()
RETURNS uuid
AS $$
  SELECT company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Verificar si el usuario es admin
CREATE FUNCTION public.is_admin()
RETURNS boolean
AS $$
  SELECT role = 'admin'
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Obtener tienda asignada del usuario
CREATE FUNCTION public.get_assigned_store_id()
RETURNS uuid
AS $$
  SELECT assigned_store_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
```

### Políticas por Tabla

#### **Companies**
- **SELECT:** Usuarios de la empresa o usuarios sin perfil (registro)
- **INSERT:** Solo usuarios sin perfil (registro inicial)
- **UPDATE:** Solo admins de la empresa

#### **Users**
- **SELECT:** Usuarios de la empresa o el propio usuario
- **INSERT:** Usuario sin perfil (registro) o admin creando usuario
- **UPDATE/DELETE:** Solo admins de la empresa

#### **Stores**
- **SELECT:** Todas las tiendas de la empresa
- **INSERT:** Usuarios de la empresa o registro inicial
- **UPDATE/DELETE:** Solo admins de la empresa

#### **Products**
- **SELECT:** Productos de la empresa
- **INSERT/UPDATE:** Admin o Manager de la empresa
- **DELETE:** Solo admins

#### **Inventories**
- **SELECT:** Inventario de la empresa
- **ALL (INSERT/UPDATE/DELETE):** Admin o Manager de la empresa

#### **Sales**
- **SELECT:** Ventas de la empresa
- **INSERT:** Cualquier usuario autenticado (como cashier)
- **UPDATE:** Admin o Manager de la empresa

---

## 🔧 Funciones SQL de Validación

### 1. **process_sale()** - Procesar Venta

```sql
CREATE OR REPLACE FUNCTION process_sale(
    p_company_id UUID,
    p_store_id UUID,
    ...
)
RETURNS JSONB
AS $$
DECLARE
    v_role TEXT;
    v_user_company UUID;
    v_assigned_store UUID;
BEGIN
    -- Validar empresa
    SELECT role, company_id, assigned_store_id 
    INTO v_role, v_user_company, v_assigned_store
    FROM public.users WHERE auth_user_id = auth.uid();
    
    IF v_user_company IS DISTINCT FROM p_company_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'COMPANY_MISMATCH');
    END IF;
    
    -- Validar tienda (si no es admin)
    IF v_role IS DISTINCT FROM 'admin' THEN
        IF p_store_id IS DISTINCT FROM v_assigned_store THEN
            RETURN jsonb_build_object('success', false, 'error', 'STORE_NOT_ALLOWED');
        END IF;
    END IF;
    
    -- Procesar venta...
END;
$$;
```

### 2. **create_product_with_inventory()** - Crear Producto

```sql
CREATE OR REPLACE FUNCTION create_product_with_inventory(...)
RETURNS JSONB
AS $$
BEGIN
    -- Solo admin o manager pueden crear productos
    IF NOT (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) 
           IN ('admin', 'manager') THEN
        RETURN jsonb_build_object('error', true, 'message', 'INSUFFICIENT_PERMISSIONS');
    END IF;
    
    -- Crear producto...
END;
$$;
```

### 3. **delete_sale_and_restore_inventory()** - Eliminar Venta

```sql
CREATE OR REPLACE FUNCTION delete_sale_and_restore_inventory(p_sale_id UUID)
RETURNS JSONB
AS $$
BEGIN
    -- Solo admins pueden eliminar ventas
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_PERMISSIONS');
    END IF;
    
    -- Eliminar venta y restaurar inventario...
END;
$$;
```

---

## 🚦 Protección de Rutas

### Componente ProtectedRoute

```typescript
// src/components/auth/ProtectedRoute.tsx
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, userProfile, loading } = useAuth();
  
  // Verificar autenticación
  if (!user || !userProfile) {
    return null; // Redirige a login
  }
  
  // Verificar permisos por jerarquía
  if (requiredRole) {
    const roleHierarchy = { admin: 3, manager: 2, cashier: 1 };
    const userRoleLevel = roleHierarchy[userProfile.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole];
    
    if (userRoleLevel < requiredRoleLevel) {
      return <AccesoDenegado />;
    }
  }
  
  return <>{children}</>;
};
```

### Rutas Protegidas en App.tsx

```typescript
// src/App.tsx
<Route path="dashboard" element={
  <ProtectedRoute requiredRole="manager">
    <Dashboard />
  </ProtectedRoute>
} />

<Route path="inventory" element={
  <ProtectedRoute requiredRole="manager">
    <InventoryPage />
  </ProtectedRoute>
} />

<Route path="stores" element={
  <ProtectedRoute requiredRole="admin">
    <StoresPage />
  </ProtectedRoute>
} />

<Route path="users" element={
  <ProtectedRoute requiredRole="admin">
    <Users />
  </ProtectedRoute>
} />

<Route path="pos" element={<POS />} />  // Acceso para todos
```

---

## 🧭 Navegación por Roles

### Función getNavigationByRole()

```typescript
// src/components/layout/MainLayout.tsx
const getNavigationByRole = (role: string) => {
  const allNavigation = [
    { name: 'Dashboard', href: '/dashboard', roles: ['admin', 'manager'] },
    { name: 'POS', href: '/pos', roles: ['admin', 'manager', 'cashier'] },
    { name: 'Productos', href: '/products', roles: ['admin', 'manager'] },
    { name: 'Inventario', href: '/inventory', roles: ['admin', 'manager'] },
    { name: 'Ventas', href: '/sales', roles: ['admin', 'manager'] },
    { name: 'Clientes', href: '/customers', roles: ['admin', 'manager'] },
    { name: 'Tiendas', href: '/stores', roles: ['admin'] },
    { name: 'Usuarios', href: '/users', roles: ['admin'] },
    { name: 'Reportes', href: '/reports', roles: ['admin'] },
    { name: 'Configuración', href: '/settings', roles: ['admin'] },
  ];
  
  return allNavigation.filter(item => item.roles.includes(role));
};
```

### Menú Visible por Role

| Item de Menú | Admin | Manager | Cashier |
|--------------|-------|---------|---------|
| Dashboard | ✅ | ✅ | ❌ |
| POS | ✅ | ✅ | ✅ |
| Productos | ✅ | ✅ | ❌ |
| Inventario | ✅ | ✅ | ❌ |
| Ventas | ✅ | ✅ | ❌ |
| Clientes | ✅ | ✅ | ❌ |
| Tiendas | ✅ | ❌ | ❌ |
| Usuarios | ✅ | ❌ | ❌ |
| Reportes | ✅ | ❌ | ❌ |
| Configuración | ✅ | ❌ | ❌ |

---

## 💡 Ejemplos de Implementación

### Ejemplo 1: Filtrado de Ventas por Role

```typescript
// src/hooks/useSalesData.ts
const fetchSalesData = useCallback(async () => {
  let query = supabase
    .from('sales')
    .select('*')
    .eq('company_id', userProfile.company_id);
  
  // Si es manager, filtrar por tienda asignada
  if (userProfile?.role === 'manager' && userProfile?.assigned_store_id) {
    query = query.eq('store_id', userProfile.assigned_store_id);
  }
  
  // Si es cashier, solo sus propias ventas
  if (userProfile?.role === 'cashier') {
    query = query.eq('cashier_id', userProfile.id);
  }
  
  const { data } = await query;
}, [userProfile]);
```

### Ejemplo 2: Botones Condicionales

```typescript
// src/pages/InventoryPage.tsx
const canEdit = userProfile?.role === 'admin' || userProfile?.role === 'manager';
const canTransfer = userProfile?.role === 'admin' && store.qty > 0;

<Button 
  onClick={handleEdit}
  disabled={!canEdit}
>
  Editar
</Button>

{canTransfer && (
  <Button onClick={handleTransfer}>
    Transferir
  </Button>
)}
```

### Ejemplo 3: Dashboard por Role

```typescript
// src/pages/Dashboard.tsx
const getFilteredData = () => {
  if (!dashboardData) return null;
  
  // Admin: Todos los datos
  if (userProfile?.role === 'admin') {
    return dashboardData;
  }
  
  // Manager: Solo su tienda
  if (userProfile?.role === 'manager' && userProfile?.assigned_store_id) {
    return {
      ...dashboardData,
      stores: dashboardData.stores.filter(
        s => s.id === userProfile.assigned_store_id
      ),
      sales: dashboardData.sales.filter(
        s => s.store_id === userProfile.assigned_store_id
      )
    };
  }
  
  // Cashier: No tiene dashboard
  return null;
};
```

### Ejemplo 4: Alertas Solo para Admin

```typescript
// src/components/inventory/NegativeStockAlert.tsx
export const NegativeStockAlert = () => {
  const { userProfile } = useAuth();
  
  // Solo mostrar para admins
  if (userProfile?.role !== 'admin') {
    return null;
  }
  
  // Mostrar alerta de stock negativo...
};
```

---

## 📝 Resumen de Validaciones

### Frontend
- ✅ Protección de rutas con `ProtectedRoute`
- ✅ Filtrado de datos por role y tienda
- ✅ Botones y acciones condicionales
- ✅ Navegación personalizada por role
- ✅ Redirección automática según role

### Backend
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Funciones SQL con validación de permisos
- ✅ Validación de empresa (`company_id`)
- ✅ Validación de tienda (`assigned_store_id`)
- ✅ Validación de role en operaciones críticas

---

## 🔍 Puntos de Validación Clave

1. **Al crear usuario:** Solo admins pueden crear usuarios
2. **Al crear producto:** Admin o Manager
3. **Al procesar venta:** Validar tienda asignada (si no es admin)
4. **Al eliminar venta:** Solo admins
5. **Al transferir inventario:** Solo admins
6. **Al acceder a rutas:** Verificar jerarquía de roles
7. **Al consultar datos:** Filtrar por empresa y tienda (si aplica)

---

**Última Actualización:** 2025-01-07  
**Versión del Documento:** 1.0  
**Mantenido por:** Equipo de Desarrollo

