# 📋 GUÍA PASO A PASO: Crear Usuario desde Panel Admin

## ✅ MÉTODO NORMALIZADO (Panel Admin Frontend)

Esta es la forma **recomendada y más segura** de crear usuarios en el sistema.

---

## 🎯 PASO 1: Acceder al Panel de Usuarios

1. **Login como Admin**
   - Abre la aplicación en tu navegador
   - Inicia sesión con tu cuenta de **Admin** o **Master Admin**
   - Debes ver el dashboard principal

2. **Navegar a Usuarios**
   - En el menú lateral, busca la opción **"Usuarios"** o **"Users"**
   - Click en **"Usuarios"**
   - Deberías ver la lista de usuarios existentes

---

## 🎯 PASO 2: Abrir Modal de Crear Usuario

1. **Click en Botón "Crear Usuario"**
   - Busca el botón **"+"** o **"Crear Usuario"** o **"Nuevo Usuario"**
   - Generalmente está en la parte superior derecha de la página
   - Click en el botón

2. **Se Abre el Modal**
   - Deberías ver un formulario con los siguientes campos:
     - Nombre
     - Email
     - Contraseña
     - Rol
     - Tienda Asignada (si aplica)

---

## 🎯 PASO 3: Completar el Formulario

### Campo 1: Nombre
- **Qué poner:** Nombre completo del usuario
- **Ejemplo:** `Juan Pérez`
- **Requerido:** ✅ Sí

### Campo 2: Email
- **Qué poner:** Email único del usuario
- **Ejemplo:** `juan.perez@tienda.com`
- **Requerido:** ✅ Sí
- **Importante:** 
  - Debe ser un email válido
  - No debe existir en el sistema
  - El usuario usará este email para hacer login

### Campo 3: Contraseña
- **Qué poner:** Contraseña segura
- **Requerido:** ✅ Sí
- **Requisitos:**
  - Mínimo 6 caracteres
  - Recomendado: 8+ caracteres con mayúsculas, minúsculas, números y símbolos
- **Ejemplo:** `MiContraseña123!`

### Campo 4: Rol
- **Opciones disponibles:**
  - `admin` - Administrador (puede ver todo de la compañía)
  - `manager` - Gerente (solo ve su tienda asignada)
  - `cashier` - Cajero (solo ve su tienda asignada)
- **Requerido:** ✅ Sí
- **Seleccionar:** Click en el dropdown y selecciona el rol

### Campo 5: Tienda Asignada
- **Cuándo aparece:** Solo si el rol es `manager` o `cashier`
- **Si es `admin`:** Este campo NO aparece (admin no tiene tienda)
- **Si es `manager` o `cashier`:** 
  - **Requerido:** ✅ Sí
  - **Qué hacer:** Click en el dropdown y selecciona la tienda
  - **Ejemplo:** `Zona Gamer Margarita`

---

## 🎯 PASO 4: Validaciones Automáticas

El sistema validará automáticamente:

1. ✅ **Email único:** No debe existir en el sistema
2. ✅ **Contraseña:** Mínimo 6 caracteres
3. ✅ **Tienda requerida:** Si es manager/cashier, debe tener tienda
4. ✅ **Admin sin tienda:** Si es admin, no debe tener tienda

**Si hay errores:**
- Verás mensajes de error en rojo
- Corrige los errores antes de continuar

---

## 🎯 PASO 5: Crear el Usuario

1. **Revisar el Formulario**
   - Verifica que todos los campos estén correctos
   - Asegúrate de que la tienda esté seleccionada (si aplica)

2. **Click en "Crear" o "Guardar"**
   - Click en el botón de crear/guardar
   - El sistema procesará la creación

3. **Esperar Confirmación**
   - Verás un mensaje de éxito: **"✅ Perfil creado exitosamente"**
   - El mensaje indicará que el usuario debe registrarse

---

## 🎯 PASO 6: Notificar al Usuario

Después de crear el usuario, **debes notificarle**:

1. **Informarle que:**
   - Su perfil fue creado
   - Debe registrarse en la aplicación
   - Usar el **mismo email** que se usó al crear el perfil
   - Puede crear su contraseña durante el registro

2. **Instrucciones para el Usuario:**
   ```
   Tu perfil ha sido creado en el sistema.
   
   Para activar tu cuenta:
   1. Ve a la página de Registro
   2. Usa este email: [email del usuario]
   3. Crea tu contraseña
   4. El sistema vinculará automáticamente tu perfil
   5. Podrás hacer login inmediatamente
   ```

---

## 🎯 PASO 7: Verificar Creación

1. **Verificar en la Lista**
   - El usuario debería aparecer en la lista de usuarios
   - Debería mostrar el nombre, email, rol y tienda asignada

2. **Verificar Estado**
   - El usuario debería estar **activo**
   - Si el usuario aún no se ha registrado, `auth_user_id` será NULL
   - Esto es normal - se vinculará cuando el usuario se registre

---

## ⚠️ PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: "El correo electrónico ya está registrado"

**Causa:** El email ya existe en el sistema

**Solución:**
- Usar un email diferente
- O verificar si el usuario ya existe (puede estar inactivo)

---

### Problema 2: "El Gerente debe tener una tienda asignada"

**Causa:** Seleccionaste `manager` pero no seleccionaste una tienda

**Solución:**
- Selecciona una tienda del dropdown
- O cambia el rol a `admin` si no necesita tienda

---

### Problema 3: Usuario Creado pero No Puede Hacer Login

**Causa:** El usuario existe en `public.users` pero NO en `auth.users`

**Solución:**
- El usuario debe **registrarse** desde la página de registro
- Usar el **mismo email** que se usó al crear el perfil
- El sistema vinculará automáticamente

---

### Problema 4: Error al Crear Usuario

**Causa:** Puede ser un error del servidor o de permisos

**Solución:**
- Verifica que tengas permisos de admin
- Revisa la consola del navegador (F12) para ver el error específico
- Intenta nuevamente
- Si persiste, contacta al administrador del sistema

---

## 📋 CHECKLIST RÁPIDO

### Antes de Crear:
- [ ] Estás logueado como Admin
- [ ] Tienes el email del usuario
- [ ] Sabes qué rol asignar
- [ ] Sabes qué tienda asignar (si es manager/cashier)

### Al Crear:
- [ ] Nombre completo correcto
- [ ] Email único y válido
- [ ] Contraseña segura (mínimo 6 caracteres)
- [ ] Rol correcto seleccionado
- [ ] Tienda asignada (si es manager/cashier)

### Después de Crear:
- [ ] Usuario aparece en la lista
- [ ] Notificaste al usuario que debe registrarse
- [ ] Usuario puede hacer login después de registrarse

---

## 🎯 EJEMPLO COMPLETO

### Crear un Gerente:

1. **Login como Admin**
2. **Ir a Usuarios**
3. **Click en "Crear Usuario"**
4. **Completar:**
   - Nombre: `María González`
   - Email: `maria.gonzalez@tienda.com`
   - Contraseña: `MiContraseña123!`
   - Rol: `manager`
   - Tienda Asignada: `Zona Gamer Margarita`
5. **Click en "Crear"**
6. **Ver mensaje:** "✅ Perfil creado exitosamente"
7. **Notificar a María:**
   - "Tu perfil fue creado. Debes registrarte con el email: maria.gonzalez@tienda.com"
8. **María se registra** y puede hacer login

---

## ✅ LISTO

Con estos pasos, puedes crear usuarios de forma segura desde el panel admin.

**¿Necesitas ayuda?** Revisa la sección "Problemas Comunes" o consulta `GUIA_CREAR_USUARIOS_SEGURO.md` para más detalles.


