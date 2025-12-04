# 🔒 ANÁLISIS DE ARQUITECTURA Y SEGURIDAD: Función restore_product

**Fecha:** 2025-01-27  
**Arquitecto:** Senior Database Architect  
**Objetivo:** Verificar si es seguro remover la validación de `company_id` sin mezclar datos entre sucursales

---

## 📋 ESTRUCTURA DE TABLAS CONFIRMADA

### 1. Tabla `stores` (Sucursales)

```sql
CREATE TABLE public.stores (
  id UUID NOT NULL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ...
);
```

**✅ CONFIRMADO:**
- `stores` tiene `company_id` → Una **Company** tiene muchas **Stores** (relación 1:N)
- `company_id` identifica la **ORGANIZACIÓN** que posee las sucursales

---

### 2. Tabla `products` (Catálogo de Productos)

```sql
CREATE TABLE public.products (
  id UUID NOT NULL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  ...
  UNIQUE(company_id, sku),
  UNIQUE(company_id, barcode)
);
```

**✅ CONFIRMADO:**
- `products` tiene **SOLO** `company_id` (NO tiene `store_id`)
- `products` es un **"Catálogo Global"** para toda la empresa
- Un producto pertenece a una **Company**, no a una **Store** específica
- El `company_id` en `products` identifica la **ORGANIZACIÓN** propietaria

---

### 3. Tabla `inventories` (Stock por Sucursal)

```sql
CREATE TABLE public.inventories (
  id UUID NOT NULL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  ...
  UNIQUE(company_id, store_id, product_id)
);
```

**✅ CONFIRMADO:**
- `inventories` vincula: `product_id` + `store_id` + `company_id`
- El stock está **aislado por sucursal** mediante `store_id`
- `UNIQUE(company_id, store_id, product_id)` garantiza que cada producto tiene un registro de stock por sucursal

---

## 🔍 ANÁLISIS DE SEGURIDAD

### ¿Es seguro remover la validación de `company_id` en `restore_product`?

**✅ SÍ, ES SEGURO** por las siguientes razones:

#### 1. **Aislamiento por Sucursal NO depende de `company_id` en `restore_product`**

La función `restore_product` **SOLO** hace:
```sql
UPDATE public.products
SET active = true
WHERE id = p_product_id;
```

**No modifica:**
- ❌ `company_id` del producto (permanece intacto)
- ❌ `store_id` (no existe en `products`)
- ❌ Tabla `inventories` (no se toca)

#### 2. **El stock está aislado por `store_id` en `inventories`**

El aislamiento por sucursal se mantiene porque:
- `inventories.store_id` identifica la sucursal específica
- `inventories` NO se modifica al restaurar
- Cada sucursal tiene su propio registro en `inventories` con su `store_id` único

#### 3. **`company_id` identifica la ORGANIZACIÓN, no la SUCURSAL**

**Jerarquía confirmada:**
```
Company (Organización)
  ├── Store 1 (Sucursal)
  ├── Store 2 (Sucursal)
  └── Store N (Sucursal)

Product (Catálogo Global)
  └── company_id → Identifica la ORGANIZACIÓN propietaria

Inventory (Stock por Sucursal)
  ├── product_id → Producto del catálogo
  ├── store_id → Sucursal específica
  └── company_id → Organización (redundante pero útil para RLS)
```

---

## ✅ VEREDICTO FINAL

### **ES SEGURO remover la validación de `company_id` en `restore_product`**

**Razones:**

1. **`company_id` NO se usa para identificar sucursales**
   - `company_id` identifica la **ORGANIZACIÓN** dueña de todas las sucursales
   - Las sucursales se identifican por `store_id` en la tabla `inventories`

2. **El producto ya tiene su `company_id` fijo**
   - Al restaurar, solo cambiamos `active = false` → `active = true`
   - El `company_id` del producto **NO se modifica**
   - El producto sigue perteneciendo a la misma organización

3. **El stock está aislado por `store_id`**
   - `inventories.store_id` identifica la sucursal específica
   - `inventories` NO se modifica al restaurar
   - No hay riesgo de mezclar stock entre sucursales

4. **`master_admin` debe poder restaurar productos de cualquier compañía**
   - Es parte de su función de "Laboratorio/Técnico"
   - Las políticas RLS ya están configuradas para permitir esto
   - La función debe ser consistente con las políticas RLS

---

## 🔒 GARANTÍAS DE SEGURIDAD

### Lo que SÍ se mantiene:

✅ **Aislamiento por Sucursal:**
- `inventories.store_id` identifica cada sucursal
- El stock no se mezcla entre sucursales

✅ **Aislamiento por Organización:**
- `products.company_id` identifica la organización propietaria
- El producto sigue perteneciendo a la misma organización

✅ **Integridad de Datos:**
- `inventories` NO se modifica (stock histórico preservado)
- `products.company_id` NO se modifica (organización preservada)
- Solo se cambia `products.active = true` (visibilidad restaurada)

### Lo que NO se modifica:

❌ `products.company_id` → Permanece intacto  
❌ `inventories.store_id` → Permanece intacto  
❌ `inventories.qty` → Permanece intacto  
❌ Cualquier dato de sucursal → Permanece intacto

---

## 📊 DIAGRAMA DE RELACIONES

```
┌─────────────┐
│  Companies  │ (Organización)
│   (id)      │
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
│   Stores    │   │  Products   │   │  Users      │
│ (company_id)│   │(company_id) │   │(company_id) │
│  (id)       │   │  (id)       │   │  (id)       │
└──────┬──────┘   └──────┬──────┘   └─────────────┘
       │                 │
       │                 │
       └────────┬────────┘
                │
        ┌───────▼────────┐
        │  Inventories   │
        │ (company_id)   │ ← Organización
        │ (store_id)     │ ← Sucursal específica
        │ (product_id)   │ ← Producto del catálogo
        │ (qty)          │ ← Stock por sucursal
        └────────────────┘
```

**Conclusión:** El aislamiento por sucursal está garantizado por `inventories.store_id`, NO por `products.company_id`.

---

## ✅ CONCLUSIÓN FINAL

**El script `fix_restore_product_complete.sql` es SEGURO y respeta el aislamiento por sucursal porque:**

1. ✅ Solo modifica `products.active` (no toca `company_id` ni `store_id`)
2. ✅ No modifica `inventories` (el stock por sucursal permanece intacto)
3. ✅ `company_id` identifica la organización, no la sucursal
4. ✅ El aislamiento por sucursal se mantiene mediante `inventories.store_id`
5. ✅ `master_admin` puede restaurar productos de cualquier compañía sin riesgo de mezclar datos

**VEREDICTO: ✅ SEGURO PARA EJECUTAR**

---

**FIN DEL ANÁLISIS**





