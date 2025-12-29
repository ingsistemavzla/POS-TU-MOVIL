# 🔍 DIAGNÓSTICO: Segunda Pantalla de Carga al Cambiar de Pestaña

**Fecha:** 2025-01-03  
**Auditor:** Senior React Debugger  
**Problema:** Segunda pantalla de carga "pegada" después de cambiar de pestaña

---

## 📋 RESUMEN EJECUTIVO

| Pregunta | Respuesta | Ubicación |
|----------|-----------|-----------|
| **¿Quién es el "Nuevo Loader"?** | `ProtectedRoute` tiene su propio loader diferente | `src/components/auth/ProtectedRoute.tsx:17-25` |
| **¿Por qué se dispara al cambiar de pestaña?** | `TOKEN_REFRESHED` o `INITIAL_SESSION` disparan `setLoading(true)` | `src/contexts/AuthContext.tsx:1075-1094` |
| **¿Por qué se queda "pegado"?** | Condición de carrera: `TOKEN_REFRESHED` con `!userProfile` puede quedar en loading | `src/contexts/AuthContext.tsx:1076-1094` |

**VEREDICTO:** 🔴 **BUG CONFIRMADO** - Hay DOS loaders diferentes y una condición de carrera en `TOKEN_REFRESHED`.

---

## 🔬 ANÁLISIS DETALLADO

### **PREGUNTA 1: ¿QUIÉN ES EL "NUEVO LOADER"?**

#### **Loader #1: LoadingFallback (App.tsx)**
- **Ubicación:** `src/App.tsx:41-43`
- **Componente:** `<LoadingScreen message="Cargando aplicación..." />`
- **Cuándo se muestra:** `if (loading && !user)` en línea 146-148
- **Visual:** Pantalla completa con anillos orbitales y "CARGANDO"

#### **Loader #2: ProtectedRoute (DIFERENTE)**
- **Ubicación:** `src/components/auth/ProtectedRoute.tsx:17-25`
- **Componente:** 
  ```typescript
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  </div>
  ```
- **Cuándo se muestra:** `if (loading)` en línea 17
- **Visual:** Spinner simple con texto "Cargando..." (DIFERENTE al LoadingScreen)

**CONCLUSIÓN:** El "segundo loader" es el de `ProtectedRoute`, que es visualmente diferente al `LoadingFallback`.

---

### **PREGUNTA 2: ¿POR QUÉ SE DISPARA AL CAMBIAR DE PESTAÑA?**

#### **Flujo de Ejecución:**

1. **Usuario cambia de pestaña** → Navegador pierde foco
2. **Usuario vuelve a la pestaña** → Navegador recupera foco
3. **Supabase detecta cambio** → Dispara evento `TOKEN_REFRESHED` o `INITIAL_SESSION`
4. **AuthContext.onAuthStateChange** → Se ejecuta (línea 964)

#### **Problema Identificado:**

**Archivo:** `src/contexts/AuthContext.tsx`  
**Líneas:** 980-1094

```typescript
} else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  if (session?.user) {
    // ✨ BLOQUE DE SEGURIDAD (línea 985-988)
    if (userProfile && session?.user?.id === userProfile.auth_user_id) {
      console.log('[Auth] Cambio de foco detectado, pero la sesión ya está activa. Omitiendo recarga.');
      return; // ✅ Salir temprano
    }
    
    // CRITICAL: loading must be true until profile is loaded
    setLoading(true); // 🔴 SE EJECUTA SI EL BLOQUE DE SEGURIDAD FALLA
    // ...
  }
} else if (event === 'TOKEN_REFRESHED') {
  if (session?.user && !userProfile) { // 🔴 PROBLEMA: Solo verifica !userProfile
    console.log('[Auth] Token refreshed, fetching profile...');
    setLoading(true); // 🔴 SE EJECUTA SI userProfile es null/undefined temporalmente
    // ...
  }
}
```

**PROBLEMA CRÍTICO:**

1. **Evento `TOKEN_REFRESHED` (línea 1075-1094):**
   - Solo verifica `!userProfile` (línea 1076)
   - **NO tiene el bloque de seguridad** que tiene `SIGNED_IN`/`INITIAL_SESSION`
   - Si `userProfile` es `null` temporalmente (por re-render o estado intermedio), dispara `setLoading(true)`

2. **Condición de carrera:**
   - Cuando cambias de pestaña, Supabase puede disparar `TOKEN_REFRESHED` ANTES de que `userProfile` esté completamente establecido
   - El check `!userProfile` puede ser `true` momentáneamente
   - `setLoading(true)` se ejecuta
   - `ProtectedRoute` detecta `loading === true` y muestra su loader

---

### **PREGUNTA 3: ¿POR QUÉ SE QUEDA "PEGADO"?**

#### **Causa Raíz: Condición de Carrera en TOKEN_REFRESHED**

**Archivo:** `src/contexts/AuthContext.tsx`  
**Líneas:** 1075-1094

```typescript
} else if (event === 'TOKEN_REFRESHED') {
  if (session?.user && !userProfile) { // 🔴 PROBLEMA AQUÍ
    console.log('[Auth] Token refreshed, fetching profile...');
    setLoading(true);
    try {
      const profileResult = await fetchUserProfile(session.user.id);
      if (profileResult.success) {
        const cached = profileCacheRef.current.get(session.user.id);
        if (cached) {
          setUserProfile(cached.profile);
          setCompany(cached.company);
          console.log('[Auth] Profile refreshed');
        }
      }
    } catch (error) {
      console.error('[Auth] Error fetching profile on token refresh:', error);
    } finally {
      setLoading(false); // ✅ Debería ejecutarse siempre
    }
  }
}
```

**PROBLEMAS IDENTIFICADOS:**

1. **Falta bloque de seguridad:**
   - `TOKEN_REFRESHED` NO tiene el mismo bloque de seguridad que `SIGNED_IN`/`INITIAL_SESSION`
   - Debería verificar si `userProfile` ya existe y el ID coincide antes de hacer fetch

2. **Condición `!userProfile` puede ser temporalmente true:**
   - Durante un re-render, `userProfile` puede ser `null` momentáneamente
   - El evento `TOKEN_REFRESHED` se dispara
   - La condición se cumple
   - `setLoading(true)` se ejecuta

3. **Si `fetchUserProfile` falla silenciosamente:**
   - El `finally` debería ejecutar `setLoading(false)`
   - Pero si hay un error no capturado o una excepción antes del try, puede quedar en `true`

4. **ProtectedRoute bloquea mientras `loading === true`:**
   - `ProtectedRoute` (línea 17) muestra su loader mientras `loading === true`
   - Si `loading` nunca vuelve a `false`, el loader se queda "pegado"

---

## 🎯 FLUJO DE EJECUCIÓN COMPLETO

### **Escenario: Usuario cambia de pestaña y vuelve**

```
1. Usuario cambia de pestaña (Window blur)
   ↓
2. Usuario vuelve a la pestaña (Window focus)
   ↓
3. Supabase detecta cambio → Dispara evento
   ↓
4. AuthContext.onAuthStateChange se ejecuta
   ↓
5. Evento puede ser:
   - 'INITIAL_SESSION' → Bloque de seguridad funciona ✅
   - 'TOKEN_REFRESHED' → NO tiene bloque de seguridad ❌
   ↓
6. Si es 'TOKEN_REFRESHED' y !userProfile:
   - setLoading(true) se ejecuta
   - fetchUserProfile() se llama
   ↓
7. AppRoutes detecta loading === true
   - Pero user existe, así que NO muestra LoadingFallback
   ↓
8. ProtectedRoute detecta loading === true
   - Muestra su propio loader (Loader2 spinner)
   ↓
9. Si fetchUserProfile tarda o falla:
   - loading permanece en true
   - ProtectedRoute sigue mostrando loader
   - Usuario ve "segunda pantalla de carga pegada"
```

---

## 🔴 BUGS IDENTIFICADOS

### **BUG #1: TOKEN_REFRESHED sin bloque de seguridad**

**Ubicación:** `src/contexts/AuthContext.tsx:1075-1094`

**Problema:**
- `TOKEN_REFRESHED` NO tiene el mismo bloque de seguridad que `SIGNED_IN`/`INITIAL_SESSION`
- Puede disparar `setLoading(true)` innecesariamente

**Fix requerido:**
```typescript
} else if (event === 'TOKEN_REFRESHED') {
  if (session?.user) {
    // ✨ AGREGAR BLOQUE DE SEGURIDAD (igual que SIGNED_IN)
    if (userProfile && session?.user?.id === userProfile.auth_user_id) {
      console.log('[Auth] Token refreshed, pero perfil ya está cargado. Omitiendo recarga.');
      return; // ✅ Salir temprano
    }
    
    // Solo hacer fetch si realmente no hay perfil
    if (!userProfile) {
      // ... resto del código
    }
  }
}
```

---

### **BUG #2: ProtectedRoute muestra loader diferente**

**Ubicación:** `src/components/auth/ProtectedRoute.tsx:17-25`

**Problema:**
- `ProtectedRoute` tiene su propio loader visualmente diferente
- Se muestra cuando `loading === true`, incluso durante revalidaciones en segundo plano
- Esto causa la "segunda pantalla de carga" que el usuario reporta

**Fix requerido:**
- `ProtectedRoute` debería usar el mismo `LoadingFallback` para consistencia
- O mejor aún, no mostrar loader si `user` ya existe (similar a AppRoutes)

---

### **BUG #3: Condición de carrera potencial**

**Ubicación:** `src/contexts/AuthContext.tsx:1076`

**Problema:**
- La condición `!userProfile` puede ser `true` temporalmente durante re-renders
- Esto dispara un fetch innecesario y pone `loading = true`

**Fix requerido:**
- Agregar el mismo bloque de seguridad que `SIGNED_IN`/`INITIAL_SESSION`
- Verificar cache antes de hacer fetch

---

## ✅ SOLUCIÓN PROPUESTA

### **Fix 1: Agregar bloque de seguridad a TOKEN_REFRESHED**

```typescript
} else if (event === 'TOKEN_REFRESHED') {
  if (session?.user) {
    // ✨ BLOQUE DE SEGURIDAD: Si ya tenemos perfil cargado, NO reiniciamos el loading
    if (userProfile && session?.user?.id === userProfile.auth_user_id) {
      console.log('[Auth] Token refreshed, pero perfil ya está cargado. Omitiendo recarga.');
      return; // ✅ Salir temprano - evitar re-inicialización innecesaria
    }
    
    // Solo hacer fetch si realmente no hay perfil Y no está en cache
    const hasCachedProfile = profileCacheRef.current.has(session.user.id);
    if (!userProfile && !hasCachedProfile) {
      console.log('[Auth] Token refreshed, fetching profile...');
      setLoading(true);
      // ... resto del código
    } else if (hasCachedProfile) {
      // Usar cache si existe
      const cached = profileCacheRef.current.get(session.user.id);
      if (cached) {
        setUserProfile(cached.profile);
        setCompany(cached.company);
        console.log('[Auth] Profile restored from cache');
      }
    }
  }
}
```

### **Fix 2: Mejorar ProtectedRoute para no bloquear durante revalidaciones**

```typescript
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, userProfile, loading } = useAuth();

  // ✅ Solo mostrar loader si NO tenemos usuario (carga inicial)
  // Si tenemos usuario pero loading es true, es una revalidación en segundo plano
  if (loading && !user) {
    return <LoadingFallback />; // Usar el mismo loader que AppRoutes
  }

  // ... resto del código
}
```

---

## 📊 IMPACTO DEL FIX

| Bug | Impacto | Prioridad |
|-----|--------|-----------|
| **TOKEN_REFRESHED sin bloque de seguridad** | 🔴 ALTO | 🔴 CRÍTICO |
| **ProtectedRoute loader diferente** | 🟡 MEDIO | 🟡 MEDIO |
| **Condición de carrera** | 🟡 MEDIO | 🟡 MEDIO |

---

## 🎯 CONCLUSIÓN

**ORIGEN EXACTO DEL BUG:**

1. **Segunda pantalla de carga:** `ProtectedRoute.tsx:17-25` muestra un loader diferente cuando `loading === true`
2. **Se dispara al cambiar de pestaña:** `TOKEN_REFRESHED` dispara `setLoading(true)` sin el bloque de seguridad
3. **Se queda pegado:** Si `fetchUserProfile` tarda o hay una condición de carrera, `loading` permanece en `true`

**ARCHIVOS A MODIFICAR:**
1. `src/contexts/AuthContext.tsx` - Agregar bloque de seguridad a `TOKEN_REFRESHED`
2. `src/components/auth/ProtectedRoute.tsx` - Mejorar lógica de loading para no bloquear durante revalidaciones

---

**Estado:** ✅ **DIAGNÓSTICO COMPLETO**  
**Próximo paso:** Aplicar fixes propuestos





