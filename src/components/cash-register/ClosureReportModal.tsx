import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileText } from 'lucide-react';

interface ClosureReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  closure: any;
  storeName?: string;
}

export const ClosureReportModal: React.FC<ClosureReportModalProps> = ({
  isOpen,
  onClose,
  closure,
  storeName = 'Tienda'
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Reporte de Cierre
          </DialogTitle>
          <DialogDescription>
            Funcionalidad temporalmente deshabilitada
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Esta funcionalidad está temporalmente deshabilitada
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* 
TODO: SISTEMA DE CIERRE DE CAJA TEMPORALMENTE DESHABILITADO

El modal completo incluye:
- Reporte detallado del cierre de caja
- Desglose de ventas por método de pago
- Conteo de efectivo por denominaciones
- Comparación de efectivo esperado vs contado
- Funcionalidad de impresión y descarga
- Formato profesional para auditoría

Para reactivar:
1. Descomentar todo el código
2. Verificar que useCashRegister esté disponible
3. Probar la funcionalidad paso a paso

CÓDIGO COMENTADO DEL MODAL COMPLETO:

TODO: Aquí va todo el código del ClosureReportModal completo
incluyendo reporte detallado, impresión, descarga y UI completa.

El código está preservado en comentarios para uso futuro.
*/
