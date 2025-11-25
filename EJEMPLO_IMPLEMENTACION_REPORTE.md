# Ejemplo de Implementación del Reporte PDF con Métodos de Pago

## 🎯 Objetivo
Implementar el reporte PDF usando exactamente los mismos datos de métodos de pago que el dashboard.

## ✅ Implementación Correcta

### Paso 1: En tu componente de reportes

```typescript
import { generateSalesReportPDF } from '@/utils/pdfGenerator';
import { usePaymentMethodsData } from '@/hooks/usePaymentMethodsData';
import { useAuth } from '@/contexts/AuthContext';

export function SalesReportComponent() {
  const { userProfile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'thisMonth'>('today');
  
  // ✅ OBTENER DATOS DE MÉTODOS DE PAGO (EXACTO DEL DASHBOARD)
  const { data: paymentMethodsData } = usePaymentMethodsData(selectedPeriod);
  
  const generateReport = async () => {
    try {
      // Generar PDF con datos reales de métodos de pago
      const pdfDataUri = await generateSalesReportPDF(
        salesData,           // Datos de ventas
        reportMetadata,      // Metadatos del reporte
        paymentMethodsData   // ← DATOS REALES DEL DASHBOARD
      );
      
      // Mostrar o descargar PDF
      // ... tu lógica aquí
      
    } catch (error) {
      console.error('Error generando reporte:', error);
    }
  };
  
  return (
    <div>
      {/* Tu UI aquí */}
      <button onClick={generateReport}>
        Generar Reporte PDF
      </button>
    </div>
  );
}
```

### Paso 2: Estructura de datos esperada

```typescript
// Los datos que vienen de usePaymentMethodsData tienen esta estructura:
interface PaymentMethodData {
  method: string;        // 'cash_usd', 'card_usd', etc.
  totalUSD: number;      // Total en dólares
  totalBS: number;       // Total en bolívares
  count: number;         // Número de transacciones
  percentage: number;    // Porcentaje del total
  color: string;         // Color para el gráfico
}
```

### Paso 3: Métodos de pago soportados

```typescript
// Exactamente los mismos que en el dashboard:
const SUPPORTED_METHODS = {
  'cash_usd': 'Efectivo USD',
  'cash_bs': 'Efectivo BS',
  'card_usd': 'Tarjeta USD',
  'card_bs': 'Tarjeta BS',
  'transfer_usd': 'Transferencia USD',
  'transfer_bs': 'Transferencia BS',
  'zelle': 'Zelle',
  'binance': 'Binance',
  'krece_initial': 'Krece Inicial'
};
```

## 🔧 Código Completo del Componente

```typescript
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateSalesReportPDF } from '@/utils/pdfGenerator';
import { usePaymentMethodsData } from '@/hooks/usePaymentMethodsData';
import { useAuth } from '@/contexts/AuthContext';
import { useReportsData } from '@/hooks/useReportsData';

export function SalesReportGenerator() {
  const { userProfile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'thisMonth'>('today');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // ✅ OBTENER DATOS DEL DASHBOARD
  const { data: paymentMethodsData } = usePaymentMethodsData(selectedPeriod);
  const { data: salesData, loading: salesLoading } = useReportsData(selectedPeriod);
  
  const generateReport = async () => {
    if (!salesData || !paymentMethodsData) {
      console.error('No hay datos disponibles');
      return;
    }
    
    try {
      setIsGenerating(true);
      
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
      
      // ✅ GENERAR PDF CON DATOS REALES
      const pdfDataUri = await generateSalesReportPDF(
        salesData,
        reportMetadata,
        paymentMethodsData  // ← DATOS REALES DEL DASHBOARD
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
        <div className="text-sm text-muted-foreground">
          {paymentMethodsData && (
            <p>✅ Datos de métodos de pago disponibles: {paymentMethodsData.length} métodos</p>
          )}
          {salesData && (
            <p>✅ Datos de ventas disponibles: {salesData.totalOrders} órdenes</p>
          )}
        </div>
        
        {/* Botón de generación */}
        <Button 
          onClick={generateReport} 
          disabled={isGenerating || !salesData || !paymentMethodsData}
          className="w-full"
        >
          {isGenerating ? 'Generando...' : 'Generar Reporte PDF'}
        </Button>
      </div>
    </Card>
  );
}
```

## 🚀 Beneficios de esta Implementación

1. **Datos Reales**: Usa exactamente los mismos datos que el dashboard
2. **Consistencia**: Misma lógica de procesamiento
3. **Mantenibilidad**: No duplica código
4. **Performance**: Reutiliza datos ya cargados
5. **Actualización Automática**: Los datos se actualizan automáticamente

## ⚠️ Notas Importantes

- **No crear funciones duplicadas**: Usar `usePaymentMethodsData` del dashboard
- **No hardcodear datos**: Los datos vienen de la base de datos
- **Mismos nombres de métodos**: Deben coincidir exactamente con el dashboard
- **Misma estructura de datos**: Compatible con la interfaz del dashboard

## 🔍 Verificación

Para verificar que funciona:

1. **Dashboard**: Ver métodos de pago funcionando ✅
2. **Reporte PDF**: Debe mostrar los mismos datos ✅
3. **Consola**: Sin errores ✅
4. **Datos**: Totales coinciden ✅

¡Ahora tu reporte PDF mostrará exactamente los mismos métodos de pago que el dashboard!
