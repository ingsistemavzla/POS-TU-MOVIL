import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isMaintenanceModeActive, subscribeMaintenanceMode } from '@/config/maintenance';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';

/**
 * Si el modo mantenimiento está ON, expulsa cualquier sesión activa
 * (incluido admin) y envía al login.
 */
export function MaintenanceEnforcer() {
  const { user, userProfile, signOut } = useAuth();
  const { active } = useMaintenanceMode();
  const evictingRef = useRef(false);

  const enforce = async () => {
    if (!isMaintenanceModeActive() || evictingRef.current) return;
    if (!user && !userProfile) return;

    evictingRef.current = true;
    try {
      await signOut();
      if (window.location.pathname !== '/' && window.location.pathname !== '/server') {
        window.location.replace('/');
      }
    } finally {
      evictingRef.current = false;
    }
  };

  useEffect(() => {
    void enforce();
  }, [active, user, userProfile]);

  useEffect(() => {
    return subscribeMaintenanceMode(() => {
      if (isMaintenanceModeActive()) void enforce();
    });
  }, [user, userProfile]);

  return null;
}
