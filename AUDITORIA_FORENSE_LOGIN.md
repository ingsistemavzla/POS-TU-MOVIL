# 🔍 AUDITORÍA FORENSE: Proceso de Login para Nuevos Usuarios (Gerentes)

**Fecha:** 2025-01-27  
**Auditor:** Auditor Forense de Autenticación y Especialista en Supabase RLS  
**Contexto:** Regresión en flujo de login para nuevos usuarios (Gerentes) - pantalla en blanco o bucle infinito

---

## 📋 HIPÓTESIS DE FALLO

1. **Política RLS Restrictiva:** La tabla `users` tiene una política RLS que impide al usuario recién logueado leer su propia fila.
2. **Race Condition en Frontend:** El componente `AuthProvider` intenta leer el perfil antes de que la BD haya finalizado la creación de la fila o antes de que el token de sesión esté listo para RLS.

---

## 🔐 TAREA 1: AUDITORÍA DE RLS EN PERFILES (`public.users`)

### Políticas RLS Encontradas

#### **Política Principal (Más Reciente):**

**Archivo:** `supabase/migrations/20250826170000_complete_auth_setup.sql`  
**Líneas:** 129-133

```sql
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (
    company_id = public.get_user_company_id() OR
    auth_user_id = auth.uid()
  );
```

**Análisis:**
- ✅ **PERMITE** que un usuario lea su propia fila si `auth_user_id = auth.uid()`
- ⚠️ **PROBLEMA POTENCIAL:** También requiere `company_id = public.get_user_company_id()`, pero esta condición es redundante si `auth_user_id = auth.uid()` es verdadero
- ✅ **La política es correcta** - permite lectura propia

---

#### **Política Alternativa (Registro):**

**Archivo:** `supabase/migrations/20250826165000_fix_registration_policies.sql`  
**Líneas:** 50-54

```sql
DROP POLICY IF EXISTS "Users can view users from their company" ON public.users;
CREATE POLICY "Users can view users from their company" ON public.users
  FOR SELECT USING (
    company_id = public.get_user_company_id() OR
    auth_user_id = auth.uid()
  );
```

**Análisis:**
- ✅ **Misma lógica** que la política principal
- ✅ **Permite lectura propia** con `auth_user_id = auth.uid()`

---

#### **Política Antigua (Potencial Conflicto):**

**Archivo:** `supabase/migrations/20250826162300_setup_auth_and_rls.sql`  
**Líneas:** 45-46

```sql
CREATE POLICY "Users can view users from their company" ON public.users
  FOR SELECT USING (company_id = public.get_user_company_id());
```

**Análisis:**
- ❌ **PROBLEMA:** Esta política **NO permite** lectura propia si `get_user_company_id()` retorna `NULL`
- ⚠️ **CONFLICTO:** Si esta política no fue eliminada, puede estar bloqueando el acceso

---

### Función Helper `get_user_company_id()`

**Archivo:** `supabase/migrations/20250826170000_complete_auth_setup.sql`  
**Líneas:** 54-60

```sql
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
```

**Análisis:**
- ⚠️ **PROBLEMA CRÍTICO:** Esta función hace un `SELECT` en `public.users` con `WHERE auth_user_id = auth.uid()`
- ⚠️ **CIRCULARIDAD:** Si la política RLS requiere `get_user_company_id()` para leer `users`, pero `get_user_company_id()` necesita leer `users`, puede haber un problema de dependencia circular
- ✅ **Mitigación:** La función usa `SECURITY DEFINER`, por lo que bypasea RLS, evitando la circularidad

---

### Verificación de Políticas Activas

**Problema Potencial:**
- Si existen múltiples políticas `SELECT` en `public.users`, PostgreSQL aplica un `OR` entre ellas
- Si una política antigua (sin `auth_user_id = auth.uid()`) no fue eliminada, puede causar conflictos

**Recomendación:**
```sql
-- Verificar políticas activas
SELECT policyname, pg_get_expr(polqual, 'public.users'::regclass) AS using_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'SELECT';
```

---

## 🖥️ TAREA 2: AUDITORÍA DEL AUTHPROVIDER (Frontend)

### Función Principal: `fetchUserProfile`

**Archivo:** `src/contexts/AuthContext.tsx`  
**Líneas:** 90-340

#### **Query de Perfil (Líneas 106-110):**

```typescript
const profileFetchPromise = supabase
  .from('users')
  .select('id, auth_user_id, company_id, email, name, role, assigned_store_id, active, created_at, updated_at')
  .eq('auth_user_id', userId)
  .maybeSingle();
```

**Análisis:**
- ✅ **Query correcta:** Busca por `auth_user_id = userId` (donde `userId = auth.uid()`)
- ✅ **Usa `maybeSingle()`:** Retorna `null` si no encuentra, en lugar de error
- ⚠️ **PROBLEMA POTENCIAL:** Si RLS bloquea, retornará `null` sin error explícito

---

#### **Mecanismo de Timeout (Líneas 112-132):**

```typescript
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error('PROFILE_FETCH_TIMEOUT')), PROFILE_FETCH_TIMEOUT);
});

try {
  const result = await Promise.race([profileFetchPromise, timeoutPromise]);
  profileResult = result;
  error = null;
} catch (raceError: any) {
  if (raceError?.message === 'PROFILE_FETCH_TIMEOUT') {
    console.warn('Profile fetch timeout - conexión lenta detectada');
    setIsSlowNetwork(true);
    return { success: false, isNetworkError: true, error: 'timeout' };
  }
  error = raceError;
}
```

**Análisis:**
- ✅ **Timeout configurado:** 15 segundos (`PROFILE_FETCH_TIMEOUT = 15000`)
- ✅ **Manejo de timeout:** No cierra sesión si es timeout, marca como error de red
- ⚠️ **PROBLEMA:** Si RLS bloquea silenciosamente (retorna `null` sin error), el timeout no se activa, pero el perfil será `null`

---

#### **Mecanismo de Reintento (Líneas 206-216):**

```typescript
// Si el error es "no encontrado" (PGRST116) y no es retry, intentar una vez más
if (queryError?.code === 'PGRST116' && !isRetry) {
  const retryCount = retryAttemptsRef.current.get(userId) || 0;
  if (retryCount < MAX_RETRY_ATTEMPTS) {
    retryAttemptsRef.current.set(userId, retryCount + 1);
    console.log(`Reintentando fetchUserProfile (intento ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
    // Esperar 2 segundos antes de reintentar
    await new Promise(resolve => setTimeout(resolve, 2000));
    return fetchUserProfile(userId, forceRefresh, true);
  }
}
```

**Análisis:**
- ✅ **Reintento configurado:** Máximo 3 intentos (`MAX_RETRY_ATTEMPTS = 3`)
- ✅ **Delay entre reintentos:** 2 segundos
- ⚠️ **PROBLEMA:** Solo reintenta si el error es `PGRST116` (404 Not Found). Si RLS bloquea silenciosamente (retorna `null` sin error), NO se reintenta

---

#### **Cierre de Sesión si No Hay Perfil (Líneas 218-237):**

```typescript
// Si realmente no existe el perfil (después de todos los intentos)
console.warn('No se encontró perfil para el usuario después de todos los intentos. Cerrando sesión.');
// Limpiar cache primero
profileCacheRef.current.delete(userId);
retryAttemptsRef.current.delete(userId);
// Limpiar cache de autenticación
clearAuthCache();
// Limpiar el estado local inmediatamente
setUserProfile(null);
setCompany(null);
setLoading(false);
setIsSlowNetwork(false);
// Forzar limpieza de user y session
setUser(null);
setSession(null);
// Cerrar sesión en background (no esperar)
supabase.auth.signOut().catch((err) => {
  console.error('Error signing out:', err);
});
return { success: false, isNetworkError: false, error: 'profile_not_found' };
```

**Análisis:**
- ⚠️ **PROBLEMA CRÍTICO:** Si RLS bloquea silenciosamente (retorna `null` sin error), el código asume que el perfil no existe y **cierra la sesión**
- ❌ **NO diferencia** entre "perfil no existe" y "RLS bloqueó el acceso"
- ❌ **NO verifica** si el error es `PGRST301` (403 Forbidden) antes de cerrar sesión

---

### Event Handler: `onAuthStateChange`

**Archivo:** `src/contexts/AuthContext.tsx`  
**Líneas:** 604-687

#### **Manejo de `SIGNED_IN` (Líneas 620-645):**

```typescript
} else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  if (session?.user) {
    const hasCachedProfile = profileCacheRef.current.has(session.user.id);
    if (!hasCachedProfile || !userProfile) {
      try {
        await fetchUserProfile(session.user.id);
        // Verificar si después de fetchUserProfile tenemos perfil
        if (!userProfile) {
          // No hay perfil, la sesión fue cerrada por fetchUserProfile
          // El siguiente evento SIGNED_OUT manejará el estado
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error fetching profile on auth change:', error);
        // Si hay error y no hay perfil, cerrar sesión
        if (!userProfile) {
          setUser(null);
          setSession(null);
          setLoading(false);
          sessionKeepAlive.stop();
          supabase.auth.signOut().catch(console.error);
          return;
        }
        setLoading(false);
      }
    }
```

**Análisis:**
- ⚠️ **PROBLEMA:** Si `fetchUserProfile` retorna `null` (por RLS bloqueando), el código cierra sesión inmediatamente
- ❌ **NO verifica** si el error es de permisos (403) antes de cerrar sesión
- ⚠️ **Race Condition:** Si el perfil se crea justo después del login, puede haber un delay entre `SIGNED_IN` y la disponibilidad del perfil en RLS

---

### Inicialización: `initializeAuth`

**Archivo:** `src/contexts/AuthContext.tsx`  
**Líneas:** 470-600

#### **Timeout de Inicialización (Líneas 485-519):**

```typescript
timeoutId = setTimeout(async () => {
  if (mounted && !isInitialized) {
    console.warn('Auth initialization timeout - verificando estado de conexión');
    // Obtener la sesión actual para verificar
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    // Si hay sesión pero no hay perfil, puede ser conexión lenta
    if (currentSession?.user) {
      // Verificar si hay perfil en cache
      const hasCachedProfile = profileCacheRef.current.has(currentSession.user.id);
      if (!hasCachedProfile) {
        // No hay perfil después del timeout - puede ser conexión lenta
        console.warn('Timeout: Sesión activa sin perfil. Marcando como conexión lenta.');
        setIsSlowNetwork(true);
        setLoading(false); // Permitir que la UI se renderice
        // NO cerrar sesión automáticamente - permitir reintento
        isInitialized = true;
      }
```

**Análisis:**
- ✅ **Timeout configurado:** 20 segundos
- ✅ **No cierra sesión en timeout:** Marca como conexión lenta y permite reintento
- ⚠️ **PROBLEMA:** Si RLS bloquea, el timeout no detecta el problema específico

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **RLS Bloquea Silenciosamente (Sin Error Explícito)**

**Problema:**
- Si RLS bloquea una query, Supabase puede retornar `null` sin error explícito
- El código asume que `null` = "perfil no existe", pero puede ser "RLS bloqueó el acceso"

**Evidencia:**
```typescript
// Línea 134: No verifica si el error es 403 antes de asumir "no existe"
let effectiveProfile = (profileResult?.data as any) as UserProfile | null;
const queryError = profileResult?.error || error;

// Línea 198: Si no hay perfil, cierra sesión sin verificar si fue bloqueo RLS
if (!effectiveProfile) {
  // ... cierra sesión
}
```

---

### 2. **No Verifica Código de Error 403 (Forbidden)**

**Problema:**
- El código NO verifica si `queryError?.code === 'PGRST301'` (403 Forbidden) antes de cerrar sesión
- Solo verifica `PGRST116` (404 Not Found) para reintentos

**Evidencia:**
```typescript
// Línea 207: Solo reintenta si es 404, no si es 403
if (queryError?.code === 'PGRST116' && !isRetry) {
  // ... reintenta
}
// NO HAY verificación para PGRST301 (403)
```

---

### 3. **Race Condition: Perfil Creado Después del Login**

**Problema:**
- Si un Gerente se crea en `public.users` ANTES de que se autentique en `auth.users`, puede haber un delay
- El frontend intenta leer el perfil inmediatamente después de `SIGNED_IN`, pero RLS puede no estar listo

**Evidencia:**
```typescript
// Línea 620: Inmediatamente después de SIGNED_IN, intenta leer perfil
} else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  if (session?.user) {
    // ... inmediatamente intenta fetchUserProfile
    await fetchUserProfile(session.user.id);
```

---

### 4. **Dependencia Circular en Política RLS**

**Problema Potencial:**
- La política RLS usa `get_user_company_id()` que lee `public.users`
- Si `get_user_company_id()` retorna `NULL` (porque el perfil no existe o RLS lo bloquea), la política puede fallar

**Evidencia:**
```sql
-- Política RLS
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (
    company_id = public.get_user_company_id() OR  -- ⚠️ Puede retornar NULL
    auth_user_id = auth.uid()  -- ✅ Esta condición debería ser suficiente
  );
```

---

## ✅ RECOMENDACIONES

### 1. **Verificar Políticas RLS Activas**

Ejecutar en Supabase SQL Editor:
```sql
-- Verificar todas las políticas SELECT en users
SELECT 
  policyname,
  cmd,
  pg_get_expr(polqual, 'public.users'::regclass) AS using_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users' 
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Eliminar políticas duplicadas o conflictivas
DROP POLICY IF EXISTS "Users can view users from their company" ON public.users;
-- Mantener solo la política que permite auth_user_id = auth.uid()
```

---

### 2. **Mejorar Manejo de Errores en `fetchUserProfile`**

Modificar `src/contexts/AuthContext.tsx`:

```typescript
// Después de línea 135
let effectiveProfile = (profileResult?.data as any) as UserProfile | null;
const queryError = profileResult?.error || error;

// ✅ AGREGAR: Verificar si el error es 403 (Forbidden)
if (queryError?.code === 'PGRST301' || queryError?.status === 403) {
  console.error('❌ RLS bloqueó el acceso al perfil (403 Forbidden)');
  console.error('Error details:', {
    code: queryError.code,
    message: queryError.message,
    details: queryError.details,
    hint: queryError.hint
  });
  
  // NO cerrar sesión - puede ser un problema temporal de RLS
  setIsSlowNetwork(true);
  return { 
    success: false, 
    isNetworkError: false, 
    error: 'rls_forbidden',
    details: 'RLS bloqueó el acceso al perfil. Verificar políticas RLS.'
  };
}

// ✅ AGREGAR: Verificar si el resultado es null pero NO hay error (RLS bloqueó silenciosamente)
if (!effectiveProfile && !queryError) {
  console.warn('⚠️ Query retornó null sin error - posible bloqueo RLS silencioso');
  // Reintentar una vez más con delay
  if (!isRetry) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return fetchUserProfile(userId, forceRefresh, true);
  }
}
```

---

### 3. **Agregar Delay en `onAuthStateChange` para Nuevos Usuarios**

Modificar `src/contexts/AuthContext.tsx`:

```typescript
} else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  if (session?.user) {
    // ✅ AGREGAR: Delay para nuevos usuarios (dar tiempo a que RLS se sincronice)
    const isNewUser = !profileCacheRef.current.has(session.user.id);
    if (isNewUser) {
      console.log('Nuevo usuario detectado - esperando 1 segundo antes de leer perfil');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const hasCachedProfile = profileCacheRef.current.has(session.user.id);
    // ... resto del código
```

---

### 4. **Simplificar Política RLS**

Modificar política RLS para que NO dependa de `get_user_company_id()`:

```sql
-- Eliminar política actual
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- Crear política simplificada que SIEMPRE permite lectura propia
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (
    -- Permitir lectura propia (SIEMPRE funciona)
    auth_user_id = auth.uid() OR
    -- Permitir lectura de usuarios de la misma compañía (solo si ya tiene perfil)
    (company_id = public.get_user_company_id() AND public.get_user_company_id() IS NOT NULL)
  );
```

---

## 📋 CHECKLIST DE CORRECCIÓN

- [ ] Verificar políticas RLS activas en `public.users`
- [ ] Eliminar políticas duplicadas o conflictivas
- [ ] Agregar verificación de error 403 en `fetchUserProfile`
- [ ] Agregar delay para nuevos usuarios en `onAuthStateChange`
- [ ] Simplificar política RLS para evitar dependencia circular
- [ ] Probar login con nuevo usuario Gerente
- [ ] Verificar logs de consola para errores RLS

---

**FIN DEL REPORTE DE AUDITORÍA FORENSE**





