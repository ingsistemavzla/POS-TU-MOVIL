# 👥 Usuarios del Sistema - Documentación Completa

**Fecha de Creación:** 2025-01-XX  
**Estado:** Activos y Pendientes de Verificación

---

## 📋 **USUARIOS ACTIVOS Y VERIFICADOS**

### 1. **Master Admin**
- **Nombre:** Master User
- **Email:** `masteradm@gmail.com`
- **Contraseña:** `Sistema1000$`
- **Rol:** `master_admin`
- **Tienda Asignada:** N/A (Master Admin no tiene tienda)
- **Estado:** ✅ Activo

---

### 2. **Admin Comercial**
- **Nombre:** Admin Comercial
- **Email:** `tumovilmgta@gmail.com`
- **Contraseña:** `Tele2025$`
- **Rol:** `admin`
- **Tienda Asignada:** N/A (Admin ve todas las tiendas)
- **Estado:** ✅ Activo

---

### 3. **Gerente Zona Gamer**
- **Nombre:** Gerente Zona Gamer
- **Email:** `zonagamermargarita@gmail.com`
- **Contraseña:** `2677Tele$`
- **Rol:** `manager`
- **Tienda Asignada:** Zona Gamer Margarita
- **Estado:** ✅ Activo

---

### 4. **Gerente Tu Móvil Centro**
- **Nombre:** Gerente Tu Móvil Centro
- **Email:** `tumovilcentro4@gmail.com`
- **Contraseña:** `2677Tele$`
- **Rol:** `manager`
- **Tienda Asignada:** Tu Móvil Centro
- **Estado:** ✅ Activo

---

### 5. **Cajero Zona Gamer**
- **Nombre:** Cajero Zona Gamer
- **Email:** `cajazonagamer@gmail.com`
- **Contraseña:** `Tele2025$`
- **Rol:** `cashier`
- **Tienda Asignada:** Zona Gamer Margarita
- **Estado:** ✅ Activo

---

### 6. **Cajero Centro**
- **Nombre:** Cajero Centro
- **Email:** `cajacentro@gmail.com`
- **Contraseña:** `Tele2025$`
- **Rol:** `cashier`
- **Tienda Asignada:** Tu Móvil Centro
- **Estado:** ✅ Activo

---

## ⚠️ **USUARIOS PENDIENTES DE VERIFICACIÓN**

### 7. **Gerente Tu Móvil Store**
- **Nombre:** Tu Móvil Store
- **Email:** `tumovilstore2025@gmail.com`
- **Contraseña:** `2677Tele$`
- **Rol:** `manager` (esperado)
- **Tienda Asignada:** Tu Móvil Store (esperado)
- **Estado:** ⚠️ **PENDIENTE** - Error: "Usuario ya existe" al intentar crear desde Admin Panel

---

### 8. **Gerente Tu Móvil La Isla**
- **Nombre:** Tu Móvil La Isla
- **Email:** `tumovillaisla@gmail.com`
- **Contraseña:** `2677Tele$`
- **Rol:** `manager` (esperado)
- **Tienda Asignada:** Tu Móvil La Isla (esperado)
- **Estado:** ⚠️ **PENDIENTE** - Error: "Usuario ya existe" al intentar crear desde Admin Panel

---

## 🔍 **DIAGNÓSTICO REQUERIDO**

Los usuarios `tumovilstore2025@gmail.com` y `tumovillaisla@gmail.com` presentan el error:
> **"El usuario ya existe"** al intentar crearlos desde el Admin Panel.

**Posibles Causas:**
1. ✅ Usuario existe en `auth.users` pero NO en `public.users`
2. ✅ Usuario existe en `public.users` pero NO tiene `auth_user_id` vinculado
3. ✅ Usuario existe en ambos pero con datos inconsistentes

**Acción Requerida:**
- Diagnosticar el estado actual de estos usuarios
- Corregir la inconsistencia
- Permitir el registro/login completo

---

## 📊 **RESUMEN POR ROL**

| Rol | Cantidad | Usuarios |
|-----|----------|----------|
| `master_admin` | 1 | masteradm@gmail.com |
| `admin` | 1 | tumovilmgta@gmail.com |
| `manager` | 4 | zonagamermargarita@gmail.com, tumovilcentro4@gmail.com, tumovilstore2025@gmail.com (⚠️), tumovillaisla@gmail.com (⚠️) |
| `cashier` | 2 | cajazonagamer@gmail.com, cajacentro@gmail.com |
| **TOTAL** | **8** | **6 activos + 2 pendientes** |

---

## 🏪 **ASIGNACIÓN POR TIENDA**

| Tienda | Gerente | Cajero |
|--------|---------|--------|
| **Zona Gamer Margarita** | zonagamermargarita@gmail.com | cajazonagamer@gmail.com |
| **Tu Móvil Centro** | tumovilcentro4@gmail.com | cajacentro@gmail.com |
| **Tu Móvil Store** | tumovilstore2025@gmail.com (⚠️) | - |
| **Tu Móvil La Isla** | tumovillaisla@gmail.com (⚠️) | - |

---

## 🔐 **CREDENCIALES POR USUARIO**

| Email | Contraseña | Rol |
|-------|------------|-----|
| masteradm@gmail.com | Sistema1000$ | master_admin |
| tumovilmgta@gmail.com | Tele2025$ | admin |
| zonagamermargarita@gmail.com | 2677Tele$ | manager |
| tumovilcentro4@gmail.com | 2677Tele$ | manager |
| cajazonagamer@gmail.com | Tele2025$ | cashier |
| cajacentro@gmail.com | Tele2025$ | cashier |
| tumovilstore2025@gmail.com | 2677Tele$ | manager (⚠️) |
| tumovillaisla@gmail.com | 2677Tele$ | manager (⚠️) |

---

**FIN DEL DOCUMENTO**


