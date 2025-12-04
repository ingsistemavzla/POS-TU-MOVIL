# 🔍 DIAGNÓSTICO: Loading Screen - Lógica de Carga Inicial

## 📍 1. DÓNDE SE MUESTRA EL LOADING SCREEN

### App.tsx (Línea 143)
```typescript
const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />; // ← AQUÍ SE MUESTRA EL LOADING
  }
  // ...
}
```

**Condición:** `loading === true` del contexto `AuthContext`.

---

## 🔄 2. QUÉ CAMBIA EL ESTADO `loading` A `false`

### AuthContext.tsx - Estado Inicial
```typescript
const [loading, setLoading] = useState(true); // ← Inicia en TRUE
```

### AuthContext.tsx - Función `initializeAuth()` (Línea 753)

**Flujo de inicialización:**

1. **Timeout de seguridad (20 segundos):**
   ```typescript
   timeoutId = setTimeout(async () => {
     // Si después de 20s no se inicializó, forzar loading = false
     setIsSlowNetwork(true);
     setLoading(false); // ← Fuerza cierre de loading
   }, 20000);
   ```

2. **Obtener sesión:**
   ```typescript
   const { data: { session }, error } = await supabase.auth.getSession();
   ```

3. **Si hay sesión:**
   ```typescript
   if (session?.user) {
     setLoading(true); // ← Asegura loading = true
     const profileResult = await fetchUserProfile(session.user.id);
     
     if (!profileResult.success) {
       // Error de perfil no encontrado
       if (profileResult.error === 'profile_not_found') {
         setLoading(false); // ← Cierra loading
         return;
       }
       // Error de red/RLS
       setIsSlowNetwork(true);
       setLoading(false); // ← Cierra loading
       return;
     }
     
     // Éxito
     setLoading(false); // ← Cierra loading
   }
   ```

4. **Si NO hay sesión:**
   ```typescript
   else {
     setLoading(false); // ← Cierra loading inmediatamente
   }
   ```

---

## ⚠️ 3. ANÁLISIS DE `fetchUserProfile()` - POSIBLES BLOQUEOS

### Timeouts Implementados:
- **Perfil:** 15 segundos (`PROFILE_FETCH_TIMEOUT = 15000`)
- **Compañía:** 10 segundos
- **Búsqueda por email:** 10 segundos

### Reintentos:
- **Máximo:** 5 intentos (`MAX_RETRY_ATTEMPTS = 5`)
- **Delay entre reintentos:** 2 segundos

### Casos que PUEDEN causar bloqueo:

#### ✅ CASO 1: Timeout de perfil (15s)
```typescript
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error('PROFILE_FETCH_TIMEOUT')), PROFILE_FETCH_TIMEOUT);
});
```
**Resultado:** Retorna `{ success: false, isNetworkError: true, error: 'timeout' }`
**Acción:** `setIsSlowNetwork(true)`, `setLoading(false)` ✅ **NO BLOQUEA**

#### ✅ CASO 2: Error 403 (RLS bloqueando)
```typescript
if (queryError?.code === 'PGRST301' || queryError?.status === 403) {
  // Reintenta hasta 5 veces
  if (retryCount < MAX_RETRY_ATTEMPTS) {
    return fetchUserProfile(userId, forceRefresh, true); // Reintenta
  }
  // Si falla después de 5 intentos
  setIsSlowNetwork(true);
  return { success: false, error: 'rls_forbidden' };
}
```
**Resultado:** Después de 5 reintentos, retorna error pero **NO cierra sesión**
**Acción:** `setIsSlowNetwork(true)`, `setLoading(false)` ✅ **NO BLOQUEA**

#### ⚠️ CASO 3: Error de red sin timeout
```typescript
catch (error: any) {
  const isNetworkError = 
    error?.message?.includes('timeout') ||
    error?.message?.includes('network') ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT';
  
  if (isNetworkError) {
    setIsSlowNetwork(true);
    return { success: false, isNetworkError: true, error: 'network_error' };
  }
  // Error real - cierra sesión
  setLoading(false);
  return { success: false, isNetworkError: false, error: 'real_error' };
}
```
**Resultado:** Detecta errores de red y retorna `isNetworkError: true`
**Acción:** `setIsSlowNetwork(true)`, `setLoading(false)` ✅ **NO BLOQUEA**

#### ⚠️ CASO 4: Error inesperado en `fetchUserProfile()`
Si `fetchUserProfile()` lanza una excepción NO capturada:
```typescript
catch (error: any) {
  console.error('Error in fetchUserProfile:', error);
  // ... manejo de errores
}
```
**Protección:** El `catch` general captura cualquier error ✅

#### ⚠️ CASO 5: `initializeAuth()` falla completamente
```typescript
catch (error) {
  console.error('Error initializing auth:', error);
  if (mounted) {
    setLoading(false); // ← Protección final
  }
}
```
**Protección:** El `catch` en `initializeAuth()` asegura `loading = false` ✅

---

## 🛡️ 4. PROTECCIONES IMPLEMENTADAS

### ✅ Timeout Global (20 segundos)
```typescript
timeoutId = setTimeout(async () => {
  if (mounted && !isInitialized) {
    // Fuerza cierre de loading después de 20s
    setLoading(false);
    isInitialized = true;
  }
}, 20000);
```

### ✅ Manejo de Errores de Red
- Detecta `timeout`, `network`, `ECONNREFUSED`, `ETIMEDOUT`
- Marca `isSlowNetwork = true` pero **NO bloquea la UI**
- Permite reintento manual

### ✅ Verificación RLS Explícita
```typescript
// Última verificación antes de cerrar sesión
const finalRLSCheck = await supabase
  .from('users')
  .select('id')
  .eq('auth_user_id', userId)
  .maybeSingle();

if (finalRLSCheck.error?.code === 'PGRST301') {
  // NO cerrar sesión - mantener para corrección administrativa
  setIsSlowNetwork(true);
  setLoading(false);
  return { success: false, error: 'rls_forbidden' };
}
```

### ✅ Reintentos Automáticos
- Hasta 5 intentos para errores 403 y "not found"
- Delay de 2 segundos entre reintentos

---

## 🚨 5. POSIBLES PROBLEMAS RESIDUALES

### ❌ PROBLEMA 1: `fetchUserProfile()` puede tardar mucho
**Escenario:** Si `fetchUserProfile()` tarda más de 20 segundos (sumando todos los reintentos):
- El timeout global (20s) puede activarse ANTES de que termine `fetchUserProfile()`
- Esto puede causar que `loading = false` mientras `fetchUserProfile()` aún está ejecutándose

**Solución actual:** El timeout verifica `!isInitialized` antes de forzar cierre.

### ❌ PROBLEMA 2: Race condition entre timeout y `fetchUserProfile()`
**Escenario:** 
1. `fetchUserProfile()` inicia (línea 828)
2. Timeout se activa a los 20s (línea 763)
3. `fetchUserProfile()` termina después del timeout

**Resultado:** Puede haber un estado inconsistente.

**Solución actual:** `isInitialized` flag previene doble inicialización.

### ❌ PROBLEMA 3: `fetchUserProfile()` puede no retornar nunca
**Escenario:** Si `Promise.race()` falla de forma inesperada o hay un deadlock en la base de datos.

**Protección actual:** 
- Timeout global de 20s ✅
- `catch` general en `initializeAuth()` ✅

---

## 📊 6. RESUMEN EJECUTIVO

### ✅ LO QUE ESTÁ BIEN:
1. **Timeout global de 20 segundos** previene bloqueo infinito
2. **Manejo de errores de red** no bloquea la UI
3. **Reintentos automáticos** para errores temporales
4. **Verificación RLS explícita** antes de cerrar sesión
5. **Catch general** en `initializeAuth()` como última protección

### ⚠️ POSIBLES MEJORAS:
1. **Reducir timeout global** a 15 segundos (mismo que `PROFILE_FETCH_TIMEOUT`)
2. **Cancelar `fetchUserProfile()`** si el timeout se activa primero
3. **Logging más detallado** para diagnosticar bloqueos
4. **Métrica de tiempo** para medir cuánto tarda realmente `fetchUserProfile()`

---

## 🔧 7. RECOMENDACIONES

### Si el loading se queda bloqueado:

1. **Verificar consola del navegador:**
   - Buscar logs `[Auth]` para ver dónde se detiene
   - Verificar si hay errores de red o RLS

2. **Verificar timeout:**
   - Si pasan más de 20 segundos, el timeout debería activarse
   - Si no se activa, puede haber un problema con el `useEffect`

3. **Verificar `fetchUserProfile()`:**
   - Revisar si está en un loop de reintentos
   - Verificar si hay un error no capturado

4. **Verificar RLS:**
   - Si hay errores 403, verificar políticas RLS en `public.users`
   - Verificar que el usuario tenga permisos correctos

---

## 📝 CONCLUSIÓN

**El código tiene múltiples protecciones contra bloqueo infinito:**
- ✅ Timeout global de 20s
- ✅ Timeouts individuales en `fetchUserProfile()`
- ✅ Manejo de errores de red
- ✅ Catch general en `initializeAuth()`

**Si el loading se queda bloqueado, es probable que:**
1. Haya un error no capturado en algún lugar
2. El timeout global no se esté activando correctamente
3. Haya un problema de red que no se está detectando correctamente

**Próximos pasos:**
1. Agregar más logging para diagnosticar
2. Reducir timeout global a 15s
3. Implementar cancelación de `fetchUserProfile()` si timeout se activa


