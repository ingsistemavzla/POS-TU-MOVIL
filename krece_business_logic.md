# Lógica de Negocio - Financiamiento Krece

## 🎯 **Concepto Principal**

Cuando se selecciona financiamiento por Krece, la lógica es la siguiente:

1. **Cliente paga solo la inicial** → Ingresa a la tienda
2. **Monto financiado** → Se convierte en cuenta por cobrar a Krece
3. **Factura muestra precio completo** → Para el cliente
4. **Venta registra solo la inicial** → Para la contabilidad de la tienda

## 📊 **Flujo de Datos**

### **Ejemplo Práctico:**
- **Precio total del producto:** $1,000 USD
- **Inicial (20%):** $200 USD
- **Monto financiado (80%):** $800 USD

### **Lo que se registra en la base de datos:**

#### **Tabla `sales`:**
```sql
total_usd: 200.00          -- Solo la inicial (lo que realmente ingresa)
total_bs: 8,346.00         -- Inicial en bolívares
invoice_total_usd: 1000.00 -- Total completo para la factura
invoice_total_bs: 41,730.00 -- Total completo en bolívares
krece_enabled: true
krece_initial_amount_usd: 200.00
krece_financed_amount_usd: 800.00
krece_initial_percentage: 20.00
krece_initial_payment_method: 'Efectivo'  -- Método de pago de la inicial
krece_payment_notes: 'Pago en efectivo'   -- Notas del método de pago
payment_method: 'Efectivo'                -- Método registrado en la venta
```

#### **Tabla `krece_financing`:**
```sql
total_amount_usd: 1000.00      -- Total completo
initial_amount_usd: 200.00     -- Inicial pagada
financed_amount_usd: 800.00    -- Monto financiado
initial_percentage: 20.00      -- Porcentaje de inicial
status: 'active'
```

#### **Tabla `krece_accounts_receivable`:**
```sql
amount_usd: 800.00         -- Monto por cobrar a Krece
amount_bs: 33,384.00       -- Monto en bolívares
status: 'pending'          -- Pendiente de pago
```

## 🔧 **Implementación Técnica**

### **Función `process_sale` Modificada:**

```sql
-- Calcular totales completos (para la factura)
v_total_usd := v_subtotal_usd + v_tax_amount_usd;
v_total_bs := v_total_usd * p_bcv_rate;

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

-- Crear la venta con el monto real que ingresa
INSERT INTO sales (
  total_usd, total_bs,           -- Solo lo que realmente ingresa
  invoice_total_usd, invoice_total_bs  -- Total completo para factura
) VALUES (
  v_actual_payment_usd, v_actual_payment_bs,
  v_total_usd, v_total_bs
);
```

### **Nuevas Columnas en `sales`:**

- `invoice_total_usd`: Total completo de la factura
- `invoice_total_bs`: Total completo en bolívares
- `total_usd`: Monto real que ingresa a la tienda
- `total_bs`: Monto real en bolívares
- `krece_initial_payment_method`: Método de pago de la inicial
- `krece_payment_notes`: Notas adicionales del método de pago

## 📋 **Componentes Frontend Modificados**

### **SaleCompletionModal:**
- Muestra el total completo en la factura
- Indica claramente qué pagó el cliente (inicial)
- Muestra el monto financiado como "por cobrar"

### **Dashboard de Krece:**
- Estadísticas basadas en montos financiados
- Cuentas por cobrar a Krece
- Total de financiamientos activos
- **Estadísticas de métodos de pago:** Desglose por método de pago de iniciales
- **Método de pago en facturas:** Muestra cómo pagó el cliente la inicial

## 💰 **Impacto en Reportes**

### **Reportes de Ventas:**
- **Ventas totales:** Solo incluyen lo que realmente ingresó
- **Facturación:** Muestra el total completo
- **Flujo de caja:** Refleja solo los ingresos reales

### **Reportes de Krece:**
- **Financiamientos:** Total de montos financiados
- **Cuentas por cobrar:** Montos pendientes de Krece
- **Ingresos futuros:** Proyección de pagos de Krece

## 🔍 **Validaciones Importantes**

### **En el Frontend:**
```typescript
// Validar que la inicial no sea mayor al total
if (initialAmount > totalAmount) {
  throw new Error('La inicial no puede ser mayor al total');
}

// Validar que la suma sea correcta
if (initialAmount + financedAmount !== totalAmount) {
  throw new Error('La suma de inicial + financiado debe ser igual al total');
}
```

### **En la Base de Datos:**
```sql
-- Trigger para validar consistencia
CREATE OR REPLACE FUNCTION validate_krece_amounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.krece_enabled THEN
    IF NEW.krece_initial_amount_usd + NEW.krece_financed_amount_usd != NEW.invoice_total_usd THEN
      RAISE EXCEPTION 'Inconsistencia en montos de Krece';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

## 📈 **Beneficios de esta Implementación**

1. **Contabilidad Correcta:** Solo se registra lo que realmente ingresa
2. **Facturación Clara:** El cliente ve el total completo
3. **Seguimiento de Krece:** Control total de cuentas por cobrar
4. **Reportes Precisos:** Separación clara entre ingresos y cuentas por cobrar
5. **Auditoría:** Trazabilidad completa de cada transacción

## 🚀 **Próximos Pasos**

1. **Aplicar migración:** `20250101000013_integrate_krece_with_production_function.sql`
2. **Probar ventas con Krece:** Verificar que se registre correctamente el método de pago
3. **Verificar facturas:** Confirmar que muestren el total completo y método de pago
4. **Revisar dashboard:** Asegurar que las estadísticas de métodos de pago sean correctas
5. **Documentar proceso:** Entrenar al equipo en la nueva lógica

## ⚠️ **Consideraciones Importantes**

- **Migración de datos:** Las ventas existentes mantienen su estructura
- **Compatibilidad:** Funciona con ventas sin Krece sin cambios
- **Auditoría:** Todos los cambios están documentados y trazables
- **Rollback:** Se puede revertir si es necesario
