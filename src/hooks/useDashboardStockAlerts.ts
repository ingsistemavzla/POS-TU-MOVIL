import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Sin stock: 0 unidades */
export const STOCK_OUT_OF_STOCK_QTY = 0;

/** Stock crítico (naranja): 1 a 3 unidades */
export const STOCK_CRITICAL_MIN_QTY = 1;
export const STOCK_CRITICAL_MAX_QTY = 3;

/** Stock bajo (amarillo): 3 a 9 unidades */
export const STOCK_WARNING_MIN_QTY = 3;
export const STOCK_WARNING_MAX_QTY = 10;

export type StockAlertMode = 'out_of_stock' | 'critical' | 'warning';

export interface DashboardStockAlertItem {
  key: string;
  productId: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  storeId: string;
  storeName: string;
}

export function useDashboardStockAlerts(category: string, mode: StockAlertMode) {
  const { userProfile } = useAuth();
  const [items, setItems] = useState<DashboardStockAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!userProfile?.company_id || !category) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('inventories')
        .select('qty, product_id, store_id, products!inner(id, name, sku, category, active), stores(id, name)')
        .eq('products.active', true)
        .eq('products.category', category);

      if (mode === 'out_of_stock') {
        query = query.eq('qty', STOCK_OUT_OF_STOCK_QTY);
      } else if (mode === 'critical') {
        query = query
          .gte('qty', STOCK_CRITICAL_MIN_QTY)
          .lte('qty', STOCK_CRITICAL_MAX_QTY);
      } else {
        query = query.gte('qty', STOCK_WARNING_MIN_QTY).lt('qty', STOCK_WARNING_MAX_QTY);
      }

      const { data, error: queryError } = await query.order('qty', { ascending: true });

      if (queryError) throw queryError;

      const mapped = (data ?? [])
        .filter((row: any) => row.products && row.stores)
        .map((row: any) => ({
          key: `${row.product_id}-${row.store_id}`,
          productId: row.products.id as string,
          name: row.products.name as string,
          sku: row.products.sku as string,
          category: row.products.category as string,
          currentStock: Math.max(0, row.qty ?? 0),
          storeId: row.store_id as string,
          storeName: row.stores.name as string,
        }));

      setItems(mapped);
    } catch (err) {
      console.error('Error fetching dashboard stock alerts:', err);
      setError('No se pudieron cargar los artículos');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.company_id, category, mode]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}
