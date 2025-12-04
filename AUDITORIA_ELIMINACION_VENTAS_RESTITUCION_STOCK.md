# 🔍 AUDITORÍA: Eliminación de Ventas y Restitución de Stock

**Fecha:** 2025-01-27  
**Auditor:** Database Expert (PostgreSQL Triggers & RPCs)  
**Objetivo:** Auditar la lógica de eliminación de ventas y restitución de stock

---

## 📋 RESUMEN EJECUTIVO

| Aspecto | Estado | Veredicto |
|---------|--------|-----------|
| **1. Función de Eliminación** | ✅ **EXISTE** | RPC `delete_sale_and_restore_inventory` implementada |
| **2. Tipo de Borrado** | ✅ **FÍSICO** | `DELETE FROM sales` (no soft delete) |
| **3. Restitución de Stock** | ✅ **AUTOMATIZADA** | Restaura stock antes de borrar (transaccional) |
| **4. Triggers ON DELETE** | ❌ **NO EXISTE** | No hay triggers automáticos |
| **5. Integridad con inventory_movements** | ⚠️ **INCOMPLETA** | No elimina registros de `inventory_movements` |

---

## 🔎 ANÁLISIS DETALLADO

### 1. PREGUNTA CLAVE 1: ¿Existe la función de "Eliminar Venta"?

#### Ubicación:
```sql
-- supabase/migrations/20250102000003_create_delete_sale_function.sql
CREATE OR REPLACE FUNCTION delete_sale_and_restore_inventory(
    p_sale_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
```

#### Tipo de Borrado:

**Veredicto:** ✅ **BORRADO FÍSICO (`DELETE`)**

**Código:**
```sql
-- Líneas 94-100
-- Delete sale items first (due to foreign key constraint)
DELETE FROM public.sale_items 
WHERE sale_id = p_sale_id;

-- Delete the sale
DELETE FROM public.sales 
WHERE id = p_sale_id;
```

**Características:**
- ✅ Borrado físico (no soft delete)
- ✅ No hay campo `status = 'cancelled'`
- ✅ La venta se elimina completamente de la base de datos

#### Validaciones Implementadas:

1. **Permisos:**
   ```sql
   -- Solo admin y manager pueden eliminar
   AND role IN ('admin', 'manager')
   ```

2. **Estado de la Venta:**
   ```sql
   -- Solo se pueden eliminar ventas completadas
   IF v_sale_record.status != 'completed' THEN
       RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden eliminar ventas completadas');
   END IF;
   ```

3. **Pertenencia a la Empresa:**
   ```sql
   -- Verifica que la venta pertenezca a la empresa del usuario
   WHERE id = p_sale_id AND company_id = v_user_company_id
   ```

#### Triggers ON DELETE:

**Búsqueda realizada:**
```bash
grep -i "ON DELETE.*sales|AFTER DELETE.*sales|BEFORE DELETE.*sales" supabase/migrations
```

**Resultado:** ❌ **NO HAY TRIGGERS ON DELETE**

- No existe un trigger que se ejecute automáticamente al borrar una venta
- La restitución de stock es **manual** dentro de la función RPC

---

### 2. PREGUNTA CLAVE 2: El Retorno del Stock (La Ley de Conservación)

#### Ubicación del Código:
```sql
-- supabase/migrations/20250102000003_create_delete_sale_function.sql
-- Líneas 71-92
-- Get all sale items and restore inventory
FOR v_sale_item IN 
    SELECT * FROM public.sale_items 
    WHERE sale_id = p_sale_id
LOOP
    -- Restore inventory quantity
    UPDATE public.inventories 
    SET qty = qty + v_sale_item.qty,
        updated_at = NOW()
    WHERE product_id = v_sale_item.product_id 
    AND store_id = v_store_id
    AND company_id = v_company_id;
END LOOP;
```

#### Escenario Identificado: ✅ **ESCENARIO B (HÍBRIDO)**

**Características:**
- ✅ Función RPC transaccional (`LANGUAGE plpgsql`)
- ✅ Restaura stock **ANTES** de borrar la venta
- ✅ Todo ocurre en una sola transacción (atómico)
- ✅ Si falla, hace ROLLBACK automático

**Flujo de Ejecución:**
1. Valida permisos y estado de la venta
2. **RESTAURA STOCK** (UPDATE inventories)
3. Borra `sale_items` (DELETE)
4. Borra `sales` (DELETE)
5. Retorna resultado

#### Integridad Matemática:

**✅ CORRECTO:**
- Suma exacta: `qty = qty + v_sale_item.qty`
- Filtra por `product_id`, `store_id`, `company_id` (triple validación)
- Transaccional: Si falla cualquier paso, se revierte todo

**⚠️ PROBLEMA IDENTIFICADO:**
- **NO elimina registros de `inventory_movements`**
- Si `process_sale` creó registros en `inventory_movements` con `type = 'OUT'`, estos quedan huérfanos
- El historial de movimientos queda inconsistente

---

## 🚨 PROBLEMAS IDENTIFICADOS

### Problema #1: Inconsistencia en el Frontend

**Severidad:** 🔴 **ALTA**

**Ubicación:**
- `src/pages/SalesPage.tsx`, línea 1020: Llama a `delete_sale_with_refund` (NO EXISTE)
- `src/components/sales/SaleDetailModal.tsx`, línea 403: Llama a `delete_sale_and_restore_inventory` (CORRECTO)

**Código problemático:**
```typescript
// SalesPage.tsx - INCORRECTO
const { data: result, error } = await supabase.rpc('delete_sale_with_refund', {
  p_sale_id: saleToDelete.id
});

// SaleDetailModal.tsx - CORRECTO
const { data: result, error } = await supabase.rpc('delete_sale_and_restore_inventory', {
  p_sale_id: sale.id
});
```

**Impacto:**
- El botón de eliminar en `SalesPage.tsx` fallará con error "function does not exist"
- El modal de detalles funciona correctamente

**Solución:**
```typescript
// Cambiar en SalesPage.tsx línea 1020
const { data: result, error } = await supabase.rpc('delete_sale_and_restore_inventory', {
  p_sale_id: saleToDelete.id
});
```

---

### Problema #2: Registros Huérfanos en `inventory_movements`

**Severidad:** 🟡 **MEDIA**

**Descripción:**
Cuando `process_sale` ejecuta, crea registros en `inventory_movements` con:
- `type = 'OUT'`
- `sale_id = <id_de_venta>`
- `qty = <cantidad_vendida>`

Cuando se elimina la venta con `delete_sale_and_restore_inventory`, estos registros **NO se eliminan**.

**Impacto:**
- El historial de movimientos queda inconsistente
- Los reportes de movimientos mostrarán salidas que ya no tienen venta asociada
- La auditoría queda corrupta

**Solución recomendada:**
```sql
-- Agregar antes de DELETE FROM sale_items (línea 94)
-- Delete inventory movements associated with this sale
DELETE FROM public.inventory_movements 
WHERE sale_id = p_sale_id;
```

---

### Problema #3: Falta de Registro de Restitución

**Severidad:** 🟡 **MEDIA**

**Descripción:**
Cuando se restaura el stock, no se crea un registro en `inventory_movements` con `type = 'IN'` para documentar la restitución.

**Impacto:**
- No hay trazabilidad de por qué aumentó el stock
- Los reportes no muestran que se restauró inventario por cancelación de venta

**Solución recomendada:**
```sql
-- Agregar dentro del LOOP (después de UPDATE inventories, línea 82)
-- Register inventory movement for restoration
INSERT INTO public.inventory_movements (
    product_id,
    store_from_id,
    qty,
    type,
    reason,
    user_id,
    company_id,
    sale_id  -- NULL porque la venta se va a eliminar
)
VALUES (
    v_sale_item.product_id,
    v_store_id,
    v_sale_item.qty,
    'IN',
    'Restitución por eliminación de venta: ' || v_sale_record.invoice_number,
    auth.uid(),
    v_company_id,
    NULL  -- La venta se eliminará, pero documentamos la restitución
);
```

---

## ✅ VEREDICTO FINAL

### ¿Qué pasa exactamente con el stock si elimino una venta hoy?

**Respuesta:** ✅ **EL STOCK SE RESTITUYE CORRECTAMENTE**

**Flujo actual:**
1. Usuario hace clic en "Eliminar Venta"
2. Frontend llama a `delete_sale_and_restore_inventory(p_sale_id)`
3. Backend valida permisos y estado
4. **RESTAURA STOCK:** `UPDATE inventories SET qty = qty + v_sale_item.qty`
5. Borra `sale_items`
6. Borra `sales`
7. Retorna éxito

**Integridad matemática:**
- ✅ Stock se restaura correctamente
- ✅ Transaccional (si falla, se revierte todo)
- ✅ Filtra por `product_id`, `store_id`, `company_id`

**Problemas menores:**
- ⚠️ No elimina `inventory_movements` huérfanos
- ⚠️ No registra la restitución en `inventory_movements`

---

### ¿Está automatizado o es manual?

**Respuesta:** ✅ **AUTOMATIZADO (RPC Transaccional)**

**Características:**
- ✅ **Automatizado:** La función RPC maneja todo
- ✅ **Transaccional:** Todo ocurre en una sola transacción
- ✅ **Atómico:** Si falla cualquier paso, se revierte todo
- ✅ **Seguro:** Valida permisos, estado, y pertenencia

**NO es:**
- ❌ Manual (no requiere cálculos en frontend)
- ❌ Basado en triggers (no hay triggers ON DELETE)
- ❌ Soft delete (es borrado físico)

---

## 📝 RECOMENDACIONES

### Recomendación #1: Corregir inconsistencia en Frontend

**Archivo:** `src/pages/SalesPage.tsx`

**Cambio:**
```typescript
// ANTES (línea 1020)
const { data: result, error } = await supabase.rpc('delete_sale_with_refund', {
  p_sale_id: saleToDelete.id
});

// DESPUÉS
const { data: result, error } = await supabase.rpc('delete_sale_and_restore_inventory', {
  p_sale_id: saleToDelete.id
});
```

---

### Recomendación #2: Mejorar función RPC para limpiar `inventory_movements`

**Archivo:** `supabase/migrations/20250102000003_create_delete_sale_function.sql`

**Agregar antes de DELETE FROM sale_items:**
```sql
-- Delete inventory movements associated with this sale
DELETE FROM public.inventory_movements 
WHERE sale_id = p_sale_id;
```

**Justificación:**
- Evita registros huérfanos
- Mantiene la integridad del historial

---

### Recomendación #3: Registrar restitución en `inventory_movements`

**Archivo:** `supabase/migrations/20250102000003_create_delete_sale_function.sql`

**Agregar dentro del LOOP (después de UPDATE inventories):**
```sql
-- Register inventory movement for restoration
INSERT INTO public.inventory_movements (
    product_id,
    store_from_id,
    qty,
    type,
    reason,
    user_id,
    company_id
)
VALUES (
    v_sale_item.product_id,
    v_store_id,
    v_sale_item.qty,
    'IN',
    'Restitución por eliminación de venta: ' || v_sale_record.invoice_number,
    (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1),
    v_company_id
);
```

**Justificación:**
- Trazabilidad completa
- Auditoría correcta
- Reportes precisos

---

## 🎯 CONCLUSIÓN

### Estado del Sistema:

| Componente | Estado | Notas |
|------------|--------|-------|
| **Función de Eliminación** | ✅ **FUNCIONAL** | RPC implementada correctamente |
| **Restitución de Stock** | ✅ **CORRECTA** | Transaccional y atómica |
| **Integridad Matemática** | ✅ **GARANTIZADA** | Stock se restaura exactamente |
| **Trazabilidad** | ⚠️ **INCOMPLETA** | Falta registro de restitución |
| **Consistencia Frontend** | ❌ **ROTO** | SalesPage.tsx llama función inexistente |

### Veredicto Final:

**El sistema de eliminación de ventas y restitución de stock está FUNCIONAL, pero tiene 3 problemas que deben corregirse:**

1. 🔴 **ALTA:** Inconsistencia en `SalesPage.tsx` (llama función inexistente)
2. 🟡 **MEDIA:** Registros huérfanos en `inventory_movements`
3. 🟡 **MEDIA:** Falta registro de restitución en `inventory_movements`

**La restitución de stock funciona correctamente y es automática (RPC transaccional).**

---

**Fin del Reporte de Auditoría**





