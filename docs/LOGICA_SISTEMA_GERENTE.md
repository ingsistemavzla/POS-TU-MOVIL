# 📋 LÓGICA DEL SISTEMA: PERFIL GERENTE

## 🎯 RESUMEN EJECUTIVO

El sistema de **Gerente** funciona como una **réplica del panel administrativo** con restricciones aplicadas **exclusivamente en el frontend**. Todas las restricciones se manejan ocultando elementos de UI y filtrando datos por `assigned_store_id`, sin modificar las políticas RLS del backend que podrían interferir con el dashboard administrativo.

---

## 🔄 FLUJO DE VIDA DEL USUARIO GERENTE

### **Paso 1: Creación del Usuario Gerente**
1. **Admin crea el usuario** desde el panel de administración (`/users`)
2. Se asigna:
   - **Rol**: `manager`
   - **Sucursal**: `assigned_store_id` (obligatorio)
   - **Email**: Correo electrónico del gerente
3. El usuario se crea en `public.users` pero **NO tiene cuenta de autenticación** aún

### **Paso 2: Registro del Gerente**
1. El gerente accede al formulario público de registro (`/register`)
2. Ingresa:
   - **Nombre Completo**
   - **Correo Electrónico** (debe coincidir con el email usado en la creación)
   - **Contraseña**
   - **Confirmar Contraseña**
3. El sistema:
   - Crea la cuenta en `auth.users`
   - **Vincula** el perfil existente en `public.users` con `auth_user_id`
   - El gerente queda **habilitado** para iniciar sesión

### **Paso 3: Acceso del Gerente**
1. El gerente inicia sesión con su email y contraseña
2. El sistema carga su perfil con `assigned_store_id`
3. Todas las vistas se filtran automáticamente por su sucursal asignada

---

## 🔒 RESTRICCIONES DEL GERENTE (Frontend Only)

### **1. Panel de Usuarios**
- ❌ **NO puede ver** el panel de usuarios (`/users`)
- ✅ **Razón**: Los gerentes no gestionan usuarios

### **2. Selección de Sucursal**
- ❌ **NO puede seleccionar** otra sucursal en el POS
- ✅ **Automático**: El sistema asigna su `assigned_store_id` automáticamente
- ✅ **Razón**: Solo puede operar en su sucursal asignada

### **3. Visualización de Stock**
- ❌ **NO puede ver** stock de otras sucursales
- ✅ **Solo ve**: Stock de su `assigned_store_id`
- ✅ **Implementación**: Filtro en queries: `.eq('store_id', userProfile.assigned_store_id)`

### **4. Modificación de Stock**
- ❌ **NO puede modificar** stock (ni de su sucursal ni de otras)
- ❌ **NO puede editar** cantidades manualmente
- ❌ **NO puede transferir** inventario entre sucursales
- ✅ **Solo puede**: Visualizar stock y procesar ventas (el backend descuenta automáticamente)

### **5. Gestión de Productos**
- ❌ **NO puede crear** productos
- ❌ **NO puede editar** productos
- ❌ **NO puede eliminar** productos
- ✅ **Solo puede**: Ver productos y venderlos

---

## 🏗️ ARQUITECTURA: FRONTEND vs BACKEND

### **Frontend (Restricciones de UI)**
```typescript
// Ejemplo: Ocultar botones para managers
{userProfile?.role !== 'manager' && (
  <Button onClick={handleEditStock}>Editar Stock</Button>
)}

// Ejemplo: Filtrar datos por sucursal
const fetchInventory = async () => {
  let query = supabase
    .from('inventories')
    .select('*')
    .eq('company_id', userProfile.company_id);
  
  // Manager: Solo su sucursal
  if (userProfile?.role === 'manager' && userProfile?.assigned_store_id) {
    query = query.eq('store_id', userProfile.assigned_store_id);
  }
  
  return query;
};
```

### **Backend (Funciones Críticas - Sin Restricciones RLS)**
Las funciones críticas del backend **NO tienen restricciones RLS** que interfieran con el dashboard admin:

#### ✅ **Funciones que se MANTIENEN:**
1. **`process_sale`**: Procesa ventas y descuenta stock
   - ✅ Valida `assigned_store_id` para managers (en la función, no en RLS)
   - ✅ Descuenta stock automáticamente
   - ✅ Crea registros de venta

2. **`transfer_inventory`**: Transfiere inventario entre sucursales
   - ✅ **Solo admins** pueden usar esta función
   - ✅ Managers reciben error si intentan transferir

3. **`update_store_inventory`**: Actualiza stock manualmente
   - ✅ **Solo admins** pueden usar esta función
   - ✅ Managers reciben error si intentan actualizar

#### ❌ **Funciones que se ELIMINARON:**
1. **`is_manager()`**: No se usa (restricciones en frontend)
2. **`is_admin_or_manager()`**: No se usa (restricciones en frontend)

#### ✅ **Funciones que se MANTIENEN:**
1. **`get_user_company_id()`**: Usada en todas las funciones críticas
2. **`is_admin()`**: Usada en `transfer_inventory` y `update_store_inventory`
3. **`get_assigned_store_id()`**: Usada en `process_sale` para validar store

---

## 📊 POLÍTICAS RLS (Sin Restricciones por Store)

Las políticas RLS **NO restringen por `assigned_store_id`** para evitar interferencias con el dashboard admin. Solo filtran por `company_id`:

```sql
-- ✅ CORRECTO: Política que permite ver todo de la empresa
CREATE POLICY "Users can view inventories from their company" ON public.inventories
  FOR SELECT USING (company_id = public.get_user_company_id());

-- ❌ INCORRECTO: Política que restringe por store (causa problemas en dashboard)
CREATE POLICY "inventories_select_policy" ON public.inventories
  FOR SELECT USING (
    company_id = public.get_user_company_id() AND
    (public.is_admin() OR (public.is_manager() AND store_id = public.get_assigned_store_id()))
  );
```

---

## 🎨 VISTAS DEL GERENTE (Réplicas con Filtros)

### **Dashboard**
- ✅ Muestra estadísticas **solo de su sucursal**
- ✅ Filtra ventas, stock, productos por `assigned_store_id`

### **POS (Punto de Venta)**
- ✅ Sucursal **pre-seleccionada** (no puede cambiar)
- ✅ Cliente: Búsqueda automática
- ✅ Productos: Solo muestra stock de su sucursal
- ✅ Ventas: Solo puede vender en su sucursal

### **Almacén**
- ✅ **Solo visualización** (sin botones de edición/transferencia)
- ✅ Muestra stock **solo de su sucursal**
- ❌ Sin "Nuevo Producto"
- ❌ Sin "Editar Stock"
- ❌ Sin "Transferir Stock"

### **Artículos**
- ✅ **Solo visualización** (sin botones de edición)
- ✅ Muestra productos con stock **solo de su sucursal**
- ❌ Sin "Nuevo Producto"
- ❌ Sin "Editar/Eliminar Producto"
- ❌ Sin "Editar Stock"
- ❌ Sin "Transferir Stock"

### **Estadísticas**
- ✅ Muestra estadísticas **solo de su sucursal**
- ✅ Filtra todas las métricas por `assigned_store_id`

### **Ventas**
- ✅ Muestra ventas **solo de su sucursal**
- ✅ Filtra por `store_id = assigned_store_id`

---

## 🔐 VALIDACIONES CRÍTICAS EN BACKEND

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

### **2. `transfer_inventory` - Solo Admins**
```sql
-- SOLO ADMINS pueden transferir
IF v_user_role != 'admin' THEN
  RETURN json_build_object(
    'error', true,
    'message', 'Solo los administradores pueden transferir inventario entre sucursales.',
    'code', 'INSUFFICIENT_PERMISSIONS'
  );
END IF;
```

### **3. `update_store_inventory` - Solo Admins**
```sql
-- SOLO ADMINS pueden actualizar stock manualmente
IF NOT public.is_admin() THEN
  RETURN json_build_object(
    'error', true,
    'message', 'Solo los administradores pueden actualizar el stock manualmente.',
    'code', 'INSUFFICIENT_PERMISSIONS'
  );
END IF;
```

---

## ✅ INTEGRIDAD DEL SISTEMA

### **Funciones Críticas (Blindadas en Backend)**
1. ✅ **`process_sale`**: Descuenta stock automáticamente (no depende del frontend)
2. ✅ **`transfer_inventory`**: Solo admins, valida stock antes de transferir
3. ✅ **`update_store_inventory`**: Solo admins, actualiza stock con validaciones
4. ✅ **`delete_product_with_inventory`**: Solo admins, maneja dependencias

### **Validaciones de Stock**
- ✅ El backend **valida stock disponible** antes de procesar ventas
- ✅ El backend **previene stock negativo** con constraints
- ✅ El frontend **muestra stock disponible** pero no lo modifica directamente

### **Sin Operaciones Transaccionales en Frontend**
- ❌ El frontend **NO hace** `UPDATE inventories SET qty = ...`
- ❌ El frontend **NO hace** sumas/restas de stock
- ✅ El frontend **solo llama** a funciones RPC que manejan todo en el backend

---

## 📝 ARCHIVOS ELIMINADOS (Limpieza)

### **Migraciones SQL Eliminadas:**
- ❌ `20250104000000_manager_rls_policies.sql` - Políticas RLS problemáticas

### **Funciones SQL Eliminadas:**
- ❌ `is_manager()` - No se usa (restricciones en frontend)
- ❌ `is_admin_or_manager()` - No se usa (restricciones en frontend)

### **Scripts Temporales Eliminados:**
- ❌ `update_functions_restrict_managers.sql` - Script temporal

---

## 🎯 CONCLUSIÓN

El sistema de **Gerente** es una **réplica funcional del panel administrativo** con:
- ✅ **Restricciones en frontend**: UI oculta elementos no permitidos
- ✅ **Filtros por sucursal**: Todas las queries filtran por `assigned_store_id`
- ✅ **Validaciones en backend**: `process_sale` valida store asignada
- ✅ **Funciones críticas intactas**: `process_sale`, `transfer_inventory`, `update_store_inventory` funcionan correctamente
- ✅ **Sin interferencias**: Las políticas RLS no restringen por store, evitando problemas en el dashboard admin

**El gerente solo puede:**
- ✅ Ver datos de su sucursal asignada
- ✅ Procesar ventas en su sucursal asignada
- ✅ Visualizar stock de su sucursal asignada

**El gerente NO puede:**
- ❌ Ver/modificar stock de otras sucursales
- ❌ Transferir inventario
- ❌ Editar stock manualmente
- ❌ Crear/editar/eliminar productos
- ❌ Gestionar usuarios





