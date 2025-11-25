# Guía de Migración - Integración Krece con Función de Producción

## 🎯 **Objetivo**

Esta migración integra las mejoras de Krece con la función `process_sale` que ya está funcionando correctamente en producción, asegurando que:

1. **Se mantenga la funcionalidad existente** que ya funciona
2. **Se agreguen las mejoras de Krece** sin romper nada
3. **Se registre correctamente el método de pago** de la inicial
4. **Se implemente la lógica correcta** de contabilidad vs facturación

## 📋 **Archivo de Migración**

**Nombre:** `20250101000013_integrate_krece_with_production_function.sql`

## 🔧 **Cambios Realizados**

### **1. Nuevos Campos en `sales`:**

```sql
-- Método de pago específico de la inicial
krece_initial_payment_method TEXT DEFAULT NULL

-- Notas adicionales sobre el método de pago
krece_payment_notes TEXT DEFAULT NULL

-- Total completo de la factura (para mostrar al cliente)
invoice_total_usd NUMERIC(12,2) DEFAULT 0
invoice_total_bs NUMERIC(15,2) DEFAULT 0
```

### **2. Función `process_sale` Integrada:**

La función mantiene toda la funcionalidad de producción y agrega:

- **Limpieza ultra agresiva de parámetros** (de producción)
- **Manejo robusto de cantidades** (de producción)
- **Generación correcta de números de factura** (de producción)
- **Lógica de Krece integrada** (nuevo)
- **Registro de método de pago** (nuevo)

### **3. Nuevos Parámetros:**

```sql
p_krece_initial_payment_method text DEFAULT NULL,  -- Método de pago de la inicial
p_krece_payment_notes text DEFAULT NULL,          -- Notas del método de pago
```

### **4. Lógica de Krece Implementada:**

```sql
-- Determinar el monto real que ingresa a la tienda
IF p_krece_enabled THEN
  -- Con Krece: solo la inicial ingresa a la tienda
  v_actual_payment_usd := p_krece_initial_amount_usd;
  v_actual_payment_bs := p_krece_initial_amount_usd * p_bcv_rate;
ELSE
  -- Sin Krece: todo el monto ingresa a la tienda
  v_actual_payment_usd := v_total_usd;
  v_actual_payment_bs := v_total_bs;
END IF;

-- Determinar el método de pago a registrar
IF p_krece_enabled THEN
  -- Con Krece: usar el método de pago de la inicial
  v_payment_method_to_record := COALESCE(p_krece_initial_payment_method, p_payment_method, 'Krece - Inicial');
ELSE
  -- Sin Krece: usar el método de pago normal
  v_payment_method_to_record := v_clean_payment_method;
END IF;
```

## 🚀 **Aplicación de la Migración**

### **Paso 1: Ejecutar la migración**

```bash
npx supabase db push
```

### **Paso 2: Verificar que se aplicó correctamente**

```sql
-- Verificar que los campos existen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name IN ('krece_initial_payment_method', 'krece_payment_notes', 'invoice_total_usd', 'invoice_total_bs');

-- Verificar que la función existe
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'process_sale';
```

### **Paso 3: Probar una venta con Krece**

```sql
-- Ejemplo de llamada a la función
SELECT process_sale(
  'company_id_here',
  'store_id_here', 
  'cashier_id_here',
  'customer_id_here',
  'Efectivo',  -- Método de pago normal
  'Cliente Test',
  41.73,
  'V12345678',
  '[{"product_id": "product_id_here", "qty": 1, "price_usd": 100, "product_name": "Producto Test", "product_sku": "TEST-001"}]',
  'Venta de prueba',
  0.16,
  true,  -- krece_enabled
  20,    -- krece_initial_amount_usd
  80,    -- krece_financed_amount_usd
  20,    -- krece_initial_percentage
  'Efectivo',  -- krece_initial_payment_method
  'Pago en efectivo - $20 USD',  -- krece_payment_notes
  false, -- is_mixed_payment
  '[]'   -- mixed_payments
);
```

## 📊 **Verificación de Funcionamiento**

### **1. Verificar la venta creada:**

```sql
SELECT 
  id,
  invoice_number,
  total_usd,           -- Debe ser 20 (solo la inicial)
  total_bs,            -- Debe ser 20 * 41.73
  invoice_total_usd,   -- Debe ser 100 (total completo)
  invoice_total_bs,    -- Debe ser 100 * 41.73
  krece_enabled,
  krece_initial_amount_usd,
  krece_financed_amount_usd,
  krece_initial_payment_method,
  krece_payment_notes,
  payment_method
FROM sales 
WHERE invoice_number = 'FAC-20250101-XXXX'
ORDER BY created_at DESC 
LIMIT 1;
```

### **2. Verificar el financiamiento Krece:**

```sql
SELECT 
  id,
  sale_id,
  total_amount_usd,      -- Debe ser 100
  initial_amount_usd,    -- Debe ser 20
  financed_amount_usd,   -- Debe ser 80
  initial_percentage,    -- Debe ser 20
  status
FROM krece_financing 
WHERE sale_id = 'sale_id_from_previous_query';
```

### **3. Verificar la cuenta por cobrar:**

```sql
SELECT 
  id,
  amount_usd,    -- Debe ser 80
  amount_bs,     -- Debe ser 80 * 41.73
  status,        -- Debe ser 'pending'
  payment_date
FROM krece_accounts_receivable 
WHERE krece_financing_id = 'financing_id_from_previous_query';
```

### **4. Verificar el pago registrado:**

```sql
SELECT 
  id,
  payment_method,    -- Debe ser 'Efectivo'
  amount_usd,        -- Debe ser 20
  amount_bs          -- Debe ser 20 * 41.73
FROM sale_payments 
WHERE sale_id = 'sale_id_from_first_query';
```

## 🎯 **Resultados Esperados**

### **Para una venta de $100 USD con 20% de inicial:**

| Campo | Valor | Descripción |
|-------|-------|-------------|
| `total_usd` | 20.00 | Solo la inicial (lo que ingresa a la tienda) |
| `total_bs` | 834.60 | Inicial en bolívares |
| `invoice_total_usd` | 100.00 | Total completo para la factura |
| `invoice_total_bs` | 4173.00 | Total completo en bolívares |
| `krece_initial_payment_method` | 'Efectivo' | Método de pago de la inicial |
| `payment_method` | 'Efectivo' | Método registrado en la venta |

### **En `krece_financing`:**
- `total_amount_usd`: 100.00
- `initial_amount_usd`: 20.00
- `financed_amount_usd`: 80.00

### **En `krece_accounts_receivable`:**
- `amount_usd`: 80.00 (monto por cobrar a Krece)
- `status`: 'pending'

## ⚠️ **Consideraciones Importantes**

### **1. Compatibilidad:**
- ✅ **Ventas existentes:** No se ven afectadas
- ✅ **Ventas sin Krece:** Funcionan exactamente igual
- ✅ **Pagos mixtos:** Mantienen su funcionalidad
- ✅ **Números de factura:** Se generan correctamente

### **2. Validaciones:**
- ✅ **Cantidades:** Manejo robusto de valores nulos/vacíos
- ✅ **Precios:** Conversión segura de tipos
- ✅ **Pagos mixtos:** Validación de totales
- ✅ **Krece:** Validación de montos

### **3. Rollback:**
Si es necesario revertir, se puede ejecutar el SQL original de producción:
```sql
-- Restaurar función original de producción
-- (Usar el contenido de SOLUCION_OFICIAL_PRODUCCION.sql)
```

## 🔍 **Troubleshooting**

### **Error: "No hay items para procesar"**
- Verificar que `p_items` no sea null o vacío
- Verificar formato JSON de los items

### **Error: "El total de pagos mixtos no coincide"**
- Verificar que la suma de pagos mixtos sea igual al total
- Verificar formato de `p_mixed_payments`

### **Error: "Tienda no encontrada o inactiva"**
- Verificar que `p_store_id` existe y está activa
- Verificar que pertenece a la compañía correcta

### **Error: "Cajero no encontrado o inactivo"**
- Verificar que `p_cashier_id` existe y está activo
- Verificar que pertenece a la compañía correcta

## 📈 **Beneficios de esta Integración**

1. **Funcionalidad Probada:** Usa la función que ya funciona en producción
2. **Mejoras de Krece:** Agrega toda la funcionalidad de financiamiento
3. **Método de Pago:** Registra correctamente cómo pagó el cliente
4. **Contabilidad Correcta:** Solo registra lo que realmente ingresa
5. **Facturación Clara:** Muestra el total completo al cliente
6. **Trazabilidad Completa:** Auditoría completa de cada transacción

## 🎉 **Conclusión**

Esta migración integra exitosamente las mejoras de Krece con la función de producción, manteniendo toda la funcionalidad existente y agregando las nuevas características de manera segura y compatible.



