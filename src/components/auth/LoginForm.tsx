import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface LoginFormProps {
  onToggleMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 ring-1 ring-primary/20 ring-offset-0 hover:ring-primary/30 transition-all duration-300 glow-primary hover:shadow-2xl hover:shadow-primary/20">
      <CardHeader className="space-y-2 pb-4">
        <CardTitle className="text-xl font-bold text-center">Iniciar Sesión</CardTitle>
        <CardDescription className="text-center text-sm">
          Ingresa tus credenciales para acceder al sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-1">
            <Label htmlFor="email" className="text-sm">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-9"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="password" className="text-sm">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-9"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-9" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar Sesión
          </Button>
          
          <div className="text-center pt-1">
            <Button 
              type="button" 
              variant="link" 
              onClick={onToggleMode}
              disabled={loading}
              className="text-sm"
            >
              ¿No tienes cuenta? Registrar empresa
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
