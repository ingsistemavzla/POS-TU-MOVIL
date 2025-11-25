import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, X, Check } from 'lucide-react';

interface IMEIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (imei: string) => void;
  productName: string;
  existingQuantity?: number;
}

export const IMEIModal: React.FC<IMEIModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productName,
  existingQuantity = 0
}) => {
  const [imei, setImei] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');

  // Validar IMEI en tiempo real
  useEffect(() => {
    if (imei.length === 0) {
      setIsValid(false);
      setError('');
    } else if (imei.length < 15) {
      setIsValid(false);
      setError('El IMEI debe tener 15 dígitos');
    } else if (imei.length > 15) {
      setIsValid(false);
      setError('El IMEI no puede tener más de 15 dígitos');
    } else if (!/^[0-9]{15}$/.test(imei)) {
      setIsValid(false);
      setError('El IMEI solo puede contener números');
    } else {
      setIsValid(true);
      setError('');
    }
  }, [imei]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onConfirm(imei);
      setImei('');
      setError('');
    }
  };

  const handleClose = () => {
    setImei('');
    setError('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Solo permitir números
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
            <Smartphone className="h-5 w-5 text-primary" />
            Registrar IMEI del Teléfono
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
            <p className="text-sm text-foreground font-medium">
              Producto: <span className="font-semibold text-primary">{productName}</span>
            </p>
            {existingQuantity > 0 && (
              <p className="text-xs text-primary font-medium mt-1">
                Ya tienes {existingQuantity} teléfono{existingQuantity > 1 ? 's' : ''} en el carrito
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Ingrese el IMEI de 15 dígitos del teléfono {existingQuantity > 0 ? 'adicional' : ''}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="imei" className="text-sm font-medium text-foreground">
                IMEI del Teléfono
              </Label>
              <div className="relative">
                <Input
                  id="imei"
                  type="text"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="123456789012345"
                  maxLength={15}
                  className={`pr-10 glass-card bg-background/90 border-primary/20 focus:border-primary focus:glow-primary ${error ? 'border-red-500' : isValid ? 'border-green-500' : ''}`}
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {isValid && <Check className="h-4 w-4 text-green-500" />}
                  {error && <X className="h-4 w-4 text-red-500" />}
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {error}
                </p>
              )}
              {isValid && (
                <p className="text-sm text-green-500 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  IMEI válido
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 hover-glow"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!isValid}
                className="flex-1 bg-primary hover:bg-primary/90 glow-primary disabled:opacity-50"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                {existingQuantity > 0 ? 'Agregar Otro Teléfono' : 'Agregar al Carrito'}
              </Button>
            </div>
          </form>

          <div className="bg-muted/20 p-3 rounded-lg border border-border/30">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Nota:</strong> El IMEI es un identificador único de 15 dígitos que se encuentra 
              en la etiqueta del teléfono o se puede obtener marcando *#06# en el dispositivo.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
