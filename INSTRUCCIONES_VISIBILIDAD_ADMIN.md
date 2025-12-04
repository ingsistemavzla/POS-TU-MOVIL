# 🔧 Instrucciones: Corregir Visibilidad en Admin Panel

## ✅ **DIAGNÓSTICO CONFIRMADO**

Los usuarios están **correctamente vinculados** entre `auth.users` y `public.users`:
- ✅ `tumovilstore2025@gmail.com` - Vinculado
- ✅ `tumovillaisla@gmail.com` - Vinculado

**El problema NO es la vinculación, sino la visibilidad en el Admin Panel.**

---

## 🔍 **PASO 1: VERIFICAR DATOS COMPLETOS**

Ejecuta el script: `verificar_visibilidad_admin_panel.sql`

**Este script verificará:**
1. ✅ Si los usuarios están activos (`active = TRUE`)
2. ✅ Si tienen `company_id` asignado
3. ✅ Si tienen `assigned_store_id` asignado
4. ✅ Si tienen `role` definido
5. ✅ Si RLS permite verlos

**Posibles Problemas:**
- ❌ `active = FALSE` → No aparecerán en el Admin Panel
- ❌ `company_id IS NULL` → No aparecerán en el Admin Panel
- ❌ `assigned_store_id IS NULL` → Puede causar problemas
- ❌ `role IS NULL` → No aparecerán en el Admin Panel

---

## 🛠️ **PASO 2: CORREGIR DATOS**

Ejecuta el script: `corregir_visibilidad_admin_panel.sql`

**Este script:**
1. ✅ Establece `active = TRUE`
2. ✅ Asigna `company_id` si falta
3. ✅ Asigna `assigned_store_id` si falta
4. ✅ Asigna `role = 'manager'` si falta
5. ✅ Asigna `name` si falta

**IDs que usará el script:**
- Tu Móvil Store: `bb11cc22-dd33-ee44-ff55-aa6677889900`
- Tu Móvil La Isla: `44fa49ac-b6ea-421d-a198-e48e179ae371`
- Company ID: `aa11bb22-cc33-dd44-ee55-ff6677889900`

---

## ✅ **PASO 3: VERIFICAR EN ADMIN PANEL**

Después de ejecutar el script de corrección:

1. **Refresca el Admin Panel** (F5 o recargar página)
2. **Verifica que los usuarios aparezcan** en la lista
3. **Verifica que tengan:**
   - ✅ Rol: `manager`
   - ✅ Tienda asignada correcta
   - ✅ Estado: Activo

---

## 🚨 **SI AÚN NO APARECEN**

Si después de ejecutar el script de corrección los usuarios aún no aparecen:

### **Causa 1: RLS (Row Level Security)**
- Las políticas RLS pueden estar bloqueando la visualización
- Verifica que el usuario admin que está viendo el panel tenga permisos para ver usuarios de su `company_id`

### **Causa 2: Filtros en el Frontend**
- El Admin Panel puede tener filtros que ocultan usuarios
- Verifica si hay filtros por `role`, `active`, o `company_id` activos

### **Causa 3: Cache del Frontend**
- Limpia el cache del navegador
- Cierra sesión y vuelve a iniciar sesión

---

## 📋 **CHECKLIST DE VERIFICACIÓN**

Después de ejecutar los scripts, verifica:

- [ ] `active = TRUE` para ambos usuarios
- [ ] `company_id` asignado correctamente
- [ ] `assigned_store_id` asignado correctamente
- [ ] `role = 'manager'` para ambos
- [ ] `name` asignado correctamente
- [ ] Los usuarios aparecen en el Admin Panel
- [ ] Los usuarios pueden iniciar sesión

---

## 🎯 **RESULTADO ESPERADO**

Después de ejecutar los scripts:

✅ Ambos usuarios deberían:
- Aparecer en la lista de usuarios del Admin Panel
- Tener todos los datos completos
- Poder iniciar sesión sin problemas
- Estar correctamente asignados a sus tiendas

---

**FIN DE LAS INSTRUCCIONES**


