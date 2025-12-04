# 🔧 Solución: Error 500 "Database error querying schema" en Login

## 🔍 **PROBLEMA IDENTIFICADO**

Error durante el login:
```
AuthApiError: Database error querying schema
Failed to load resource: the server responded with a status of 500
```

**Causa Probable:**
1. ❌ El trigger `handle_new_user` o `on_auth_user_created` está fallando
2. ❌ Las políticas RLS en `public.users` están causando un error circular
3. ❌ El formato del hash de contraseña no es compatible con Supabase Auth

---

## 🛠️ **SOLUCIÓN 1: Verificar el Problema**

Ejecuta el script: `verificar_error_auth.sql`

Este script verificará:
- ✅ Estado de `auth.users`
- ✅ Triggers activos en `auth.users`
- ✅ Funciones relacionadas con usuarios
- ✅ Formato del hash de contraseña

**Resultado Esperado:**
El script mostrará si el hash tiene el formato correcto (`$2a$`, `$2b$`, o `$2y$`).

---

## 🛠️ **SOLUCIÓN 2: Resetear Contraseña con Formato Verificado**

Ejecuta el script: `fix_auth_password_supabase_format.sql`

Este script:
- ✅ Genera un hash bcrypt con formato verificado
- ✅ Valida que el formato sea correcto antes de actualizar
- ✅ Confirma el email si no está confirmado

---

## 🛠️ **SOLUCIÓN 3: Usar Supabase Dashboard (Recomendado)**

Si los scripts SQL no funcionan, usa el método oficial de Supabase:

1. **Ir a Supabase Dashboard:**
   - Dashboard > Authentication > Users

2. **Seleccionar el usuario:**
   - Buscar `tumovilstore2025@gmail.com` o `tumovillaisla@gmail.com`

3. **Resetear contraseña:**
   - Click en "..." (tres puntos)
   - Seleccionar "Reset Password" o "Update User"
   - Establecer nueva contraseña: `2677Tele$`

4. **Verificar:**
   - Confirmar que el email esté verificado
   - Confirmar que la contraseña esté establecida

---

## 🛠️ **SOLUCIÓN 4: Deshabilitar Temporalmente el Trigger**

Si el problema es el trigger, puedes deshabilitarlo temporalmente:

```sql
-- Deshabilitar trigger temporalmente
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Resetear contraseña manualmente
-- (usar fix_auth_password_supabase_format.sql)

-- Rehabilitar trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

**⚠️ ADVERTENCIA:** Solo haz esto si es absolutamente necesario y después de verificar que los usuarios ya tienen perfiles en `public.users`.

---

## 🔍 **DIAGNÓSTICO ADICIONAL**

Si el error persiste, verifica:

1. **Logs de Supabase:**
   - Dashboard > Logs > Postgres Logs
   - Buscar errores relacionados con `handle_new_user` o `auth.users`

2. **RLS Policies:**
   - Verificar que las políticas RLS en `public.users` no estén causando errores circulares

3. **Trigger Function:**
   - Verificar que `handle_new_user` no tenga errores de sintaxis o lógica

---

## ✅ **VERIFICACIÓN POST-CORRECCIÓN**

Después de aplicar cualquier solución:

1. **Verificar hash:**
   ```sql
   SELECT email, 
          encrypted_password IS NOT NULL AS has_password,
          LEFT(encrypted_password, 7) AS hash_format
   FROM auth.users
   WHERE email IN ('tumovilstore2025@gmail.com', 'tumovillaisla@gmail.com');
   ```

2. **Intentar login:**
   - Email: `tumovilstore2025@gmail.com` / Password: `2677Tele$`
   - Email: `tumovillaisla@gmail.com` / Password: `2677Tele$`

3. **Verificar logs:**
   - Si el error persiste, revisar los logs de Supabase para más detalles

---

## 📋 **CHECKLIST DE SOLUCIÓN**

- [ ] Ejecutar `verificar_error_auth.sql` para diagnosticar
- [ ] Verificar formato del hash de contraseña
- [ ] Ejecutar `fix_auth_password_supabase_format.sql` si el formato es incorrecto
- [ ] O usar Supabase Dashboard para resetear contraseña
- [ ] Verificar logs de Supabase para errores adicionales
- [ ] Intentar login nuevamente
- [ ] Si persiste, verificar triggers y RLS policies

---

**FIN DE LA SOLUCIÓN**


