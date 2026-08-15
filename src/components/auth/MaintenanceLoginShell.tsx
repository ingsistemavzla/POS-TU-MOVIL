import { lazy, Suspense, useEffect } from 'react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import {
  isMaintenanceModeActive,
  MAINTENANCE_PROTOCOL_ENABLED,
} from '@/config/maintenance';
import { supabase } from '@/integrations/supabase/client';

const AuthPage = lazy(() => import('@/pages/AuthPage'));

/** Login completo (misma UI que producción) durante mantenimiento. */
export function MaintenanceLoginShell() {
  useEffect(() => {
    if (!MAINTENANCE_PROTOCOL_ENABLED || !isMaintenanceModeActive()) return;
    // Solo limpiar sesión residual. NO enable() + replace: provoca bucle de carga.
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await supabase.auth.signOut({ scope: 'local' });
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return (
    <Suspense fallback={<LoadingScreen message="Cargando..." />}>
      <AuthPage />
    </Suspense>
  );
}
