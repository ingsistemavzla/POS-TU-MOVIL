import { useEffect, useRef } from 'react';

/** ID de este bundle (inyectado en build). Si el servidor publica otro, se recarga la pestaña. */
export const CLIENT_BUILD_ID =
  typeof import.meta.env.VITE_BUILD_ID === 'string' && import.meta.env.VITE_BUILD_ID
    ? import.meta.env.VITE_BUILD_ID
    : 'dev';

const POLL_MS = 30_000;
const STORAGE_KEY = 'pos_client_build_id';
const RELOAD_GUARD_KEY = 'pos_deploy_reload_once';

/** Solo acepta ids numéricos/cortos; rechaza HTML del rewrite SPA. */
function isValidBuildId(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 64) return false;
  if (v.includes('<') || v.includes('DOCTYPE') || v.includes('html')) return false;
  return /^[a-zA-Z0-9._-]+$/.test(v);
}

/**
 * Detecta un nuevo deploy y recarga la pestaña UNA vez.
 * No montar en App hasta confirmar que /build-id.txt se sirve como texto estático
 * (si el hosting reescribe a index.html, provoca parpadeo).
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
        if (sessionStorage.getItem(RELOAD_GUARD_KEY) === CLIENT_BUILD_ID) {
          return;
        }
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch(`/build-id.txt?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html')) return;

        const remote = (await res.text()).trim();
        if (!isValidBuildId(remote)) return;
        if (remote === CLIENT_BUILD_ID) return;

        reloadingRef.current = true;
        try {
          sessionStorage.setItem(RELOAD_GUARD_KEY, CLIENT_BUILD_ID);
        } catch {
          /* ignore */
        }
        console.warn('[Deploy] Nuevo build detectado — recargando pestaña una vez.', {
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
    return () => {
      window.clearInterval(id);
    };
  }, []);

  return null;
}
