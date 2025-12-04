# 🚀 PASOS INMEDIATOS: Corregir Usuarios No Visibles

## 📋 SITUACIÓN ACTUAL

Hay usuarios en **dos company_id diferentes**:
- `aa11bb22-cc33-dd44-ee55-ff6677889900` - 4 usuarios
- `db66d95b-9a33-4b4b-9157-5e34d5fb610a` - 4 usuarios

**El problema:** El usuario actual solo puede ver usuarios de su propia `company_id`.

---

## ✅ ACCIÓN INMEDIATA (3 PASOS)

### PASO 1: Verificar Company ID del Usuario Actual

**Ejecutar:** `verificar_usuario_actual_company.sql`

**Qué mostrará:**
- ✅ Company ID del usuario logueado
- ✅ Usuarios que debería ver (misma company_id)
- ✅ Conteo de usuarios visibles

**Importante:** Este script te dirá exactamente qué `company_id` tiene el usuario actual y cuántos usuarios debería ver.

---

### PASO 2: Corregir Políticas RLS

**Ejecutar:** `fix_rls_users_ver_company.sql`

**Qué hace:**
- ✅ Elimina políticas SELECT existentes
- ✅ Crea política para leer tu propio perfil
- ✅ Crea política para ver usuarios de tu compañía

**Resultado:** Los usuarios de tu `company_id` aparecerán en el panel.

---

### PASO 3: Corregir Usuarios Sin Company ID

**Ejecutar:** `corregir_usuarios_sin_company_id.sql`

**Qué hace:**
- ✅ Asigna `company_id` a usuarios que lo tienen NULL
- ✅ Asigna `assigned_store_id` a cashiers sin tienda

**Resultado:** Todos los usuarios tendrán `company_id` y podrán aparecer en el panel.

---

## 🎯 DESPUÉS DE EJECUTAR

1. **Recargar la página de Usuarios**
2. **Los usuarios deberían aparecer** en las listas
3. **Verificar que:**
   - ✅ Aparecen usuarios de tu `company_id`
   - ✅ Tienen `company_id` asignado
   - ✅ Tienen `assigned_store_id` (si es manager/cashier)

---

## ⚠️ NOTA IMPORTANTE

**Si el usuario actual tiene un `company_id` diferente:**
- Solo verá usuarios de su propia `company_id`
- Los usuarios de otras compañías no aparecerán (esto es correcto por seguridad)
- Si necesitas ver usuarios de otra compañía, debes cambiar el `company_id` del usuario actual

---

## 🚀 EJECUTAR AHORA

1. **`verificar_usuario_actual_company.sql`** → Ver company_id del usuario actual
2. **`fix_rls_users_ver_company.sql`** → Corregir políticas RLS
3. **`corregir_usuarios_sin_company_id.sql`** → Corregir usuarios sin company_id
4. **Recargar panel** → Verificar que aparecen usuarios


