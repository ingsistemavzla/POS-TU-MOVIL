import type { DashboardData } from '@/hooks/useDashboardData';

const STORAGE_KEY = 'pos_dashboard_page_cache_v2';
/** Cache “fresca”: se considera vigente para no forzar loader. */
const TTL_MS = 10 * 60 * 1000;
/** Cache “stale”: se puede mostrar mientras se refresca en segundo plano. */
const STALE_TTL_MS = 45 * 60 * 1000;

export interface DashboardPageCachePayload {
  data: DashboardData;
  timestamp: number;
  companyId: string;
  storeId: string;
}

export function readDashboardPageCache(
  companyId: string,
  storeId: string,
  options?: { allowStale?: boolean }
): DashboardData | null {
  if (typeof window === 'undefined' || !companyId || !storeId || storeId === 'all') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardPageCachePayload;
    if (parsed.companyId !== companyId) return null;
    if (parsed.storeId !== storeId) return null;
    const age = Date.now() - parsed.timestamp;
    const maxAge = options?.allowStale ? STALE_TTL_MS : TTL_MS;
    if (age > maxAge) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeDashboardPageCache(companyId: string, storeId: string, data: DashboardData): void {
  if (typeof window === 'undefined' || !companyId || !storeId || storeId === 'all') return;
  try {
    const payload: DashboardPageCachePayload = {
      data,
      timestamp: Date.now(),
      companyId,
      storeId,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

export function clearDashboardPageCache(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
