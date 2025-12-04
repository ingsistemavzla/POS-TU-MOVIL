# ⚡ PRUEBA RÁPIDA: ROL CAJA

## 🚀 PASOS RÁPIDOS (5 minutos)

### **1. Crear Usuario Caja (Como Admin)**
1. Inicia sesión como **Admin**
2. Ve a **Usuarios** → **Crear Usuario**
3. Completa:
   - **Nombre**: `Cajero Test`
   - **Email**: `cajero@test.com`
   - **Rol**: Selecciona **"Cajero"**
   - **Sucursal**: Selecciona una sucursal (ej: "Tu Móvil Margarita")
   - **Contraseña**: `test123`
   - **Confirmar**: `test123`
4. Haz clic en **"Crear"**

### **2. Registrar el Usuario**
1. **Cierra sesión** del admin
2. Ve a **Registrarse** (o `/register`)
3. Completa con los mismos datos:
   - **Nombre**: `Cajero Test`
   - **Email**: `cajero@test.com`
   - **Contraseña**: `test123`
   - **Confirmar**: `test123`
4. Haz clic en **"Registrar"**

### **3. Iniciar Sesión como Cajero**
1. Inicia sesión con:
   - **Email**: `cajero@test.com`
   - **Contraseña**: `test123`

### **4. Verificar Restricciones**

#### ✅ **DEBE VER:**
- Solo **2 módulos** en el menú: **POS** y **Almacén**

#### ❌ **NO DEBE VER:**
- Dashboard, Artículos, Ventas, Clientes, Tiendas, Usuarios, Reportes, Configuración, Estadísticas

#### ✅ **EN ALMACÉN:**
- Solo ve productos de su sucursal asignada
- **NO** ve botón "Nuevo Producto"
- **NO** ve botones "Editar" o "Eliminar"
- **NO** ve botones "Editar Stock" o "Transferir Stock"
- Ve mensaje "Solo lectura"

#### ✅ **EN POS:**
- Sucursal pre-seleccionada (no puede cambiarla)
- Puede procesar ventas normalmente

---

## 🎯 RESULTADO ESPERADO

Si todo funciona correctamente:
- ✅ Solo 2 módulos visibles
- ✅ Almacén en solo lectura
- ✅ POS funciona normalmente
- ✅ Restringido a su sucursal asignada

---

## 🐛 SI ALGO NO FUNCIONA

1. **Verifica que el usuario tenga `assigned_store_id`** en la base de datos
2. **Verifica que el email coincida** exactamente entre creación y registro
3. **Revisa la consola del navegador** (F12) para ver errores
4. **Verifica que el rol sea `cashier`** en la tabla `users`





