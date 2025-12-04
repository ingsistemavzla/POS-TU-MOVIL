# 🔧 INSTRUCCIONES: Corregir Usuarios Sin Company ID

## ⚠️ PROBLEMA IDENTIFICADO

Varios usuarios tienen `company_id = NULL`, por eso:
- ❌ No aparecen en el panel de usuarios
- ❌ No pueden hacer login correctamente
- ❌ Las políticas RLS los bloquean

**Usuarios afectados:**
- `tumovillaisla@gmail.com` (cashier) - `company_id = NULL`, `assigned_store_id = NULL`
- `tumovilcentro4@gmail.com` (cashier) - `company_id = NULL`
- `tumovilstore2025@gmail.com` (cashier) - `company_id = NULL`
- `tumovilcentro4@gmail.com` (manager) - `auth_user_id = NULL` (no vinculado)

---

## ✅ SOLUCIÓN

### PASO 1: Corregir TODOS los usuarios sin company_id

**Ejecutar:** `corregir_usuarios_sin_company_id.sql`

Este script:
- ✅ Asigna `company_id` a todos los usuarios que lo tienen NULL
- ✅ Asigna `assigned_store_id` a cashiers que no tienen tienda
- ✅ Muestra verificación final

**Resultado esperado:**
- Todos los usuarios tendrán `company_id`
- Los cashiers tendrán `assigned_store_id`
- Los usuarios aparecerán en el panel

---

### PASO 2: Corregir usuario específico (Opcional)

**Ejecutar:** `corregir_usuario_tumovillaisla_completo.sql`

Este script corrige específicamente el usuario `tumovillaisla@gmail.com`:
- ✅ Asigna `company_id`
- ✅ Vincula `auth_user_id`
- ✅ Asigna `assigned_store_id` (si es cashier)

---

### PASO 3: Verificar en el Panel

1. **Recargar la página de Usuarios**
2. **Los usuarios deberían aparecer** en las listas
3. **Verificar que tienen:**
   - ✅ Company ID asignado
   - ✅ Tienda asignada (si es manager/cashier)
   - ✅ auth_user_id vinculado (si se registraron)

---

## 📋 DESPUÉS DE CORREGIR

### Verificar que los usuarios aparecen:

1. **Ir al panel de Usuarios**
2. **Verificar que aparecen:**
   - Tu Móvil Centro (manager)
   - Caja Centro (cashier)
   - Zona Gamer (manager)
   - Tu Movil Centro (cashier)
   - Tu Movil La Isla (cashier) ← Este es el que no podía registrarse
   - Tu Movil Store (cashier)

### Verificar que pueden hacer login:

1. **Usuario `tumovillaisla@gmail.com` debe poder:**
   - Hacer login (si ya se registró)
   - O registrarse (si aún no se ha registrado)

---

## ⚠️ NOTAS IMPORTANTES

1. **Company ID:** Todos los usuarios deben tener `company_id` para aparecer en el panel
2. **Tienda Asignada:** Los cashiers deben tener `assigned_store_id` para poder operar
3. **Vinculación:** Los usuarios deben tener `auth_user_id` vinculado para hacer login

---

## 🚀 ACCIÓN INMEDIATA

1. **Ejecutar `corregir_usuarios_sin_company_id.sql`** → Corregir todos los usuarios
2. **Recargar el panel de Usuarios** → Verificar que aparecen
3. **Probar login con `tumovillaisla@gmail.com`** → Verificar que funciona


