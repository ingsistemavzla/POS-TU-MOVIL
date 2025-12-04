# 🔧 INSTRUCCIONES: Vincular Usuarios Restantes

## 📊 ESTADO ACTUAL

Según el reporte de verificación:
- ✅ **4 usuarios** correctamente vinculados
- 🟡 **1 perfil** sin `auth_user_id` (puede vincularse)
- 🔴 **3 usuarios** en `auth.users` sin perfil vinculado
- 🟢 **1 perfil** que puede vincularse por email

## ✅ SOLUCIÓN: Ejecutar Script de Vinculación Completo

### PASO 1: Ejecutar Script de Vinculación

1. Abre Supabase Dashboard → **SQL Editor**
2. Abre el archivo `vincular_usuarios_restantes.sql`
3. Copia y pega todo el contenido
4. Ejecuta el script
5. Revisa los mensajes de `RAISE NOTICE` para ver qué se vinculó

**Este script:**
- ✅ Vincula usuarios de `auth.users` con perfiles existentes por email
- ✅ Crea perfiles faltantes para usuarios en `auth.users` sin perfil
- ✅ Muestra un reporte detallado de lo que se hizo

### PASO 2: Verificar Resultado

Después de ejecutar el script, ejecuta nuevamente:

```sql
-- Ejecuta: verificar_vinculacion_usuarios.sql
-- O ejecuta este query rápido:
SELECT 
  '📊 RESUMEN' AS "Tipo",
  'Usuarios correctamente vinculados' AS "Categoría",
  COUNT(*) AS "Cantidad"
FROM auth.users au
INNER JOIN public.users pu ON pu.auth_user_id = au.id
UNION ALL
SELECT 
  '📊 RESUMEN',
  'Perfiles sin auth_user_id',
  COUNT(*)
FROM public.users pu
WHERE pu.auth_user_id IS NULL
UNION ALL
SELECT 
  '📊 RESUMEN',
  'Usuarios en auth.users sin perfil vinculado',
  COUNT(*)
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
);
```

**Resultado esperado:**
- ✅ Usuarios correctamente vinculados: **7** (4 + 3)
- ✅ Perfiles sin auth_user_id: **0** (o muy bajo)
- ✅ Usuarios sin perfil vinculado: **0** (o muy bajo)

---

## 🔍 SI AÚN HAY PROBLEMAS

### Ver Detalle de Usuarios No Vinculados

Ejecuta este query para ver exactamente qué usuarios no están vinculados:

```sql
SELECT 
  au.email AS "Email Auth",
  au.id AS "Auth User ID",
  au.created_at AS "Fecha Creación Auth",
  pu.email AS "Email Perfil",
  pu.id AS "Profile ID",
  pu.auth_user_id AS "Profile Auth User ID",
  CASE 
    WHEN pu.id IS NULL THEN '❌ No existe perfil en public.users'
    WHEN pu.auth_user_id IS NULL THEN '🟡 Perfil existe pero sin auth_user_id'
    WHEN pu.auth_user_id != au.id THEN '⚠️ Perfil vinculado a otro usuario'
    ELSE '✅ Vinculado correctamente'
  END AS "Estado"
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu2 WHERE pu2.auth_user_id = au.id
)
ORDER BY au.created_at DESC;
```

### Vincular Manualmente un Usuario Específico

Si hay un usuario específico que no se puede vincular automáticamente:

```sql
-- Reemplaza 'email@ejemplo.com' con el email del usuario problemático
UPDATE public.users
SET 
  auth_user_id = (
    SELECT id FROM auth.users WHERE email = 'email@ejemplo.com'
  ),
  updated_at = NOW()
WHERE email = 'email@ejemplo.com'
  AND (auth_user_id IS NULL OR auth_user_id != (
    SELECT id FROM auth.users WHERE email = 'email@ejemplo.com'
  ));
```

---

## ✅ DESPUÉS DE VINCULAR

1. **Prueba el registro** del usuario que estaba fallando
2. **Verifica que puede iniciar sesión** sin errores
3. **Confirma que el dashboard carga** correctamente

---

## 📝 NOTAS

- El script `vincular_usuarios_restantes.sql` es más completo que el anterior
- Crea perfiles faltantes si es necesario (con rol 'cashier' por defecto)
- Los perfiles creados pueden necesitar `company_id` asignado manualmente después
- Si un perfil ya está vinculado a otro usuario, el script lo omite por seguridad


