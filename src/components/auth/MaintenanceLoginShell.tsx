import { lazy, Suspense } from 'react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

const AuthPage = lazy(() => import('@/pages/AuthPage'));

/** Login completo (misma UI que producción) durante mantenimiento. */
export function MaintenanceLoginShell() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando..." />}>
      <AuthPage />
    </Suspense>
  );
}
