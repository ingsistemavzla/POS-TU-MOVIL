const STORAGE_KEY = 'pos_inventory_page_cache_v5';
/** Cache fresca: se puede mostrar sin forzar sensación de “viejo”. */
const TTL_MS = 5 * 60 * 1000;
/** Cache stale: pintar al instante y refrescar en segundo plano. */
const STALE_TTL_MS = 30 * 60 * 1000;

export interface InventoryPageCachePayload {
  products: unknown[];
  storeInventories: Record<string, unknown[]>;
  timestamp: number;
  companyId: string;
  storeId: string;
  /** Filtro de categoría usado al cargar (`all` = sin filtro). */
  categoryScope: string;
  /** Todos / con stock / sin stock. */
  stockPresence: string;
}

/** Dual-slot: ALL y última sucursal concreta (no se pisan entre sí). */
interface InventoryDualCache {
  companyId: string;
  all: InventoryPageCachePayload | null;
  concrete: InventoryPageCachePayload | null;
}

function scopeKey(category?: string | null): string {
  return category && category !== 'all' ? category : 'all';
}

function isAllStoreId(storeId: string): boolean {
  return storeId === 'all';
}

function readDual(companyId: string): InventoryDualCache | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InventoryDualCache;
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

function writeDual(dual: InventoryDualCache): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dual));
  } catch {
    // quota / private mode
  }
}

function payloadMatches(
  parsed: InventoryPageCachePayload,
  companyId: string,
  storeId: string,
  category: string | null | undefined,
  stockPresence: string,
  options?: { allowStale?: boolean }
): boolean {
  if (parsed.companyId !== companyId) return false;
  if (parsed.storeId !== storeId) return false;
  if ((parsed.categoryScope ?? 'all') !== scopeKey(category)) return false;
  if ((parsed.stockPresence ?? 'all') !== (stockPresence || 'all')) return false;
  const age = Date.now() - parsed.timestamp;
  const maxAge = options?.allowStale ? STALE_TTL_MS : TTL_MS;
  return age <= maxAge;
}

export function readInventoryPageCache(
  companyId: string,
  storeId: string,
  category: string | null | undefined,
  stockPresence: string,
  options?: { allowStale?: boolean }
): InventoryPageCachePayload | null {
  if (typeof window === 'undefined' || !companyId || !storeId) return null;
  const dual = readDual(companyId);
  if (!dual) return null;
  const slot = isAllStoreId(storeId) ? dual.all : dual.concrete;
  if (!slot) return null;
  if (!payloadMatches(slot, companyId, storeId, category, stockPresence, options)) return null;
  return slot;
}

/** Distingue FRESH (TTL) vs STALE usable vs MISS sin duplicar TTL en páginas. */
export type InventoryPageCacheStatus = 'fresh' | 'stale' | 'miss';

export function inspectInventoryPageCache(
  companyId: string,
  storeId: string,
  category: string | null | undefined,
  stockPresence: string
): { status: InventoryPageCacheStatus; payload: InventoryPageCachePayload | null } {
  if (typeof window === 'undefined' || !companyId || !storeId) {
    return { status: 'miss', payload: null };
  }
  const dual = readDual(companyId);
  if (!dual) return { status: 'miss', payload: null };
  const slot = isAllStoreId(storeId) ? dual.all : dual.concrete;
  if (!slot) return { status: 'miss', payload: null };
  if (slot.companyId !== companyId || slot.storeId !== storeId) {
    return { status: 'miss', payload: null };
  }
  if ((slot.categoryScope ?? 'all') !== scopeKey(category)) {
    return { status: 'miss', payload: null };
  }
  if ((slot.stockPresence ?? 'all') !== (stockPresence || 'all')) {
    return { status: 'miss', payload: null };
  }
  const age = Date.now() - slot.timestamp;
  if (age <= TTL_MS) return { status: 'fresh', payload: slot };
  if (age <= STALE_TTL_MS) return { status: 'stale', payload: slot };
  return { status: 'miss', payload: null };
}

export function writeInventoryPageCache(
  companyId: string,
  storeId: string,
  products: unknown[],
  storeInventories: Record<string, unknown[]>,
  category: string | null | undefined,
  stockPresence: string
): void {
  if (typeof window === 'undefined' || !companyId || !storeId) return;
  const payload: InventoryPageCachePayload = {
    products,
    storeInventories,
    timestamp: Date.now(),
    companyId,
    storeId,
    categoryScope: scopeKey(category),
    stockPresence: stockPresence || 'all',
  };
  const prev = readDual(companyId) ?? { companyId, all: null, concrete: null };
  if (isAllStoreId(storeId)) {
    writeDual({ companyId, all: payload, concrete: prev.concrete });
  } else {
    writeDual({ companyId, all: prev.all, concrete: payload });
  }
}

export function clearInventoryPageCache(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
