import { useEffect, useRef } from 'react';

/** ID de este bundle (inyectado en build). Si el servidor publica otro, se recarga la pestaña. */
export const CLIENT_BUILD_ID =
  typeof import.meta.env.VITE_BUILD_ID === 'string' && import.meta.env.VITE_BUILD_ID
    ? import.meta.env.VITE_BUILD_ID
    : 'dev';

const POLL_MS = 20_000;
const STORAGE_KEY = 'pos_client_build_id';

/**
 * Detecta un nuevo deploy y recarga la pestaña abierta.
 * Así el mantenimiento (u otros cambios) no dependen de que el usuario refresque a mano.
 */
export function DeployReloadWatchdog() {
  const reloadingRef = useRef(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, CLIENT_BUILD_ID);
    } catch {
      /* ignore */
    }

    const check = async () => {
      if (reloadingRef.current) return;
      try {
        const res = await fetch(`/build-id.txt?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const remote = (await res.text()).trim();
        if (!remote || remote === CLIENT_BUILD_ID) return;
        reloadingRef.current = true;
        console.warn('[Deploy] Nuevo build detectado — recargando pestaña.', {
          local: CLIENT_BUILD_ID,
          remote,
        });
        window.location.reload();
      } catch {
        /* red / offline */
      }
    };

    void check();
    const id = window.setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
