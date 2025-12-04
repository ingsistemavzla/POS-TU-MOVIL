# 🧪 GUÍA DE PRUEBA: ROL CAJA (Cashier)

## 📋 PASOS PARA PROBAR EL ROL CAJA

---

## **PASO 1: Crear Usuario Caja desde Panel Admin**

### 1.1. Iniciar sesión como Admin
- Abre la aplicación
- Inicia sesión con un usuario que tenga rol `admin`

### 1.2. Ir al Panel de Usuarios
- En el menú lateral, haz clic en **"Usuarios"**
- Deberías ver la lista de usuarios existentes

### 1.3. Crear Nuevo Usuario Caja
- Haz clic en el botón **"Crear Usuario"** o **"Nuevo Usuario"**
- Completa el formulario:
  - **Nombre Completo**: `Juan Pérez` (o el nombre que prefieras)
  - **Correo Electrónico**: `cajero@test.com` (usa un email que no esté registrado)
  - **Rol**: Selecciona **"Caja"** o **"cashier"** del dropdown
  - **Sucursal Asignada**: Selecciona una sucursal (ej: "Tu Móvil Margarita")
  - **Contraseña**: `password123` (o la que prefieras)
  - **Confirmar Contraseña**: Misma contraseña
- Haz clic en **"Crear"** o **"Guardar"**

### 1.4. Verificar Creación
- El usuario debería aparecer en la lista con rol **"Caja"**
- Verifica que tenga una **Sucursal Asignada**

---

## **PASO 2: Registrar el Usuario Caja**

### 2.1. Cerrar Sesión del Admin
- Haz clic en el menú de usuario (esquina superior derecha)
- Selecciona **"Cerrar Sesión"**

### 2.2. Ir al Formulario de Registro
- En la pantalla de login, busca el enlace **"Registrarse"** o **"Crear cuenta"**
- O navega directamente a `/register`

### 2.3. Completar Registro
- **Nombre Completo**: `Juan Pérez` (debe coincidir con el nombre usado en la creación)
- **Correo Electrónico**: `cajero@test.com` (debe coincidir con el email usado en la creación)
- **Contraseña**: `password123` (la misma que usaste al crear el usuario)
- **Confirmar Contraseña**: `password123`
- Haz clic en **"Registrar"** o **"Crear Cuenta"**

### 2.4. Verificar Registro
- Deberías ver un mensaje de éxito
- El sistema debería redirigirte automáticamente al login o al dashboard

---

## **PASO 3: Iniciar Sesión como Cajero**

### 3.1. Iniciar Sesión
- **Email**: `cajero@test.com`
- **Contraseña**: `password123`
- Haz clic en **"Iniciar Sesión"**

### 3.2. Verificar Redirección
- El sistema debería redirigirte automáticamente a `/pos` (Punto de Venta)
- O si no, deberías ver el dashboard (pero con restricciones)

---

## **PASO 4: Verificar Restricciones del Rol Caja**

### 4.1. Verificar Navegación (Menú Lateral)

**Módulos que DEBEN estar visibles:**
- ✅ **POS** (Punto de Venta)
- ✅ **Almacén**

**Módulos que NO deben estar visibles:**
- ❌ Dashboard
- ❌ Artículos
- ❌ Ventas
- ❌ Clientes
- ❌ Tiendas
- ❌ Usuarios
- ❌ Reportes
- ❌ Configuración
- ❌ Estadísticas

### 4.2. Probar Módulo POS

1. **Haz clic en "POS"** en el menú lateral
2. **Verificar Sucursal**:
   - La sucursal debería estar **pre-seleccionada** (no deberías poder cambiarla)
   - Debería mostrar el nombre de la sucursal asignada
3. **Probar una Venta**:
   - Busca un producto
   - Agrega al carrito
   - Selecciona un cliente (o crea uno nuevo)
   - Completa el pago
   - Procesa la venta
   - ✅ **Debería funcionar correctamente**

### 4.3. Probar Módulo Almacén (Solo Lectura)

1. **Haz clic en "Almacén"** en el menú lateral
2. **Verificar Filtrado**:
   - Solo deberías ver productos e inventario de **tu sucursal asignada**
   - No deberías ver datos de otras sucursales
3. **Verificar Botones Ocultos**:
   - ❌ **NO debe aparecer** el botón "Nuevo Producto"
   - ❌ **NO debe aparecer** el botón "Editar" en los productos
   - ❌ **NO debe aparecer** el botón "Eliminar" en los productos
   - ❌ **NO debe aparecer** el botón "Editar Stock" (ícono de lápiz)
   - ❌ **NO debe aparecer** el botón "Transferir Stock" (ícono de flechas)
   - ✅ **DEBE aparecer** el mensaje "Solo lectura" en lugar de los botones de edición
4. **Verificar Visualización**:
   - ✅ Deberías poder **ver** todos los productos
   - ✅ Deberías poder **ver** el stock por tienda (solo tu tienda asignada)
   - ✅ Deberías poder **expandir** productos para ver detalles

### 4.4. Intentar Acceder a Módulos Restringidos (Opcional)

1. **Intenta navegar directamente** a rutas restringidas:
   - `/dashboard` → Debería mostrar "Acceso Denegado" o redirigir
   - `/articulos` → Debería mostrar "Acceso Denegado" o redirigir
   - `/sales` → Debería mostrar "Acceso Denegado" o redirigir
   - `/users` → Debería mostrar "Acceso Denegado" o redirigir
   - `/stores` → Debería mostrar "Acceso Denegado" o redirigir
   - `/settings` → Debería mostrar "Acceso Denegado" o redirigir

---

## **PASO 5: Verificar Validación Backend (Opcional - Avanzado)**

### 5.1. Intentar Vender en Otra Sucursal (Desde Código)

Si tienes acceso a la consola del navegador:

1. Abre las **Herramientas de Desarrollador** (F12)
2. Ve a la pestaña **Console**
3. Intenta modificar el `store_id` en el proceso de venta
4. El backend debería **rechazar** la venta con error `STORE_NOT_ALLOWED`

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Navegación
- [ ] Solo ve 2 módulos en el menú: POS y Almacén
- [ ] No ve Dashboard, Artículos, Ventas, Clientes, Tiendas, Usuarios, Reportes, Configuración, Estadísticas

### POS
- [ ] Puede acceder al POS
- [ ] La sucursal está pre-seleccionada (no puede cambiarla)
- [ ] Puede procesar ventas correctamente
- [ ] Las ventas se registran en su sucursal asignada

### Almacén
- [ ] Puede acceder al Almacén
- [ ] Solo ve productos e inventario de su sucursal asignada
- [ ] NO ve el botón "Nuevo Producto"
- [ ] NO ve botones "Editar" o "Eliminar" en productos
- [ ] NO ve botones "Editar Stock" o "Transferir Stock"
- [ ] Ve el mensaje "Solo lectura" en lugar de botones de edición
- [ ] Puede ver y expandir productos para ver detalles

### Seguridad
- [ ] No puede acceder a rutas restringidas directamente
- [ ] El backend valida que las ventas sean en su sucursal asignada

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema: El usuario caja ve más módulos de los permitidos
**Solución**: Verifica que `MainLayout.tsx` tenga `cashier` solo en los roles de POS y Almacén.

### Problema: El usuario caja puede editar stock en Almacén
**Solución**: Verifica que `AlmacenPage.tsx` oculte los botones de edición para `cashier`.

### Problema: El usuario caja puede seleccionar otra sucursal en POS
**Solución**: Verifica que `POS.tsx` fuerce `store_id` al `assigned_store_id` para cashier.

### Problema: El usuario caja no puede iniciar sesión
**Solución**: 
1. Verifica que el usuario tenga `assigned_store_id` asignado
2. Verifica que el email coincida exactamente entre creación y registro
3. Verifica que el usuario se haya registrado correctamente

---

## 📝 NOTAS ADICIONALES

- **Flujo de Creación**: El admin crea el usuario primero, luego el usuario se registra
- **Email debe coincidir**: El email usado en la creación debe ser el mismo que en el registro
- **Sucursal obligatoria**: El usuario caja DEBE tener una sucursal asignada
- **Solo lectura**: El módulo Almacén es completamente de solo lectura para cajeros

---

## 🎯 RESULTADO ESPERADO

Al completar todas las pruebas, el usuario caja debería:
- ✅ Ver solo 2 módulos (POS y Almacén)
- ✅ Poder procesar ventas en su sucursal asignada
- ✅ Poder visualizar inventario de su sucursal (solo lectura)
- ✅ NO poder editar, crear, eliminar o transferir nada
- ✅ Estar completamente restringido a su sucursal asignada





