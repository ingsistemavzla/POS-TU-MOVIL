# 🔒 AUDITORÍA DE SEGURIDAD Y AUTENTICACIÓN

**Fecha de Auditoría:** 2025-01-28  
**Auditor:** Análisis Técnico de Seguridad  
**Objetivo:** Identificar vulnerabilidades y puntos de mejora en el sistema de autenticación y gestión de roles

---

## 1. DEFINICIÓN DE ROLES

### 1.1 Almacenamiento de Roles

**Ubicación:** `public.users.role` (columna `TEXT`)

**Definición en Base de Datos:**
```sql
-- De: supabase/migrations/20250822150200_306f5474-1a01-445e-bba2-bb270dd1f89a.sql
CREATE TABLE public.users (
  ...
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
  ...
);
```

**⚠️ HALLAZGO CRÍTICO:**
- El CHECK constraint solo permite: `'admin'`, `'manager'`, `'cashier'`
- **NO incluye `'master_admin'`** en el constraint
- `master_admin` existe en el código pero **NO está validado a nivel de BD**

**Definición en TypeScript:**
```typescript
// src/integrations/supabase/types.ts
users: {
  Row: {
    role: string  // ← Tipo genérico, sin enum
  }
}
```

**Roles Definidos en Frontend:**
```typescript
// src/pages/Users.tsx
const roles = [
  { key: "admin", name: "Administrador" },
  { key: "manager", name: "Gerente" },
  { key: "cashier", name: "Cajero" },
];
// NOTA: 'master_admin' NO está incluido intencionalmente
```

**Jerarquía de Roles (Frontend):**
```typescript
// src/components/auth/ProtectedRoute.tsx
const roleHierarchy = { 
  master_admin: 4,  // ← Existe en código pero NO en BD constraint
  admin: 3, 
  manager: 3, 
  cashier: 1 
};
```

### 1.2 Verificación de Roles

**¿Cómo sabe el código que el usuario es "Admin" o "Cajero"?**

1. **Lectura desde `public.users.role`:**
   - El campo `role` es un `string` en la tabla `public.users`
   - Se lee mediante `fetchUserProfile()` en `AuthContext.tsx`
   - Se almacena en estado React: `userProfile.role`

2. **NO se usa `auth.users` para roles:**
   - Los roles NO están en `auth.users` (tabla de Supabase Auth)
   - Los roles NO están en claims JWT
   - Los roles están SOLO en `public.users.role`

3. **Flujo de Verificación:**
   ```
   Usuario inicia sesión
   → supabase.auth.signInWithPassword()
   → onAuthStateChange('SIGNED_IN')
   → fetchUserProfile(userId)
   → SELECT role FROM public.users WHERE auth_user_id = userId
   → setUserProfile({ ...profile, role })
   → ProtectedRoute verifica userProfile.role
   ```

**🔴 VULNERABILIDAD IDENTIFICADA:**
- Si un atacante modifica directamente `public.users.role` en la BD, puede escalar privilegios
- No hay validación de integridad entre `auth.users` y `public.users.role`
- El constraint CHECK no incluye `master_admin`, permitiendo valores inválidos

---

## 2. EL MISTERIO DE LA CREACIÓN

### 2.1 Función de Creación de Usuarios

**Ubicación:** `src/pages/Users.tsx` → `createUser()`

**Implementación Actual:**
```typescript
const createUser = async () => {
  // ...
  const { data: result, error: rpcError } = await (supabase as any)
    .rpc('create_user_atomic_admin', {
      p_email: createEmail,
      p_password: createPassword,  // ← Se pasa pero se ignora
      p_name: createName,
      p_role: createRole,
      p_company_id: companyId,
      p_assigned_store_id: createRole === "admin" ? null : (createStoreId || null),
    });
};
```

**⚠️ HALLAZGO IMPORTANTE:**
- **NO usa `supabase.auth.signUp()`** directamente
- Usa RPC `create_user_atomic_admin` que **SOLO crea el perfil en `public.users`**
- **NO crea entrada en `auth.users`** desde el admin panel

### 2.2 Función RPC: `create_user_atomic_admin`

**Ubicación:** `create_user_atomic_admin.sql`

**Comportamiento:**
```sql
CREATE OR REPLACE FUNCTION create_user_atomic_admin(
  p_email TEXT,
  p_password TEXT, -- Se ignora, mantenido para compatibilidad
  p_name TEXT,
  p_role TEXT,
  p_company_id UUID,
  p_assigned_store_id UUID DEFAULT NULL
)
RETURNS JSONB
AS $$
BEGIN
  -- Validar que el email no exista en public.users
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', '...');
  END IF;

  -- Validar que el rol sea válido
  IF p_role NOT IN ('admin', 'manager', 'cashier') THEN
    RETURN jsonb_build_object('success', false, 'error', '...');
  END IF;

  -- Validar que manager tenga tienda asignada
  IF p_role = 'manager' AND p_assigned_store_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '...');
  END IF;

  -- Crear SOLO el perfil en public.users (sin auth_user_id)
  INSERT INTO users (
    auth_user_id,  -- NULL inicialmente
    company_id,
    email,
    name,
    role,
    assigned_store_id,
    active,
    ...
  ) VALUES (
    NULL,  -- ← Se vinculará cuando el usuario se registre
    ...
  );
END;
$$;
```

**✅ SOLUCIÓN AL PROBLEMA DE SESIÓN:**
- **NO usa `supabase.auth.signUp()`** → No cierra la sesión del admin
- Crea solo el perfil en `public.users` con `auth_user_id = NULL`
- El usuario debe registrarse después con el mismo email
- `AuthContext` vincula automáticamente el perfil cuando el usuario se registra

### 2.3 Comparación: Gerente vs Cajero

**Validación Específica para Gerente:**
```typescript
// src/pages/Users.tsx
// GERENTE requiere tienda asignada obligatoriamente
if (createRole === 'manager' && !createStoreId) {
  toast({ 
    title: "Tienda requerida", 
    description: "El Gerente debe tener una tienda asignada.",
    variant: "destructive"
  });
  return;
}
```

**Validación en RPC:**
```sql
-- Validar que manager tenga tienda asignada
IF p_role = 'manager' AND p_assigned_store_id IS NULL THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'El rol de Gerente requiere una tienda asignada'
  );
END IF;
```

**Validación para Cajero:**
```typescript
// Cajero puede tener tienda opcional
p_assigned_store_id: createRole === "admin" ? null : (createStoreId || null)
```

**🔍 DIFERENCIA CLAVE:**
- **Gerente:** `assigned_store_id` es **OBLIGATORIO** (validado en frontend y backend)
- **Cajero:** `assigned_store_id` es **OPCIONAL** (puede asignarse después)

**¿Por qué falló la creación de Gerente?**
- Si el admin no seleccionaba una tienda → Validación fallaba
- Si la tienda no existía o estaba inactiva → Error en BD
- Si había un problema de permisos en la RPC → Error silencioso

**¿Por qué funcionó mejor la creación de Cajero?**
- No requiere tienda obligatoria → Menos validaciones
- Puede crearse sin tienda y asignarse después → Más flexible

---

## 3. ESTABILIDAD DEL LOGIN

### 3.1 Manejo del Estado `loading`

**Ubicación:** `src/contexts/AuthContext.tsx`

**Inicialización:**
```typescript
const [loading, setLoading] = useState(true);  // ← Inicia en true

useEffect(() => {
  const initializeAuth = async () => {
    // Timeout de seguridad (8 segundos)
    timeoutId = setTimeout(async () => {
      if (mounted && !isInitialized) {
        console.warn('Auth initialization timeout');
        clearAuthCache();
        // ... manejo de timeout
        setLoading(false);  // ← Fuerza loading a false
        isInitialized = true;
      }
    }, 8000);

    // Obtener sesión
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      setLoading(false);  // ← Error → loading false
      return;
    }

    if (session?.user) {
      // Timeout para fetchUserProfile (3 segundos)
      const profileTimeout = setTimeout(() => {
        setLoading(false);  // ← Timeout → loading false
        isInitialized = true;
      }, 3000);

      await fetchUserProfile(session.user.id);
      clearTimeout(profileTimeout);
      
      // Verificar si tenemos perfil
      const currentCached = profileCacheRef.current.get(session.user.id);
      if (!currentCached) {
        // No hay perfil → Cerrar sesión
        setUser(null);
        setSession(null);
        setLoading(false);  // ← Sin perfil → loading false
        return;
      }
      
      setLoading(false);  // ← Éxito → loading false
    } else {
      setLoading(false);  // ← Sin sesión → loading false
    }
  };

  initializeAuth();
}, []);
```

**✅ PROTECCIONES IMPLEMENTADAS:**
1. **Timeout de 8 segundos** para inicialización completa
2. **Timeout de 3 segundos** para fetch de perfil
3. **Múltiples puntos de `setLoading(false)`** para evitar pantalla blanca infinita
4. **Limpieza automática de cache** en caso de timeout
5. **Cierre automático de sesión** si no hay perfil

**⚠️ POSIBLES PROBLEMAS:**
- Si Supabase tarda > 8 segundos → Timeout fuerza `loading = false` pero puede no tener perfil
- Si `fetchUserProfile` tarda > 3 segundos → Timeout pero puede seguir intentando en background
- Si hay error de red → `loading = false` pero usuario puede quedar en estado inconsistente

### 3.2 UI Durante Carga

**Componente de Carga:**
```typescript
// src/App.tsx
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center space-y-6">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-lg font-semibold">Cargando...</p>
    </div>
  </div>
);
```

**Uso en Rutas:**
```typescript
// src/App.tsx
const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;  // ← Muestra spinner
  }

  if (!user) {
    return <AuthPage />;  // ← Muestra login
  }

  return <Routes>...</Routes>;
};
```

**✅ PROTECCIÓN:**
- Si `loading = true` → Muestra spinner (NO pantalla blanca)
- Si `loading = false` y `!user` → Muestra login
- Si `loading = false` y `user` → Muestra rutas protegidas

### 3.3 Redirecciones Forzadas

**Redirección Basada en Rol:**
```typescript
// src/App.tsx
const RoleBasedRedirect = () => {
  const { userProfile } = useAuth();
  
  // Si no hay perfil, mostrar login
  if (!userProfile) {
    return <Navigate to="/" replace />;
  }
  
  // Redirigir según rol
  if (userProfile.role === 'master_admin') {
    return <Navigate to="/master-audit" replace />;
  }
  if (userProfile.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (userProfile.role === 'manager') {
    return <Navigate to="/estadisticas" replace />;
  }
  if (userProfile.role === 'cashier') {
    return <Navigate to="/pos" replace />;
  }
  
  // Por defecto, dashboard
  return <Dashboard />;
};
```

**⚠️ PROBLEMA POTENCIAL:**
- Si `userProfile` es `null` pero `user` existe → Redirige a `/` (login)
- Si `userProfile.role` es `undefined` → No redirige, muestra Dashboard por defecto
- Si `userProfile.role` tiene un valor inválido (ej: `'hacker'`) → No hay validación, puede acceder a rutas

**Guards de Rutas:**
```typescript
// src/components/auth/ProtectedRoute.tsx
if (requiredRole) {
  const roleHierarchy = { master_admin: 4, admin: 3, manager: 3, cashier: 1 };
  const userRoleLevel = roleHierarchy[userProfile.role as keyof typeof roleHierarchy] || 0;
  
  if (userRoleLevel < requiredRoleLevel) {
    // Acceso denegado
  }
}
```

**🔴 VULNERABILIDAD:**
- Si `userProfile.role` no está en `roleHierarchy` → `userRoleLevel = 0`
- Si `requiredRole = 'cashier'` (nivel 1) → `0 < 1` → Acceso denegado ✅
- Si `requiredRole = 'admin'` (nivel 3) → `0 < 3` → Acceso denegado ✅
- **PERO:** Si hay un bug y `userProfile.role` es `undefined` → Puede haber comportamiento inesperado

---

## 4. RESUMEN DE HALLAZGOS

### 🔴 CRÍTICOS

1. **Constraint de BD no incluye `master_admin`:**
   - El CHECK constraint solo valida `('admin', 'manager', 'cashier')`
   - `master_admin` existe en código pero no está validado en BD
   - **Riesgo:** Valores inválidos pueden insertarse directamente en BD

2. **Rol almacenado como `string` sin enum:**
   - No hay validación de tipos en TypeScript
   - No hay validación de valores permitidos en runtime
   - **Riesgo:** Valores inválidos pueden causar bugs silenciosos

### 🟡 MEDIOS

3. **Validación de roles inconsistente:**
   - Frontend valida: `'admin' | 'manager' | 'cashier'`
   - Backend valida: `'admin' | 'manager' | 'cashier'`
   - Código usa: `'master_admin' | 'admin' | 'manager' | 'cashier'`
   - **Riesgo:** Inconsistencias pueden causar errores

4. **Timeout agresivo de 3 segundos:**
   - Si `fetchUserProfile` tarda > 3s → Timeout pero puede seguir en background
   - **Riesgo:** Usuario puede ver login pero tener sesión activa

### 🟢 MENORES

5. **Gerente requiere tienda, Cajero no:**
   - Diferencia intencional pero puede confundir
   - **Riesgo:** Admin puede crear Gerente sin tienda si hay bug en validación

6. **Múltiples puntos de `setLoading(false)`:**
   - Puede causar race conditions
   - **Riesgo:** Estado inconsistente si hay errores de red

---

## 5. RECOMENDACIONES

### 🔧 CORRECCIONES INMEDIATAS

1. **Actualizar constraint de BD:**
   ```sql
   ALTER TABLE public.users 
   DROP CONSTRAINT IF EXISTS users_role_check;
   
   ALTER TABLE public.users 
   ADD CONSTRAINT users_role_check 
   CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier'));
   ```

2. **Crear enum TypeScript:**
   ```typescript
   type UserRole = 'master_admin' | 'admin' | 'manager' | 'cashier';
   
   interface UserProfile {
     role: UserRole;  // ← En lugar de string
   }
   ```

3. **Validación de rol en runtime:**
   ```typescript
   const isValidRole = (role: string): role is UserRole => {
     return ['master_admin', 'admin', 'manager', 'cashier'].includes(role);
   };
   ```

### 📋 MEJORAS SUGERIDAS

4. **Aumentar timeout de fetchUserProfile a 5 segundos**
5. **Agregar logging de errores de autenticación**
6. **Implementar retry automático para fetchUserProfile**
7. **Agregar validación de integridad entre `auth.users` y `public.users`**

---

**Fin del Documento de Auditoría**





