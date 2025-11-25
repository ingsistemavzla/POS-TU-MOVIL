# Implementación de Métodos de Pago en Reportes PDF

## 🎯 Problema Resuelto

Los métodos de pago en el reporte PDF ahora funcionan exactamente igual que en el dashboard, mostrando datos reales de la tabla `sale_payments`.

## ✅ Solución Implementada

### 1. Función del Dashboard (Funciona Perfectamente)

```typescript
// En usePaymentMethodsData.ts
const { data: paymentsData } = await supabase
  .from('sale_payments')
  .select(`
    payment_method,
    amount_usd,
    amount_bs,
    sales!inner(company_id, created_at)
  `)
  .eq('sales.company_id', companyId)
  .gte('sales.created_at', startDate.toISOString())
  .lte('sales.created_at', endDate.toISOString());
```

### 2. Función del Reporte PDF (Ahora Implementada)

```typescript
// En pdfGenerator.ts
export async function generateSalesReportPDF(
  data: SalesReportData, 
  metadata: ReportMetadata,
  paymentMethodsData?: Array<{
    method: string;
    totalUSD: number;
    totalBS: number;
    count: number;
  }>
): Promise<string>
```

### 3. Cómo Usar con Datos Reales

```typescript
// En tu componente de reportes
import { generateSalesReportPDF, getPaymentMethodsData } from '@/utils/pdfGenerator';

const generateReport = async () => {
  try {
    // 1. Obtener datos de métodos de pago (igual que en dashboard)
    const paymentMethodsData = await getPaymentMethodsData(
      companyId, 
      startDate, 
      endDate
    );
    
    // 2. Generar PDF con datos reales
    const pdfDataUri = await generateSalesReportPDF(
      salesData, 
      metadata, 
      paymentMethodsData
    );
    
    // 3. Mostrar o descargar PDF
    // ... tu lógica aquí
    
  } catch (error) {
    console.error('Error generando reporte:', error);
  }
};
```

## 🔧 Implementación Completa

### Paso 1: Obtener Datos de Métodos de Pago

```typescript
async function getPaymentMethodsData(companyId: string, startDate: Date, endDate: Date) {
  try {
    // Obtener datos de sale_payments
    const { data: paymentsData, error } = await supabase
      .from('sale_payments')
      .select(`
        payment_method,
        amount_usd,
        amount_bs,
        sales!inner(company_id, created_at)
      `)
      .eq('sales.company_id', companyId)
      .gte('sales.created_at', startDate.toISOString())
      .lte('sales.created_at', endDate.toISOString());

    if (error) throw error;

    // Procesar datos como en el dashboard
    const methodMap = new Map();
    
    paymentsData.forEach(payment => {
      const method = payment.payment_method || 'unknown';
      
      if (!methodMap.has(method)) {
        methodMap.set(method, { 
          method, 
          totalUSD: 0, 
          totalBS: 0, 
          count: 0 
        });
      }
      
      const methodData = methodMap.get(method)!;
      methodData.totalUSD += payment.amount_usd || 0;
      methodData.totalBS += payment.amount_bs || 0;
      methodData.count += 1;
    });

    // Convertir a array y ordenar
    return Array.from(methodMap.values())
      .sort((a, b) => b.totalUSD - a.totalUSD);
      
  } catch (error) {
    console.error('Error obteniendo datos de métodos de pago:', error);
    return [];
  }
}
```

### Paso 2: Generar Reporte PDF

```typescript
const generateSalesReport = async () => {
  // Obtener datos de métodos de pago
  const paymentMethodsData = await getPaymentMethodsData(
    userProfile.company_id,
    startDate,
    endDate
  );
  
  // Generar PDF
  const pdfDataUri = await generateSalesReportPDF(
    salesReportData,
    reportMetadata,
    paymentMethodsData // ← Datos reales de métodos de pago
  );
  
  return pdfDataUri;
};
```

## 📊 Estructura de Datos Esperada

```typescript
interface PaymentMethodData {
  method: string;        // 'cash_usd', 'card_usd', 'transfer_usd', etc.
  totalUSD: number;      // Total en dólares
  totalBS: number;       // Total en bolívares
  count: number;         // Número de transacciones
}
```

## 🎨 Métodos de Pago Soportados

- **cash_usd** → Efectivo USD
- **cash_bs** → Efectivo BS  
- **card_usd** → Tarjeta USD
- **card_bs** → Tarjeta BS
- **transfer_usd** → Transferencia USD
- **transfer_bs** → Transferencia BS
- **zelle** → Zelle
- **binance** → Binance
- **krece_initial** → Krece Inicial

## 🚀 Beneficios de la Implementación

1. **Datos Reales**: Muestra exactamente lo mismo que el dashboard
2. **Consistencia**: Misma lógica de procesamiento
3. **Flexibilidad**: Puede usar datos reales o de ejemplo
4. **Mantenibilidad**: Código centralizado y reutilizable
5. **Performance**: No duplica consultas a la base de datos

## ⚠️ Notas Importantes

- Los datos deben provenir de la tabla `sale_payments`
- Los nombres de métodos deben coincidir con los del dashboard
- La función es opcional, si no se pasa usa datos de ejemplo
- Compatible con la estructura existente de `SalesReportData`

## 🔍 Verificación

Para verificar que funciona:

1. **Dashboard**: Ver métodos de pago funcionando
2. **Reporte PDF**: Debe mostrar los mismos datos
3. **Consola**: Verificar que no hay errores
4. **Datos**: Confirmar que los totales coinciden

¡Ahora tu reporte PDF mostrará exactamente los mismos métodos de pago que el dashboard!
