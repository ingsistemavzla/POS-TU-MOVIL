import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';

export const MAINTENANCE_LOGIN_MESSAGE = 'Failed to fetch';

export function MaintenanceBanner({ show }: { show?: boolean }) {
  const { active } = useMaintenanceMode();

  if (!show && !active) return null;

  return (
    <Alert variant="destructive" className="mb-4 bg-red-500/20 border-red-500/50 text-white">
      <AlertDescription className="text-white font-medium">{MAINTENANCE_LOGIN_MESSAGE}</AlertDescription>
    </Alert>
  );
}
