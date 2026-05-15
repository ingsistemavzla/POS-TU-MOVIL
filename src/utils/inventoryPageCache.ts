const STORAGE_KEY = 'pos_inventory_page_cache_v1';
const TTL_MS = 5 * 60 * 1000;

export interface InventoryPageCachePayload {
  products: unknown[];
  storeInventories: Record<string, unknown[]>;
  timestamp: number;
  companyId: string;
}

export function readInventoryPageCache(companyId: string): InventoryPageCachePayload | null {
  if (typeof window === 'undefined' || !companyId) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InventoryPageCachePayload;
    if (parsed.companyId !== companyId) return null;
    if (Date.now() - parsed.timestamp > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeInventoryPageCache(
  companyId: string,
  products: unknown[],
  storeInventories: Record<string, unknown[]>
): void {
  if (typeof window === 'undefined' || !companyId) return;
  try {
    const payload: InventoryPageCachePayload = {
      products,
      storeInventories,
      timestamp: Date.now(),
      companyId,
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
