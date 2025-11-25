# Sistema de Financiamiento KRECE - Funcionamiento Completo

## 📋 **Resumen Ejecutivo**

KRECE es un sistema de financiamiento integrado en el POS que permite a los clientes pagar solo una parte inicial del producto y financiar el resto. El sistema gestiona automáticamente las cuentas por cobrar y los registros contables.

---

## 🎯 **Concepto Principal**

Cuando un cliente selecciona financiamiento por KRECE:

1. **Cliente paga solo la inicial** → El dinero que ingresa físicamente a la tienda
2. **Monto financiado** → Se convierte en cuenta por cobrar a KRECE
3. **Factura muestra precio completo** → Para el cliente (documento completo)
4. **Venta registra solo la inicial** → Para la contabilidad de la tienda (efectivo real)

---

## 🔄 **Flujo Completo del Proceso**

### **1. En el POS (Interfaz de Usuario)**

#### **Ubicación del Contenedor KRECE:**
El sistema KRECE aparece en el POS **antes de la sección "Método de Pago"**, específicamente en el contenedor de **"Cliente"**.

```
┌─────────────────────────────────────────┐
│ Cliente                                 │
│ Cédula o RIF...                         │
│                                         │
│ Tasa BCV                                │
│ Bs 41.73                                │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Krece Financiamiento    [Activar]  │ │
│ │                                     │ │
│ │ Si está activado:                   │ │
│ │ - Selección de porcentaje (40/35/  │ │
│ │   30/25%)                           │ │
│ │ - Monto personalizado               │ │
│ │ - Resumen del financiamiento        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Método de Pago                          │
│ [Pago Único / Mixto]                    │
└─────────────────────────────────────────┘
```

#### **Proceso de Activación:**

1. **Cliente agregado al carrito**
   - El usuario debe agregar productos al carrito
   - Se calcula el `subtotalUSD` (total sin IVA)

2. **Botón "Activar" KRECE**
   - Ubicado en: `src/pages/POS.tsx` línea ~2014
   - Al activar:
     ```javascript
     setIsKreceEnabled(true)
     setKreceInitialAmount(subtotalUSD * 0.3) // 30% por defecto
     ```

3. **Selección del Porcentaje de Inicial:**
   - Opciones predefinidas: **40%, 35%, 30%, 25%**
   - Cálculo automático: `kreceInitialAmount = (subtotalUSD * percentage) / 100`
   - También permite **monto personalizado** (0 a 100% del subtotal)

4. **Resumen Visual:**
   - **Total del carrito:** Subtotal completo
   - **Inicial a pagar:** Monto que paga el cliente ahora
   - **A financiar:** `subtotalUSD - kreceInitialAmount`
   - **Porcentaje inicial:** Calculado automáticamente

### **2. Método de Pago con KRECE**

Cuando KRECE está activado, el flujo de pago cambia:

- **Si es "Pago Único":**
  - El cliente paga solo la inicial usando cualquier método (Efectivo USD, Zelle, Binance, etc.)
  - Este método se guarda en `kreceInitialPaymentMethod`

- **Si es "Pago Mixto":**
  - Los pagos mixtos **deben coincidir exactamente** con la inicial
  - Validación: `Math.abs(mixedTotal - kreceInitialAmount) < 0.01`
  - Si no coincide, muestra error y no permite continuar

### **3. Procesamiento de la Venta**

#### **Datos Enviados a `process_sale`:**

```javascript
{
  p_krece_enabled: true,
  p_krece_initial_amount_usd: 200.00,        // Lo que paga el cliente
  p_krece_financed_amount_usd: 800.00,       // Lo que se financia
  p_krece_initial_percentage: 20.00,         // Porcentaje de inicial
  p_payment_method: "cash_usd",              // Método de pago de la inicial
  p_total_usd: 1000.00,                      // Total completo (para factura)
  // ... otros datos
}
```

#### **En la Base de Datos (SQL):**

**Tabla `sales`:**
```sql
total_usd: 200.00              -- Solo la inicial (dinero real recibido)
total_bs: 8,346.00             -- Inicial en bolívares (200 * 41.73)
krece_enabled: true
krece_initial_amount_usd: 200.00
krece_financed_amount_usd: 800.00
krece_initial_percentage: 20.00
payment_method: 'cash_usd'     -- Método usado para la inicial
```

**Tabla `sale_payments`:**
```sql
-- Solo se registra el pago de la inicial
sale_id: <id>
payment_method: 'cash_usd'     -- Método de pago de la inicial
amount_usd: 200.00             -- SOLO la inicial
amount_bs: 8,346.00            -- Inicial en bolívares
```

**Tabla `krece_financing`:**
```sql
sale_id: <id>
customer_id: <id>
total_amount_usd: 1000.00      -- Total completo del producto
initial_amount_usd: 200.00     -- Inicial pagada
financed_amount_usd: 800.00    -- Monto financiado
initial_percentage: 20.00      -- Porcentaje de inicial
status: 'active'
```

**Tabla `krece_accounts_receivable`:**
```sql
company_id: <id>
krece_financing_id: <id>
customer_id: <id>
amount_usd: 800.00             -- Monto por cobrar a KRECE
amount_bs: 33,384.00           -- Monto en bolívares (800 * 41.73)
bcv_rate: 41.73
status: 'pending'              -- Pendiente de pago
```

---

## 💡 **Ejemplo Práctico Completo**

### **Escenario:**
- **Producto:** iPhone 15 Pro
- **Precio Total:** $1,000.00 USD
- **Inicial Seleccionada:** 20% ($200.00)
- **Monto Financiado:** 80% ($800.00)
- **Método de Pago Inicial:** Efectivo USD

### **Flujo en el POS:**

1. **Cliente agrega producto al carrito:**
   ```
   Subtotal: $1,000.00
   ```

2. **Activa KRECE:**
   - Click en "Activar"
   - Selecciona 20% de inicial
   - Sistema calcula:
     - Inicial: $200.00
     - A financiar: $800.00

3. **Resumen mostrado:**
   ```
   Total del carrito: $1,000.00
   Inicial a pagar: $200.00
   A financiar: $800.00
   Porcentaje inicial: 20%
   ```

4. **Selecciona método de pago:**
   - Pago Único: Efectivo USD
   - Paga: $200.00

5. **Procesamiento:**
   - Se guarda venta con `total_usd: 200.00`
   - Se crea registro en `krece_financing`
   - Se crea cuenta por cobrar en `krece_accounts_receivable`

### **Resultado Final:**

- **Cliente recibe:** Factura por $1,000.00 (total completo)
- **Tienda recibe:** $200.00 en efectivo
- **Cuenta por cobrar:** $800.00 pendiente de KRECE
- **Inventario:** Se descuenta 1 unidad del producto

---

## 🔧 **Implementación Técnica**

### **Archivos Clave:**

1. **`src/pages/POS.tsx`** (líneas ~2003-2137):
   - Interfaz de usuario del contenedor KRECE
   - Estados: `isKreceEnabled`, `kreceInitialAmount`, `kreceInitialPaymentMethod`
   - Validaciones de montos y porcentajes

2. **`src/pages/POS.tsx`** (líneas ~940-1270):
   - Función `handleProcessSale()`
   - Preparación de datos para `process_sale`
   - Validación de pagos mixtos con KRECE

3. **`supabase/migrations/..._process_sale_function.sql`:**
   - Función SQL `process_sale()`
   - Lógica de registro en base de datos
   - Creación de registros en `krece_financing` y `krece_accounts_receivable`

### **Validaciones Implementadas:**

1. **Inicial no puede exceder el total:**
   ```javascript
   const newAmount = Math.min(value, subtotalUSD);
   ```

2. **Pagos mixtos deben coincidir con inicial (si KRECE activo):**
   ```javascript
   if (isKreceEnabled) {
     if (Math.abs(mixedTotal - kreceInitialAmount) > 0.01) {
       // Error: no coincide
     }
   }
   ```

3. **Porcentaje válido (0-100%):**
   ```javascript
   const percentage = ((kreceInitialAmount / subtotalUSD) * 100);
   ```

### **Integración con Métodos de Pago:**

- **Con KRECE activo:**
  - El método de pago seleccionado se aplica **solo a la inicial**
  - Se guarda en `kreceInitialPaymentMethod`
  - Se registra en `sale_payments` como pago de la inicial

- **Sin KRECE:**
  - Funcionamiento normal del POS
  - Método de pago aplicado al total completo

---

## 📊 **Visualización en Reportes**

### **En el Dashboard de Ventas:**

- **Badge KRECE:** Muestra si la venta tiene financiamiento activo
- **Indicador de porcentaje:** Muestra el porcentaje de inicial (ej: "20%")
- **Monto total:** Muestra el monto completo (no solo la inicial)

### **En Reportes PDF:**

- **Detalle completo:** Total del producto, inicial pagada, monto financiado
- **Método de pago:** Método usado para la inicial
- **Estado:** "Activo" si está pendiente de cobro

---

## ⚠️ **Consideraciones Importantes**

1. **Cliente Requerido:**
   - KRECE requiere que el cliente esté registrado
   - No se puede usar con "Cliente General"
   - Necesario para crear cuenta por cobrar

2. **Inventario:**
   - Se descuenta inmediatamente al procesar la venta
   - No se espera al pago completo de KRECE

3. **Contabilidad:**
   - La tienda registra solo el dinero recibido (inicial)
   - El monto financiado queda como cuenta por cobrar
   - KRECE es responsable del cobro del resto

4. **Método de Pago:**
   - Solo afecta a la inicial
   - No aplica al monto financiado

---

## 🔍 **Flujo de Datos Completo**

```
[POS] 
  ↓
isKreceEnabled = true
kreceInitialAmount = 200
kreceInitialPaymentMethod = "cash_usd"
  ↓
[handleProcessSale]
  ↓
[process_sale SQL Function]
  ↓
├─→ [sales] total_usd = 200
├─→ [sale_payments] amount_usd = 200
├─→ [krece_financing] 
│     total_amount_usd = 1000
│     initial_amount_usd = 200
│     financed_amount_usd = 800
└─→ [krece_accounts_receivable]
      amount_usd = 800
      status = 'pending'
```

---

## 📝 **Resumen de Funcionalidad**

✅ **Sistema completo de financiamiento integrado**
✅ **Validaciones robustas de montos y porcentajes**
✅ **Integración con métodos de pago existentes**
✅ **Registro contable correcto (inicial vs total)**
✅ **Gestión automática de cuentas por cobrar**
✅ **Visualización clara en facturas y reportes**

---

**Última actualización:** v-valid
**Versión del sistema:** v-valid

