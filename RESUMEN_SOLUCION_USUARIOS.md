# 🔧 RESUMEN: Solución para Usuarios No Visibles

## ⚠️ PROBLEMA

Hay usuarios en **dos company_id diferentes**, pero el usuario actual solo puede ver usuarios de su propia `company_id` debido a las políticas RLS.

**Company IDs encontrados:**
- `aa11bb22-cc33-dd44-ee55-ff6677889900` - 4 usuarios (1 admin, 2 managers, 1 cashier)
- `db66d95b-9a33-4b4b-9157-5e34d5fb610a` - 4 usuarios (0 admin, 0 manager, 3 cashiers, 1 master_admin)

---

## ✅ SOLUCIÓN

### PASO 1: Verificar Company ID del Usuario Actual

**Ejecutar:** `verificar_usuario_actual_company.sql`

Este script mostrará:
- ✅ Company ID del usuario actual
- ✅ Usuarios que debería ver (misma company_id)
- ✅ Conteo de usuarios visibles

**Resultado esperado:**
- Verás qué `company_id` tiene el usuario logueado
- Verás cuántos usuarios debería ver
- Identificarás si el problema es de `company_id` o de políticas RLS

---

### PASO 2: Corregir Políticas RLS

**Ejecutar:** `fix_rls_users_ver_company.sql`

Este script:
- ✅ Elimina políticas SELECT existentes
- ✅ Crea política para leer tu propio perfil
- ✅ Crea política para ver usuarios de tu compañía
- ✅ Verifica que las políticas se crearon correctamente

**Resultado esperado:**
- Las políticas permitirán ver usuarios de la misma `company_id`
- Los usuarios aparecerán en el panel

---

### PASO 3: Corregir Usuarios Sin Company ID

**Ejecutar:** `corregir_usuarios_sin_company_id.sql`

Este script:
- ✅ Asigna `company_id` a usuarios que lo tienen NULL
- ✅ Asigna `assigned_store_id` a cashiers
- ✅ Muestra verificación final

**Resultado esperado:**
- Todos los usuarios tendrán `company_id`
- Los cashiers tendrán `assigned_store_id`

---

### PASO 4: Verificar en el Panel

1. **Recargar la página de Usuarios**
2. **Los usuarios deberían aparecer** en las listas
3. **Verificar que:**
   - ✅ Aparecen usuarios de tu `company_id`
   - ✅ Tienen `company_id` asignado
   - ✅ Tienen `assigned_store_id` (si es manager/cashier)

---

## 📋 ORDEN DE EJECUCIÓN

1. **`verificar_usuario_actual_company.sql`** → Ver company_id del usuario actual
2. **`fix_rls_users_ver_company.sql`** → Corregir políticas RLS
3. **`corregir_usuarios_sin_company_id.sql`** → Corregir usuarios sin company_id
4. **Recargar panel** → Verificar que aparecen usuarios

---

## 🎯 RESULTADO ESPERADO

Después de ejecutar los scripts:

1. ✅ **Políticas RLS corregidas** - Permiten ver usuarios de la misma compañía
2. ✅ **Usuarios con company_id** - Todos tienen `company_id` asignado
3. ✅ **Usuarios visibles en el panel** - Aparecen en las listas
4. ✅ **Usuario `tumovillaisla@gmail.com` puede registrarse** - Tiene `company_id` y `assigned_store_id`

---

## ⚠️ NOTA IMPORTANTE

**Si el usuario actual tiene un `company_id` diferente:**
- Solo verá usuarios de su propia `company_id`
- Los usuarios de otras compañías no aparecerán (esto es correcto por seguridad)
- Si necesitas ver usuarios de otra compañía, debes cambiar el `company_id` del usuario actual

---

## 🚀 ACCIÓN INMEDIATA

1. **Ejecutar `verificar_usuario_actual_company.sql`** → Ver company_id del usuario actual
2. **Ejecutar `fix_rls_users_ver_company.sql`** → Corregir políticas RLS
3. **Ejecutar `corregir_usuarios_sin_company_id.sql`** → Corregir usuarios
4. **Recargar panel** → Verificar que aparecen usuarios


