import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInitialSetup?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  isInitialSetup = false,
}) => {
  const { toast } = useToast();
  const { markPasswordAsSetup } = useAuth();
  const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
   
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Validar nueva contraseña
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }

    // Validar confirmación
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirma tu nueva contraseña';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Cambiar contraseña usando Supabase
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) {
        // Si hay error, verificar si es por contraseña actual incorrecta
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ currentPassword: 'La contraseña actual es incorrecta' });
        } else {
          throw error;
        }
        return;
      }

             // Éxito - Siempre marcar como configurada
       await markPasswordAsSetup();
       
       toast({
         title: "Contraseña configurada",
         description: "Tu contraseña ha sido configurada exitosamente. Ya puedes acceder al sistema.",
       });

      // Limpiar formulario y cerrar modal
      setFormData({
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
      onClose();

    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar la contraseña. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleClose = () => {
    // Limpiar formulario al cerrar
    setFormData({
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Configurar Contraseña
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                placeholder="Ingresa tu nueva contraseña"
                className={errors.newPassword ? "border-red-500" : ""}
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.newPassword}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirma tu nueva contraseña"
                className={errors.confirmPassword ? "border-red-500" : ""}
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.confirmPassword}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Información de seguridad */}
          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Recomendaciones de seguridad:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Usa al menos 6 caracteres</li>
                <li>• Combina letras, números y símbolos</li>
                <li>• No uses información personal</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? "Configurando..." : "Configurar Contraseña"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
