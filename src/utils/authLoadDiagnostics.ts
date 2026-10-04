/**
 * L1-05J — Instrumentación diagnóstica Auth (solo observabilidad).
 * Misma activación que inventario: localStorage pos_inv_load_diag=1 (o DEV).
 *
 * No mide navigator.locks directamente (internals.debug de gotrue es
 * module-load-time). Con bootstrap previo, gotrue emite sus propios
 * console.log de acquire/release cuando locks.debug=true.
 */

import { diagNow, isInventoryLoadDiagEnabled, roundDiagMs } from '@/utils/inventoryLoadDiagnostics';

const LOG_PREFIX = '[AUTH_LOAD_DIAG]';

type AuthDiagFields = Record<string, string | number | boolean | null | undefined>;

export function logAuthLoadEvent(event: string, fields: AuthDiagFields = {}): void {
  if (!isInventoryLoadDiagEnabled()) return;
  console.info(LOG_PREFIX, event, {
    EVENT: event,
    DIAG_ENABLED: true,
    AT_MS: roundDiagMs(diagNow()),
    ...fields,
  });
}

export function beginAuthTimedOp(eventStart: string, fields: AuthDiagFields = {}): number {
  const t0 = diagNow();
  logAuthLoadEvent(eventStart, { ...fields, START_MS: roundDiagMs(t0) });
  return t0;
}

export function endAuthTimedOp(
  eventEnd: string,
  t0: number,
  fields: AuthDiagFields = {}
): number {
  const t1 = diagNow();
  const durationMs = roundDiagMs(t1 - t0);
  logAuthLoadEvent(eventEnd, {
    ...fields,
    START_MS: roundDiagMs(t0),
    END_MS: roundDiagMs(t1),
    DURATION_MS: durationMs,
  });
  return durationMs;
}

/** Verifica soporte de la clave de debug de locks en auth-js instalado (documentación estática). */
export const GOTRUE_LOCKS_DEBUG_KEY = 'supabase.gotrue-js.locks.debug';
