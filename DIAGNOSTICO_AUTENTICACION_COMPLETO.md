# 🔍 DIAGNÓSTICO PROFUNDO: Sistema de Autenticación y Permisos

**Fecha:** 2025-01-XX  
**Auditor:** Senior React & Supabase Security Auditor  
**Objetivo:** Identificar problemas de estabilidad y seguridad en el módulo AUTH & PERMISSIONS

---

## 📋 RESUMEN EJECUTIVO

El sistema de autenticación tiene **3 problemas críticos**:

1. **Race Condition en Login:** La redirección ocurre antes de que el perfil del usuario esté disponible
2. **Filtrado de Seguridad en Frontend:** Los datos se filtran por `role` y `store_id` en React en lugar de usar RLS
3. **Magic Strings de Roles:** Roles hardcodeados en múltiples componentes, creando dependencias frágiles

---

## 1. IDENTITY SOURCE OF TRUTH (El Problema "¿Quién soy?")

### ✅ Fuente de Verdad Identificada

**Ubicación:** `src/contexts/AuthContext.tsx`

**Método:** El rol se lee desde la tabla `public.users` (NO desde `auth.users.user_metadata`)

```typescript
// Línea 108: fetchUserProfile en AuthContext.tsx
const profileResult = await supabase
  .from('users')
  .select('id, auth_user_id, company_id, email, name, role, assigned_store_id, active, created_at, updated_at')
  .eq('auth_user_id', userId)
  .maybeSingle();
```

**Almacenamiento:**
- Se guarda en `userProfile` (tipo `Tables<'users'>`)
- Accesible vía `useAuth()` hook
- Se cachea por 5 minutos en `profileCacheRef`

### ❌ PROBLEMA: Magic Strings de Roles Esparcidos

**Evidencia de Código:**

```typescript
// src/pages/POS.tsx - Línea 244
const isRestrictedToStore = userProfile?.role === 'cashier' || userProfile?.role === 'manager';

// src/pages/POS.tsx - Línea 356
if (userProfile?.role === 'admin' && selectedStore) {

// src/pages/POS.tsx - Línea 420
const isRestrictedUser = userProfile?.role === 'cashier' || userProfile?.role === 'manager';

// src/pages/POS.tsx - Línea 480
const storeId = userProfile?.role === 'cashier' 
  ? userProfile.assigned_store_id 
  : selectedStore?.id;

// src/components/layout/MainLayout.tsx - Línea 166
if (userProfile.role === 'admin' || userProfile.role === 'master_admin') {

// src/App.tsx - Línea 88
if (userProfile.role !== requiredRole) {

// src/App.tsx - Líneas 111-128
if (userProfile.role === 'master_admin') { ... }
if (userProfile.role === 'admin') { ... }
if (userProfile.role === 'manager') { ... }
if (userProfile.role === 'cashier') { ... }

// src/hooks/useDashboardData.ts - Línea 272
if (userProfile.role === 'cashier' && userProfile.assigned_store_id) {

// src/hooks/useDashboardData.ts - Líneas 308-310, 324-328
const storeFilter = userProfile.role === 'cashier' || userProfile.role === 'manager'
  ? userProfile.assigned_store_id || undefined
  : undefined;
```

**Total encontrado:** 21+ instancias de comparaciones de roles hardcodeadas

**Riesgo:** Si el nombre de un rol cambia en la BD, hay que actualizar múltiples archivos manualmente.

---

## 2. THE LOGIN BOTTLENECK (Race Condition)

### 🔴 PROBLEMA CRÍTICO: Race Condition en el Flujo de Login

**Flujo Actual:**

```
1. Usuario hace submit en LoginForm.tsx
   ↓
2. signIn(email, password) → supabase.auth.signInWithPassword()
   ↓
3. Supabase Auth dispara evento SIGNED_IN
   ↓
4. onAuthStateChange en AuthContext.tsx detecta SIGNED_IN
   ↓
5. fetchUserProfile() se ejecuta (con delay de 3 segundos para nuevos usuarios)
   ↓
6. RoleBasedRedirect en App.tsx se ejecuta INMEDIATAMENTE
   ↓
7. ❌ userProfile aún es null → Redirección falla o va a ruta incorrecta
```

### Evidencia de Código:

**LoginForm.tsx (Líneas 21-33):**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  const { error } = await signIn(email, password);  // ⚠️ Solo llama a signInWithPassword
  
  if (error) {
    setError(error.message);
  }
  
  setLoading(false);
  // ❌ NO espera a que userProfile esté disponible
};
```

**AuthContext.tsx - signIn (Líneas 518-540):**
```typescript
const signIn = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  // ❌ NO espera a fetchUserProfile
  // ❌ NO retorna el perfil del usuario
  return { error };
};
```

**AuthContext.tsx - onAuthStateChange (Líneas 798-805):**
```typescript
} else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  if (session?.user) {
    // 🚨 DELAY PARA NUEVOS USUARIOS: Dar tiempo a que RLS se sincronice
    const isNewUser = !profileCacheRef.current.has(session.user.id);
    if (isNewUser) {
      console.log('🆕 Nuevo usuario detectado - esperando 3 segundos...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // ⚠️ Delay de 3 segundos
    }
    
    // ⚠️ fetchUserProfile puede tardar más (reintentos, timeouts, etc.)
    await fetchUserProfile(session.user.id);
```

**App.tsx - RoleBasedRedirect (Líneas 102-138):**
```typescript
const RoleBasedRedirect = () => {
  const { userProfile } = useAuth();
  
  // ❌ Si no hay perfil, redirige a login (pero puede que el perfil aún esté cargando)
  if (!userProfile) {
    return <Navigate to="/" replace />;
  }
  
  // ❌ Estas comparaciones pueden ejecutarse ANTES de que userProfile esté disponible
  if (userProfile.role === 'master_admin') {
    return <Navigate to="/master-audit" replace />;
  }
  // ...
};
```

### 🔴 CONSECUENCIA DEL RACE CONDITION

1. Usuario hace login
2. `signInWithPassword` completa exitosamente
3. `onAuthStateChange` dispara `SIGNED_IN`
4. `RoleBasedRedirect` se ejecuta **ANTES** de que `fetchUserProfile` complete
5. `userProfile` es `null` → Redirección a `/` (login)
6. Usuario ve pantalla de login aunque ya está autenticado
7. Después de 3+ segundos, `fetchUserProfile` completa y `userProfile` se establece
8. Usuario es redirigido correctamente (pero ya vio el login)

**Síntomas observados:**
- Pantalla negra después del login
- Redirección a login después de autenticación exitosa
- Dashboard aparece después de varios segundos

---

## 3. DATA CONTAMINATION (El Problema "Leaky Dashboard")

### 🔴 PROBLEMA CRÍTICO: Filtrado de Seguridad en Frontend

**Patrón Encontrado:** El código filtra datos por `role`, `store_id`, y `company_id` en el **FRONTEND** en lugar de confiar en RLS.

### Evidencia de Código:

#### A. useDashboardData.ts - Filtrado por Role y Store

**Líneas 272-293:**
```typescript
// ❌ BAD PATTERN: Filtrado por role en frontend
if (userProfile.role === 'cashier' && userProfile.assigned_store_id) {
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('id', userProfile.assigned_store_id)  // ⚠️ Filtro manual
    .eq('active', true)
    .single();
  
  if (!storeError && storeData) {
    stores = [storeData];
  }
} else {
  const { data: storesData, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('company_id', companyId)  // ⚠️ Filtro manual
    .eq('active', true);
  
  if (!storesError && storesData) {
    stores = storesData;
  }
}
```

**Líneas 308-310, 324-328:**
```typescript
// ❌ BAD PATTERN: Filtrado por role y store_id en frontend
const storeFilter = userProfile.role === 'cashier' || userProfile.role === 'manager'
  ? userProfile.assigned_store_id || undefined
  : undefined;

// ...

const storeFilterForQueries = userProfile.role === 'cashier' && userProfile.assigned_store_id
  ? userProfile.assigned_store_id
  : userProfile.role === 'manager' && userProfile.assigned_store_id
  ? userProfile.assigned_store_id
  : undefined;

// Línea 347-349: Aplicar filtro manual
if (storeFilterForQueries) {
  recentQuery = recentQuery.eq('store_id', storeFilterForQueries);  // ⚠️ Filtro manual
}
```

**Líneas 165-171:**
```typescript
// ❌ BAD PATTERN: Filtrado por company_id y store_id en frontend
let query = supabase
  .from('sales')
  .select('id, total_usd, created_at')
  .eq('company_id', companyId)  // ⚠️ Filtro manual
  .gte('created_at', startDate.toISOString())
  .lte('created_at', endDate.toISOString());

if (storeId) {
  query = query.eq('store_id', storeId);  // ⚠️ Filtro manual
}
```

#### B. useSalesData.ts - Filtrado por Role y Store

**Líneas 154-159:**
```typescript
// ❌ BAD PATTERN: Filtrado por company_id y role en frontend
.eq('company_id', userProfile.company_id);  // ⚠️ Filtro manual

// If user is manager, only show sales from their assigned store
if (userProfile?.role === 'manager' && userProfile?.assigned_store_id) {
  query = query.eq('store_id', userProfile.assigned_store_id);  // ⚠️ Filtro manual
}
```

#### C. SalesPage.tsx - Filtrado por Company y Store

**Línea 562:**
```typescript
// ❌ BAD PATTERN: Filtrado por company_id en frontend
.eq('company_id', userProfile.company_id)  // ⚠️ Filtro manual
```

**Líneas 275, 296, 497, 591:**
```typescript
// ❌ BAD PATTERN: Múltiples filtros manuales por store_id
salesQuery = salesQuery.eq('store_id', effectiveStoreId);  // ⚠️ Filtro manual
saleItemsQuery = saleItemsQuery.eq('sales.store_id', reportFilters.storeId);  // ⚠️ Filtro manual
```

#### D. AlmacenPage.tsx - Filtrado por Company

**Líneas 98, 132, 161:**
```typescript
// ❌ BAD PATTERN: Filtrado por company_id en frontend
.eq('company_id', userProfile.company_id)  // ⚠️ Filtro manual (3 veces)
```

#### E. POS.tsx - Filtrado por Store y Company

**Líneas 440-441, 493-494:**
```typescript
// ❌ BAD PATTERN: Filtrado por store_id y company_id en frontend
.eq('store_id', storeId)  // ⚠️ Filtro manual
.eq('company_id', userProfile.company_id)  // ⚠️ Filtro manual
```

### 🔴 CONSECUENCIA DEL FILTRADO EN FRONTEND

**Por qué esto es un problema de seguridad:**

1. **Si `userProfile.role` es incorrecto o está desincronizado**, el usuario puede ver datos que no debería
2. **Si `userProfile.assigned_store_id` es NULL o incorrecto**, el usuario puede ver todas las tiendas
3. **Si hay un bug en la lógica de filtrado**, se pueden filtrar datos incorrectamente
4. **Si RLS no está implementado correctamente**, el frontend es la única barrera de seguridad (frágil)

**Ejemplo de ataque:**
```typescript
// Si un usuario manipula el estado de React (DevTools):
userProfile.role = 'admin';  // Cambiar role manualmente
userProfile.assigned_store_id = null;  // Quitar restricción de tienda

// Ahora el usuario puede ver TODOS los datos de la compañía
// porque el frontend no filtra correctamente
```

**Patrón Correcto (RLS):**
```typescript
// ✅ GOOD PATTERN: Confiar en RLS
const { data } = await supabase
  .from('sales')
  .select('*');
  // NO filtrar por company_id o store_id
  // RLS en la BD se encarga automáticamente
```

---

## 📊 RESUMEN DE PROBLEMAS ENCONTRADOS

| Problema | Severidad | Archivos Afectados | Líneas |
|----------|-----------|-------------------|--------|
| **Race Condition en Login** | 🔴 CRÍTICO | `AuthContext.tsx`, `LoginForm.tsx`, `App.tsx` | ~50 líneas |
| **Filtrado de Seguridad en Frontend** | 🔴 CRÍTICO | `useDashboardData.ts`, `useSalesData.ts`, `SalesPage.tsx`, `AlmacenPage.tsx`, `POS.tsx` | ~100+ líneas |
| **Magic Strings de Roles** | 🟡 ALTO | 21+ archivos | ~50+ instancias |

---

## 🎯 "SMOKING GUN" (El Problema Principal)

### El Problema Principal: **Race Condition + Filtrado en Frontend**

**Ubicación Exacta:**

1. **`src/contexts/AuthContext.tsx` - Líneas 798-854:**
   - `onAuthStateChange` tiene un delay de 3 segundos para nuevos usuarios
   - `fetchUserProfile` puede tardar más (reintentos, timeouts)
   - `RoleBasedRedirect` se ejecuta **ANTES** de que `userProfile` esté disponible

2. **`src/hooks/useDashboardData.ts` - Líneas 272-328:**
   - Filtra por `role` y `store_id` en el frontend
   - Si `userProfile.role` está desincronizado, muestra datos incorrectos

3. **`src/hooks/useSalesData.ts` - Líneas 154-159:**
   - Filtra por `company_id` y `store_id` en el frontend
   - Si `userProfile.assigned_store_id` es NULL, muestra todas las tiendas

---

## 🔒 SECURITY LEAKS (Filtros de Seguridad en React)

### Lista Completa de Filtros Manuales Encontrados:

1. **useDashboardData.ts:**
   - Línea 272: `if (userProfile.role === 'cashier' && userProfile.assigned_store_id)`
   - Línea 287: `.eq('company_id', companyId)`
   - Línea 308-310: `storeFilter` basado en `role`
   - Línea 324-328: `storeFilterForQueries` basado en `role`
   - Línea 347-349: `.eq('store_id', storeFilterForQueries)`
   - Línea 165: `.eq('company_id', companyId)`
   - Línea 170: `.eq('store_id', storeId)`

2. **useSalesData.ts:**
   - Línea 154: `.eq('company_id', userProfile.company_id)`
   - Línea 157-159: `if (userProfile?.role === 'manager' && userProfile?.assigned_store_id)`

3. **SalesPage.tsx:**
   - Línea 562: `.eq('company_id', userProfile.company_id)`
   - Líneas 275, 296, 497, 591: `.eq('store_id', ...)`

4. **AlmacenPage.tsx:**
   - Líneas 98, 132, 161: `.eq('company_id', userProfile.company_id)`

5. **POS.tsx:**
   - Líneas 440-441, 493-494: `.eq('store_id', storeId)` y `.eq('company_id', userProfile.company_id)`

**Total:** ~20+ filtros manuales de seguridad en el frontend

---

## 📝 CÓDIGO EVIDENCE (Fragmentos de Código Problemáticos)

### Fragmento 1: Race Condition en Login

```typescript
// src/contexts/AuthContext.tsx - Líneas 798-854
} else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  if (session?.user) {
    const isNewUser = !profileCacheRef.current.has(session.user.id);
    if (isNewUser) {
      console.log('🆕 Nuevo usuario detectado - esperando 3 segundos...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // ⚠️ Delay
    }
    
    await fetchUserProfile(session.user.id); // ⚠️ Puede tardar más
    // ❌ RoleBasedRedirect ya se ejecutó antes de esto
  }
}
```

### Fragmento 2: Filtrado Manual por Role

```typescript
// src/hooks/useDashboardData.ts - Líneas 308-310
const storeFilter = userProfile.role === 'cashier' || userProfile.role === 'manager'
  ? userProfile.assigned_store_id || undefined
  : undefined;
// ❌ Si role está desincronizado, muestra datos incorrectos
```

### Fragmento 3: Filtrado Manual por Company

```typescript
// src/hooks/useSalesData.ts - Línea 154
.eq('company_id', userProfile.company_id)
// ❌ Si company_id es incorrecto, muestra datos de otra compañía
```

---

## ✅ RECOMENDACIONES (NO IMPLEMENTADAS - SOLO DIAGNÓSTICO)

1. **Eliminar Race Condition:**
   - Hacer que `RoleBasedRedirect` espere a que `userProfile` esté disponible
   - Mostrar loading mientras `userProfile` se carga

2. **Eliminar Filtrado en Frontend:**
   - Remover todos los `.eq('company_id', ...)` y `.eq('store_id', ...)` manuales
   - Confiar en RLS para filtrar automáticamente

3. **Centralizar Magic Strings:**
   - Crear constantes para roles: `ROLES.ADMIN`, `ROLES.MANAGER`, etc.
   - Usar estas constantes en lugar de strings hardcodeados

---

## 🎯 CONCLUSIÓN

El sistema tiene **problemas críticos de estabilidad y seguridad**:

1. **Race Condition:** El login falla porque la redirección ocurre antes de que el perfil esté disponible
2. **Filtrado en Frontend:** Los datos se filtran manualmente en React, creando vulnerabilidades de seguridad
3. **Magic Strings:** Roles hardcodeados en múltiples archivos, creando dependencias frágiles

**Prioridad de Corrección:**
1. 🔴 **CRÍTICO:** Eliminar race condition en login
2. 🔴 **CRÍTICO:** Eliminar filtrado de seguridad en frontend (confiar en RLS)
3. 🟡 **ALTO:** Centralizar magic strings de roles

---

**FIN DEL DIAGNÓSTICO**


