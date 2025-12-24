import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, Mail } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Inicializar campos cuando se abre el modal
  useEffect(() => {
    if (isOpen && userProfile) {
      setName(userProfile.name || '');
      setEmail(userProfile.email || '');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validaciones
      if (!name.trim()) {
        setError('El nombre es requerido');
        return;
      }

      if (!email.trim()) {
        setError('El email es requerido');
        return;
      }

      // Actualizar perfil en la base de datos
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          email: email.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        setError('Error al actualizar el perfil');
        return;
      }

      // Actualizar email en auth si cambió
      let emailChanged = false;
      if (email.trim() !== userProfile.email) {
        console.log('Email changed, updating auth user...');
        console.log('Old email:', userProfile.email);
        console.log('New email:', email.trim());
        emailChanged = true;
        
        try {
          // Try the standard Supabase auth update first
          const { data: authData, error: authError } = await supabase.auth.updateUser({
            email: email.trim()
          });

          console.log('Auth update result:', { authData, authError });

          if (authError) {
            console.error('Standard auth update failed:', authError);
            
            // If standard update fails, try using RPC function as fallback
            console.log('Trying RPC function as fallback...');
            const { data: rpcData, error: rpcError } = await supabase.rpc('update_auth_user_email', {
              p_user_id: userProfile.auth_user_id,
              p_new_email: email.trim()
            });

            console.log('RPC update result:', { rpcData, rpcError });

            if (rpcError || !rpcData?.success) {
              console.error('RPC update also failed:', rpcError || rpcData);
              setError(`Error al actualizar el email: ${authError.message}. Fallback también falló.`);
              setLoading(false);
              return;
            } else {
              console.log('RPC update successful:', rpcData);
            }
          } else {
            console.log('Standard auth update successful:', authData);
          }
        } catch (authErr) {
          console.error('Exception updating auth email:', authErr);
          setError(`Error al actualizar el email: ${authErr}`);
          setLoading(false);
          return;
        }
      }

      // Verificar el estado actual del usuario autenticado
      if (emailChanged) {
        console.log('Verifying current auth user...');
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        console.log('Current auth user after update:', currentUser);
        
        if (currentUser?.email !== email.trim()) {
          console.warn('Auth user email does not match updated email');
          console.log('Expected:', email.trim());
          console.log('Actual:', currentUser?.email);
        }
      }

      // Refrescar el perfil
      await refreshProfile();
      
      // Mostrar mensaje de éxito
      if (emailChanged) {
        setSuccess('Perfil actualizado. El email se ha actualizado en la autenticación.');
      } else {
        setSuccess('Perfil actualizado correctamente.');
      }
      
      // Cerrar modal después de un breve delay para mostrar el mensaje
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('Error inesperado al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Editar Perfil
          </DialogTitle>
          <DialogDescription>
            Actualiza tu información personal. Los cambios se reflejarán inmediatamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nombre Completo
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo"
              disabled={loading}
              className="glass-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
              className="glass-card"
            />
            <p className="text-xs text-muted-foreground">
              El cambio de email se aplicará inmediatamente.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {success && (
            <Alert variant="success" className="p-3">
              <AlertDescription className="text-white">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
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
              disabled={loading || !name.trim() || !email.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Perfil'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
