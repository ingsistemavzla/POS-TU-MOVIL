# 🔧 SOLUCIÓN: Error "Database error finding user" al Registrar Usuario Creado por Admin

## 🔴 PROBLEMA

Cuando un admin crea un usuario desde el panel:
1. Se crea un perfil en `public.users` con `auth_user_id = NULL`
2. El usuario intenta registrarse con `supabase.auth.signUp()`
3. Se crea un usuario en `auth.users`
4. **PERO** no se vincula automáticamente con el perfil existente
5. Resultado: Error "Database error finding user"

## ✅ SOLUCIÓN INMEDIATA

### PASO 1: Ejecutar Script de Corrección Rápida

Ejecuta el script `corregir_registro_usuario_rapido.sql` en Supabase SQL Editor:

```sql
-- Este script vincula automáticamente usuarios de auth.users con perfiles en public.users por email
```

**Instrucciones:**
1. Abre Supabase Dashboard → SQL Editor
2. Abre el archivo `corregir_registro_usuario_rapido.sql`
3. Copia y pega el contenido
4. Ejecuta el script
5. Verifica que muestra mensajes de vinculación exitosa

### PASO 2: Verificar Vinculación

Ejecuta este query para verificar que los usuarios están vinculados:

```sql
SELECT 
  au.email,
  au.id AS auth_user_id,
  pu.id AS profile_id,
  pu.auth_user_id AS linked_auth_user_id,
  CASE 
    WHEN pu.auth_user_id = au.id THEN '✅ Vinculado'
    WHEN pu.auth_user_id IS NULL THEN '❌ Sin vincular'
    ELSE '⚠️ Vinculado incorrectamente'
  END AS estado
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
ORDER BY au.created_at DESC;
```

### PASO 3: Si Aún Hay Problemas

Si después de ejecutar el script aún hay usuarios sin vincular, ejecuta el script completo:

```sql
-- Ejecuta: corregir_usuarios_huérfanos.sql
-- Este script es más completo y crea perfiles faltantes si es necesario
```

---

## 🛡️ SOLUCIÓN PERMANENTE: Función RPC para Vinculación Automática

### Crear Función de Vinculación

Ejecuta este script para crear una función que permita vincular desde el frontend:

```sql
CREATE OR REPLACE FUNCTION public.link_user_profile_by_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id UUID;
  v_email TEXT;
  v_profile_id UUID;
BEGIN
  -- Obtener el auth_user_id y email del usuario actual
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no autenticado'
    );
  END IF;
  
  -- Obtener email del usuario autenticado
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_auth_user_id;
  
  IF v_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No se pudo obtener el email del usuario'
    );
  END IF;
  
  -- Buscar perfil con el mismo email y sin auth_user_id
  SELECT id INTO v_profile_id
  FROM public.users
  WHERE email = v_email
    AND (auth_user_id IS NULL OR auth_user_id != v_auth_user_id)
  LIMIT 1;
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No se encontró un perfil para vincular'
    );
  END IF;
  
  -- Vincular el perfil
  UPDATE public.users
  SET 
    auth_user_id = v_auth_user_id,
    updated_at = NOW()
  WHERE id = v_profile_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Perfil vinculado exitosamente',
    'profile_id', v_profile_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_user_profile_by_email() TO authenticated;
```

### Mejorar el Frontend para Llamar a Esta Función

Modifica `src/contexts/AuthContext.tsx` en la función `fetchUserProfile` para llamar a esta función RPC si no encuentra el perfil:

```typescript
// Después de la línea 208 (después de buscar por email)
if (existingProfile && !existingProfile.auth_user_id) {
  // Intentar vincular usando RPC
  try {
    const { data: linkResult, error: linkError } = await supabase.rpc('link_user_profile_by_email');
    if (linkResult?.success) {
      // Recargar el perfil después de vincular
      const { data: reloadedProfile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single();
      effectiveProfile = reloadedProfile as UserProfile;
    }
  } catch (linkErr) {
    console.error('Error linking profile via RPC:', linkErr);
  }
}
```

---

## 📋 CHECKLIST DE SOLUCIÓN

- [ ] Ejecutar `corregir_registro_usuario_rapido.sql`
- [ ] Verificar que los usuarios están vinculados (query de verificación)
- [ ] Probar registro de un usuario creado por admin
- [ ] Si persiste, ejecutar `corregir_usuarios_huérfanos.sql`
- [ ] (Opcional) Crear función RPC `link_user_profile_by_email()`
- [ ] (Opcional) Mejorar frontend para llamar a la función RPC

---

## 🚨 NOTA IMPORTANTE

El problema puede estar relacionado con las políticas RLS que acabamos de implementar. Verifica que la política de UPDATE en `public.users` permita que un usuario actualice su propio `auth_user_id`:

```sql
-- Verificar política de UPDATE en public.users
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND cmd = 'UPDATE';
```

Si no existe una política que permita actualizar `auth_user_id`, puede ser necesario agregarla o usar `SECURITY DEFINER` en la función de vinculación.


