# 🔍 AUDITORÍA: Manejo de `store_id` en POS

**Fecha:** 2025-01-27  
**Auditor:** React & State Management Specialist  
**Objetivo:** Verificar si el Admin puede operar en múltiples sucursales

---

## 📋 RESUMEN EJECUTIVO

| Aspecto | Estado | Veredicto |
|---------|--------|-----------|
| **Determinación de `store_id` en `process_sale`** | ✅ CORRECTO | Admin usa `selectedStore.id`, Roles Fijos usan `assigned_store_id` |
| **Selector de Sucursal para Admin** | ✅ EXISTE | Selector visible solo para Admin en Paso 1 del Wizard |
| **Refresh de Stock al cambiar tienda** | ⚠️ PARCIAL | Se refresca stock de productos actuales, pero NO se limpian productos de búsqueda anterior |
| **Limpieza de Carrito al cambiar tienda** | ❌ FALTA | **CRÍTICO:** El carrito NO se limpia al cambiar de tienda |

---

## 🔎 ANÁLISIS DETALLADO

### 1. PREGUNTA CLAVE 1: ¿Cómo determina el POS de qué tienda descontar stock?

#### Ubicación del código:
```typescript
// src/pages/POS.tsx, líneas 1613-1626
const isRestrictedUser = userProfile?.role === 'cashier' || userProfile?.role === 'manager';
const storeId = isRestrictedUser
  ? (userProfile as any)?.assigned_store_id ?? selectedStore?.id
  : selectedStore?.id;

// Luego se pasa a process_sale (línea 1854)
p_store_id: storeId,
```

#### Veredicto: ✅ **CORRECTO**

- **Admin:** Usa `selectedStore?.id` del contexto global (CORRECTO)
- **Gerente/Cajero:** Usa `assigned_store_id` del perfil (CORRECTO)
- **Backend:** La función `process_sale` valida que Admin pueda usar cualquier tienda, y Roles Fijos solo su tienda asignada

#### Código Backend (validación):
```sql
-- Si no es admin, enforce assigned store
IF v_role IS DISTINCT FROM 'admin' THEN
  IF p_store_id IS DISTINCT FROM v_assigned_store THEN
    RETURN jsonb_build_object('success', false, 'error', 'STORE_NOT_ALLOWED');
  END IF;
END IF;
```

---

### 2. PREGUNTA CLAVE 2: Selector de Sucursal

#### Ubicación del código:
```typescript
// src/pages/POS.tsx, líneas 2426-2447
) : (
  // Para admins: mostrar selector de tiendas
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {availableStores.map((store) => (
      <Button
        onClick={() => {
          setSelectedStore(store);
          setHasSelectedStoreInSession(true);
        }}
      >
        <span className="font-semibold">{store.name}</span>
      </Button>
    ))}
  </div>
)
```

#### Veredicto: ✅ **EXISTE Y FUNCIONA**

- **Selector visible:** Solo para Admin (línea 2427)
- **Ubicación:** Paso 1 del Wizard (Modal de Selección de Tienda)
- **Funcionalidad:** Permite cambiar de tienda haciendo clic en el botón
- **Estado:** Se actualiza `selectedStore` y `hasSelectedStoreInSession`

---

### 3. ¿Se refresca la data de productos y stock al cambiar de tienda?

#### Ubicación del código:
```typescript
// src/pages/POS.tsx, líneas 344-347
useEffect(() => {
  if (products.length > 0 && selectedStore) {
    loadProductStock(products);
  }
}, [selectedStore, products]);
```

#### Veredicto: ⚠️ **PARCIAL (PROBLEMA MENOR)**

**Lo que SÍ hace:**
- ✅ Refresca el stock de los productos que ya están en `products` (resultados de búsqueda anterior)
- ✅ Usa el `storeId` correcto (Admin: `selectedStore.id`, Roles Fijos: `assigned_store_id`)

**Lo que NO hace:**
- ❌ NO limpia la lista de productos (`products`) al cambiar de tienda
- ❌ Si el Admin buscó "iPhone" en Tienda A, luego cambia a Tienda B, seguirá viendo los resultados de "iPhone" de Tienda A (aunque el stock se actualice a Tienda B)

**Impacto:**
- **Menor:** El stock mostrado será correcto (de la nueva tienda), pero los productos visibles pueden ser de la búsqueda anterior
- **Solución recomendada:** Limpiar `products` cuando `selectedStore` cambia (solo para Admin)

---

### 4. ¿Se limpia el carrito al cambiar de tienda?

#### Búsqueda realizada:
```bash
grep -i "useEffect.*selectedStore|selectedStore.*change|onChange.*store|store.*change" src/pages/POS.tsx
# Resultado: No se encontró ningún useEffect que limpie el carrito cuando selectedStore cambia
```

#### Veredicto: ❌ **FALTA (CRÍTICO)**

**Problema identificado:**
- El carrito (`cart`) NO se limpia cuando el Admin cambia de tienda
- Si el Admin tiene productos en el carrito de Tienda A y cambia a Tienda B, el carrito mantiene productos de Tienda A
- Esto puede causar:
  1. **Ventas incorrectas:** Intentar vender productos de Tienda A en Tienda B
  2. **Stock inconsistente:** El stock mostrado será de Tienda B, pero los productos en el carrito son de Tienda A
  3. **Errores en `process_sale`:** El backend puede rechazar la venta si detecta inconsistencia

**Código actual del carrito:**
```typescript
// src/pages/POS.tsx, línea 213
const [cart, setCart] = useState<CartItem[]>([]);

// No hay useEffect que limpie el carrito cuando selectedStore cambia
```

**Limpieza del carrito solo ocurre en:**
- ✅ Después de una venta exitosa (línea 2161: `setCart([])`)
- ✅ Al resetear el POS (líneas 3955, 3972: `setCart([])`)
- ❌ **NO ocurre al cambiar de tienda**

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### Problema #1: Carrito no se limpia al cambiar de tienda

**Severidad:** 🔴 **ALTA**

**Escenario de error:**
1. Admin abre POS → Selecciona "Tienda A"
2. Busca "iPhone" → Agrega 2 unidades al carrito
3. Cambia a "Tienda B" (selector en Paso 1)
4. El carrito sigue teniendo 2 iPhones de Tienda A
5. Intenta procesar venta → Backend rechaza o descuenta stock de Tienda B incorrectamente

**Solución recomendada:**
```typescript
// Agregar en src/pages/POS.tsx
useEffect(() => {
  // Solo limpiar carrito si es Admin y cambió de tienda
  if (userProfile?.role === 'admin' && selectedStore) {
    // Limpiar carrito al cambiar de tienda
    setCart([]);
    // Opcional: Limpiar también productos de búsqueda
    setProducts([]);
    setProductStock({});
  }
}, [selectedStore?.id]); // Solo cuando cambia el ID de la tienda
```

---

### Problema #2: Productos de búsqueda no se limpian al cambiar de tienda

**Severidad:** 🟡 **MEDIA**

**Escenario:**
1. Admin busca "Samsung" en Tienda A → Ve 5 productos
2. Cambia a Tienda B
3. Los 5 productos de Samsung siguen visibles (aunque el stock se actualiza a Tienda B)

**Impacto:**
- Confusión visual para el usuario
- Los productos mostrados pueden no existir en la nueva tienda (aunque el stock será 0)

**Solución recomendada:**
```typescript
// Incluir en el mismo useEffect del Problema #1
setProducts([]);
setProductStock({});
```

---

## ✅ CONFIRMACIÓN FINAL

### ¿El Admin realmente tiene la capacidad técnica de vender en distintas sucursales?

**Respuesta:** ✅ **SÍ, PERO CON RIESGOS**

**Capacidades actuales:**
1. ✅ El selector de tiendas existe y funciona
2. ✅ El `store_id` se determina correctamente (`selectedStore.id` para Admin)
3. ✅ El backend permite que Admin use cualquier tienda
4. ✅ El stock se refresca al cambiar de tienda

**Limitaciones actuales:**
1. ❌ El carrito NO se limpia al cambiar de tienda (RIESGO ALTO)
2. ⚠️ Los productos de búsqueda NO se limpian (RIESGO MEDIO)

**Recomendación:**
- **Implementar limpieza automática del carrito y productos al cambiar de tienda** (solo para Admin)
- Esto garantizará que cada cambio de tienda inicie con un estado limpio

---

## 📝 CÓDIGO DE CORRECCIÓN RECOMENDADO

```typescript
// Agregar en src/pages/POS.tsx, después de la línea 347

// Limpiar carrito y productos al cambiar de tienda (solo para Admin)
useEffect(() => {
  // Solo aplicar si es Admin y hay una tienda seleccionada
  if (userProfile?.role === 'admin' && selectedStore) {
    // Limpiar carrito para evitar mezclar inventarios
    setCart([]);
    // Limpiar productos de búsqueda anterior
    setProducts([]);
    setProductStock({});
    // Limpiar búsqueda
    setSearchTerm("");
    setHasSearched(false);
  }
}, [selectedStore?.id, userProfile?.role]); // Solo cuando cambia el ID de la tienda o el rol
```

**Nota:** Este `useEffect` debe tener una dependencia estricta en `selectedStore?.id` para evitar limpiezas innecesarias durante la inicialización.

---

## 🎯 CONCLUSIÓN

El Admin **SÍ tiene la capacidad técnica** de operar en múltiples sucursales, pero el código actual tiene **2 vulnerabilidades** que pueden causar inconsistencias:

1. **Carrito no se limpia** → Puede intentar vender productos de Tienda A en Tienda B
2. **Productos de búsqueda no se limpian** → Confusión visual

**Prioridad de corrección:** 🔴 **ALTA** (especialmente el Problema #1)

---

**Fin del Reporte de Auditoría**





