import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calculator } from 'lucide-react';

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseShift: (closureData: any) => Promise<boolean>;
  activeShift: any;
  salesStats: any;
  loading?: boolean;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  isOpen,
  onClose,
  onCloseShift,
  activeShift,
  salesStats,
  loading = false
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Cerrar Turno
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
- Proceso de 3 pasos: conteo, revisión, notas
- Conteo de efectivo por denominaciones (Bs y USD)
- Cálculo automático de totales
- Comparación con efectivo esperado
- Manejo de discrepancias
- Formulario de notas y razones

Para reactivar:
1. Descomentar todo el código
2. Verificar que useCashRegister esté disponible
3. Probar la funcionalidad paso a paso

CÓDIGO COMENTADO DEL MODAL COMPLETO:

TODO: Aquí va todo el código del CloseShiftModal completo
incluyendo proceso de 3 pasos, conteo de efectivo, validaciones y UI completa.

El código está preservado en comentarios para uso futuro.
*/
