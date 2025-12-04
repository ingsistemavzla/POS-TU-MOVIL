# 🔧 INSTRUCCIONES: Corregir Usuario zonagamermargarita@gmail.com

## 📋 PROBLEMA

El usuario "Gerente Zona Gamer" (zonagamermargarita@gmail.com) fue creado pero:
- ❌ No puede registrarse
- ❌ No puede loguearse
- ⚠️ Posible inconsistencia entre `auth.users` y `public.users`

---

## 🔍 PASO 1: DIAGNÓSTICO

**Ejecuta `diagnosticar_usuario_especifico.sql`** en Supabase SQL Editor.

Este script mostrará:
- ✅ Si existe en `auth.users`
- ✅ Si existe en `public.users`
- ✅ Si están vinculados correctamente
- ✅ Tienda asignada

**Resultado esperado:**
- Verás el estado actual del usuario en ambas tablas
- Identificarás el problema específico (no existe, no vinculado, etc.)

---

## 🛠️ PASO 2: CORRECCIÓN

**Ejecuta `corregir_usuario_zonagamer.sql`** en Supabase SQL Editor.

Este script:
1. **Detecta automáticamente** el problema:
   - Si existe en `auth.users` pero NO en `public.users` → Crea el perfil
   - Si existe en `public.users` pero NO en `auth.users` → Indica que debe registrarse
   - Si existe en ambos pero NO vinculado → Vincula `auth_user_id`
   - Si no existe en ninguno → Indica que debe crearse desde admin

2. **Corrige automáticamente**:
   - Crea perfil faltante
   - Vincula `auth_user_id`
   - Actualiza `assigned_store_id` si es necesario

3. **Muestra verificación final** con el estado corregido

---

## ⚠️ SI LA CORRECCIÓN FALLA POR RLS

Si el script falla con error de permisos (RLS bloqueando), usa el RPC:

```sql
-- Vincular usando RPC (bypass RLS)
SELECT public.link_user_profile_by_email(
  p_auth_user_id := (SELECT id FROM auth.users WHERE email = 'zonagamermargarita@gmail.com' LIMIT 1),
  p_email := 'zonagamermargarita@gmail.com'
);
```

---

## 🧪 PASO 3: PROBAR LOGIN

Después de la corrección:

1. **Abre la aplicación** en el navegador
2. **Intenta hacer login** con:
   - Email: `zonagamermargarita@gmail.com`
   - Password: `2677Tele$`
3. **Si aún no funciona**, verifica:
   - ¿El usuario existe en `auth.users`? (debe existir para login)
   - ¿El `auth_user_id` está vinculado? (debe estar vinculado)

---

## 📝 NOTAS IMPORTANTES

### Si el usuario NO existe en `auth.users`:

El usuario debe **registrarse primero** desde la página de registro de la aplicación, o debe ser creado usando el RPC `create_user_atomic_admin` desde el panel admin.

### Si el usuario existe pero NO está vinculado:

El script `corregir_usuario_zonagamer.sql` debería vincularlo automáticamente. Si falla por RLS, usar el RPC `link_user_profile_by_email`.

---

## 🚀 ACCIÓN INMEDIATA

1. **Ejecuta `diagnosticar_usuario_especifico.sql`** → Ver estado actual
2. **Ejecuta `corregir_usuario_zonagamer.sql`** → Corregir automáticamente
3. **Prueba login** con el usuario corregido


