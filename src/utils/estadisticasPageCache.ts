/** Cache de sesión para Estadísticas (stale-while-revalidate). */

export interface EstadisticasCachePayload {
  companyId: string;
  timestamp: number;
  storeStats: Record<string, unknown>;
  inventorySummary: unknown;
  categoryStats: unknown[];
  uncategorizedProducts: unknown[];
  globalCategoryTotals: {
    phones: number;
    accessories: number;
    technical_service: number;
  };
}

const STORAGE_KEY = 'pos_estadisticas_page_cache_v1';
const TTL_MS = 8 * 60 * 1000;
const STALE_TTL_MS = 40 * 60 * 1000;

export function readEstadisticasPageCache(
  companyId: string,
  options?: { allowStale?: boolean }
): EstadisticasCachePayload | null {
  if (typeof window === 'undefined' || !companyId) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EstadisticasCachePayload;
    if (parsed.companyId !== companyId) return null;
    const age = Date.now() - parsed.timestamp;
    const maxAge = options?.allowStale ? STALE_TTL_MS : TTL_MS;
    if (age > maxAge) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeEstadisticasPageCache(
  companyId: string,
  payload: Omit<EstadisticasCachePayload, 'companyId' | 'timestamp'>
): void {
  if (typeof window === 'undefined' || !companyId) return;
  try {
    const full: EstadisticasCachePayload = {
      ...payload,
      companyId,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // quota / private mode
  }
}
