/**
 * Experiencia de carga presentacional (L1-06F).
 *
 * OPTIMIZED (default): comportamiento productivo actual — sin gate visual extra.
 * LEGACY_SIMULATION: mantiene SOLO la presentación de loading un mínimo de ms
 * en entradas deliberadas a Estadísticas / Almacén / Artículos.
 *
 * No altera fetch, Auth, cachés, TTL, concurrency ni lógica de negocio.
 */

export type PerformanceExperienceMode = 'OPTIMIZED' | 'LEGACY_SIMULATION';

export type PresentationReason =
  | 'initial_entry'
  | 'store_change'
  | 'background_refresh'
  | 'manual_refresh'
  | 'filter_change'
  | 'other';

const DEFAULT_MODE: PerformanceExperienceMode = 'OPTIMIZED';
const DEFAULT_LEGACY_MINIMUM_LOADING_MS = 30_000;
const MIN_LEGACY_MS = 0;
const MAX_LEGACY_MS = 120_000;

function readEnvString(key: string): string | undefined {
  try {
    const env = import.meta.env as Record<string, string | boolean | undefined>;
    const v = env[key];
    return typeof v === 'string' ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Sanitiza modo; cualquier valor desconocido → OPTIMIZED. */
export function parsePerformanceExperienceMode(
  raw: string | undefined | null
): PerformanceExperienceMode {
  if (!raw) return DEFAULT_MODE;
  const normalized = String(raw).trim().toUpperCase();
  if (normalized === 'LEGACY_SIMULATION' || normalized === 'LEGACY') {
    return 'LEGACY_SIMULATION';
  }
  if (normalized === 'OPTIMIZED') return 'OPTIMIZED';
  return DEFAULT_MODE;
}

/** Sanitiza ms; NaN/negativo/fuera de rango → default seguro. */
export function parseLegacyMinimumLoadingMs(
  raw: string | undefined | null,
  fallback = DEFAULT_LEGACY_MINIMUM_LOADING_MS
): number {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  if (rounded < MIN_LEGACY_MS || rounded > MAX_LEGACY_MS) return fallback;
  return rounded;
}

export function getPerformanceExperienceMode(): PerformanceExperienceMode {
  return parsePerformanceExperienceMode(readEnvString('VITE_PERFORMANCE_EXPERIENCE_MODE'));
}

export function getLegacyMinimumLoadingMs(): number {
  return parseLegacyMinimumLoadingMs(readEnvString('VITE_LEGACY_MINIMUM_LOADING_MS'));
}

export function isLegacySimulationActive(): boolean {
  return getPerformanceExperienceMode() === 'LEGACY_SIMULATION';
}

/** Razones que aplican ventana visual en LEGACY_SIMULATION. */
export function shouldApplyLegacyPresentation(reason: PresentationReason): boolean {
  return reason === 'initial_entry' || reason === 'store_change';
}

export const PERFORMANCE_EXPERIENCE_DEFAULTS = {
  mode: DEFAULT_MODE,
  legacyMinimumLoadingMs: DEFAULT_LEGACY_MINIMUM_LOADING_MS,
} as const;
