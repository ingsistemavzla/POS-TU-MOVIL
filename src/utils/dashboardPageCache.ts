import type { DashboardData } from '@/hooks/useDashboardData';

const STORAGE_KEY = 'pos_dashboard_page_cache_v1';
const TTL_MS = 3 * 60 * 1000;

export interface DashboardPageCachePayload {
  data: DashboardData;
  timestamp: number;
  companyId: string;
}

export function readDashboardPageCache(companyId: string): DashboardData | null {
  if (typeof window === 'undefined' || !companyId) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardPageCachePayload;
    if (parsed.companyId !== companyId) return null;
    if (Date.now() - parsed.timestamp > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeDashboardPageCache(companyId: string, data: DashboardData): void {
  if (typeof window === 'undefined' || !companyId) return;
  try {
    const payload: DashboardPageCachePayload = {
      data,
      timestamp: Date.now(),
      companyId,
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
