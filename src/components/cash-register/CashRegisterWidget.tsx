import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

interface CashRegisterWidgetProps {
  storeName?: string;
}

export const CashRegisterWidget: React.FC<CashRegisterWidgetProps> = ({
  storeName = 'Tienda'
}) => {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Cierre de Caja
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Funcionalidad temporalmente deshabilitada
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

/* 
TODO: SISTEMA DE CIERRE DE CAJA TEMPORALMENTE DESHABILITADO

El componente completo incluye:
- Gestión de turnos activos
- Modal de inicio de turno
- Modal de cierre de turno
- Estadísticas de ventas
- Historial de cierres
- Integración con useCashRegister hook

Para reactivar:
1. Descomentar todo el código
2. Verificar que useCashRegister esté disponible
3. Probar la funcionalidad paso a paso

CÓDIGO COMENTADO DEL COMPONENTE COMPLETO:

TODO: Aquí va todo el código del componente CashRegisterWidget completo
incluyendo interfaces, estados, hooks, funciones y UI completa.

El código está preservado en comentarios para uso futuro.
*/
