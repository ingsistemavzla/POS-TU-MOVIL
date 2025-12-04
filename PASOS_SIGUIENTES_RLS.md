# 🚀 PASOS SIGUIENTES: IMPLEMENTACIÓN RLS COMPLETO

## ✅ PASO 1: EJECUTAR SCRIPT SQL EN SUPABASE

### Instrucciones:
1. Abre el **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo `rls_complete_master.sql` (ya está creado en tu proyecto)
3. Copia todo el contenido del script
4. Pega el contenido en el SQL Editor de Supabase
5. Haz clic en **"Run"** o presiona `Ctrl+Enter`

### Verificación:
- ✅ Deberías ver mensajes de éxito: `✅ RLS COMPLETO IMPLEMENTADO`
- ✅ No deberían aparecer errores de sintaxis
- ✅ Las funciones auxiliares deben crearse sin errores

---

## ✅ PASO 2: VERIFICAR POLÍTICAS RLS CREADAS

### Instrucciones:
1. En Supabase Dashboard → **Authentication** → **Policies**
2. Verifica que las siguientes políticas existen:
   - `stores_select_policy` en `public.stores`
   - `products_select_policy` en `public.products`
   - `inventories_select_policy` en `public.inventories`
   - `sales_select_policy` en `public.sales`

### Alternativa (SQL):
Ejecuta este query para verificar:
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('stores', 'products', 'inventories', 'sales')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;
```

---

## ✅ PASO 3: PROBAR FUNCIONALIDAD CON DIFERENTES ROLES

### Prueba 1: Manager/Cashier (Acceso Restringido)
1. **Inicia sesión** con un usuario **Manager** o **Cashier** que tenga `assigned_store_id`
2. **Verifica**:
   - ✅ En **Dashboard**: Solo ve datos de su tienda asignada
   - ✅ En **Ventas**: Solo ve ventas de su tienda asignada
   - ✅ En **Almacén**: Solo ve inventario de su tienda asignada
   - ✅ En **Tiendas**: Solo ve su tienda asignada en los filtros

### Prueba 2: Admin (Acceso Global)
1. **Inicia sesión** con un usuario **Admin**
2. **Verifica**:
   - ✅ En **Dashboard**: Ve datos de todas las tiendas de su company
   - ✅ En **Ventas**: Ve ventas de todas las tiendas de su company
   - ✅ En **Almacén**: Ve inventario de todas las tiendas de su company
   - ✅ En **Tiendas**: Ve todas las tiendas de su company

### Prueba 3: Master Admin (Acceso Global + Productos Inactivos)
1. **Inicia sesión** con un usuario **Master Admin**
2. **Verifica**:
   - ✅ En **Productos**: Ve productos activos e inactivos
   - ✅ En **Dashboard**: Ve datos de todas las tiendas
   - ✅ Acceso completo a todas las funcionalidades

---

## ✅ PASO 4: VERIFICAR QUE LOS BOTONES FUNCIONAN CORRECTAMENTE

### Prueba: Manager intenta editar producto
1. **Inicia sesión** con un usuario **Manager**
2. Ve a **Almacén**
3. Intenta **editar** un producto (el botón debe estar visible)
4. **Verifica**:
   - ✅ El botón está visible (no está oculto por lógica de frontend)
   - ✅ Si intenta guardar, el backend debe rechazar con error 403 (Forbidden)
   - ✅ El frontend debe mostrar un mensaje de error apropiado

### Prueba: Manager intenta crear producto
1. **Inicia sesión** con un usuario **Manager**
2. Ve a **Almacén**
3. Intenta **crear** un nuevo producto (el botón debe estar visible)
4. **Verifica**:
   - ✅ El botón está visible
   - ✅ Si intenta crear, el backend debe rechazar con error 403 (Forbidden)
   - ✅ El frontend debe mostrar un mensaje de error apropiado

---

## ✅ PASO 5: MONITOREAR LOGS Y ERRORES

### Verificar Consola del Navegador:
1. Abre las **DevTools** (F12) → **Console**
2. Busca errores relacionados con:
   - `403 Forbidden`
   - `PGRST301` (código de error de Supabase para acceso denegado)
3. **Verifica**:
   - ✅ Los errores 403 aparecen cuando un usuario sin permisos intenta una acción
   - ✅ El frontend maneja estos errores correctamente (muestra mensaje al usuario)
   - ✅ No hay errores inesperados que rompan la aplicación

### Verificar Supabase Logs:
1. En Supabase Dashboard → **Logs** → **Postgres Logs**
2. Busca errores relacionados con:
   - `permission denied`
   - `row-level security policy violation`
3. **Verifica**:
   - ✅ Los errores son esperados (cuando un usuario sin permisos intenta algo)
   - ✅ No hay errores inesperados que indiquen problemas con las políticas RLS

---

## ✅ PASO 6: VERIFICAR QUE NO HAY REGRESIONES

### Checklist de Funcionalidad:
- [ ] **POS**: Los cajeros pueden procesar ventas normalmente
- [ ] **Ventas**: Los managers pueden ver ventas de su tienda
- [ ] **Almacén**: Los managers pueden ver inventario de su tienda
- [ ] **Dashboard**: Los datos se muestran correctamente según el rol
- [ ] **Productos**: Los productos se muestran correctamente (activos/inactivos según rol)
- [ ] **Transferencias**: Los admins pueden transferir inventario entre tiendas
- [ ] **Eliminación de Ventas**: Los admins pueden eliminar ventas

---

## ⚠️ SI ALGO FALLA

### Error: "Policy already exists"
**Solución**: El script intenta eliminar políticas existentes, pero si falla:
```sql
-- Ejecuta manualmente para eliminar políticas duplicadas:
DROP POLICY IF EXISTS "stores_select_policy" ON public.stores;
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "inventories_select_policy" ON public.inventories;
DROP POLICY IF EXISTS "sales_select_policy" ON public.sales;
```
Luego ejecuta el script completo nuevamente.

### Error: "Function already exists"
**Solución**: Las funciones se crean con `CREATE OR REPLACE`, así que esto no debería ser un problema. Si persiste:
```sql
-- Verifica funciones existentes:
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('get_user_company_id', 'get_user_role', 'get_user_store_id', 
                  'is_master_admin', 'is_admin', 'is_global_admin');
```

### Error: Usuarios no ven datos esperados
**Solución**: Verifica que:
1. Los usuarios tienen `company_id` asignado correctamente
2. Los managers/cashiers tienen `assigned_store_id` asignado
3. Las políticas RLS están activas (verificar con el query del Paso 2)

### Error: 403 Forbidden inesperado
**Solución**: 
1. Verifica que el usuario tiene el `role` correcto en `public.users`
2. Verifica que `assigned_store_id` está correcto para managers/cashiers
3. Revisa los logs de Supabase para ver qué política está bloqueando

---

## 📊 CHECKLIST FINAL

- [ ] Script SQL ejecutado sin errores
- [ ] Políticas RLS verificadas en Supabase
- [ ] Manager/Cashier solo ve su tienda asignada
- [ ] Admin ve todas las tiendas de su company
- [ ] Master Admin ve productos inactivos
- [ ] Botones funcionan correctamente (RLS rechaza acciones no permitidas)
- [ ] No hay errores inesperados en consola
- [ ] No hay regresiones en funcionalidad existente

---

## 🎯 RESULTADO ESPERADO

Después de completar estos pasos:
- ✅ **Seguridad centralizada**: Toda la seguridad está en RLS, no en el frontend
- ✅ **Código más limpio**: El frontend no tiene lógica de roles insegura
- ✅ **Funcionalidad intacta**: Todo funciona como antes, pero más seguro
- ✅ **Mantenibilidad mejorada**: Cambios de seguridad solo requieren modificar SQL

---

## 📞 SIGUIENTE ACCIÓN INMEDIATA

**EJECUTA EL SCRIPT SQL AHORA:**
1. Abre `rls_complete_master.sql`
2. Cópialo al SQL Editor de Supabase
3. Ejecútalo
4. Verifica que no hay errores
5. Prueba con diferentes roles

¡Listo para continuar! 🚀


