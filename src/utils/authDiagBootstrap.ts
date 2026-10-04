/**
 * L1-05J — Debe importarse ANTES de @supabase/* para que
 * `supabase.gotrue-js.locks.debug` se lea al cargar auth-js.
 *
 * Solo activa el debug de locks si pos_inv_load_diag=1.
 * No altera comportamiento Auth ni crea timers.
 */
const DIAG_FLAG_KEY = 'pos_inv_load_diag';
const GOTRUE_LOCKS_DEBUG_KEY = 'supabase.gotrue-js.locks.debug';

try {
  if (typeof window !== 'undefined' && window.localStorage?.getItem(DIAG_FLAG_KEY) === '1') {
    window.localStorage.setItem(GOTRUE_LOCKS_DEBUG_KEY, 'true');
  }
} catch {
  /* ignore */
}

export {};
