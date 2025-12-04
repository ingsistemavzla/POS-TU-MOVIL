# 🔒 DIAGNÓSTICO: Blindaje de Roles y Manejo de Tiendas

**Fecha:** 2025-01-27  
**Auditor:** React & State Management Specialist  
**Objetivo:** Validar que el Frontend respeta estrictamente la jerarquía de roles al seleccionar el contexto de datos (Tienda Activa)

---

## 📋 RESUMEN EJECUTIVO

| Aspecto | Estado | Veredicto |
|---------|--------|-----------|
| **1. Fuente de Verdad (`p_store_id`)** | ⚠️ **PROTEGIDO CON FALLBACK RIESGOSO** | Gerente usa `assigned_store_id`, pero hay fallback a `selectedStore` |
| **2. Selector de Sucursales (UI)** | ✅ **BLINDADO** | Selector oculto para Gerente/Cajero, visible solo para Admin |
| **3. Limpieza de Contexto (Admin)** | ✅ **IMPLEMENTADO** | Carrito se limpia automáticamente al cambiar de tienda |

---

## 🔎 ANÁLISIS DETALLADO

### 1. LA FUENTE DE LA VERDAD (`p_store_id`)

#### Ubicación del código:
```typescript
// src/pages/POS.tsx, líneas 1615-1617
const isRestrictedUser = userProfile?.role === 'cashier' || userProfile?.role === 'manager';
const storeId = isRestrictedUser
  ? (userProfile as any)?.assigned_store_id ?? selectedStore?.id
  : selectedStore?.id;

// Luego se pasa a process_sale (línea 1854)
p_store_id: storeId,
```

#### Prueba Lógica:

**Escenario 1: Gerente con `assigned_store_id` válido**
- ✅ `isRestrictedUser = true`
- ✅ `storeId = userProfile.assigned_store_id` (CORRECTO)
- ✅ No usa `selectedStore` (aunque esté disponible)

**Escenario 2: Gerente SIN `assigned_store_id` (NULL)**
- ⚠️ `isRestrictedUser = true`
- ⚠️ `storeId = selectedStore?.id` (FALLBACK)
- ⚠️ **RIESGO:** Si `selectedStore` está configurado (por ejemplo, de una sesión anterior), el Gerente podría usar una tienda incorrecta

**Escenario 3: Admin**
- ✅ `isRestrictedUser = false`
- ✅ `storeId = selectedStore?.id` (CORRECTO)
- ✅ Puede operar en cualquier tienda

#### Protección Backend:

El backend en `process_sale` valida:
```sql
-- Si no es admin, enforce assigned store
IF v_role IS DISTINCT FROM 'admin' THEN
  IF v_assigned_store IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ASSIGNED_STORE');
  END IF;
  IF p_store_id IS DISTINCT FROM v_assigned_store THEN
    RETURN jsonb_build_object('success', false, 'error', 'STORE_NOT_ALLOWED');
  END IF;
END IF;
```

**Veredicto:** ✅ **PROTEGIDO (con doble validación)**
- Frontend intenta usar `assigned_store_id` primero
- Backend rechaza explícitamente si no coincide
- **PERO:** El fallback `?? selectedStore?.id` es innecesario y podría causar confusión

#### Recomendación:
```typescript
// MEJOR: Eliminar el fallback innecesario
const storeId = isRestrictedUser
  ? (userProfile as any)?.assigned_store_id  // Sin fallback
  : selectedStore?.id;

// Si assigned_store_id es null, el backend rechazará la venta (correcto)
```

---

### 2. EL SELECTOR DE SUCURSALES (UI)

#### Ubicación del código:
```typescript
// src/pages/POS.tsx, líneas 2435-2447
) : isRestrictedToStore ? (
  // Para managers y cajeros: mostrar solo su tienda asignada (sin selector)
  <div className="py-8">
    <Card className="p-6 bg-primary/5 border border-primary/20">
      <div className="flex items-center justify-center gap-3">
        <Store className="w-8 h-8 text-primary" />
        <div>
          <p className="text-lg font-bold">{selectedStore?.name}</p>
          <p className="text-sm text-muted-foreground">Tienda asignada</p>
        </div>
      </div>
    </Card>
  </div>
) : (
  // Para admins: mostrar selector de tiendas
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {availableStores.map((store) => (
      <Button onClick={() => { setSelectedStore(store); ... }}>
        <span className="font-semibold">{store.name}</span>
      </Button>
    ))}
  </div>
)
```

#### Prueba Lógica:

**Si soy Gerente:**
- ✅ `isRestrictedToStore = true` (línea 244)
- ✅ El selector NO se renderiza (línea 2435)
- ✅ Solo ve un Card con el nombre de su tienda asignada
- ✅ No puede hacer clic para cambiar de tienda

**Si soy Admin:**
- ✅ `isRestrictedToStore = false`
- ✅ El selector SÍ se renderiza (línea 2449)
- ✅ Puede hacer clic en cualquier tienda para cambiar

#### Verificación en StoreContext:

```typescript
// src/contexts/StoreContext.tsx, líneas 50-62
if (userProfile.role === 'cashier' || userProfile.role === 'manager') {
  // Los cajeros y gerentes solo ven su tienda asignada
  if (userProfile.assigned_store_id) {
    const { data: store } = await supabase
      .from('stores')
      .select('...')
      .eq('id', userProfile.assigned_store_id)
      .single();
    stores = store ? [store] : [];
  }
} else {
  // Solo administradores ven todas las tiendas
  const { data: allStores } = await supabase
    .from('stores')
    .select('...')
    .eq('company_id', company.id)
    .eq('active', true);
  stores = allStores || [];
}
```

**Veredicto:** ✅ **BLINDADO CORRECTAMENTE**
- Gerente/Cajero: Solo ven su tienda asignada en `availableStores`
- Admin: Ve todas las tiendas activas
- El selector está condicionalmente renderizado

#### Verificación en MainLayout:

```typescript
// src/components/layout/MainLayout.tsx, líneas 317-320
<div className="flex items-center space-x-1 xs:space-x-2 px-2 xs:px-3 py-1 rounded-none glass-card">
  <Store className="w-3 h-3 xs:w-4 xs:h-4 text-muted-foreground flex-shrink-0" />
  <span className="text-xs xs:text-sm font-medium truncate max-w-[100px] xs:max-w-none">{storeName}</span>
</div>
```

**Observación:** En el header del MainLayout, NO hay selector de tiendas. Solo muestra el nombre de la tienda (o "Todas las tiendas" para Admin). Esto es correcto, ya que el selector solo debe estar en el POS.

**Veredicto:** ✅ **SIN SELECTOR EN HEADER (CORRECTO)**

---

### 3. LIMPIEZA DE CONTEXTO (Admin)

#### Ubicación del código:
```typescript
// src/pages/POS.tsx, líneas 350-368
// Limpiar carrito y productos al cambiar de tienda (solo para Admin)
useEffect(() => {
  if (userProfile?.role === 'admin' && selectedStore) {
    // Si cambió la tienda (no es la primera vez)
    if (prevStoreIdRef.current !== null && prevStoreIdRef.current !== selectedStore.id) {
      // Limpiar carrito para evitar mezclar inventarios
      setCart([]);
      // Limpiar productos de búsqueda anterior
      setProducts([]);
      setProductStock({});
      // Limpiar búsqueda
      setSearchTerm("");
      setHasSearched(false);
    }
    // Actualizar la referencia
    prevStoreIdRef.current = selectedStore.id;
  }
}, [selectedStore?.id, userProfile?.role]);
```

#### Prueba Lógica:

**Escenario: Admin cambia de Tienda A a Tienda B**

1. Admin tiene productos en el carrito de Tienda A
2. Admin hace clic en "Tienda B" en el selector (Paso 1 del Wizard)
3. `setSelectedStore(store)` se ejecuta (línea 2461)
4. `selectedStore.id` cambia de "Tienda A" a "Tienda B"
5. El `useEffect` detecta el cambio (línea 356)
6. **Limpieza automática:**
   - ✅ `setCart([])` - Carrito vaciado
   - ✅ `setProducts([])` - Productos de búsqueda limpiados
   - ✅ `setProductStock({})` - Stock cacheado limpiado
   - ✅ `setSearchTerm("")` - Búsqueda limpiada
   - ✅ `setHasSearched(false)` - Estado de búsqueda reseteado

**Veredicto:** ✅ **IMPLEMENTADO CORRECTAMENTE**

**Protección adicional:**
- El `prevStoreIdRef` previene limpieza en la inicialización (primera carga)
- Solo limpia cuando realmente cambia la tienda (no en el primer render)

---

## 🚨 PROBLEMAS IDENTIFICADOS

### Problema #1: Fallback innecesario en `resolvedStoreId`

**Severidad:** 🟡 **MEDIA**

**Ubicación:** `src/pages/POS.tsx`, línea 245-247

**Código actual:**
```typescript
const resolvedStoreId = isRestrictedUser
  ? (userProfile as any)?.assigned_store_id ?? selectedStore?.id ?? null
  : selectedStore?.id ?? (userProfile as any)?.assigned_store_id ?? null;
```

**Problema:**
- Si un Gerente no tiene `assigned_store_id`, el código intenta usar `selectedStore?.id`
- Aunque el backend rechazará la venta, el frontend podría mostrar datos incorrectos (stock de otra tienda)

**Solución recomendada:**
```typescript
// Eliminar fallback innecesario
const resolvedStoreId = isRestrictedUser
  ? (userProfile as any)?.assigned_store_id ?? null  // Sin fallback a selectedStore
  : selectedStore?.id ?? null;
```

**Justificación:**
- Si un Gerente no tiene `assigned_store_id`, es un error de configuración
- El backend rechazará la venta de todas formas
- Mejor mostrar un error claro que usar datos incorrectos

---

## ✅ CONFIRMACIONES FINALES

### ¿Está el Gerente realmente blindado en su sucursal?

**Respuesta:** ✅ **SÍ, CON PROTECCIÓN DOBLE**

**Protecciones implementadas:**

1. **Frontend - StoreContext:**
   - ✅ Solo carga la tienda asignada en `availableStores` (línea 50-62 de StoreContext.tsx)
   - ✅ No puede ver otras tiendas

2. **Frontend - UI:**
   - ✅ Selector oculto en el Paso 1 del Wizard (línea 2435 de POS.tsx)
   - ✅ Solo ve un Card con el nombre de su tienda

3. **Frontend - Lógica de venta:**
   - ✅ Usa `assigned_store_id` como primera opción (línea 1616 de POS.tsx)
   - ⚠️ Tiene fallback a `selectedStore` (innecesario pero no peligroso)

4. **Backend - Validación:**
   - ✅ Rechaza explícitamente si `p_store_id !== assigned_store_id` (SQL en process_sale)
   - ✅ Rechaza si `assigned_store_id IS NULL`

**Conclusión:** El Gerente está blindado. Aunque hay un fallback innecesario, el backend garantiza que no puede vender en otra tienda.

---

### ¿Puede el Admin cambiar de tienda sin corromper el carrito?

**Respuesta:** ✅ **SÍ, LIMPIEZA AUTOMÁTICA IMPLEMENTADA**

**Protecciones implementadas:**

1. **Limpieza automática del carrito:**
   - ✅ `setCart([])` cuando cambia `selectedStore.id` (línea 358 de POS.tsx)
   - ✅ Solo aplica para Admin (línea 354)

2. **Limpieza de contexto relacionado:**
   - ✅ Productos de búsqueda limpiados (`setProducts([])`)
   - ✅ Stock cacheado limpiado (`setProductStock({})`)
   - ✅ Búsqueda reseteada (`setSearchTerm("")`)

3. **Prevención de limpieza en inicialización:**
   - ✅ `prevStoreIdRef` evita limpieza en el primer render
   - ✅ Solo limpia cuando realmente cambia la tienda

**Conclusión:** El Admin puede cambiar de tienda de forma segura. El carrito y todo el contexto se limpian automáticamente, previniendo mezclar inventarios.

---

## 📝 RECOMENDACIONES FINALES

### Recomendación #1: Eliminar fallback innecesario

**Archivo:** `src/pages/POS.tsx`

**Cambio:**
```typescript
// ANTES (línea 245-247)
const resolvedStoreId = isRestrictedUser
  ? (userProfile as any)?.assigned_store_id ?? selectedStore?.id ?? null
  : selectedStore?.id ?? (userProfile as any)?.assigned_store_id ?? null;

// DESPUÉS
const resolvedStoreId = isRestrictedUser
  ? (userProfile as any)?.assigned_store_id ?? null  // Sin fallback
  : selectedStore?.id ?? null;
```

**Justificación:**
- Simplifica la lógica
- Hace explícito que Gerente/Cajero DEBEN tener `assigned_store_id`
- El backend rechazará de todas formas si es null, pero mejor mostrar error claro en frontend

---

### Recomendación #2: Agregar validación explícita en frontend

**Archivo:** `src/pages/POS.tsx`

**Agregar antes de `processSale`:**
```typescript
// Validación explícita para Roles Fijos
if (isRestrictedUser && !(userProfile as any)?.assigned_store_id) {
  toast({
    title: "Error de configuración",
    description: "No tienes una tienda asignada. Contacta al administrador.",
    variant: "destructive",
  });
  return;
}
```

**Justificación:**
- Mejor UX: Error claro en lugar de fallback silencioso
- Previene intentos de venta que el backend rechazará de todas formas

---

## 🎯 CONCLUSIÓN GENERAL

### Estado del Blindaje:

| Rol | Blindaje Frontend | Blindaje Backend | Estado Final |
|-----|------------------|------------------|--------------|
| **Admin** | ✅ Selector visible, puede cambiar tienda | ✅ Permite cualquier tienda | ✅ **FUNCIONAL** |
| **Gerente** | ✅ Selector oculto, solo ve su tienda | ✅ Rechaza si no es su tienda | ✅ **BLINDADO** |
| **Cajero** | ✅ Selector oculto, solo ve su tienda | ✅ Rechaza si no es su tienda | ✅ **BLINDADO** |

### Vulnerabilidades:

1. ⚠️ **Fallback innecesario** en `resolvedStoreId` (no peligroso, pero confuso)
2. ✅ **Limpieza de carrito** implementada correctamente
3. ✅ **Selector de tiendas** correctamente oculto para Roles Fijos

### Veredicto Final:

**El sistema está blindado correctamente.** Las protecciones frontend y backend funcionan en conjunto para garantizar que:
- Gerente/Cajero solo pueden operar en su tienda asignada
- Admin puede cambiar de tienda sin corromper el carrito
- El backend rechaza cualquier intento de violación

**Recomendación:** Implementar las 2 mejoras sugeridas para simplificar la lógica y mejorar la UX.

---

**Fin del Diagnóstico**





