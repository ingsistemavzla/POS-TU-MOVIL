import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStockNotifications } from '@/contexts/StockNotificationContext';
import {
  DashboardStockAlertItem,
  StockAlertMode,
} from '@/constants/stockAlerts';
import {
  fetchAllStockAlertRows,
  filterStockAlertItems,
} from '@/utils/stockAlertsQuery';

export {
  STOCK_OUT_OF_STOCK_QTY,
  STOCK_CRITICAL_MIN_QTY,
  STOCK_CRITICAL_MAX_QTY,
  STOCK_WARNING_MIN_QTY,
  STOCK_WARNING_MAX_QTY,
  type StockAlertMode,
  type DashboardStockAlertItem,
} from '@/constants/stockAlerts';

/**
 * Alertas del dashboard.
 * Si hay StockNotificationProvider, reutiliza la consulta única (sin N requests).
 * Si no, hace fallback a una consulta propia (mismos umbrales).
 */
export function useDashboardStockAlerts(category: string, mode: StockAlertMode) {
  const { userProfile } = useAuth();
  const shared = useStockNotifications();
  const [fallbackItems, setFallbackItems] = useState<DashboardStockAlertItem[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const useShared = !!shared;

  const sharedItems = useMemo(() => {
    if (!shared || !category) return [];
    return filterStockAlertItems(shared.alertRows, mode, category, 'dashboard');
  }, [shared, category, mode]);

  const fetchFallback = useCallback(async () => {
    if (useShared || !userProfile?.company_id || !category) {
      setFallbackItems([]);
      setFallbackLoading(false);
      return;
    }

    try {
      setFallbackLoading(true);
      setError(null);
      const rows = await fetchAllStockAlertRows(userProfile.company_id);
      setFallbackItems(filterStockAlertItems(rows, mode, category, 'dashboard'));
    } catch (err) {
      console.error('Error fetching dashboard stock alerts:', err);
      setError('No se pudieron cargar los artículos');
      setFallbackItems([]);
    } finally {
      setFallbackLoading(false);
    }
  }, [useShared, userProfile?.company_id, category, mode]);

  useEffect(() => {
    if (useShared) {
      setFallbackLoading(false);
      setError(null);
      return;
    }
    void fetchFallback();
  }, [useShared, fetchFallback]);

  if (useShared) {
    return {
      items: sharedItems,
      loading: shared!.loading,
      error: null as string | null,
      refetch: shared!.refresh,
    };
  }

  return {
    items: fallbackItems,
    loading: fallbackLoading,
    error,
    refetch: fetchFallback,
  };
}
