import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getMaintenanceSettings,
  isMaintenanceModeActive,
  subscribeMaintenanceMode,
  type MaintenanceSettings,
} from '@/config/maintenance';

function subscribe(callback: () => void) {
  const unsubMaintenance = subscribeMaintenanceMode(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'pos_maintenance_mode') callback();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    unsubMaintenance();
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): boolean {
  return isMaintenanceModeActive();
}

export function useMaintenanceMode(): {
  active: boolean;
  settings: MaintenanceSettings;
} {
  const active = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const [settings, setSettings] = useState(getMaintenanceSettings);

  useEffect(() => {
    setSettings(getMaintenanceSettings());
  }, [active]);

  return { active, settings };
}
