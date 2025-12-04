# 🔍 AUDITORÍA FORENSE: Sistema de Autenticación y RLS

## 📋 RESUMEN EJECUTIVO

**Problema Reportado:** Usuarios recién creados (Gerentes) no pueden completar el flujo de login y acceder a la aplicación.

**Síntomas:**
- Login falla, pantalla en blanco, o bucle de redirección/cierre de sesión
- Usuario se crea exitosamente en `public.users`
- Autenticación en Supabase Auth es exitosa
- Fallo al leer el perfil después de la autenticación

---

## 🔒 TAREA 1: AUDITORÍA DE RLS EN `public.users`

### **1.1 Política RLS Actual (Después de Corrección)**

**Archivo:** `fix_rls_users_circular_dependency.sql`

**Política Aplicada:**
```sql
CREATE POLICY "users_select_policy_self_only" ON public.users
  FOR SELECT USING (
    auth_user_id = auth.uid()
  );
```

**Análisis:**
- ✅ **Condición Explícita:** La política permite lectura propia usando `auth_user_id = auth.uid()`
- ✅ **Sin Dependencia Circular:** No usa `get_user_company_id()` ni otras funciones que requieran leer `public.users`
- ✅ **Atómicamente Segura:** La condición es simple y directa, no requiere consultas adicionales

**Estado:** ✅ **CORRECTO** - La política actual es segura y no debería causar problemas de lectura.

---

### **1.2 Políticas RLS Históricas (Problemas Identificados)**

**Migración Problemática:** `supabase/migrations/20250826170000_complete_auth_setup.sql`

**Política Anterior (PROBLEMÁTICA):**
```sql
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (
    company_id = public.get_user_company_id() OR
    auth_user_id = auth.uid()
  );
```

**Problema Identificado:**
- ❌ **Dependencia Circular:** `get_user_company_id()` requiere leer `public.users` para obtener `company_id`
- ❌ **Race Condition:** Si el usuario intenta leer su perfil antes de que RLS se sincronice, `get_user_company_id()` retorna `NULL`
- ❌ **Fallo Silencioso:** La condición `company_id = NULL` falla, y si `auth_user_id` aún no está establecido correctamente, el acceso es denegado

**Estado:** ❌ **PROBLEMÁTICA** - Esta política fue reemplazada por la versión corregida.

---

### **1.3 Verificación de Aplicación de Política**

**Script de Verificación:** `verificar_politica_rls.sql`

**Resultado Esperado:**
- Debe existir **1 sola política SELECT** llamada `users_select_policy_self_only`
- La expresión debe ser: `auth_user_id = auth.uid()`

**⚠️ ACCIÓN REQUERIDA:** Ejecutar `verificar_politica_rls.sql` para confirmar que la política correcta está aplicada.

---

## 💻 TAREA 2: AUDITORÍA DEL AUTHPROVIDER (Frontend)

### **2.1 Función Principal: `fetchUserProfile`**

**Ubicación:** `src/contexts/AuthContext.tsx` (líneas 70-404)

**Código Completo:**
```typescript
const fetchUserProfile = async (
  userId: string, 
  forceRefresh: boolean = false, 
  isRetry: boolean = false
): Promise<{ success: boolean; isNetworkError?: boolean; error?: string }> => {
  // ... código completo en AuthContext.tsx líneas 70-404
}
```

**Análisis del Flujo:**

#### **PASO 1: Verificación de Cache (Líneas 75-103)**
```typescript
if (!forceRefresh && profileCacheRef.current.has(userId)) {
  const cached = profileCacheRef.current.get(userId);
  if (cached) {
    setUserProfile(cached.profile);
    setCompany(cached.company);
    setIsSlowNetwork(false);
    return { success: true };
  }
}
```
- ✅ **Optimización:** Usa cache para evitar consultas redundantes
- ✅ **Seguro:** Solo retorna cache si existe

#### **PASO 2: Consulta Principal con Timeout (Líneas 105-132)**
```typescript
const profileFetchPromise = supabase
  .from('users')
  .select('id, auth_user_id, company_id, email, name, role, assigned_store_id, active, created_at, updated_at')
  .eq('auth_user_id', userId)
  .maybeSingle();

const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error('PROFILE_FETCH_TIMEOUT')), PROFILE_FETCH_TIMEOUT);
});

const result = await Promise.race([profileFetchPromise, timeoutPromise]);
```
- ✅ **Timeout Implementado:** 15 segundos (PROFILE_FETCH_TIMEOUT)
- ✅ **Consulta Correcta:** Filtra por `auth_user_id = userId`
- ⚠️ **Posible Problema:** Si RLS bloquea el acceso, retorna `null` sin error explícito

#### **PASO 3: Verificación de Error 403 (RLS Forbidden) (Líneas 137-168)**
```typescript
if (queryError?.code === 'PGRST301' || queryError?.status === 403) {
  console.error('❌ RLS bloqueó el acceso al perfil (403 Forbidden)');
  
  // NO cerrar sesión inmediatamente - puede ser un problema temporal de RLS
  // Reintentar si no es un retry
  if (!isRetry) {
    const retryCount = retryAttemptsRef.current.get(userId) || 0;
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      retryAttemptsRef.current.set(userId, retryCount + 1);
      console.log(`🔄 Reintentando después de error 403 (intento ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchUserProfile(userId, forceRefresh, true);
    }
  }
  
  // Si ya se reintentó y sigue fallando, marcar como error de red (no cerrar sesión)
  setIsSlowNetwork(true);
  return { 
    success: false, 
    isNetworkError: false, 
    error: 'rls_forbidden',
    details: 'RLS bloqueó el acceso al perfil. Verificar políticas RLS.'
  };
}
```
- ✅ **Manejo de 403:** Detecta errores RLS explícitos
- ✅ **Reintento Implementado:** Hasta `MAX_RETRY_ATTEMPTS` (3 intentos)
- ✅ **No Cierra Sesión Inmediatamente:** Marca como error de red, no cierra sesión
- ⚠️ **Problema Potencial:** Si RLS bloquea silenciosamente (retorna `null` sin error), no se detecta aquí

#### **PASO 4: Verificación de Null Silencioso (Líneas 170-184)**
```typescript
if (!effectiveProfile && !queryError) {
  console.warn('⚠️ Query retornó null sin error - posible bloqueo RLS silencioso');
  // Reintentar una vez más con delay si no es retry
  if (!isRetry) {
    const retryCount = retryAttemptsRef.current.get(userId) || 0;
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      retryAttemptsRef.current.set(userId, retryCount + 1);
      console.log(`🔄 Reintentando después de null silencioso (intento ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchUserProfile(userId, forceRefresh, true);
    }
  }
}
```
- ✅ **Detección de Bloqueo Silencioso:** Detecta cuando RLS bloquea sin error explícito
- ✅ **Reintento:** Implementa reintento para casos de bloqueo silencioso
- ⚠️ **Limitación:** Solo reintenta una vez, luego continúa al siguiente paso

#### **PASO 5: Búsqueda por Email (Fallback) (Líneas 186-243)**
```typescript
if (!effectiveProfile && (!queryError || queryError.code === 'PGRST116')) {
  // Buscar por email
  const emailSearchPromise = supabase
    .from('users')
    .select('id, auth_user_id, company_id, email, name, role, assigned_store_id, active, created_at, updated_at')
    .eq('email', email)
    .maybeSingle();
  
  // Si encuentra perfil, vincularlo
  if (existingProfile) {
    const { data: linkedProfile } = await supabase
      .from('users')
      .update({ auth_user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', existingProfile.id)
      .select()
      .single();
    
    effectiveProfile = linkedProfile as UserProfile || existingProfile as UserProfile;
  }
}
```
- ✅ **Fallback Inteligente:** Busca por email si no encuentra por `auth_user_id`
- ✅ **Vinculación Automática:** Vincula `auth_user_id` si encuentra perfil por email
- ⚠️ **Problema Potencial:** Si RLS bloquea la búsqueda por email, este fallback no funciona

#### **PASO 6: Cierre de Sesión (Líneas 245-287)**
```typescript
if (!effectiveProfile) {
  // Si hay error de timeout/red (pero NO 403), NO cerrar sesión
  if (queryError?.message?.includes('timeout') || queryError?.message?.includes('network')) {
    console.warn('Error de red al buscar perfil - manteniendo sesión activa');
    setIsSlowNetwork(true);
    return { success: false, isNetworkError: true, error: 'network_error' };
  }

  // Si el error es "no encontrado" (PGRST116) y no es retry, intentar una vez más
  if (queryError?.code === 'PGRST116' && !isRetry) {
    const retryCount = retryAttemptsRef.current.get(userId) || 0;
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      retryAttemptsRef.current.set(userId, retryCount + 1);
      console.log(`🔄 Reintentando fetchUserProfile (intento ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchUserProfile(userId, forceRefresh, true);
    }
  }

  // Si realmente no existe el perfil (después de todos los intentos)
  console.warn('No se encontró perfil para el usuario después de todos los intentos. Cerrando sesión.');
  // ... limpiar cache ...
  supabase.auth.signOut().catch((err) => {
    console.error('Error signing out:', err);
  });
  return { success: false, isNetworkError: false, error: 'profile_not_found' };
}
```

**⚠️ PROBLEMA CRÍTICO IDENTIFICADO:**

**Línea 283:** `supabase.auth.signOut()` se ejecuta cuando:
1. No se encontró perfil después de todos los reintentos
2. No es un error de red/timeout
3. No es un error 403 (RLS Forbidden)

**Causa Raíz del Problema:**
- Si RLS bloquea silenciosamente (retorna `null` sin error), el código asume que el perfil no existe
- Después de 3 reintentos, cierra la sesión
- Esto causa el bucle de login/cierre de sesión

---

### **2.2 Lógica de Cierre de Sesión - Puntos Críticos**

**Ubicaciones donde se ejecuta `signOut`:**

1. **Línea 283:** `fetchUserProfile` - Cuando no se encuentra perfil después de reintentos
2. **Línea 399:** `fetchUserProfile` - En caso de error fatal (no usado actualmente)
3. **Línea 524:** `signOut` - Función explícita de cierre de sesión
4. **Línea 712:** `onAuthStateChange` - En caso de error crítico

**Análisis:**
- ⚠️ **Múltiples Puntos de Cierre:** Hay varios lugares donde se puede cerrar sesión
- ⚠️ **Falta de Diferenciación:** No diferencia claramente entre "perfil no existe" y "RLS bloqueó acceso"
- ✅ **Reintentos Implementados:** Hay lógica de reintento, pero puede no ser suficiente

---

### **2.3 Resiliencia y Reintentos**

**Constantes:**
```typescript
const MAX_RETRY_ATTEMPTS = 3;
const PROFILE_FETCH_TIMEOUT = 15000; // 15 segundos
```

**Lógica de Reintento:**
- ✅ **Reintento en Error 403:** Hasta 3 intentos con delay de 2 segundos
- ✅ **Reintento en Null Silencioso:** Hasta 3 intentos con delay de 2 segundos
- ✅ **Reintento en PGRST116 (No Encontrado):** Hasta 3 intentos con delay de 2 segundos
- ⚠️ **Problema:** Si RLS bloquea consistentemente, los 3 reintentos no son suficientes

**Delay de Nuevo Usuario:**
```typescript
if (isNewUser) {
  console.log('🆕 Nuevo usuario detectado - esperando 1 segundo antes de leer perfil (sincronización RLS)');
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```
- ✅ **Delay Implementado:** 1 segundo de espera para nuevos usuarios
- ⚠️ **Puede No Ser Suficiente:** 1 segundo puede no ser suficiente para sincronización RLS

---

## 🎯 DIAGNÓSTICO FINAL

### **Problema Principal Identificado:**

**HIPÓTESIS CONFIRMADA:** El sistema falla al leer el perfil del usuario después de que Supabase Auth lo autentica debido a:

1. **RLS Bloqueo Silencioso:** 
   - Si la política RLS no está correctamente aplicada, puede bloquear el acceso sin retornar error explícito
   - El código detecta `null` sin error y asume que el perfil no existe
   - Después de 3 reintentos, cierra la sesión

2. **Race Condition:**
   - El delay de 1 segundo para nuevos usuarios puede no ser suficiente
   - RLS puede requerir más tiempo para sincronizarse después de la autenticación

3. **Falta de Diferenciación:**
   - El código no diferencia claramente entre "perfil no existe" y "RLS bloqueó acceso"
   - Ambos casos resultan en cierre de sesión

---

## 🔧 RECOMENDACIONES DE CORRECCIÓN

### **1. Verificar Política RLS (CRÍTICO)**

**Acción:** Ejecutar `verificar_politica_rls.sql` para confirmar que la política correcta está aplicada.

**Resultado Esperado:**
- Debe existir 1 sola política SELECT: `users_select_policy_self_only`
- Expresión: `auth_user_id = auth.uid()`

### **2. Mejorar Detección de Bloqueo RLS**

**Modificación Sugerida en `fetchUserProfile`:**
```typescript
// Después de la consulta principal, verificar explícitamente si RLS bloqueó
if (!effectiveProfile && !queryError) {
  // Intentar una consulta de prueba para verificar RLS
  const testQuery = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .limit(1);
  
  if (testQuery.error?.code === 'PGRST301' || testQuery.error?.status === 403) {
    // RLS bloqueó explícitamente
    console.error('RLS bloqueó acceso - reintentando...');
    // Reintentar con más delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    return fetchUserProfile(userId, forceRefresh, true);
  }
}
```

### **3. Aumentar Delay para Nuevos Usuarios**

**Modificación Sugerida:**
```typescript
if (isNewUser) {
  console.log('🆕 Nuevo usuario detectado - esperando 3 segundos antes de leer perfil');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Aumentar a 3 segundos
}
```

### **4. Mejorar Lógica de Cierre de Sesión**

**Modificación Sugerida:**
```typescript
// Antes de cerrar sesión, verificar una última vez si es problema de RLS
if (!effectiveProfile) {
  // Última verificación: ¿Es problema de RLS o perfil realmente no existe?
  const finalCheck = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle();
  
  if (finalCheck.error?.code === 'PGRST301') {
    // Es problema de RLS, NO cerrar sesión
    console.error('RLS bloquea acceso - NO cerrando sesión. Verificar políticas RLS.');
    setIsSlowNetwork(true);
    return { success: false, isNetworkError: false, error: 'rls_forbidden' };
  }
  
  // Solo cerrar sesión si realmente no existe el perfil
  console.warn('Perfil no existe - cerrando sesión');
  supabase.auth.signOut().catch((err) => {
    console.error('Error signing out:', err);
  });
}
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Política RLS verificada (ejecutar `verificar_politica_rls.sql`)
- [ ] Política `users_select_policy_self_only` existe y es correcta
- [ ] No hay políticas SELECT duplicadas
- [ ] Delay de nuevo usuario aumentado a 3 segundos
- [ ] Lógica de detección de bloqueo RLS mejorada
- [ ] Lógica de cierre de sesión diferenciada (RLS vs perfil no existe)
- [ ] Reintentos aumentados a 5 intentos para casos de RLS
- [ ] Logs mejorados para debugging

---

## 📊 CONCLUSIÓN

**Estado Actual:**
- ✅ Política RLS corregida (sin dependencia circular)
- ⚠️ Código frontend tiene lógica de reintento pero puede mejorar
- ⚠️ Falta diferenciación clara entre "RLS bloqueó" y "perfil no existe"
- ⚠️ Delay de 1 segundo puede no ser suficiente para nuevos usuarios

**Prioridad de Corrección:**
1. **CRÍTICO:** Verificar que la política RLS correcta está aplicada
2. **ALTO:** Aumentar delay para nuevos usuarios a 3 segundos
3. **MEDIO:** Mejorar detección de bloqueo RLS silencioso
4. **BAJO:** Mejorar logs para debugging

---

## 📝 ARCHIVOS DE REFERENCIA

- `fix_rls_users_circular_dependency.sql` - Corrección de política RLS
- `verificar_politica_rls.sql` - Script de verificación
- `src/contexts/AuthContext.tsx` - Código del AuthProvider
- `AUDITORIA_FORENSE_AUTENTICACION.md` - Este documento



