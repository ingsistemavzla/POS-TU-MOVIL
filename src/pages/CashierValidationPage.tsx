import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function CashierValidationPage() {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [validationStatus, setValidationStatus] = useState<'validating' | 'valid' | 'invalid'>('validating');

  useEffect(() => {
    // Timeout de validación (3 segundos)
    const validationTimeout = setTimeout(() => {
      if (loading) {
        setValidationStatus('invalid');
        setTimeout(() => {
          navigate('/');
        }, 2000);
        return;
      }

      if (!user || !userProfile) {
        setValidationStatus('invalid');
        setTimeout(() => {
          navigate('/');
        }, 2000);
        return;
      }

      if (userProfile.role !== 'cashier') {
        setValidationStatus('invalid');
        setTimeout(() => {
          navigate('/');
        }, 2000);
        return;
      }

      // Validación exitosa
      setValidationStatus('valid');
      setTimeout(() => {
        navigate('/pos');
      }, 1500);
    }, 3000);

    return () => clearTimeout(validationTimeout);
  }, [user, userProfile, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="p-8 w-full max-w-md">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            {validationStatus === 'validating' && (
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
            )}
            {validationStatus === 'valid' && (
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            )}
            {validationStatus === 'invalid' && (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {validationStatus === 'validating' && 'Validando Cajero...'}
              {validationStatus === 'valid' && 'Sesión Validada'}
              {validationStatus === 'invalid' && 'Sesión Inválida'}
            </h1>
            <p className="text-muted-foreground">
              {validationStatus === 'validating' && 'Verificando credenciales y permisos...'}
              {validationStatus === 'valid' && 'Redirigiendo al punto de venta...'}
              {validationStatus === 'invalid' && 'No tienes acceso. Redirigiendo al login...'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}





