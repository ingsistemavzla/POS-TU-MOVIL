# 🔍 AUDITORÍA FORENSE: Eliminación de Usuario
## Email: `tumovilcentro4@gmail.com`

---

## 📋 RESUMEN EJECUTIVO

**Problema Reportado:** El sistema reporta que el usuario `tumovilcentro4@gmail.com` "no fue encontrado" al intentar eliminarlo.

**Causa Raíz Identificada:** La función `delete_user_atomic_admin` busca por **UUID del perfil** (`p_user_profile_id`), NO por email. Si el usuario no aparece en la lista del frontend, no se puede obtener su UUID para eliminarlo.

---

## 🔬 ANÁLISIS TÉCNICO

### 1. MÉTODO DE BÚSQUEDA

#### ✅ **Función RPC: `delete_user_atomic_admin`**

**Ubicación:** `delete_user_atomic_admin.sql` (raíz del proyecto) o migración equivalente.

**Firma:**
```sql
CREATE OR REPLACE FUNCTION delete_user_atomic_admin(
  p_user_profile_id UUID  -- ⚠️ BUSCA POR UUID, NO POR EMAIL
)
```

**Lógica de Búsqueda (Líneas 20-24):**
```sql
SELECT auth_user_id, email, name, company_id
INTO v_auth_user_id, v_user_email, v_user_name, v_company_id
FROM users
WHERE id = p_user_profile_id;  -- ⚠️ Busca por ID (UUID), no por email
```

**Veredicto:** 
- ❌ **NO busca por email**
- ✅ **Busca por UUID del perfil** (`public.users.id`)
- ⚠️ **Case Sensitivity:** No aplica (busca por UUID, no por texto)

---

### 2. PERMISOS DEL LLAMADOR

#### ✅ **Validación de Permisos en la Función**

**La función `delete_user_atomic_admin` NO valida permisos explícitamente**, pero depende de:

1. **RLS (Row Level Security):**
   - Política: `"Admins can delete users in their company"` (Línea 54-55 de `20250826162300_setup_auth_and_rls.sql`)
   - Condición: `company_id = public.get_user_company_id() AND public.is_admin()`
   - **Veredicto:** Solo admins de la misma empresa pueden eliminar usuarios.

2. **Función Helper: `is_admin()`**
   ```sql
   SELECT role = 'admin'
   FROM public.users
   WHERE auth_user_id = auth.uid()
   ```
   - **Veredicto:** Solo usuarios con `role = 'admin'` pueden ejecutar la función.

3. **Validación de Company:**
   - La RLS asegura que solo se pueden eliminar usuarios de la misma `company_id`.
   - **Veredicto:** ✅ **Seguro** - No se pueden eliminar usuarios de otras empresas.

---

### 3. VERIFICACIÓN DE EXISTENCIA

#### ✅ **Orden de Verificación:**

**Paso 1: Búsqueda en `public.users` (Líneas 20-24)**
```sql
SELECT auth_user_id, email, name, company_id
INTO v_auth_user_id, v_user_email, v_user_name, v_company_id
FROM users
WHERE id = p_user_profile_id;
```

**Paso 2: Validación de `auth_user_id` (Líneas 26-32)**
```sql
IF v_auth_user_id IS NULL THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Usuario no encontrado'  -- ⚠️ Este es el mensaje que ve el usuario
  );
END IF;
```

**Veredicto:**
- ✅ **Primero verifica en `public.users`** (tabla de perfiles)
- ⚠️ **Si `auth_user_id IS NULL`, retorna "Usuario no encontrado"**
- ⚠️ **NO verifica si el perfil existe en `auth.users` antes de eliminar**

**Problema Potencial:**
- Si el usuario tiene un perfil en `public.users` pero `auth_user_id IS NULL`, la función retorna error.
- Si el usuario fue eliminado de `auth.users` pero el perfil sigue en `public.users`, la función falla.

---

## 🐛 DIAGNÓSTICO DEL PROBLEMA

### **Escenario 1: Usuario no aparece en la lista del frontend**

**Causa:** RLS está ocultando el usuario porque:
1. El usuario pertenece a otra `company_id`.
2. El usuario está inactivo (`active = false`) y el frontend filtra solo activos.
3. El usuario no existe en `public.users`.

**Verificación:**
```sql
-- Ejecutar en Supabase SQL Editor
SELECT id, email, name, role, company_id, active
FROM public.users
WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com');
```

---

### **Escenario 2: Usuario existe pero `auth_user_id IS NULL`**

**Causa:** El perfil fue creado pero nunca se vinculó con `auth.users`.

**Síntoma:** La función retorna `'error': 'Usuario no encontrado'` aunque el perfil existe.

**Verificación:**
```sql
SELECT id, email, auth_user_id, company_id
FROM public.users
WHERE LOWER(email) = LOWER('tumovilcentro4@gmail.com');
-- Si auth_user_id IS NULL, este es el problema
```

---

### **Escenario 3: Usuario existe en otra empresa**

**Causa:** El usuario pertenece a una `company_id` diferente a la del admin que intenta eliminarlo.

**Síntoma:** El usuario no aparece en la lista del frontend (RLS lo oculta).

**Verificación:**
```sql
-- Comparar company_id del usuario con la del admin actual
SELECT 
  u.id,
  u.email,
  u.company_id AS user_company_id,
  public.get_user_company_id() AS current_admin_company_id,
  CASE 
    WHEN u.company_id = public.get_user_company_id() THEN '✅ MISMA EMPRESA'
    ELSE '❌ EMPRESA DIFERENTE'
  END AS diagnostico
FROM public.users u
WHERE LOWER(u.email) = LOWER('tumovilcentro4@gmail.com');
```

---

## 🔧 SOLUCIÓN PROPUESTA

### **Opción 1: Crear función de eliminación por email (Recomendada)**

Crear una nueva función RPC que busque por email y luego llame a `delete_user_atomic_admin`:

```sql
CREATE OR REPLACE FUNCTION delete_user_by_email(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_profile_id UUID;
  v_result JSONB;
BEGIN
  -- Buscar usuario por email (case-insensitive)
  SELECT id INTO v_user_profile_id
  FROM users
  WHERE LOWER(email) = LOWER(p_email)
    AND company_id = public.get_user_company_id()  -- Seguridad: Solo misma empresa
  LIMIT 1;

  -- Si no se encuentra, retornar error
  IF v_user_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Usuario con email %s no encontrado en tu empresa', p_email)
    );
  END IF;

  -- Llamar a la función existente
  SELECT delete_user_atomic_admin(v_user_profile_id) INTO v_result;
  
  RETURN v_result;
END;
$$;
```

**Ventajas:**
- ✅ Permite eliminar por email directamente
- ✅ Mantiene la seguridad (solo misma empresa)
- ✅ Reutiliza la lógica existente

---

### **Opción 2: Modificar el frontend para buscar por email**

Modificar `src/pages/Users.tsx` para agregar una función que busque el usuario por email antes de eliminarlo:

```typescript
const deleteUserByEmail = async (userEmail: string) => {
  // Buscar el usuario por email
  const { data: userData, error: searchError } = await supabase
    .from('users')
    .select('id, name')
    .eq('email', userEmail)
    .eq('company_id', companyId)
    .single();

  if (searchError || !userData) {
    toast({
      title: "Usuario no encontrado",
      description: `No se encontró un usuario con el email ${userEmail}`,
      variant: "destructive"
    });
    return;
  }

  // Llamar a la función de eliminación existente
  await deleteUser(userData.id, userData.name || userEmail);
};
```

---

## 📊 CHECKLIST DE DIAGNÓSTICO

Ejecuta el script `DIAGNOSTICO_ELIMINACION_USUARIO.sql` en Supabase SQL Editor para verificar:

- [ ] **PASO 1:** ¿Existe el usuario en `public.users`?
- [ ] **PASO 2:** ¿Existe el usuario en `auth.users`?
- [ ] **PASO 3:** ¿El `auth_user_id` está vinculado correctamente?
- [ ] **PASO 4:** ¿El usuario actual tiene permisos de admin?
- [ ] **PASO 5:** ¿El usuario pertenece a la misma `company_id`?
- [ ] **PASO 6:** ¿El usuario tiene dependencias (sales, transfers)?
- [ ] **PASO 7:** ¿El usuario está activo o inactivo?
- [ ] **PASO 8:** ¿La búsqueda de `delete_user_atomic_admin` encuentra el usuario?

---

## 🎯 CONCLUSIÓN

**Problema Principal:**
La función `delete_user_atomic_admin` requiere un **UUID del perfil**, pero el usuario está intentando eliminar por **email**. Si el usuario no aparece en la lista del frontend (por RLS, inactividad, o pertenencia a otra empresa), no se puede obtener su UUID.

**Recomendación:**
1. Ejecutar `DIAGNOSTICO_ELIMINACION_USUARIO.sql` para identificar el escenario exacto.
2. Si el usuario existe pero está oculto por RLS, crear la función `delete_user_by_email` (Opción 1).
3. Si el usuario no existe, verificar si fue eliminado previamente o si el email es incorrecto.

---

## 📝 ARCHIVOS RELACIONADOS

- `delete_user_atomic_admin.sql` - Función RPC de eliminación
- `src/pages/Users.tsx` - Frontend de gestión de usuarios (líneas 621-688)
- `supabase/migrations/20250826162300_setup_auth_and_rls.sql` - Políticas RLS
- `DIAGNOSTICO_ELIMINACION_USUARIO.sql` - Script de diagnóstico








