# 🧪 CASOS DE PRUEBA: Resiliencia de `processSale`

**Fecha:** 2025-01-27  
**Objetivo:** Validar que la corrección de resiliencia funciona correctamente en el entorno real

---

## 📋 CASOS DE PRUEBA CRÍTICOS

### ✅ Caso 1: Venta Exitosa Normal

**Acción (Cajero):**
1. Agregar productos al carrito
2. Seleccionar cliente (opcional)
3. Seleccionar método de pago
4. Hacer clic en "Procesar Venta"

**Resultado Esperado (UI):**
- ✅ **Toast de Éxito Inmediato:** Aparece "✅ Venta completada" con mensaje "Venta procesada exitosamente. Asignando número de factura..."
- ✅ **Carrito Limpio:** El carrito se vacía INMEDIATAMENTE después del toast
- ✅ **Modal de Confirmación:** Se muestra el modal `SaleCompletionModal` con:
  - Número de factura asignado
  - Datos del cliente
  - Items de la venta
  - Totales correctos
  - Información fiscal de la tienda
- ✅ **Estado Limpio:** Todos los campos del formulario se resetean (cliente, método de pago, financiamiento, etc.)

**Verificación en Base de Datos:**
- ✅ La venta existe en la tabla `sales` con `status = 'completed'`
- ✅ Los items están en `sale_items`
- ✅ El inventario fue descontado correctamente
- ✅ Los movimientos de inventario están registrados en `inventory_movements`

---

### ❌ Caso 2: Stock Insuficiente

**Acción (Cajero):**
1. Agregar un producto al carrito con cantidad mayor al stock disponible
2. Intentar procesar la venta

**Resultado Esperado (UI):**
- ❌ **Error Destructivo:** Toast rojo con mensaje "Stock insuficiente" y descripción específica del producto
- ✅ **Carrito Intacto:** El carrito NO se limpia (los productos permanecen)
- ✅ **Formulario Intacto:** Cliente, método de pago y otros campos permanecen sin cambios
- ✅ **No se muestra modal:** El modal de confirmación NO aparece

**Verificación en Base de Datos:**
- ✅ NO se crea ninguna venta en la tabla `sales`
- ✅ El inventario NO fue modificado
- ✅ NO hay movimientos de inventario registrados

**Nota:** Este error es capturado en el `catch` principal porque el RPC `process_sale` falla por validación de stock.

---

### ⚠️ Caso 3: Fallo en Asignación de Factura

**Simulación:**
1. **Opción A (Manual):** Modificar temporalmente la función `applyInvoiceToSale` para que siempre falle
2. **Opción B (Red):** Simular fallo de red durante el `UPDATE` de la factura

**Acción (Cajero):**
1. Procesar una venta normal
2. El RPC `process_sale` es exitoso
3. La asignación de factura falla (primera vez)
4. El reintento también falla (o se captura el error)

**Resultado Esperado (UI):**
- ✅ **Toast de Éxito Primario:** Aparece "✅ Venta completada" INMEDIATAMENTE después del RPC exitoso
- ✅ **Carrito Limpio:** El carrito se vacía INMEDIATAMENTE
- ⚠️ **Toast de Advertencia:** Aparece un segundo toast con:
  - Título: "⚠️ Advertencia"
  - Variante: `warning` (amarillo, no rojo)
  - Descripción: "La venta fue procesada exitosamente, pero no se pudo asignar un número de factura correlativo. Contacta al administrador."
  - Duración: 5 segundos
- ✅ **Modal de Confirmación:** Se muestra el modal con:
  - Número de factura de la reserva (o "Pendiente" si no se pudo asignar)
  - Todos los demás datos correctos
- ✅ **Flujo Continúa:** El usuario puede continuar trabajando normalmente

**Verificación en Base de Datos:**
- ✅ La venta existe en la tabla `sales` con `status = 'completed'`
- ⚠️ El campo `invoice_number` puede estar `NULL` o tener un valor de reserva
- ✅ El inventario fue descontado correctamente
- ✅ Los movimientos de inventario están registrados

**Nota:** Este es el caso crítico que la corrección resuelve. Antes, esto mostraba un error destructivo y el usuario pensaba que la venta falló.

---

### ⚠️ Caso 4: Fallo de Red al Obtener Datos de Tienda

**Simulación:**
1. **Opción A (Manual):** Deshabilitar temporalmente la conexión a Supabase durante la obtención de datos de tienda
2. **Opción B (Red):** Simular timeout en la query `supabase.from('stores').select(...)`

**Acción (Cajero):**
1. Procesar una venta normal
2. El RPC `process_sale` es exitoso
3. La obtención de datos de tienda falla (timeout o error de red)

**Resultado Esperado (UI):**
- ✅ **Toast de Éxito Primario:** Aparece "✅ Venta completada" INMEDIATAMENTE
- ✅ **Carrito Limpio:** El carrito se vacía INMEDIATAMENTE
- ✅ **Modal de Confirmación:** Se muestra el modal con:
  - `store_info` como objeto vacío `{}` (fallback seguro)
  - Todos los demás datos correctos
  - El modal NO falla al renderizar (maneja `store_info` vacío correctamente)
- ✅ **No se muestra error:** NO aparece un toast de error destructivo
- ✅ **Flujo Continúa:** El usuario puede continuar trabajando normalmente

**Verificación en Base de Datos:**
- ✅ La venta existe en la tabla `sales` con `status = 'completed'`
- ✅ El inventario fue descontado correctamente
- ✅ Los movimientos de inventario están registrados

**Nota:** La información fiscal de la tienda es opcional para el modal. Si no se obtiene, el modal debe renderizar correctamente con valores por defecto.

---

## 🔍 VERIFICACIONES ADICIONALES

### Verificación 1: Orden de Ejecución

**Verificar en Consola del Navegador:**
1. Abrir DevTools → Console
2. Procesar una venta
3. Verificar que los logs aparecen en este orden:
   ```
   ✅ Venta procesada exitosamente: [data]
   ⚠️ (Si hay advertencias) Error en asignación de factura (no crítico): [error]
   ⚠️ (Si hay advertencias) Error obteniendo información de la tienda (no crítico): [error]
   ```

**Resultado Esperado:**
- ✅ El log "Venta procesada exitosamente" aparece PRIMERO
- ✅ Los logs de advertencia aparecen DESPUÉS (si ocurren)
- ✅ NO hay logs de error destructivo después del éxito

---

### Verificación 2: Estado de React

**Verificar en DevTools → React DevTools:**
1. Procesar una venta
2. Verificar que los estados se actualizan en este orden:
   - `isProcessingSale: true` → `false`
   - `cart: [...]` → `[]` (INMEDIATAMENTE después del éxito)
   - `selectedCustomer: {...}` → `null`
   - `isSaleConfirmedAndCompleted: false` → `true`
   - `showSaleModal: false` → `true`

**Resultado Esperado:**
- ✅ El carrito se limpia ANTES de que se ejecuten las operaciones secundarias
- ✅ El estado de venta completada se establece ANTES del modal

---

### Verificación 3: Resiliencia de Operaciones Secundarias

**Probar cada operación secundaria de forma independiente:**

1. **Asignación de Factura:**
   - Simular fallo en `applyInvoiceToSale`
   - Verificar que muestra advertencia pero NO interrumpe el flujo

2. **Verificación de Factura:**
   - Simular fallo en `supabase.from('sales').select('invoice_number')`
   - Verificar que NO muestra error (solo log en consola)

3. **Obtención de Datos de Tienda:**
   - Simular fallo en `supabase.from('stores').select(...)`
   - Verificar que usa `storeInfo = {}` como fallback

**Resultado Esperado:**
- ✅ Cada operación secundaria falla de forma aislada
- ✅ NO se propaga al `catch` principal
- ✅ El flujo de éxito continúa normalmente

---

## 📊 CHECKLIST DE VALIDACIÓN

### Pre-requisitos
- [ ] Usuario cajero o admin autenticado
- [ ] Productos con stock disponible en la base de datos
- [ ] Tienda asignada (para cajeros) o tienda seleccionada (para admins)
- [ ] Conexión a internet estable (para pruebas normales)

### Casos de Prueba
- [ ] **Caso 1:** Venta exitosa normal - ✅ PASÓ
- [ ] **Caso 2:** Stock insuficiente - ✅ PASÓ
- [ ] **Caso 3:** Fallo en asignación de factura - ✅ PASÓ
- [ ] **Caso 4:** Fallo de red al obtener datos de tienda - ✅ PASÓ

### Verificaciones Adicionales
- [ ] **Verificación 1:** Orden de ejecución en consola - ✅ PASÓ
- [ ] **Verificación 2:** Estado de React - ✅ PASÓ
- [ ] **Verificación 3:** Resiliencia de operaciones secundarias - ✅ PASÓ

---

## 🚨 NOTAS IMPORTANTES

1. **No modificar el RPC `process_sale`:** Las pruebas solo validan el frontend.
2. **Simulación de fallos:** Usar herramientas de DevTools (Network Throttling, Breakpoints) para simular fallos.
3. **Backup de datos:** Hacer backup de la base de datos antes de pruebas destructivas.
4. **Logs de consola:** Revisar los logs de consola para entender el flujo de ejecución.

---

## ✅ CRITERIOS DE ÉXITO

La corrección se considera **EXITOSA** si:

1. ✅ **Caso 1 (Venta Exitosa):** Funciona correctamente
2. ✅ **Caso 2 (Stock Insuficiente):** Muestra error destructivo correctamente
3. ✅ **Caso 3 (Fallo en Asignación):** Muestra éxito + advertencia (NO error destructivo)
4. ✅ **Caso 4 (Fallo de Red):** Muestra éxito + modal con fallback (NO error destructivo)
5. ✅ **Orden de Ejecución:** El éxito se declara ANTES de operaciones secundarias
6. ✅ **Estado de React:** El carrito se limpia INMEDIATAMENTE después del éxito
7. ✅ **Resiliencia:** Las operaciones secundarias NO interrumpen el flujo de éxito

---

**FIN DE LOS CASOS DE PRUEBA**





