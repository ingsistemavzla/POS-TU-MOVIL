# ✅ VERIFICACIÓN POST-EJECUCIÓN: fix_restore_product_complete.sql

**Fecha:** 2025-01-27  
**Script ejecutado:** `fix_restore_product_complete.sql`

---

## 📋 CHECKLIST DE VERIFICACIÓN

### 1. Verificar Políticas RLS Creadas

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar políticas SELECT
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'products'
  AND cmd = 'SELECT'
ORDER BY policyname;
```

**Resultado esperado:**
- ✅ `master_admin_products_select_policy` debe existir
- ✅ `products_select_policy` debe existir

---

### 2. Verificar Políticas RLS de UPDATE

```sql
-- Verificar políticas UPDATE
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'products'
  AND cmd = 'UPDATE'
ORDER BY policyname;
```

**Resultado esperado:**
- ✅ `master_admin_products_update_policy` debe existir
- ✅ `products_update_policy` debe existir

---

### 3. Verificar Función restore_product

```sql
-- Verificar función
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'restore_product';
```

**Resultado esperado:**
- ✅ La función debe existir
- ✅ Debe tener un parámetro `p_product_id UUID`

---

### 4. Probar Restauración desde Frontend

1. **Iniciar sesión como `master_admin`**
2. **Navegar a `/deleted-products`** (Papelera)
3. **Seleccionar un producto eliminado**
4. **Hacer clic en "Restaurar"**
5. **Verificar:**
   - ✅ No aparece error "Producto no encontrado"
   - ✅ Aparece mensaje de éxito
   - ✅ El producto desaparece de la Papelera
   - ✅ El producto aparece en `/articulos` (lista de activos)

---

### 5. Verificar que el Stock se Preservó

```sql
-- Verificar que el inventario NO se modificó
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.active as product_active,
  i.store_id,
  s.name as store_name,
  i.qty as stock_qty
FROM public.products p
JOIN public.inventories i ON i.product_id = p.id
JOIN public.stores s ON s.id = i.store_id
WHERE p.id = 'UUID_DEL_PRODUCTO_RESTAURADO'
ORDER BY s.name;
```

**Resultado esperado:**
- ✅ `product_active` debe ser `true` (restaurado)
- ✅ `stock_qty` debe tener los valores originales (no modificados)
- ✅ Cada sucursal mantiene su stock independiente

---

## 🔍 DIAGNÓSTICO DE PROBLEMAS

### Si aún aparece "Producto no encontrado":

1. **Verificar que el usuario es `master_admin`:**
```sql
SELECT id, name, email, role, company_id
FROM public.users
WHERE auth_user_id = auth.uid();
```

2. **Verificar que la política RLS permite acceso:**
```sql
-- Probar SELECT directo (como master_admin)
SELECT id, name, active, company_id
FROM public.products
WHERE id = 'UUID_DEL_PRODUCTO';
```

3. **Verificar que la función puede ejecutarse:**
```sql
-- Probar función directamente
SELECT public.restore_product('UUID_DEL_PRODUCTO'::uuid);
```

---

## ✅ RESULTADO ESPERADO

Después de ejecutar el script:

1. ✅ Políticas RLS creadas correctamente
2. ✅ Función `restore_product` sin restricción de `company_id`
3. ✅ `master_admin` puede ver productos inactivos
4. ✅ `master_admin` puede restaurar productos de cualquier compañía
5. ✅ El stock histórico se preserva intacto
6. ✅ No se mezclan datos entre sucursales

---

## 🚨 SI PERSISTE EL ERROR

Si después de ejecutar el script sigues viendo "Producto no encontrado", ejecuta:

```sql
-- Verificar políticas activas
SELECT * FROM pg_policies WHERE tablename = 'products';

-- Verificar función
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname = 'restore_product';

-- Verificar rol del usuario
SELECT role FROM public.users WHERE auth_user_id = auth.uid();
```

Y comparte los resultados para diagnóstico adicional.

---

**FIN DE LA VERIFICACIÓN**





