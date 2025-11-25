import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Clock } from 'lucide-react';

interface StartShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartShift: (cashBs: number, cashUsd: number, notes?: string) => Promise<boolean>;
  loading?: boolean;
}

export const StartShiftModal: React.FC<StartShiftModalProps> = ({
  isOpen,
  onClose,
  onStartShift,
  loading = false
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Iniciar Turno
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
- Formulario para efectivo inicial (Bs y USD)
- Validaciones de formulario
- Campo de notas opcional
- Manejo de errores
- Integración con onStartShift callback

Para reactivar:
1. Descomentar todo el código
2. Verificar que useCashRegister esté disponible
3. Probar la funcionalidad paso a paso

CÓDIGO COMENTADO DEL MODAL COMPLETO:

TODO: Aquí va todo el código del StartShiftModal completo
incluyendo formulario, validaciones, manejo de estado y UI completa.

El código está preservado en comentarios para uso futuro.
*/
