# 🔧 SOLUCIÓN: Problema con Usuarios No Visibles y Error de Registro

## ⚠️ PROBLEMA IDENTIFICADO

1. **Usuario `tumovillaisla@gmail.com` no puede registrarse**
   - Error: "Database error finding user"
   - El usuario intenta registrarse pero falla

2. **No se ven usuarios en el panel de usuarios**
   - Los gerentes/usuarios creados no aparecen en la lista
   - El panel muestra listas vacías

---

## 🔍 DIAGNÓSTICO

### Ejecutar Scripts de Diagnóstico

**PASO 1: Diagnosticar usuario específico**
```sql
-- Ejecutar: diagnosticar_usuario_tumovillaisla.sql
```
Este script mostrará:
- ✅ Si existe en `auth.users`
- ✅ Si existe en `public.users`
- ✅ Si están vinculados correctamente

**PASO 2: Diagnosticar por qué no se ven usuarios**
```sql
-- Ejecutar: diagnosticar_porque_no_se_ven_usuarios.sql
```
Este script mostrará:
- ✅ Políticas RLS en `public.users`
- ✅ Si RLS está habilitado
- ✅ Conteo de usuarios por rol
- ✅ Usuarios sin vincular
- ✅ Usuarios por company_id

---

## 🛠️ SOLUCIONES

### Solución 1: Corregir Usuario Específico

**Ejecutar:** `corregir_usuario_tumovillaisla.sql`

Este script:
1. Detecta automáticamente el problema
2. Crea perfil si falta
3. Vincula `auth_user_id` si no está vinculado
4. Muestra verificación final

**Después de ejecutar:**
- El usuario debería poder hacer login
- Si aún no puede, debe intentar registrarse nuevamente

---

### Solución 2: Verificar Políticas RLS

**Problema:** Las políticas RLS pueden estar bloqueando la lectura de usuarios

**Verificar:**
```sql
-- Ver políticas RLS
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users';
```

**Si las políticas son muy restrictivas:**
- Los admins pueden no ver usuarios de su company
- Necesitamos verificar que las políticas permitan a los admins ver usuarios de su company

---

### Solución 3: Verificar Company ID

**Problema:** Los usuarios pueden tener `company_id` NULL o incorrecto

**Verificar:**
```sql
-- Ver usuarios sin company_id
SELECT id, email, name, role, company_id
FROM public.users
WHERE company_id IS NULL;
```

**Corregir:**
```sql
-- Asignar company_id a usuarios sin company
UPDATE public.users
SET company_id = 'aa11bb22-cc33-dd44-ee55-ff6677889900'  -- ⚠️ Tu company_id
WHERE company_id IS NULL
  AND role IN ('admin', 'manager', 'cashier');
```

---

## 📋 PASOS PARA RESOLVER

### PASO 1: Ejecutar Diagnósticos

1. **Ejecutar `diagnosticar_usuario_tumovillaisla.sql`**
   - Ver estado del usuario específico
   - Identificar el problema

2. **Ejecutar `diagnosticar_porque_no_se_ven_usuarios.sql`**
   - Ver políticas RLS
   - Ver conteo de usuarios
   - Identificar problemas de company_id

---

### PASO 2: Corregir Usuario Específico

1. **Ejecutar `corregir_usuario_tumovillaisla.sql`**
   - Corregir el usuario `tumovillaisla@gmail.com`

2. **Verificar corrección:**
   - El usuario debería poder hacer login
   - O debe intentar registrarse nuevamente

---

### PASO 3: Verificar Políticas RLS

Si los usuarios aún no se ven en el panel:

1. **Verificar políticas RLS:**
   ```sql
   SELECT policyname, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'users'
     AND cmd = 'SELECT';
   ```

2. **Si las políticas son restrictivas:**
   - Verificar que permitan a los admins ver usuarios de su company
   - Si es necesario, ejecutar `fix_rls_users_emergency.sql` nuevamente

---

### PASO 4: Verificar Company ID

Si los usuarios tienen `company_id` NULL:

1. **Asignar company_id:**
   ```sql
   -- Obtener tu company_id
   SELECT company_id FROM public.users WHERE auth_user_id = auth.uid();
   
   -- Asignar a usuarios sin company_id
   UPDATE public.users
   SET company_id = 'TU_COMPANY_ID_AQUI'
   WHERE company_id IS NULL;
   ```

---

## 🎯 RESULTADO ESPERADO

Después de aplicar las soluciones:

1. ✅ **Usuario `tumovillaisla@gmail.com` puede hacer login**
2. ✅ **Usuarios aparecen en el panel de usuarios**
3. ✅ **Admins pueden ver usuarios de su company**
4. ✅ **No hay errores de "Database error finding user"**

---

## ⚠️ SI AÚN HAY PROBLEMAS

### Problema: Usuarios aún no se ven

**Verificar:**
1. ¿El admin tiene `company_id` correcto?
2. ¿Los usuarios tienen `company_id` correcto?
3. ¿Las políticas RLS permiten lectura?

**Solución:**
- Ejecutar `fix_rls_users_emergency.sql` nuevamente
- Verificar que las políticas permitan a los admins ver usuarios de su company

---

### Problema: Usuario aún no puede registrarse

**Verificar:**
1. ¿El usuario existe en `auth.users`?
2. ¿El usuario existe en `public.users`?
3. ¿Están vinculados?

**Solución:**
- Ejecutar `corregir_usuario_tumovillaisla.sql` nuevamente
- El usuario debe intentar registrarse nuevamente
- Si falla, crear el perfil manualmente desde el panel admin

---

## 🚀 ACCIÓN INMEDIATA

1. **Ejecutar `diagnosticar_usuario_tumovillaisla.sql`** → Ver estado del usuario
2. **Ejecutar `diagnosticar_porque_no_se_ven_usuarios.sql`** → Ver por qué no se ven usuarios
3. **Ejecutar `corregir_usuario_tumovillaisla.sql`** → Corregir usuario específico
4. **Verificar en el panel** → Los usuarios deberían aparecer


