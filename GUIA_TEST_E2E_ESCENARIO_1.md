# 🧪 GUÍA: Test End-to-End - ESCENARIO 1

**Objetivo:** Validar creación de usuarios y productos con blindaje completo

---

## 📍 PASO 1.1: CREAR USUARIO "GERENTE NORTE"

### Navegación:
1. **Abre tu navegador** en `http://localhost:8080`
2. **Inicia sesión como Admin** (tu usuario administrador)
3. **Ve a:** Menú lateral → **"Usuarios"** (icono de personas)

### Acción:
1. **Haz clic en el botón:** `+ Crear Usuario` (arriba a la derecha)
2. **Se abrirá un modal** con el formulario de creación

### Datos a Ingresar:

| Campo | Valor | Nota |
|-------|-------|------|
| **Nombre Completo** | `Gerente Norte` | Requerido |
| **Correo Electrónico** | `gerente.norte@test.com` | Requerido, debe ser único |
| **Contraseña** | `Test123456` | Mínimo 6 caracteres |
| **Rol** | `Gerente` | Seleccionar del dropdown |
| **Sucursal** | `Sucursal Norte` | ⚠️ **OBLIGATORIO para Gerente** |

### Validación Crítica #1: Campo Sucursal OBLIGATORIO

**Prueba esto ANTES de llenar todos los campos:**

1. **Llena todos los campos EXCEPTO "Sucursal"**
2. **Selecciona Rol = "Gerente"**
3. **Intenta hacer clic en "Crear Usuario"**

**✅ RESULTADO ESPERADO:**
- El botón debe estar **DESHABILITADO** (gris, no clickeable)
- O debe mostrar un **toast/error** rojo: *"El Gerente debe tener una tienda asignada"*
- El campo "Sucursal" debe tener un **asterisco rojo (*)** indicando que es obligatorio

**❌ SI NO PASA ESTO:** Hay un bug en la validación frontend.

---

### Completar la Creación:

1. **Selecciona "Sucursal Norte"** del dropdown (si no existe, créala primero en "Tiendas")
2. **Haz clic en "Crear Usuario"**
3. **Espera el mensaje de éxito**

**✅ RESULTADO ESPERADO:**
- Toast verde: *"Usuario creado exitosamente"*
- El usuario aparece en la tabla de "Gerentes"
- El usuario tiene `assigned_store_id` = ID de "Sucursal Norte"

---

## 📍 PASO 1.2: VALIDAR EN BASE DE DATOS

### Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que el usuario se creó correctamente
SELECT 
    id,
    name,
    email,
    role,
    assigned_store_id,
    active,
    company_id
FROM public.users
WHERE email = 'gerente.norte@test.com';
```

**✅ RESULTADO ESPERADO:**
- `role` = `'manager'`
- `assigned_store_id` = UUID de "Sucursal Norte" (NO NULL)
- `active` = `true`
- `company_id` = Tu empresa

---

## 📍 PASO 1.3: CREAR PRODUCTO "PRODUCTO PRUEBA TOTAL"

### Navegación:
1. **Ve a:** Menú lateral → **"Artículos"** (icono de grid)
2. **Haz clic en:** `+ Nuevo Producto` (botón arriba a la derecha)

### Datos a Ingresar:

| Campo | Valor | Nota |
|-------|-------|------|
| **Nombre** | `Producto Prueba Total` | Requerido |
| **SKU** | `PRUEBA-001` | Requerido, debe ser único |
| **Código de Barras** | `1234567890123` | Opcional |
| **Categoría** | `Electrónica` | Seleccionar del dropdown |
| **Costo (USD)** | `10.00` | Requerido, > 0 |
| **Precio de Venta (USD)** | `20.00` | Requerido, > 0 |
| **IVA (%)** | `16` | Por defecto |

### Inventario Inicial:

**⚠️ IMPORTANTE:** 
- Si el formulario tiene campos de "Stock Inicial por Tienda", déjalos en **0** o vacíos
- El sistema debe crear inventario automáticamente en TODAS las sucursales

### Acción:
1. **Haz clic en "Crear Producto"**
2. **Espera el mensaje de éxito**

**✅ RESULTADO ESPERADO:**
- Toast verde: *"Producto creado exitosamente"*
- El producto aparece en la lista de artículos

---

## 📍 PASO 1.4: VALIDAR INVENTARIO AUTOMÁTICO

### Ejecuta en Supabase SQL Editor:

```sql
-- 1. Obtener el ID del producto creado
SELECT id, name, sku 
FROM public.products 
WHERE sku = 'PRUEBA-001';

-- 2. Verificar que se creó inventario en TODAS las sucursales activas
SELECT 
    i.id,
    i.product_id,
    p.name as product_name,
    i.store_id,
    s.name as store_name,
    i.qty,
    i.company_id
FROM public.inventories i
JOIN public.products p ON p.id = i.product_id
JOIN public.stores s ON s.id = i.store_id
WHERE p.sku = 'PRUEBA-001'
AND s.active = true
ORDER BY s.name;
```

**✅ RESULTADO ESPERADO:**
- Debe haber **UNA FILA por cada sucursal activa** en tu empresa
- Todas las filas deben tener `qty = 0` (stock inicial)
- `product_id` = ID del "Producto Prueba Total"
- `store_id` = ID de cada sucursal activa

**Ejemplo si tienes 3 sucursales:**
```
product_name          | store_name      | qty
----------------------|-----------------|-----
Producto Prueba Total | Sucursal Centro | 0
Producto Prueba Total | Sucursal Norte  | 0
Producto Prueba Total | Sucursal Sur    | 0
```

**❌ SI FALTA ALGUNA SUCURSAL:** El trigger `on_store_created` o la función `create_product_v3` no está funcionando correctamente.

---

## ✅ CHECKLIST DE VALIDACIÓN - ESCENARIO 1

- [ ] **Validación Frontend:** Campo "Sucursal" es obligatorio para Gerente
- [ ] **Creación de Usuario:** Usuario "Gerente Norte" creado exitosamente
- [ ] **Validación BD Usuario:** `assigned_store_id` NO es NULL
- [ ] **Creación de Producto:** Producto "Producto Prueba Total" creado exitosamente
- [ ] **Validación BD Inventario:** Inventario creado en TODAS las sucursales activas
- [ ] **Stock Inicial:** Todas las filas tienen `qty = 0`

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: "El campo Sucursal no es obligatorio"
**Solución:** Verificar que `src/pages/Users.tsx` tiene la validación en línea 230.

### Problema 2: "No se crea inventario en todas las sucursales"
**Solución:** Ejecutar `fix_inventory_shield_final.sql` (Módulo 2).

### Problema 3: "Error al crear usuario: function does not exist"
**Solución:** Verificar que `create_user_atomic_admin` existe en Supabase.

---

## 📝 NOTAS PARA EL SIGUIENTE ESCENARIO

**Guarda estos datos para el ESCENARIO 2:**
- ✅ ID del usuario "Gerente Norte": `_________________`
- ✅ ID del producto "Producto Prueba Total": `_________________`
- ✅ ID de "Sucursal Norte": `_________________`
- ✅ Número de sucursales activas: `_________________`

---

**¿Listo para continuar?** Una vez completado el ESCENARIO 1, avísame y te guío con el ESCENARIO 2.





