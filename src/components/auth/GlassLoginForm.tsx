import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface GlassLoginFormProps {
  onToggleMode: () => void;
}

export const GlassLoginForm: React.FC<GlassLoginFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // signIn now waits for profile to be loaded
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(error.message || 'Error al iniciar sesión');
      }
      // If no error, the AuthContext will handle the redirect via RoleBasedRedirect
      // The loading state in AuthContext will control when the app is ready
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Error inesperado al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full glass-card rounded-2xl p-8">
      <div className="space-y-4 mb-6">
        {/* Logo justo encima del título */}
        <div className="flex justify-center mb-4">
          <img 
            src="/TUMOVILMGTA.png" 
            alt="Logo Tu Móvil Margarita" 
            className="h-20 w-20 object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold text-white text-center">Iniciar Sesión</h2>
        <p className="text-sm text-white/70 text-center">
          Ingresa tus credenciales para acceder al sistema
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {error && (
          <Alert variant="destructive" className="bg-red-500/20 border-red-500/50 text-white">
            <AlertDescription className="text-white">{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm text-white/90">Correo Electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="bg-slate-950/50 border-emerald-500/30 !text-white placeholder:text-white/50 focus:ring-[#00FF7F] focus:border-[#00FF7F] h-10"
            style={{ color: '#ffffff' }}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm text-white/90">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="bg-slate-950/50 border-emerald-500/30 !text-white placeholder:text-white/50 focus:ring-[#00FF7F] focus:border-[#00FF7F] h-10"
            style={{ color: '#ffffff' }}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full h-10 transition-all duration-300 text-white font-bold" 
          disabled={loading}
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
          Iniciar Sesión
        </Button>
        
        <div className="text-center pt-2">
          <Button 
            type="button" 
            variant="link" 
            onClick={onToggleMode}
            disabled={loading}
            className="text-sm text-[#00FF7F] hover:text-[#00ff9d] underline-offset-4"
          >
            ¿No tienes cuenta? Registrar empresa
          </Button>
        </div>
      </form>
    </div>
  );
};

