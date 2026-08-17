import { StockAlertMode } from '@/constants/stockAlerts';

/** Clave por producto (inventario global consolidado, sin duplicar por sucursal). */
export function buildStockAlertItemKey(
  productId: string,
  mode: StockAlertMode
): string {
  return `${mode}:${productId}`;
}

export function getStockAlertsStorageKey(companyId: string, userId: string): string {
  return `stock_alerts_ack_v1_${companyId}_${userId}`;
}

export interface StockAlertsAckState {
  acknowledgedKeys: string[];
  updatedAt: string;
}

export function loadAcknowledgedKeys(companyId: string, userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStockAlertsStorageKey(companyId, userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as StockAlertsAckState;
    return new Set(parsed.acknowledgedKeys ?? []);
  } catch {
    return new Set();
  }
}

export function saveAcknowledgedKeys(
  companyId: string,
  userId: string,
  keys: Iterable<string>
): void {
  const payload: StockAlertsAckState = {
    acknowledgedKeys: Array.from(keys),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(getStockAlertsStorageKey(companyId, userId), JSON.stringify(payload));
}
