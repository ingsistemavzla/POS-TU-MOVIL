# Plan: Problemas al Agregar Productos Nuevos

## Prioridad máxima (INTOUCHABLE)

- **Proceso de compra-venta del POS**
- **Descuento de inventario** (`process_sale`, `update_store_inventory` en contexto de ventas)
- **Registro de transacciones** (sales, sale_items, inventory_movements)
- **Transferencias** (`transfer_inventory`)
- **Trigger de auditoría** (`audit_inventory_change`)

Solo modificaremos el flujo de **creación de productos** (`create_product_v3` + `ProductForm`).

---

## Fase 1: Plan de detección de errores

### 1.1 Puntos de fallo identificados

| # | Componente | Posible problema | Cómo detectar |
|---|------------|------------------|---------------|
| 1 | **ProductForm** | Categoría vacía al enviar (Select sin valor por defecto) | Revisar valor inicial de `formData.category` y si el Select permite enviar vacío |
| 2 | **ProductForm** | `storeInventories` vacío si `stores` está vacío | Si `availableStores`/`stores` = [], el formulario no tiene sucursales |
| 3 | **create_product_v3** | EXCEPTION si `p_category` es NULL o vacío | Error explícito: "La categoría del producto es requerida" |
| 4 | **create_product_v3** | Sin tiendas activas en la compañía | Safety Count: 0 tiendas esperadas → 0 inventarios. ¿El producto se crea sin inventario? |
| 5 | **create_product_v3** | Permisos: solo admin puede crear | Error: "Only administrators can create products" |
| 6 | **ProductForm** | Validación frontend bloquea antes de llamar RPC | Toast "La categoría del producto es requerida" |
| 7 | **RLS / políticas** | INSERT en `products` o `inventories` bloqueado | Error de Supabase con código de permiso |

### 1.2 Checklist de diagnóstico (ejecutar en orden)

```
□ 1. Abrir DevTools (F12) → Console y Network
□ 2. Ir a Artículos o Almacén → Clic en "Agregar producto"
□ 3. Llenar: SKU, Nombre, Categoría (seleccionar una), Costo, Precio venta
□ 4. Clic en Guardar
□ 5. Anotar:
   - ¿Aparece toast de error? (texto exacto)
   - ¿Hay error en Console? (mensaje completo)
   - ¿Se hace llamada a create_product_v3? (Network → filtro "rpc")
   - Si sí: status y body de la respuesta
□ 6. Verificar: ¿El usuario es admin? (solo admin puede crear)
□ 7. Verificar: ¿La compañía tiene al menos 1 tienda activa?
```

### 1.3 Consultas SQL de diagnóstico (ejecutar en Supabase SQL Editor)

```sql
-- A) ¿Hay tiendas activas para la compañía?
SELECT id, name, active FROM public.stores WHERE active = true LIMIT 5;

-- B) ¿create_product_v3 existe y con qué firma?
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname = 'create_product_v3';

-- C) ¿Hay productos con categoría NULL o vacía? (para ver si antes se permitía)
SELECT COUNT(*) FROM public.products WHERE category IS NULL OR TRIM(COALESCE(category,'')) = '';

-- D) Últimos errores (si hay log)
-- (depende de si tienes extensión de logging)
```

---

## Fase 2: Plan de ataque (correcciones seguras)

### 2.1 Cambios permitidos (solo flujo de creación de productos)

| Acción | Archivo | Descripción | Riesgo |
|--------|---------|-------------|--------|
| A | `ProductForm.tsx` | Mejorar UX: valor por defecto de categoría o validación más clara | Bajo |
| B | `ProductForm.tsx` | Si `stores` vacío: mensaje explicativo y/o permitir crear (create_product_v3 crea para todas las tiendas de la compañía) | Bajo |
| C | `create_product_v3` | Solo si es estrictamente necesario: ajustar validación de categoría (ej. aceptar NULL y convertir a valor por defecto) | Medio – evaluar antes |
| D | Mensajes de error | Traducir/mejorar mensajes de error del RPC para el usuario | Bajo |

### 2.2 Cambios prohibidos

- Modificar `process_sale`
- Modificar `update_store_inventory` en su uso para ventas/ajustes
- Modificar `transfer_inventory`
- Modificar triggers de auditoría
- Cambiar esquema de `sales`, `sale_items`, `inventory_movements`
- Alterar lógica de descuento de stock en ventas

---

## Fase 3: Ejecución (después de detectar el error)

1. Ejecutar **Fase 1** y documentar el error exacto.
2. Aplicar solo las correcciones de **Fase 2** que correspondan al error detectado.
3. Probar: crear producto nuevo con categoría y con al menos una tienda activa.
4. Probar: que una venta siga descontando inventario correctamente (no tocar ese flujo).
5. Probar: que el historial/auditoría siga registrando cambios (no tocar ese flujo).

---

## Resumen de flujo actual

```
Usuario → ProductForm (validación: categoría, precio, etc.)
       → supabase.rpc('create_product_v3', { p_sku, p_name, p_category, ... })
       → create_product_v3 (validación backend: name, sku, category, cost, sale_price)
       → INSERT products
       → INSERT inventories (para TODAS las tiendas activas de la compañía)
       → INSERT inventory_movements (solo si initial_qty > 0)
       → RETURN product_record
```

El RPC **no depende** de `p_store_inventories` para decidir en qué tiendas crear inventario; solo lo usa para cantidades iniciales. Las tiendas vienen de `SELECT id FROM stores WHERE company_id = X AND active = true`.
