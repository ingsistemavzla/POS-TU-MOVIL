# 📋 RESUMEN: Crear Usuario desde Panel Admin (Método Normalizado)

## ✅ PASOS RÁPIDOS

### 1️⃣ Login como Admin
- Entra al sistema como **Admin** o **Master Admin**

### 2️⃣ Ir a Usuarios
- Menú → **"Usuarios"** o **"Users"**
- Click en **"+"** o **"Crear Usuario"**

### 3️⃣ Completar Formulario
- **Nombre:** Nombre completo
- **Email:** Email único (ej: `usuario@tienda.com`)
- **Contraseña:** Mínimo 6 caracteres
- **Rol:** 
  - `admin` → No necesita tienda
  - `manager` → **DEBE** tener tienda asignada ⚠️
  - `cashier` → Puede tener tienda (opcional)
- **Tienda Asignada:** Seleccionar (solo si es manager/cashier)

### 4️⃣ Crear
- Click en **"Crear Usuario"**
- Ver mensaje: **"✅ Perfil creado exitosamente"**

### 5️⃣ Notificar al Usuario
- Informarle que debe **registrarse** desde la página de registro
- Usar el **mismo email** que se usó al crear el perfil
- El sistema vinculará automáticamente

---

## ⚠️ VALIDACIONES AUTOMÁTICAS

El sistema valida automáticamente:
- ✅ Email único
- ✅ Contraseña mínimo 6 caracteres
- ✅ Manager DEBE tener tienda asignada
- ✅ Admin NO debe tener tienda

---

## 🔍 DESPUÉS DE CREAR

1. **Usuario aparece en la lista**
2. **Usuario debe registrarse** (si no se creó en auth.users)
3. **Usuario puede hacer login** después de registrarse

---

## 📚 GUÍA COMPLETA

Para más detalles, ver: `GUIA_PASO_A_PASO_PANEL_ADMIN.md`


