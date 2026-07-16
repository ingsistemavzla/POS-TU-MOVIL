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
import {
  DashboardStockAlertItem,
  STOCK_WARNING_MAX_QTY,
  STOCK_WARNING_MIN_QTY,
  StockAlertMode,
} from '@/hooks/useDashboardStockAlerts';
import {
  buildStockAlertItemKey,
  loadAcknowledgedKeys,
  saveAcknowledgedKeys,
} from '@/utils/stockAlertKeys';

interface StockNotificationContextValue {
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

function mapInventoryRows(data: unknown[], mode: StockAlertMode): DashboardStockAlertItem[] {
  return (data ?? [])
    .filter((row: any) => row.products && row.stores)
    .map((row: any) => {
      const productId = row.products.id as string;
      const storeId = row.store_id as string;
      return {
        key: buildStockAlertItemKey(productId, storeId, mode),
        productId,
        name: row.products.name as string,
        sku: row.products.sku as string,
        category: row.products.category as string,
        currentStock: Math.max(0, row.qty ?? 0),
        storeId,
        storeName: row.stores.name as string,
      };
    });
}

async function fetchWarningItemsAllCategories(): Promise<DashboardStockAlertItem[]> {
  const { data, error } = await supabase
    .from('inventories')
    .select('qty, product_id, store_id, products!inner(id, name, sku, category, active), stores(id, name)')
    .eq('products.active', true)
    .gte('qty', STOCK_WARNING_MIN_QTY)
    .lt('qty', STOCK_WARNING_MAX_QTY)
    .order('qty', { ascending: true });

  if (error) throw error;
  return mapInventoryRows(data ?? [], 'warning');
}

const STOCK_NOTIFICATION_ROLES = new Set(['admin', 'manager', 'master_admin']);

export function StockNotificationProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const [warningItems, setWarningItems] = useState<DashboardStockAlertItem[]>([]);
  const [acknowledgedKeys, setAcknowledgedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasNewLowStock, setHasNewLowStock] = useState(false);
  const refreshInFlight = useRef(false);
  const previousWarningKeysRef = useRef<Set<string>>(new Set());

  const enabled =
    !!userProfile?.company_id &&
    !!userProfile?.id &&
    STOCK_NOTIFICATION_ROLES.has(userProfile.role ?? '');

  const loadAckState = useCallback(() => {
    if (!userProfile?.company_id || !userProfile?.id) return;
    setAcknowledgedKeys(loadAcknowledgedKeys(userProfile.company_id, userProfile.id));
  }, [userProfile?.company_id, userProfile?.id]);

  const refresh = useCallback(async () => {
    if (!enabled || refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const items = await fetchWarningItemsAllCategories();
      const currentKeys = new Set(items.map((item) => item.key));
      const ack = loadAcknowledgedKeys(userProfile!.company_id, userProfile!.id);

      const newlyAppeared = items.filter(
        (item) => !previousWarningKeysRef.current.has(item.key) && !ack.has(item.key)
      );
      if (newlyAppeared.length > 0) {
        setHasNewLowStock(true);
      }

      previousWarningKeysRef.current = currentKeys;
      setWarningItems(items);
    } catch (err) {
      console.error('Error refreshing stock notifications:', err);
    } finally {
      setLoading(false);
      refreshInFlight.current = false;
    }
  }, [enabled, userProfile?.company_id, userProfile?.id]);

  useEffect(() => {
    loadAckState();
  }, [loadAckState]);

  useEffect(() => {
    if (!enabled) {
      setWarningItems([]);
      setLoading(false);
      return;
    }

    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refresh();
    }, 45_000);

    const channel = supabase
      .channel(`stock-notifications-${userProfile.company_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventories' },
        () => {
          void refresh();
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
      void supabase.removeChannel(channel);
    };
  }, [enabled, refresh, userProfile?.company_id]);

  const unreviewedCount = useMemo(
    () => warningItems.filter((item) => !acknowledgedKeys.has(item.key)).length,
    [warningItems, acknowledgedKeys]
  );

  const totalWarningCount = warningItems.length;
  const hasAlerts = totalWarningCount > 0;

  const acknowledgeCurrentWarnings = useCallback(() => {
    if (!userProfile?.company_id || !userProfile?.id) return;
    const merged = new Set(acknowledgedKeys);
    warningItems.forEach((item) => merged.add(item.key));
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
