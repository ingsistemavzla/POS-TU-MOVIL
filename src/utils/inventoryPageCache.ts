const STORAGE_KEY = 'pos_inventory_page_cache_v2';
/** Cache fresca: se puede mostrar sin forzar sensación de “viejo”. */
const TTL_MS = 5 * 60 * 1000;
/** Cache stale: pintar al instante y refrescar en segundo plano. */
const STALE_TTL_MS = 30 * 60 * 1000;

export interface InventoryPageCachePayload {
  products: unknown[];
  storeInventories: Record<string, unknown[]>;
  timestamp: number;
  companyId: string;
  /** Filtro de categoría usado al cargar (`all` = sin filtro). */
  categoryScope: string;
}

function scopeKey(category?: string | null): string {
  return category && category !== 'all' ? category : 'all';
}

export function readInventoryPageCache(
  companyId: string,
  category?: string | null,
  options?: { allowStale?: boolean }
): InventoryPageCachePayload | null {
  if (typeof window === 'undefined' || !companyId) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InventoryPageCachePayload;
    if (parsed.companyId !== companyId) return null;
    if ((parsed.categoryScope ?? 'all') !== scopeKey(category)) return null;
    const age = Date.now() - parsed.timestamp;
    const maxAge = options?.allowStale ? STALE_TTL_MS : TTL_MS;
    if (age > maxAge) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeInventoryPageCache(
  companyId: string,
  products: unknown[],
  storeInventories: Record<string, unknown[]>,
  category?: string | null
): void {
  if (typeof window === 'undefined' || !companyId) return;
  try {
    const payload: InventoryPageCachePayload = {
      products,
      storeInventories,
      timestamp: Date.now(),
      companyId,
      categoryScope: scopeKey(category),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode
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
