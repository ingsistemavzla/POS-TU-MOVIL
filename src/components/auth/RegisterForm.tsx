import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, Mail, ExternalLink } from 'lucide-react';

interface RegisterFormProps {
  onToggleMode: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    userName: '',
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

    const { error } = await signUp(
      formData.email, 
      formData.password, 
      formData.companyName, 
      formData.userName
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
              <Card className="w-full max-w-md mx-auto shadow-lg border-0 ring-1 ring-primary/20 ring-offset-0 hover:ring-primary/30 transition-all duration-300 glow-primary hover:shadow-2xl hover:shadow-primary/20">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-lg font-bold text-center">Registrar Empresa</CardTitle>
        <CardDescription className="text-center text-xs">
          Crea tu cuenta y configura tu empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-1">
                  <p className="font-medium text-sm">¡Registro exitoso!</p>
                  <p className="text-xs">Se ha enviado un correo de confirmación a <strong>{userEmail}</strong></p>
                  <p className="text-xs">Por favor, revisa tu bandeja de entrada y confirma tu correo electrónico.</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-1">
            <Label htmlFor="companyName" className="text-xs">Nombre de la Empresa</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Mi Empresa S.A."
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              required
              disabled={loading}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="userName" className="text-xs">Tu Nombre Completo</Label>
            <Input
              id="userName"
              type="text"
              placeholder="Juan Pérez"
              value={formData.userName}
              onChange={(e) => handleInputChange('userName', e.target.value)}
              required
              disabled={loading}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@miempresa.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              disabled={loading}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
              disabled={loading}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className="text-xs">Confirmar Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              required
              disabled={loading}
              className="h-8 text-sm"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-8 text-sm" 
            disabled={loading || success}
          >
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {success ? (
              <>
                <Mail className="mr-2 h-3 w-3" />
                Correo Enviado
              </>
            ) : (
              'Registrar Empresa'
            )}
          </Button>
          
          <div className="text-center pt-1">
            {success ? (
              <Button 
                type="button" 
                variant="link" 
                onClick={onToggleMode}
                className="text-xs"
              >
                Ir a Iniciar Sesión
              </Button>
            ) : (
              <Button 
                type="button" 
                variant="link" 
                onClick={onToggleMode}
                disabled={loading}
                className="text-xs"
              >
                ¿Ya tienes cuenta? Iniciar sesión
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>

    {/* Modal de Confirmación de Correo */}
    <Dialog open={success} onOpenChange={setSuccess}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-lg">¡Registro Exitoso!</span>
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <p className="text-base font-medium text-foreground">
                  Correo de confirmación enviado
                </p>
                <p className="text-xs text-muted-foreground">
                  Hemos enviado un correo de confirmación a:
                </p>
                <p className="text-xs font-medium text-primary bg-primary/10 p-2 rounded">
                  {userEmail}
                </p>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p>Para activar tu cuenta, por favor:</p>
                <ol className="list-decimal list-inside space-y-1 text-left">
                  <li>Revisa tu bandeja de entrada</li>
                  <li>Busca el correo de "Confirmación de cuenta"</li>
                  <li>Haz clic en el enlace de confirmación</li>
                  <li>Inicia sesión con tus credenciales</li>
                </ol>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <p className="text-xs text-amber-800">
                  <strong>Nota:</strong> Si no ves el correo, revisa tu carpeta de spam o correo no deseado.
                </p>
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
            className="w-full"
          >
            Ir a Iniciar Sesión
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
