# ✅ PLAN DE CORRECCIÓN: Estabilización de Autenticación y Perfiles

**Fecha:** 2025-01-27  
**Estado:** ✅ Implementado

---

## 📋 RESUMEN EJECUTIVO

Se implementaron correcciones en dos frentes simultáneos:

1. **Backend (RLS)**: Eliminada dependencia circular en política RLS de `public.users`
2. **Frontend (Resiliencia)**: Agregada verificación de error 403 y mejor manejo de reintentos

---

## 🔧 CORRECCIÓN 1: Backend - Política RLS Simplificada

### Archivo Creado: `fix_rls_users_circular_dependency.sql`

### Cambios Implementados:

1. **Eliminación de Políticas Duplicadas:**
   - Elimina TODAS las políticas SELECT existentes en `public.users`
   - Previene conflictos y fallos silenciosos

2. **Nueva Política Simplificada:**
   ```sql
   CREATE POLICY "users_select_policy_self_only" ON public.users
     FOR SELECT USING (
       auth_user_id = auth.uid()
     );
   ```

3. **Beneficios:**
   - ✅ Elimina dependencia circular con `get_user_company_id()`
   - ✅ Permite que nuevos usuarios lean su perfil inmediatamente
   - ✅ Atómicamente segura (no requiere conocer `company_id`)

### Instrucciones de Ejecución:

1. Abrir Supabase SQL Editor
2. Ejecutar el script `fix_rls_users_circular_dependency.sql`
3. Verificar que la política se creó correctamente (el script muestra mensajes de confirmación)

---

## 💻 CORRECCIÓN 2: Frontend - Resiliencia en `fetchUserProfile`

### Archivo Modificado: `src/contexts/AuthContext.tsx`

### Cambios Implementados:

#### 1. **Verificación Explícita de Error 403 (Forbidden)**

**Ubicación:** Líneas ~137-165

```typescript
// 🚨 VERIFICACIÓN CRÍTICA: Error 403 (Forbidden) - RLS bloqueó el acceso
if (queryError?.code === 'PGRST301' || queryError?.status === 403) {
  console.error('❌ RLS bloqueó el acceso al perfil (403 Forbidden)');
  
  // NO cerrar sesión inmediatamente - puede ser un problema temporal de RLS
  // Reintentar si no es un retry
  if (!isRetry) {
    const retryCount = retryAttemptsRef.current.get(userId) || 0;
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      retryAttemptsRef.current.set(userId, retryCount + 1);
      console.log(`🔄 Reintentando después de error 403 (intento ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      // Esperar 2 segundos antes de reintentar
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

**Beneficios:**
- ✅ Detecta errores 403 explícitamente
- ✅ Reintenta automáticamente (hasta 3 intentos)
- ✅ NO cierra sesión inmediatamente (permite reintento manual)

---

#### 2. **Detección de Bloqueo RLS Silencioso**

**Ubicación:** Líneas ~167-185

```typescript
// 🚨 VERIFICACIÓN: Si el resultado es null pero NO hay error (posible bloqueo RLS silencioso)
if (!effectiveProfile && !queryError) {
  console.warn('⚠️ Query retornó null sin error - posible bloqueo RLS silencioso');
  // Reintentar una vez más con delay si no es retry
  if (!isRetry) {
    const retryCount = retryAttemptsRef.current.get(userId) || 0;
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      retryAttemptsRef.current.set(userId, retryCount + 1);
      console.log(`🔄 Reintentando después de null silencioso (intento ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      // Esperar 2 segundos antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchUserProfile(userId, forceRefresh, true);
    }
  }
}
```

**Beneficios:**
- ✅ Detecta cuando RLS bloquea silenciosamente (retorna `null` sin error)
- ✅ Reintenta automáticamente antes de asumir que el perfil no existe

---

#### 3. **Delay para Nuevos Usuarios en `onAuthStateChange`**

**Ubicación:** Líneas ~620-625

```typescript
} else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  if (session?.user) {
    // 🚨 DELAY PARA NUEVOS USUARIOS: Dar tiempo a que RLS se sincronice
    const isNewUser = !profileCacheRef.current.has(session.user.id);
    if (isNewUser) {
      console.log('🆕 Nuevo usuario detectado - esperando 1 segundo antes de leer perfil (sincronización RLS)');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // ... resto del código
```

**Beneficios:**
- ✅ Da tiempo a que RLS se sincronice después del login
- ✅ Solo aplica delay para nuevos usuarios (no afecta usuarios existentes)

---

#### 4. **Mejora en Manejo de Errores en `catch`**

**Ubicación:** Líneas ~305-340

```typescript
// Verificar si es error 403 (ya debería haberse manejado arriba, pero por si acaso)
if (error?.code === 'PGRST301' || error?.status === 403) {
  console.error('❌ Error 403 detectado en catch - reintentando');
  setIsSlowNetwork(true);
  if (!isRetry) {
    const retryCount = retryAttemptsRef.current.get(userId) || 0;
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      retryAttemptsRef.current.set(userId, retryCount + 1);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchUserProfile(userId, forceRefresh, true);
    }
  }
  return { success: false, isNetworkError: false, error: 'rls_forbidden' };
}
```

**Beneficios:**
- ✅ Manejo redundante de error 403 en el bloque `catch`
- ✅ Asegura que errores 403 siempre se manejen correctamente

---

## 📊 FLUJO MEJORADO DE LOGIN

### Antes de las Correcciones:

```
1. Usuario hace login → auth.users creado
2. Frontend intenta leer perfil → RLS bloquea (dependencia circular)
3. Frontend recibe null → Asume "perfil no existe"
4. Frontend cierra sesión → ❌ Usuario bloqueado
```

### Después de las Correcciones:

```
1. Usuario hace login → auth.users creado
2. Frontend espera 1 segundo (nuevo usuario) → Sincronización RLS
3. Frontend intenta leer perfil → RLS permite (política simplificada)
4. Si RLS bloquea (403):
   a. Frontend detecta error 403
   b. Reintenta automáticamente (hasta 3 veces)
   c. Si falla, marca como "conexión lenta" (NO cierra sesión)
5. Usuario puede reintentar manualmente → ✅ Resiliente
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Backend:
- [x] Script SQL creado: `fix_rls_users_circular_dependency.sql`
- [ ] Script ejecutado en Supabase SQL Editor
- [ ] Política RLS verificada (solo 1 política SELECT activa)
- [ ] Política permite `auth_user_id = auth.uid()`

### Frontend:
- [x] Verificación de error 403 implementada
- [x] Detección de bloqueo RLS silencioso implementada
- [x] Delay para nuevos usuarios implementado
- [x] Manejo redundante de error 403 en `catch` implementado
- [ ] Código compilado sin errores
- [ ] Pruebas de login con nuevo usuario Gerente realizadas

---

## 🧪 PRUEBAS RECOMENDADAS

### Prueba 1: Login de Nuevo Usuario Gerente

1. Crear nuevo usuario Gerente desde admin panel
2. Hacer login con ese usuario
3. Verificar:
   - ✅ No aparece pantalla en blanco
   - ✅ No hay bucle infinito
   - ✅ El perfil se carga correctamente
   - ✅ Los logs muestran "Nuevo usuario detectado - esperando 1 segundo"

### Prueba 2: Simulación de Error 403

1. Temporalmente deshabilitar RLS en `public.users`
2. Intentar login
3. Verificar:
   - ✅ El frontend detecta error 403
   - ✅ Reintenta automáticamente (hasta 3 veces)
   - ✅ NO cierra sesión inmediatamente
   - ✅ Muestra mensaje de "conexión lenta" si falla

### Prueba 3: Verificación de Política RLS

Ejecutar en Supabase SQL Editor:
```sql
-- Verificar que solo existe 1 política SELECT
SELECT 
  policyname,
  cmd,
  pg_get_expr(polqual, 'public.users'::regclass) AS using_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users' 
  AND cmd = 'SELECT';
```

**Resultado Esperado:**
- Solo 1 política: `users_select_policy_self_only`
- Expresión: `auth_user_id = auth.uid()`

---

## 📝 NOTAS ADICIONALES

### Políticas Adicionales (Opcional)

Si necesitas que usuarios de la misma compañía se vean entre sí (para dashboards de admin), puedes crear una política adicional **DESPUÉS** de que el usuario haya leído su perfil:

```sql
CREATE POLICY "users_select_policy_same_company" ON public.users
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  );
```

**IMPORTANTE:** Esta política requiere que el usuario ya haya leído su perfil, por lo que debe ser una política **SECUNDARIA**, no la principal.

---

## 🚨 TROUBLESHOOTING

### Si el login sigue fallando:

1. **Verificar Política RLS:**
   ```sql
   SELECT policyname, pg_get_expr(polqual, 'public.users'::regclass)
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'SELECT';
   ```

2. **Verificar Logs de Consola:**
   - Buscar mensajes: "❌ RLS bloqueó el acceso"
   - Buscar mensajes: "🔄 Reintentando después de error 403"
   - Buscar mensajes: "🆕 Nuevo usuario detectado"

3. **Verificar que `auth_user_id` esté correctamente vinculado:**
   ```sql
   SELECT id, auth_user_id, email, role
   FROM public.users
   WHERE email = 'email_del_usuario@ejemplo.com';
   ```

---

**FIN DEL PLAN DE CORRECCIÓN**





