import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, Mail } from 'lucide-react';

interface GlassRegisterFormProps {
  onToggleMode: () => void;
}

export const GlassRegisterForm: React.FC<GlassRegisterFormProps> = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const { signUp } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.name || formData.name.trim().length === 0) {
      setError('El nombre es requerido');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    // Verificar si el email ya tiene un perfil creado por admin
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id, name, company_id, role, assigned_store_id')
      .eq('email', formData.email)
      .maybeSingle();

    // Si tiene perfil, usar los datos del perfil; si no, usar los del formulario
    const userName = existingProfile?.name || formData.name || formData.email.split('@')[0];
    const companyName = existingProfile ? 'Empresa Existente' : formData.email.split('@')[1].split('.')[0];
    
    // CRITICAL: Pass company_id to trigger - required for profile creation
    const companyId = existingProfile?.company_id || undefined;
    const role = existingProfile?.role || undefined;
    const assignedStoreId = existingProfile?.assigned_store_id || undefined;

    const { error } = await signUp(
      formData.email, 
      formData.password, 
      companyName, 
      userName,
      companyId,      // Pass company_id for trigger
      role,           // Pass role if exists
      assignedStoreId // Pass assigned_store_id if exists
    );
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setUserEmail(formData.email);
    }
    
    setLoading(false);
  };

  return (
    <>
      <div className="w-full glass-card rounded-2xl p-8">
        <div className="space-y-4 mb-6">
          <h2 className="text-2xl font-bold text-white text-center">Registrar Usuario</h2>
          <p className="text-sm text-white/70 text-center">
            Crea tu cuenta para acceder al sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {error && (
            <Alert variant="destructive" className="bg-red-500/20 border-red-500/50 text-white">
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="bg-emerald-500/20 border-emerald-500/50 text-white">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="text-white">
                <div className="space-y-1">
                  <p className="font-medium text-sm">¡Registro exitoso!</p>
                  <p className="text-xs">Tu cuenta ha sido creada con el email: <strong>{userEmail}</strong></p>
                  <p className="text-xs">Ya puedes iniciar sesión con tus credenciales.</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-white/90">Nombre Completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Juan Pérez"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              disabled={loading}
              className="bg-slate-950/50 border-emerald-500/30 !text-white placeholder:text-white/50 focus:ring-[#00FF7F] focus:border-[#00FF7F] h-10"
              style={{ color: '#ffffff !important' }}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-white/90">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@miempresa.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              disabled={loading}
              className="bg-slate-950/50 border-emerald-500/30 !text-white placeholder:text-white/50 focus:ring-[#00FF7F] focus:border-[#00FF7F] h-10"
              style={{ color: '#ffffff !important' }}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-white/90">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
              disabled={loading}
              className="bg-slate-950/50 border-emerald-500/30 !text-white placeholder:text-white/50 focus:ring-[#00FF7F] focus:border-[#00FF7F] h-10"
              style={{ color: '#ffffff !important' }}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm text-white/90">Confirmar Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              required
              disabled={loading}
              className="bg-slate-950/50 border-emerald-500/30 !text-white placeholder:text-white/50 focus:ring-[#00FF7F] focus:border-[#00FF7F] h-10"
              style={{ color: '#ffffff !important' }}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-10 transition-all duration-300 text-white font-bold" 
            disabled={loading || success}
            style={{
              background: 'var(--btn-gradient)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Registro Exitoso
              </>
            ) : (
              'Registrar Usuario'
            )}
          </Button>
          
          <div className="text-center pt-2">
            {success ? (
              <Button 
                type="button" 
                variant="link" 
                onClick={onToggleMode}
                className="text-sm text-[#00FF7F] hover:text-[#00ff9d] underline-offset-4"
              >
                Ir a Iniciar Sesión
              </Button>
            ) : (
              <Button 
                type="button" 
                variant="link" 
                onClick={onToggleMode}
                disabled={loading}
                className="text-sm text-[#00FF7F] hover:text-[#00ff9d] underline-offset-4"
              >
                ¿Ya tienes cuenta? Iniciar sesión
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Modal de Confirmación de Correo */}
      <Dialog open={success} onOpenChange={setSuccess}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-emerald-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span className="text-lg">¡Registro Exitoso!</span>
            </DialogTitle>
            <DialogDescription className="space-y-3 text-white/70">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Mail className="h-6 w-6 text-emerald-400" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-base font-medium text-white">
                    ¡Cuenta creada exitosamente!
                  </p>
                  <p className="text-xs text-white/70">
                    Tu cuenta ha sido registrada con el correo:
                  </p>
                  <p className="text-xs font-medium text-emerald-400 bg-emerald-500/10 p-2 rounded">
                    {userEmail}
                  </p>
                </div>

                <div className="space-y-2 text-xs text-white/70">
                  <p>Ya puedes iniciar sesión con tus credenciales.</p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center">
            <Button 
              onClick={() => {
                setSuccess(false);
                onToggleMode();
              }}
              className="w-full transition-all duration-300 text-white font-bold"
              style={{
                background: 'var(--btn-gradient)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              Ir a Iniciar Sesión
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};


