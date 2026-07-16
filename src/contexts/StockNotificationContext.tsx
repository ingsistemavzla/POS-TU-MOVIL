import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStockAlertItem } from '@/constants/stockAlerts';
import {
  loadAcknowledgedKeys,
  saveAcknowledgedKeys,
} from '@/utils/stockAlertKeys';
import {
  fetchAllStockAlertRows,
  filterStockAlertItems,
  type StockAlertInventoryRow,
} from '@/utils/stockAlertsQuery';

const REALTIME_DEBOUNCE_MS = 1500;
const POLL_INTERVAL_MS = 60_000;

interface StockNotificationContextValue {
  /** Filas compartidas qty 0–9 (fuente única navbar + dashboard). */
  alertRows: StockAlertInventoryRow[];
  totalWarningCount: number;
  unreviewedCount: number;
  hasAlerts: boolean;
  hasNewLowStock: boolean;
  loading: boolean;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  acknowledgeCurrentWarnings: () => void;
  refresh: () => Promise<void>;
}

const StockNotificationContext = createContext<StockNotificationContextValue | null>(null);

const STOCK_NOTIFICATION_ROLES = new Set(['admin', 'manager', 'master_admin']);

export function StockNotificationProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const [alertRows, setAlertRows] = useState<StockAlertInventoryRow[]>([]);
  const [acknowledgedKeys, setAcknowledgedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasNewLowStock, setHasNewLowStock] = useState(false);
  const refreshInFlight = useRef(false);
  const previousWarningKeysRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<number | null>(null);

  const enabled =
    !!userProfile?.company_id &&
    !!userProfile?.id &&
    STOCK_NOTIFICATION_ROLES.has(userProfile.role ?? '');

  const companyId = userProfile?.company_id;

  const loadAckState = useCallback(() => {
    if (!userProfile?.company_id || !userProfile?.id) return;
    setAcknowledgedKeys(loadAcknowledgedKeys(userProfile.company_id, userProfile.id));
  }, [userProfile?.company_id, userProfile?.id]);

  const refresh = useCallback(async () => {
    if (!enabled || !companyId || refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const rows = await fetchAllStockAlertRows(companyId);
      const warningItems = filterStockAlertItems(rows, 'warning', null, 'notification');
      const currentKeys = new Set(warningItems.map((item) => item.key));
      const ack = loadAcknowledgedKeys(userProfile!.company_id, userProfile!.id);

      const newlyAppeared = warningItems.filter(
        (item) => !previousWarningKeysRef.current.has(item.key) && !ack.has(item.key)
      );
      if (newlyAppeared.length > 0) {
        setHasNewLowStock(true);
      }

      previousWarningKeysRef.current = currentKeys;
      setAlertRows(rows);
    } catch (err) {
      console.error('Error refreshing stock notifications:', err);
    } finally {
      setLoading(false);
      refreshInFlight.current = false;
    }
  }, [enabled, companyId, userProfile?.company_id, userProfile?.id]);

  const scheduleRefresh = useCallback(() => {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void refresh();
    }, REALTIME_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    loadAckState();
  }, [loadAckState]);

  useEffect(() => {
    if (!enabled || !companyId) {
      setAlertRows([]);
      setLoading(false);
      return;
    }

    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refresh();
    }, POLL_INTERVAL_MS);

    const channel = supabase
      .channel(`stock-notifications-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventories',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe();

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [enabled, companyId, refresh, scheduleRefresh]);

  const warningItems = useMemo(
    () => filterStockAlertItems(alertRows, 'warning', null, 'notification'),
    [alertRows]
  );

  const unreviewedCount = useMemo(
    () => warningItems.filter((item) => !acknowledgedKeys.has(item.key)).length,
    [warningItems, acknowledgedKeys]
  );

  const totalWarningCount = warningItems.length;
  const hasAlerts = totalWarningCount > 0;

  const acknowledgeCurrentWarnings = useCallback(() => {
    if (!userProfile?.company_id || !userProfile?.id) return;
    const merged = new Set(acknowledgedKeys);
    warningItems.forEach((item: DashboardStockAlertItem) => merged.add(item.key));
    setAcknowledgedKeys(merged);
    setHasNewLowStock(false);
    saveAcknowledgedKeys(userProfile.company_id, userProfile.id, merged);
  }, [acknowledgedKeys, userProfile?.company_id, userProfile?.id, warningItems]);

  const openModal = useCallback(() => setModalOpen(true), []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    acknowledgeCurrentWarnings();
  }, [acknowledgeCurrentWarnings]);

  const value = useMemo<StockNotificationContextValue>(
    () => ({
      alertRows,
      totalWarningCount,
      unreviewedCount,
      hasAlerts,
      hasNewLowStock,
      loading,
      modalOpen,
      openModal,
      closeModal,
      acknowledgeCurrentWarnings,
      refresh,
    }),
    [
      alertRows,
      totalWarningCount,
      unreviewedCount,
      hasAlerts,
      hasNewLowStock,
      loading,
      modalOpen,
      openModal,
      closeModal,
      acknowledgeCurrentWarnings,
      refresh,
    ]
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <StockNotificationContext.Provider value={value}>
      {children}
    </StockNotificationContext.Provider>
  );
}

export function useStockNotifications(): StockNotificationContextValue | null {
  return useContext(StockNotificationContext);
}
