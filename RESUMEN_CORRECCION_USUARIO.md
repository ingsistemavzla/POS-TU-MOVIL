# ✅ RESUMEN: Corregir Usuario zonagamermargarita@gmail.com

## 📋 PROBLEMA

El usuario "Gerente Zona Gamer" fue creado pero:
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
Verás una tabla con el estado actual del usuario en ambas tablas.

---

## 🛠️ PASO 2: CORRECCIÓN AUTOMÁTICA

**Ejecuta `corregir_usuario_zonagamer.sql`** en Supabase SQL Editor.

Este script:
1. **Detecta automáticamente** el problema:
   - ✅ Si existe en `auth.users` pero NO en `public.users` → Crea el perfil
   - ⚠️ Si existe en `public.users` pero NO en `auth.users` → Indica que debe registrarse
   - ✅ Si existe en ambos pero NO vinculado → Vincula `auth_user_id`
   - ⚠️ Si no existe en ninguno → Indica que debe crearse desde admin

2. **Corrige automáticamente**:
   - Crea perfil faltante
   - Vincula `auth_user_id`
   - Actualiza `assigned_store_id` si es necesario

3. **Muestra verificación final** con el estado corregido

---

## ⚠️ SI LA CORRECCIÓN FALLA POR RLS

Si el script muestra "⚠️ No se pudo vincular - posible problema de RLS", el usuario puede:

### Opción 1: Intentar Login/Registro (Recomendado)

El `AuthContext.tsx` tiene lógica automática para vincular perfiles por email:
1. El usuario intenta loguearse/registrarse con `zonagamermargarita@gmail.com`
2. El `AuthContext` detecta que existe un perfil con ese email pero `auth_user_id` es NULL
3. Automáticamente vincula el perfil usando el RPC `link_user_profile_by_email`

### Opción 2: Usar RPC desde Frontend (Después de Autenticarse)

Si el usuario puede autenticarse pero el perfil no está vinculado:
1. El usuario se autentica (aunque no pueda acceder al dashboard)
2. Desde la consola del navegador, ejecutar:
   ```javascript
   const { data, error } = await supabase.rpc('link_user_profile_by_email');
   console.log(data, error);
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

## 📝 CASOS ESPECÍFICOS

### Caso 1: Usuario existe en `auth.users` pero NO en `public.users`

**Solución:** El script creará automáticamente el perfil en `public.users`.

### Caso 2: Usuario existe en `public.users` pero NO en `auth.users`

**Solución:** El usuario debe **registrarse** desde la página de registro de la aplicación con el email `zonagamermargarita@gmail.com` y la contraseña `2677Tele$`.

### Caso 3: Usuario existe en ambos pero NO vinculado

**Solución:** El script intentará vincularlo automáticamente. Si falla por RLS, el usuario debe intentar loguearse/registrarse y el `AuthContext` lo vinculará automáticamente.

### Caso 4: Usuario no existe en ninguna tabla

**Solución:** El usuario debe ser creado usando el panel admin con el RPC `create_user_atomic_admin`.

---

## 🚀 ACCIÓN INMEDIATA

1. **Ejecuta `diagnosticar_usuario_especifico.sql`** → Ver estado actual
2. **Ejecuta `corregir_usuario_zonagamer.sql`** → Corregir automáticamente
3. **Prueba login** con el usuario corregido
4. **Si aún no funciona**, intenta registro/login y el `AuthContext` lo vinculará automáticamente


