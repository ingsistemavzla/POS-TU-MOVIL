/** Cache de sesión para Estadísticas (stale-while-revalidate). */

export interface EstadisticasCachePayload {
  companyId: string;
  storeId: string;
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

/** Dual-slot: ALL y última sucursal concreta. */
interface EstadisticasDualCache {
  companyId: string;
  all: EstadisticasCachePayload | null;
  concrete: EstadisticasCachePayload | null;
}

const STORAGE_KEY = 'pos_estadisticas_page_cache_v3';
const TTL_MS = 8 * 60 * 1000;
const STALE_TTL_MS = 40 * 60 * 1000;

function isAllStoreId(storeId: string): boolean {
  return storeId === 'all';
}

function readDual(companyId: string): EstadisticasDualCache | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EstadisticasDualCache;
    if (!parsed || parsed.companyId !== companyId) return null;
    return {
      companyId,
      all: parsed.all ?? null,
      concrete: parsed.concrete ?? null,
    };
  } catch {
    return null;
  }
}

function writeDual(dual: EstadisticasDualCache): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dual));
  } catch {
    // quota / private mode
  }
}

function payloadMatches(
  parsed: EstadisticasCachePayload,
  companyId: string,
  storeId: string,
  options?: { allowStale?: boolean }
): boolean {
  if (parsed.companyId !== companyId) return false;
  if (parsed.storeId !== storeId) return false;
  const age = Date.now() - parsed.timestamp;
  const maxAge = options?.allowStale ? STALE_TTL_MS : TTL_MS;
  return age <= maxAge;
}

export function readEstadisticasPageCache(
  companyId: string,
  storeId: string,
  options?: { allowStale?: boolean }
): EstadisticasCachePayload | null {
  if (typeof window === 'undefined' || !companyId || !storeId) return null;
  const dual = readDual(companyId);
  if (!dual) return null;
  const slot = isAllStoreId(storeId) ? dual.all : dual.concrete;
  if (!slot) return null;
  if (!payloadMatches(slot, companyId, storeId, options)) return null;
  return slot;
}

export function writeEstadisticasPageCache(
  companyId: string,
  storeId: string,
  payload: Omit<EstadisticasCachePayload, 'companyId' | 'storeId' | 'timestamp'>
): void {
  if (typeof window === 'undefined' || !companyId || !storeId) return;
  const full: EstadisticasCachePayload = {
    ...payload,
    companyId,
    storeId,
    timestamp: Date.now(),
  };
  const prev = readDual(companyId) ?? { companyId, all: null, concrete: null };
  if (isAllStoreId(storeId)) {
    writeDual({ companyId, all: full, concrete: prev.concrete });
  } else {
    writeDual({ companyId, all: prev.all, concrete: full });
  }
}
