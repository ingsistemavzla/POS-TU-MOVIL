import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { MAINTENANCE_LOGIN_MESSAGE } from '@/config/maintenance';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { cn } from '@/lib/utils';
import { LoginLordIcon } from '@/components/auth/LoginLordIcon';

interface GlassLoginFormProps {
  onToggleMode: () => void;
}

export const GlassLoginForm: React.FC<GlassLoginFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchFailedOverlay, setFetchFailedOverlay] = useState(false);
  const { signIn } = useAuth();
  const { active: maintenanceActive } = useMaintenanceMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFetchFailedOverlay(false);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        const msg = signInError.message || 'Error al iniciar sesión';
        if (maintenanceActive || msg === MAINTENANCE_LOGIN_MESSAGE) {
          setFetchFailedOverlay(true);
          setError(null);
        } else {
          setError(msg);
        }
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const message = err instanceof Error ? err.message : 'Error inesperado al iniciar sesión';
      if (maintenanceActive || message === MAINTENANCE_LOGIN_MESSAGE) {
        setFetchFailedOverlay(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full glass-card rounded-2xl p-8">
      <div className="space-y-4 mb-4">
        <div className="flex justify-center mb-2">
          <LoginLordIcon size={140} />
        </div>
        <h2 className="text-2xl font-bold text-white text-center">Iniciar Sesión</h2>
        <p className="text-sm text-white/70 text-center">
          Ingresa tus credenciales para acceder al sistema
        </p>
      </div>

      {fetchFailedOverlay && (
        <Alert
          variant="destructive"
          className="mb-4 bg-red-500/25 border-red-500/45 text-white shadow-lg shadow-red-950/20"
          role="alert"
          aria-live="assertive"
        >
          <AlertDescription className="text-center text-white font-semibold">
            {MAINTENANCE_LOGIN_MESSAGE}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4">
        {error && !fetchFailedOverlay && (
          <Alert variant="destructive" className="bg-red-500/20 border-red-500/50 text-white">
            <AlertDescription className="text-white">{error}</AlertDescription>
          </Alert>
        )}

        <div
          className={cn(
            'grid gap-4 transition-opacity duration-300',
            fetchFailedOverlay && 'opacity-50'
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-white/90">
              Correo Electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFetchFailedOverlay(false);
              }}
              required
              disabled={loading}
              className="bg-slate-950/60 border-white/10 !text-white placeholder:text-white/40 focus:ring-[#2563EB]/50 focus:border-[#2563EB]/60 h-10"
              style={{ color: '#ffffff !important' }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-white/90">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFetchFailedOverlay(false);
              }}
              required
              disabled={loading}
              className="bg-slate-950/60 border-white/10 !text-white placeholder:text-white/40 focus:ring-[#2563EB]/50 focus:border-[#2563EB]/60 h-10"
              style={{ color: '#ffffff !important' }}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10 transition-all duration-300 text-white font-bold"
            disabled={loading}
            style={{ background: 'var(--btn-gradient)' }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar Sesión
          </Button>
        </div>

        <div className="text-center pt-2">
          <Button
            type="button"
            variant="link"
            onClick={onToggleMode}
            disabled={loading}
            className="text-sm text-[#2563EB] hover:text-[#60A5FA] underline-offset-4"
          >
            ¿No tienes cuenta? Registrar empresa
          </Button>
        </div>
      </form>
    </div>
  );
};
