import { useEffect, useRef } from 'react';

/** ID de este bundle (inyectado en build). Si el servidor publica otro, se recarga la pestaña. */
export const CLIENT_BUILD_ID =
  typeof import.meta.env.VITE_BUILD_ID === 'string' && import.meta.env.VITE_BUILD_ID
    ? import.meta.env.VITE_BUILD_ID
    : 'dev';

const POLL_MS = 20_000;
const STORAGE_KEY = 'pos_client_build_id';
const RELOAD_GUARD_KEY = 'pos_deploy_reload_once';

/** Solo acepta ids numéricos/cortos; rechaza HTML del rewrite SPA. */
function isValidBuildId(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 64) return false;
  if (v.includes('<') || v.includes('DOCTYPE') || v.includes('html')) return false;
  return /^[a-zA-Z0-9._-]+$/.test(v);
}

function hardReloadForDeploy(remoteBuildId: string): void {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, remoteBuildId);
  } catch {
    /* ignore */
  }
  // Navegación completa: descarta JS/estado en memoria (sin residuos del bundle anterior).
  const url = new URL(window.location.href);
  url.searchParams.set('_b', remoteBuildId);
  window.location.replace(url.toString());
}

/**
 * Detecta un nuevo deploy y fuerza hard refresh UNA vez.
 * Requiere que `/build-id.txt` se sirva como texto estático (no HTML del SPA).
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
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html')) return;

        const remote = (await res.text()).trim();
        if (!isValidBuildId(remote)) return;

        // Ya alineados con el deploy publicado: limpia marcador de hard refresh.
        if (remote === CLIENT_BUILD_ID) {
          try {
            const url = new URL(window.location.href);
            if (url.searchParams.has('_b')) {
              url.searchParams.delete('_b');
              window.history.replaceState(null, '', url.pathname + url.search + url.hash);
            }
          } catch {
            /* ignore */
          }
          return;
        }

        // Evita bucle si ya intentamos cargar este remote y el id local aún no coincide.
        try {
          if (sessionStorage.getItem(RELOAD_GUARD_KEY) === remote) return;
        } catch {
          /* ignore */
        }

        reloadingRef.current = true;
        console.warn('[Deploy] Nuevo build detectado — hard refresh.', {
          local: CLIENT_BUILD_ID,
          remote,
        });
        hardReloadForDeploy(remote);
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
