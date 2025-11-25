# Métodos de Pago - Financiamiento Krece

## 🎯 **Concepto**

Cuando se realiza una venta con financiamiento Krece, es fundamental registrar **cómo pagó el cliente la inicial**. Esta información es crucial para:

- **Contabilidad:** Saber qué método de pago ingresó realmente a la tienda
- **Reportes:** Desglosar ingresos por método de pago
- **Auditoría:** Trazabilidad completa de cada transacción
- **Análisis:** Entender preferencias de pago de los clientes

## 📊 **Campos Agregados**

### **En la tabla `sales`:**

```sql
-- Método de pago específico de la inicial
krece_initial_payment_method TEXT DEFAULT NULL

-- Notas adicionales sobre el método de pago
krece_payment_notes TEXT DEFAULT NULL

-- Método de pago general (se usa el de la inicial cuando es Krece)
payment_method TEXT
```

## 🔧 **Lógica de Implementación**

### **Función `process_sale` Modificada:**

```sql
-- Determinar el método de pago a registrar
IF p_krece_enabled THEN
  -- Con Krece: usar el método de pago de la inicial
  v_payment_method_to_record := COALESCE(p_krece_initial_payment_method, p_payment_method, 'Krece - Inicial');
ELSE
  -- Sin Krece: usar el método de pago normal
  v_payment_method_to_record := p_payment_method;
END IF;
```

### **Parámetros Nuevos:**

```sql
p_krece_initial_payment_method text DEFAULT NULL,  -- Método de pago de la inicial
p_krece_payment_notes text DEFAULT NULL,          -- Notas del método de pago
```

## 📋 **Métodos de Pago Soportados**

### **Métodos Principales:**
- **Efectivo** - Pago en dinero físico
- **Tarjeta de Débito** - Pago con tarjeta de débito
- **Tarjeta de Crédito** - Pago con tarjeta de crédito
- **Transferencia** - Transferencia bancaria
- **Pago Móvil** - Pago a través de aplicaciones móviles
- **Zelle** - Pago a través de Zelle
- **Otros** - Métodos de pago no estándar

### **Ejemplos de Uso:**

```typescript
// Ejemplo 1: Pago en efectivo
krece_initial_payment_method: 'Efectivo'
krece_payment_notes: 'Pago en efectivo - $200 USD'

// Ejemplo 2: Pago con tarjeta
krece_initial_payment_method: 'Tarjeta de Crédito'
krece_payment_notes: 'Visa terminada en 1234'

// Ejemplo 3: Transferencia
krece_initial_payment_method: 'Transferencia'
krece_payment_notes: 'Transferencia Banesco - Ref: 12345'
```

## 📈 **Funciones de Base de Datos**

### **1. `get_krece_payment_method_stats`**

```sql
-- Obtiene estadísticas por método de pago
SELECT 
  payment_method,
  total_initial_amount_usd,
  total_initial_amount_bs,
  count_sales
FROM get_krece_payment_method_stats('company_id');
```

**Resultado:**
```json
[
  {
    "payment_method": "Efectivo",
    "total_initial_amount_usd": 1500.00,
    "total_initial_amount_bs": 62550.00,
    "count_sales": 8
  },
  {
    "payment_method": "Tarjeta de Crédito",
    "total_initial_amount_usd": 800.00,
    "total_initial_amount_bs": 33360.00,
    "count_sales": 4
  }
]
```

### **2. `get_krece_sales_with_payment_method`**

```sql
-- Obtiene ventas con Krece incluyendo método de pago
SELECT * FROM get_krece_sales_with_payment_method('company_id', 50);
```

## 🎨 **Componentes Frontend**

### **1. SaleCompletionModal**

Muestra el método de pago en la factura:

```typescript
// En la sección de Krece
<div className="flex justify-between text-blue-700">
  <span>Método de Pago:</span>
  <span className="font-semibold">
    {saleData.krece_initial_payment_method || 'No especificado'}
  </span>
</div>
```

### **2. KrecePaymentMethodStats**

Componente del dashboard que muestra estadísticas por método de pago:

```typescript
// Estadísticas desglosadas
{stats.map((stat, index) => (
  <div key={index} className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      {getPaymentMethodIcon(stat.payment_method)}
      <div>
        <div className="font-medium">{stat.payment_method}</div>
        <div className="text-sm text-muted-foreground">
          {stat.count_sales} ventas
        </div>
      </div>
    </div>
    <div className="text-right">
      <div className="font-semibold">
        {formatCurrency(stat.total_initial_amount_usd, 'USD')}
      </div>
    </div>
  </div>
))}
```

## 💰 **Impacto en Reportes**

### **Reportes de Ventas:**
- **Desglose por método de pago:** Ver cuánto ingresó por cada método
- **Tendencias:** Analizar preferencias de pago de clientes
- **Flujo de caja:** Separar ingresos por método de pago

### **Reportes de Krece:**
- **Métodos de pago más usados:** Para iniciales de Krece
- **Distribución de ingresos:** Por método de pago
- **Análisis de comportamiento:** Patrones de pago de clientes

## 🔍 **Validaciones**

### **En el Frontend:**
```typescript
// Validar que se especifique método de pago cuando es Krece
if (isKreceEnabled && !kreceInitialPaymentMethod) {
  throw new Error('Debe especificar el método de pago de la inicial');
}

// Validar que el método de pago sea válido
const validPaymentMethods = [
  'Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 
  'Transferencia', 'Pago Móvil', 'Zelle', 'Otros'
];

if (!validPaymentMethods.includes(kreceInitialPaymentMethod)) {
  throw new Error('Método de pago no válido');
}
```

### **En la Base de Datos:**
```sql
-- Trigger para validar método de pago
CREATE OR REPLACE FUNCTION validate_krece_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.krece_enabled AND NEW.krece_initial_payment_method IS NULL THEN
    RAISE EXCEPTION 'Método de pago de inicial requerido para ventas con Krece';
  END IF;
  RETURN NEW;
END;
$$;
```

## 📊 **Ejemplo de Datos**

### **Venta con Krece - Pago en Efectivo:**
```json
{
  "invoice_number": "FAC-20250101-0001",
  "total_usd": 200.00,                    // Solo la inicial
  "total_bs": 8346.00,                    // Inicial en bolívares
  "invoice_total_usd": 1000.00,           // Total completo
  "krece_enabled": true,
  "krece_initial_amount_usd": 200.00,
  "krece_financed_amount_usd": 800.00,
  "krece_initial_payment_method": "Efectivo",
  "krece_payment_notes": "Pago en efectivo - $200 USD",
  "payment_method": "Efectivo"
}
```

### **Venta con Krece - Pago con Tarjeta:**
```json
{
  "invoice_number": "FAC-20250101-0002",
  "total_usd": 300.00,
  "total_bs": 12519.00,
  "invoice_total_usd": 1500.00,
  "krece_enabled": true,
  "krece_initial_amount_usd": 300.00,
  "krece_financed_amount_usd": 1200.00,
  "krece_initial_payment_method": "Tarjeta de Crédito",
  "krece_payment_notes": "Visa terminada en 5678",
  "payment_method": "Tarjeta de Crédito"
}
```

## 🚀 **Beneficios**

1. **Trazabilidad Completa:** Saber exactamente cómo pagó cada cliente
2. **Reportes Detallados:** Desglose por método de pago
3. **Análisis de Tendencias:** Entender preferencias de pago
4. **Auditoría:** Control total de ingresos por método
5. **Toma de Decisiones:** Datos para optimizar métodos de pago

## ⚠️ **Consideraciones**

- **Obligatorio:** El método de pago debe especificarse para ventas con Krece
- **Flexibilidad:** Permite métodos personalizados con notas
- **Compatibilidad:** Funciona con ventas existentes
- **Escalabilidad:** Fácil agregar nuevos métodos de pago



