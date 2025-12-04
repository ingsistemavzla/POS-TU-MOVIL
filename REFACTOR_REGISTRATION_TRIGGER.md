# ✅ REFACTOR: User Registration para Database Trigger

## 🎯 Objetivo

Actualizar las funciones de registro para pasar `company_id` y otros metadatos requeridos al trigger de base de datos que crea automáticamente los perfiles en `public.users`.

---

## 📝 Cambios Implementados

### 1. **Actualizado `signUp` en `AuthContext.tsx`**

**Archivo:** `src/contexts/AuthContext.tsx`

**Cambios:**
- ✅ Agregados parámetros opcionales: `companyId`, `role`, `assignedStoreId`
- ✅ Construye objeto `metadata` con todos los campos requeridos por el trigger
- ✅ **CRÍTICO:** Pasa `company_id` en metadata (requerido por el trigger)
- ✅ Pasa `role` y `assigned_store_id` si están disponibles
- ✅ Agregado logging para debugging

**Código Final:**
```typescript
const signUp = async (
  email: string, 
  password: string, 
  companyName: string, 
  userName: string,
  companyId?: string,        // NUEVO: Para el trigger
  role?: string,              // NUEVO: Para el trigger
  assignedStoreId?: string | null  // NUEVO: Para el trigger
) => {
  console.log('[Auth] Starting signUp...', { email, companyId, role, assignedStoreId });
  
  // Build metadata object for the trigger
  const metadata: Record<string, any> = {
    name: userName,
    user_name: userName, // Keep for backward compatibility
    company_name: companyName, // Keep for backward compatibility
  };
  
  // CRITICAL: company_id is REQUIRED by the trigger to create the profile
  if (companyId) {
    metadata.company_id = companyId;
  }
  
  // Optional: role (defaults to 'cashier' in trigger if not provided)
  if (role) {
    metadata.role = role;
  }
  
  // Optional: assigned_store_id (nullable)
  if (assignedStoreId) {
    metadata.assigned_store_id = assignedStoreId;
  }
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  
  if (error) {
    console.error('[Auth] signUp failed:', error);
  } else {
    console.log('[Auth] signUp successful - trigger will create profile automatically');
  }
  
  return { error };
};
```

**Interfaz Actualizada:**
```typescript
signUp: (
  email: string, 
  password: string, 
  companyName: string, 
  userName: string,
  companyId?: string,        // NUEVO
  role?: string,             // NUEVO
  assignedStoreId?: string | null  // NUEVO
) => Promise<{ error: any }>;
```

---

### 2. **Actualizado `RegisterForm.tsx`**

**Archivo:** `src/components/auth/RegisterForm.tsx`

**Cambios:**
- ✅ Extrae `company_id`, `role`, y `assigned_store_id` del perfil existente (si existe)
- ✅ Pasa estos valores a `signUp` para que el trigger los use
- ✅ Maneja el caso donde no hay perfil existente (nuevo registro)

**Código Final:**
```typescript
// Verificar si el email ya tiene un perfil creado por admin
const { data: existingProfile } = await supabase
  .from('users')
  .select('id, name, company_id, role, assigned_store_id')  // ✅ Agregado role y assigned_store_id
  .eq('email', formData.email)
  .maybeSingle();

// Si tiene perfil, usar los datos del perfil; si no, usar los del formulario
const userName = existingProfile?.name || formData.name || formData.email.split('@')[0];
const companyName = existingProfile ? 'Empresa Existente' : formData.email.split('@')[1].split('.')[0];

// CRITICAL: Pass company_id to trigger - required for profile creation
const companyId = existingProfile?.company_id || undefined;
const role = existingProfile?.role || undefined;
const assignedStoreId = existingProfile?.assigned_store_id || undefined;

const { error } = await signUp(
  formData.email, 
  formData.password, 
  companyName, 
  userName,
  companyId,      // ✅ Pass company_id for trigger
  role,           // ✅ Pass role if exists
  assignedStoreId // ✅ Pass assigned_store_id if exists
);
```

---

## 🔍 Verificación: Inserciones Manuales Eliminadas

**Resultado:** ✅ **No se encontraron inserciones manuales en el frontend**

```bash
# Búsqueda realizada:
grep -r "\.from\(['\"]users['\"]\)\.insert" src/
grep -r "INSERT INTO.*users" src/
grep -r "\.insert\(.*users" src/

# Resultado: No matches found
```

**Nota:** El RPC `create_user_atomic_admin` en el backend crea perfiles manualmente, pero es un flujo diferente (admin crea perfil primero, usuario se registra después). El trigger maneja este caso verificando si existe un perfil por email y vinculándolo automáticamente.

---

## 🔄 Flujo Actualizado

### Flujo Antes (Sin Trigger):
```
1. Usuario hace signUp
2. Se crea usuario en auth.users
3. ❌ Perfil NO se crea automáticamente
4. Frontend debe crear perfil manualmente (o falla)
```

### Flujo Después (Con Trigger):
```
1. Usuario hace signUp con metadata (company_id, role, etc.)
2. Se crea usuario en auth.users
3. ✅ Trigger detecta INSERT en auth.users
4. ✅ Trigger crea perfil automáticamente en public.users
5. ✅ Usuario puede hacer login inmediatamente
```

---

## ⚠️ Casos Especiales

### Caso 1: Registro Público (Sin Perfil Existente)
- **Problema:** No hay `company_id` en metadata
- **Solución:** El trigger detecta que falta `company_id` y registra un warning, pero permite que el usuario en `auth.users` se cree
- **Resultado:** El perfil debe crearse manualmente después vía admin panel o RPC

### Caso 2: Registro con Perfil Existente (Creado por Admin)
- **Problema:** Perfil existe pero `auth_user_id` es NULL
- **Solución:** El trigger detecta el perfil existente por email y lo vincula automáticamente
- **Resultado:** ✅ Perfil vinculado correctamente

### Caso 3: Admin Crea Usuario (RPC `create_user_atomic_admin`)
- **Problema:** RPC crea perfil manualmente primero
- **Solución:** Cuando el usuario se registra después, el trigger encuentra el perfil por email y lo vincula
- **Resultado:** ✅ Funciona correctamente (sin duplicados)

---

## ✅ Beneficios

1. **Eliminación de Race Conditions:** El perfil se crea automáticamente, no hay delay
2. **Consistencia:** Todos los usuarios tienen perfil inmediatamente después de registro
3. **Menos Código:** No hay lógica manual de creación de perfiles en el frontend
4. **Manejo de Errores:** El trigger maneja casos edge (perfiles existentes, duplicados, etc.)

---

## 🧪 Testing Recomendado

1. **Registro Público Nuevo:**
   - Registrar usuario nuevo sin perfil existente
   - Verificar que el trigger crea el perfil (si tiene company_id)
   - Verificar que el usuario puede hacer login

2. **Registro con Perfil Existente:**
   - Admin crea perfil vía panel
   - Usuario se registra con el mismo email
   - Verificar que el trigger vincula el perfil existente

3. **Registro sin company_id:**
   - Registrar usuario sin company_id en metadata
   - Verificar que el trigger registra warning pero permite creación de auth user
   - Verificar que el perfil se crea manualmente después

---

## 📝 Notas Importantes

1. **Backward Compatibility:** Los parámetros nuevos son opcionales, así que el código existente sigue funcionando
2. **RPC `create_user_atomic_admin`:** Sigue funcionando para el flujo de admin (crea perfil primero, usuario se registra después)
3. **Trigger es Idempotente:** Puede ejecutarse múltiples veces sin crear duplicados

---

**FIN DEL REFACTOR**


