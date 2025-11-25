# Implementación Completa del Reporte PDF con Datos Reales

## 🎯 Problema Identificado

El reporte PDF está mostrando datos de ejemplo porque no se están pasando los datos reales de métodos de pago desde el dashboard.

## ✅ Solución Paso a Paso

### Paso 1: Crear el Componente de Reportes

Crea un nuevo archivo: `src/components/reports/SalesReportGenerator.tsx`

```typescript
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateSalesReportPDF } from '@/utils/pdfGenerator';
import { usePaymentMethodsData } from '@/hooks/usePaymentMethodsData';
import { useAuth } from '@/contexts/AuthContext';

export function SalesReportGenerator() {
  const { userProfile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'thisMonth'>('today');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // ✅ OBTENER DATOS REALES DEL DASHBOARD
  const { data: paymentMethodsData, loading: paymentLoading } = usePaymentMethodsData(selectedPeriod);
  
  const generateReport = async () => {
    if (!paymentMethodsData) {
      console.error('No hay datos de métodos de pago disponibles');
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Crear datos de ventas (ajusta según tu estructura)
      const salesData = {
        totalSales: 5000,
        totalOrders: 25,
        averageOrderValue: 200,
        totalKreceFinancing: 1500,
        totalKreceInitial: 500,
        paymentMethods: [],
        storeBreakdown: []
      };
      
      // Crear metadatos del reporte
      const reportMetadata = {
        reportId: `RPT-${Date.now()}`,
        reportType: 'sales' as const,
        title: `Reporte de Ventas - ${selectedPeriod}`,
        period: selectedPeriod,
        dateRange: {
          startDate: new Date(),
          endDate: new Date()
        },
        generatedAt: new Date(),
        generatedBy: userProfile?.name || 'Usuario',
        companyName: 'Mi Bendición C.A.'
      };
      
      console.log('Generando reporte con datos:', {
        paymentMethodsData,
        salesData,
        reportMetadata
      });
      
             // ✅ GENERAR PDF CON DATOS REALES
       const pdfDataUri = await generateSalesReportPDF(
         salesData,
         reportMetadata,
         paymentMethodsData  // ← DATOS REALES DEL DASHBOARD (estructura completa)
       );
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `Reporte_Ventas_${selectedPeriod}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error generando reporte:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Generador de Reportes PDF</h2>
        
        {/* Selector de período */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Período del Reporte</label>
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="yesterday">Ayer</SelectItem>
              <SelectItem value="thisMonth">Este Mes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Información de datos disponibles */}
        <div className="space-y-2 text-sm">
          {paymentLoading ? (
            <p className="text-blue-600">🔄 Cargando datos de métodos de pago...</p>
          ) : paymentMethodsData ? (
            <div className="space-y-1">
              <p className="text-green-600">✅ Datos disponibles: {paymentMethodsData.methods.length} métodos</p>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Total USD: ${paymentMethodsData.totalUSD}</p>
                <p>Total Transacciones: {paymentMethodsData.totalTransactions}</p>
                {paymentMethodsData.methods.map((method, index) => (
                  <div key={index}>
                    {method.method}: ${method.totalUSD} ({method.count} trans.) - {method.percentage.toFixed(1)}%
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-red-600">❌ No hay datos de métodos de pago</p>
          )}
        </div>
        
        {/* Botón de generación */}
        <Button 
          onClick={generateReport} 
          disabled={isGenerating || !paymentMethodsData}
          className="w-full"
        >
          {isGenerating ? 'Generando...' : 'Generar Reporte PDF'}
        </Button>
        
        {/* Instrucciones */}
        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
          <p><strong>Instrucciones:</strong></p>
          <p>1. Selecciona el período del reporte</p>
          <p>2. Verifica que los datos estén cargados</p>
          <p>3. Haz clic en "Generar Reporte PDF"</p>
          <p>4. El PDF se descargará automáticamente</p>
        </div>
      </div>
    </Card>
  );
}
```

### Paso 2: Agregar el Componente a tu Página

En tu página de reportes o donde quieras usarlo:

```typescript
import { SalesReportGenerator } from '@/components/reports/SalesReportGenerator';

export default function ReportsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Reportes</h1>
      <SalesReportGenerator />
    </div>
  );
}
```

### Paso 3: Verificar que usePaymentMethodsData Funcione

Asegúrate de que el hook `usePaymentMethodsData` esté funcionando correctamente:

```typescript
// En tu componente, agrega esto para debug
useEffect(() => {
  console.log('Payment Methods Data:', paymentMethodsData);
  console.log('Loading:', paymentLoading);
}, [paymentMethodsData, paymentLoading]);
```

## 🔍 Verificación del Problema

### 1. Verificar en la Consola del Navegador

Abre las herramientas de desarrollador (F12) y ve a la consola. Deberías ver:

```javascript
Payment Methods Data: [
  { method: 'cash_usd', totalUSD: 1250.50, totalBS: 0, count: 15 },
  { method: 'card_usd', totalUSD: 890.25, totalBS: 0, count: 8 },
  // ... más métodos
]
```

### 2. Verificar en el PDF

El PDF ahora mostrará:

- **Si hay datos reales**: "✅ Usando datos reales del dashboard (X métodos)"
- **Si no hay datos**: "⚠️ Usando datos de ejemplo - Para datos reales, pasar paymentMethodsData"

### 3. Verificar la Estructura de Datos

Los datos deben tener esta estructura exacta (la que devuelve `usePaymentMethodsData`):

```typescript
interface PaymentMethodsData {
  totalUSD: number;           // Total en dólares
  totalBS: number;            // Total en bolívares  
  totalTransactions: number;  // Total de transacciones
  methods: Array<{
    method: string;           // 'cash_usd', 'card_usd', etc.
    totalUSD: number;         // Total en dólares para este método
    totalBS: number;          // Total en bolívares para este método
    count: number;            // Número de transacciones
    percentage: number;       // Porcentaje del total
  }>;
}
```

**IMPORTANTE**: No uses `data.paymentMethods` de la tabla de ventas. Usa `usePaymentMethodsData()` que obtiene datos directamente de `sale_payments`.

## 🚨 Problemas Comunes y Soluciones

### ⚠️ IMPORTANTE: Diferencia entre Tablas

- **❌ NO USAR**: `data.paymentMethods` de la tabla de ventas (puede estar vacía)
- **✅ USAR**: `usePaymentMethodsData()` que obtiene datos de `sale_payments`

### Problema 1: "No hay datos de métodos de pago"

**Solución**: Verifica que `usePaymentMethodsData` esté funcionando:

```typescript
// En tu componente
const { data: paymentMethodsData, loading, error } = usePaymentMethodsData(selectedPeriod);

console.log('Hook result:', { data: paymentMethodsData, loading, error });
```

### Problema 2: "Usando datos de ejemplo"

**Solución**: Los datos no se están pasando correctamente. Verifica:

1. Que `paymentMethodsData` no sea `undefined`
2. Que tenga `length > 0`
3. Que se esté pasando como tercer parámetro

### Problema 3: Datos vacíos (0, 0, 0)

**Solución**: El problema está en la base de datos o en el hook. Verifica:

1. Que haya datos en la tabla `sale_payments`
2. Que las fechas del período sean correctas
3. Que el `company_id` sea válido

## 🎯 Resultado Esperado

Después de implementar esto correctamente, deberías ver:

1. **En el componente**: Lista de métodos de pago con montos reales
2. **En el PDF**: "✅ Usando datos reales del dashboard (X métodos)"
3. **En la tabla**: Montos reales en lugar de 0
4. **En la consola**: Datos reales siendo pasados a `generateSalesReportPDF`

## 🔧 Debugging Adicional

Si sigues teniendo problemas, agrega esto al PDF:

```typescript
// En la función generateSalesReportPDF, antes de la tabla
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(100, 100, 100);
doc.text(`Debug: paymentMethodsData recibido: ${JSON.stringify(paymentMethodsData)}`, 25, currentY);
currentY += 8;
```

Esto te mostrará exactamente qué datos está recibiendo la función.

¡Implementa esto paso a paso y verás que el reporte PDF mostrará los datos reales de métodos de pago del dashboard!
