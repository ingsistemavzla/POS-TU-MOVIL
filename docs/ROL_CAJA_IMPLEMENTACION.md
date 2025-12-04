# 💰 IMPLEMENTACIÓN DEL ROL CAJA (Cashier)

## 📋 RESUMEN

El rol **Caja (Cashier)** es el nivel más básico del sistema, diseñado para usuarios que solo necesitan:
- ✅ **Procesar ventas** en el POS
- ✅ **Visualizar inventario** de su sucursal asignada (solo lectura)

---

## 🔄 FLUJO DE VIDA DEL USUARIO CAJA

### **Paso 1: Creación del Usuario Caja**
1. **Admin crea el usuario** desde el panel de administración (`/users`)
2. Se asigna:
   - **Rol**: `cashier`
   - **Sucursal**: `assigned_store_id` (obligatorio)
   - **Email**: Correo electrónico del cajero
3. El usuario se crea en `public.users` pero **NO tiene cuenta de autenticación** aún

### **Paso 2: Registro del Cajero**
1. El cajero accede al formulario público de registro (`/register`)
2. Ingresa:
   - **Nombre Completo**
   - **Correo Electrónico** (debe coincidir con el email usado en la creación)
   - **Contraseña**
   - **Confirmar Contraseña**
3. El sistema:
   - Crea la cuenta en `auth.users`
   - **Vincula** el perfil existente en `public.users` con `auth_user_id`
   - El cajero queda **habilitado** para iniciar sesión

### **Paso 3: Acceso del Cajero**
1. El cajero inicia sesión con su email y contraseña
2. El sistema carga su perfil con `assigned_store_id`
3. Solo puede acceder a:
   - **POS** (Punto de Venta) - solo de su sucursal asignada
   - **Almacén** (solo lectura) - solo de su sucursal asignada

---

## 🔒 RESTRICCIONES DEL CAJERO (Frontend Only)

### **1. Módulos Visibles**
- ✅ **POS** (`/pos`)
- ✅ **Almacén** (`/almacen`) - Solo lectura
- ❌ **Dashboard** (oculto)
- ❌ **Artículos** (oculto)
- ❌ **Ventas** (oculto)
- ❌ **Clientes** (oculto)
- ❌ **Tiendas** (oculto)
- ❌ **Usuarios** (oculto)
- ❌ **Reportes** (oculto)
- ❌ **Configuración** (oculto)
- ❌ **Estadísticas** (oculto)

### **2. Almacén - Solo Lectura**
- ✅ **Puede ver**: Productos e inventario de su sucursal asignada
- ❌ **NO puede crear** productos
- ❌ **NO puede editar** productos
- ❌ **NO puede eliminar** productos
- ❌ **NO puede editar** stock
- ❌ **NO puede transferir** stock
- ✅ **Solo lectura**: Todos los botones de edición están ocultos

### **3. POS - Solo su Sucursal**
- ✅ **Sucursal pre-seleccionada**: No puede cambiar de sucursal
- ✅ **Fuerza `store_id`**: Siempre usa `assigned_store_id`
- ✅ **Validación backend**: `process_sale` rechaza ventas en otras tiendas

---

## 🏗️ IMPLEMENTACIÓN TÉCNICA

### **1. MainLayout.tsx - Navegación**

```typescript
// Línea 47-51: POS visible para cashier
{
  name: 'POS',
  href: '/pos',
  icon: ShoppingCart,
  roles: ['admin', 'manager', 'cashier'],
}

// Línea 53-57: Almacén visible para cashier (solo lectura)
{
  name: 'Almacén',
  href: '/almacen',
  icon: Warehouse,
  roles: ['admin', 'manager', 'cashier'],  // Cashier: solo lectura
}
```

### **2. AlmacenPage.tsx - Filtrado y Restricciones**

**Filtrado por Sucursal**:
```typescript
// Línea 126-128: Detección de cashier
const isManager = userProfile.role === 'manager';
const isCashier = userProfile.role === 'cashier';
const isRestricted = (isManager || isCashier) && userProfile.assigned_store_id;

// Línea 136-139: Filtro de tiendas
if (isRestricted && userProfile.assigned_store_id) {
  storesQuery = storesQuery.eq('id', userProfile.assigned_store_id);
}

// Línea 167-169: Filtro de inventario
if (isRestricted) {
  inventoryQuery = inventoryQuery.eq('store_id', userProfile.assigned_store_id);
}
```

**Botones Ocultos**:
```typescript
// Línea 501: "Nuevo Producto" - Solo admin
{userProfile?.role === 'admin' && (
  <Button onClick={...}>Nuevo Producto</Button>
)}

// Línea 613: "Editar/Eliminar Producto" - Solo admin
{userProfile?.role === 'admin' && (
  <>
    <Button>Editar</Button>
    <Button>Eliminar</Button>
  </>
)}

// Línea 706-707: Detección de solo lectura
const isManager = userProfile?.role === 'manager';
const isCashier = userProfile?.role === 'cashier';
const isReadOnly = isManager || isCashier;

// Línea 815: "Editar Stock" - Solo admin
{userProfile?.role === 'admin' && !isReadOnly && (
  <Button>Editar</Button>
)}

// Línea 826: "Transferir Stock" - Solo admin
{userProfile?.role === 'admin' && !isReadOnly && (
  <Button>Transferir</Button>
)}

// Línea 837: Mensaje "Solo lectura" para managers y cajeros
{isReadOnly && (
  <span>Solo lectura</span>
)}
```

### **3. POS.tsx - Fuerza Sucursal Asignada**

```typescript
// Línea 244-247: Fuerza store_id al assigned_store_id
const isRestrictedToStore = userProfile?.role === 'cashier' || userProfile?.role === 'manager';
const resolvedStoreId = isRestrictedToStore
  ? (userProfile as any)?.assigned_store_id ?? selectedStore?.id ?? null
  : selectedStore?.id ?? (userProfile as any)?.assigned_store_id ?? null;
```

### **4. App.tsx - Rutas Protegidas**

```typescript
// Ruta de Almacén: Requiere nivel cashier (permite cashier, manager, admin)
<Route 
  path="almacen" 
  element={
    <ProtectedRoute requiredRole="cashier">
      <AlmacenPage />
    </ProtectedRoute>
  } 
/>

// Ruta de POS: Ya está configurada para cashier
<Route 
  path="pos" 
  element={
    <POSAccessGuard>
      <POS />
    </POSAccessGuard>
  } 
/>
```

---

## 📊 COMPARACIÓN DE ROLES

| Característica | Admin | Manager | Cashier |
|----------------|-------|---------|---------|
| **Módulos Visibles** | Todos | Dashboard, POS, Almacén, Artículos, Ventas, Clientes, Reportes | POS, Almacén |
| **Almacén - Crear Productos** | ✅ | ❌ | ❌ |
| **Almacén - Editar Productos** | ✅ | ❌ | ❌ |
| **Almacén - Eliminar Productos** | ✅ | ❌ | ❌ |
| **Almacén - Editar Stock** | ✅ | ❌ | ❌ |
| **Almacén - Transferir Stock** | ✅ | ❌ | ❌ |
| **Almacén - Ver Stock** | Todas las sucursales | Solo su sucursal | Solo su sucursal |
| **POS - Seleccionar Sucursal** | ✅ | ❌ | ❌ |
| **POS - Procesar Ventas** | ✅ | ✅ | ✅ |
| **Gestionar Usuarios** | ✅ | ❌ | ❌ |
| **Gestionar Tiendas** | ✅ | ❌ | ❌ |
| **Configuración** | ✅ | ❌ | ❌ |

---

## ✅ VALIDACIONES BACKEND

### **1. `process_sale` - Validación de Store**
```sql
-- Si no es admin, validar que la tienda sea la asignada
IF v_role IS DISTINCT FROM 'admin' THEN
  IF v_assigned_store IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ASSIGNED_STORE');
  END IF;
  IF p_store_id IS DISTINCT FROM v_assigned_store THEN
    RETURN jsonb_build_object('success', false, 'error', 'STORE_NOT_ALLOWED');
  END IF;
END IF;
```

**Estado**: ✅ **IMPLEMENTADO** - Cashier no puede vender en otras tiendas

---

## 🎯 CONCLUSIÓN

El rol **Caja (Cashier)** está completamente implementado con:
- ✅ **Solo 2 módulos visibles**: POS y Almacén
- ✅ **Almacén en solo lectura**: Sin botones de edición
- ✅ **Filtrado por sucursal**: Solo ve datos de su `assigned_store_id`
- ✅ **POS blindado**: Fuerza `store_id` al `assigned_store_id`
- ✅ **Validación backend**: `process_sale` rechaza ventas en otras tiendas

**El sistema está listo para usuarios caja.**





