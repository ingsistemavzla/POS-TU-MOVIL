import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  isMaintenanceModeActive,
  MAINTENANCE_PROTOCOL_ENABLED,
  subscribeMaintenanceMode,
} from '@/config/maintenance';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { isPublicAppPath } from '@/lib/publicInformePaths';
import { supabase } from '@/integrations/supabase/client';

const WATCHDOG_MS = 8_000;

/**
 * Si el mantenimiento está ON y aún hay sesión/UI logueada, expulsa de inmediato
 * y vuelve a comprobar cada pocos segundos + al volver a la pestaña.
 * Cubre el caso "seguía dentro del POS hasta refrescar".
 */
export function MaintenanceSessionWatchdog() {
  if (!MAINTENANCE_PROTOCOL_ENABLED) return null;
  return <MaintenanceSessionWatchdogInner />;
}

function MaintenanceSessionWatchdogInner() {
  const { user, session, signOut } = useAuth();
  const { active } = useMaintenanceMode();
  const busyRef = useRef(false);

  const kick = async () => {
    if (!isMaintenanceModeActive() || busyRef.current) return;

    const { data } = await supabase.auth.getSession();
    const hasSession = Boolean(data.session || user || session);
    if (!hasSession) return;

    busyRef.current = true;
    try {
      console.warn('[Maintenance] Watchdog: sesión detectada — expulsando.');
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        /* ignore */
      }
      try {
        await signOut();
      } catch {
        /* ignore */
      }
      if (!isPublicAppPath(window.location.pathname)) {
        window.location.replace('/?maintenance=1');
      } else if (!window.location.search.includes('maintenance=')) {
        window.location.replace('/?maintenance=1');
      }
    } finally {
      busyRef.current = false;
    }
  };

  useEffect(() => {
    void kick();
  }, [active, user, session]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void kick();
    }, WATCHDOG_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void kick();
    };
    const onFocus = () => {
      void kick();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    const unsub = subscribeMaintenanceMode(() => {
      void kick();
    });

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      unsub();
    };
  }, [user, session, active]);

  return null;
}
