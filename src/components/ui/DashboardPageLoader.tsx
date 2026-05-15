import { LoadingScreen } from '@/components/ui/LoadingScreen';

/** Única pantalla de carga del dashboard (Suspense + datos) */
export function DashboardPageLoader() {
  return <LoadingScreen message="Cargando datos del dashboard..." />;
}
