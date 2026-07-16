import { supabase } from '@/integrations/supabase/client';
import {
  DashboardStockAlertItem,
  STOCK_CRITICAL_MAX_QTY,
  STOCK_CRITICAL_MIN_QTY,
  STOCK_OUT_OF_STOCK_QTY,
  STOCK_WARNING_MAX_QTY,
  STOCK_WARNING_MIN_QTY,
  StockAlertMode,
} from '@/constants/stockAlerts';
import { buildStockAlertItemKey } from '@/utils/stockAlertKeys';

/** Fila cruda de inventario relevante para alertas (qty 0–9). */
export interface StockAlertInventoryRow {
  productId: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  storeId: string;
  storeName: string;
}

/** Una sola consulta: todo el stock de alerta (0 hasta 9 inclusive). */
export async function fetchAllStockAlertRows(
  companyId: string
): Promise<StockAlertInventoryRow[]> {
  const { data, error } = await supabase
    .from('inventories')
    .select(
      'qty, product_id, store_id, products!inner(id, name, sku, category, active), stores(id, name)'
    )
    .eq('company_id', companyId)
    .eq('products.active', true)
    .lt('qty', STOCK_WARNING_MAX_QTY)
    .order('qty', { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((row: any) => row.products && row.stores)
    .map((row: any) => ({
      productId: row.products.id as string,
      name: row.products.name as string,
      sku: row.products.sku as string,
      category: row.products.category as string,
      currentStock: Math.max(0, row.qty ?? 0),
      storeId: row.store_id as string,
      storeName: row.stores.name as string,
    }));
}

export function rowMatchesMode(qty: number, mode: StockAlertMode): boolean {
  if (mode === 'out_of_stock') return qty === STOCK_OUT_OF_STOCK_QTY;
  if (mode === 'critical') {
    return qty >= STOCK_CRITICAL_MIN_QTY && qty <= STOCK_CRITICAL_MAX_QTY;
  }
  return qty >= STOCK_WARNING_MIN_QTY && qty < STOCK_WARNING_MAX_QTY;
}

export function filterStockAlertItems(
  rows: StockAlertInventoryRow[],
  mode: StockAlertMode,
  category?: string | null,
  keyStyle: 'dashboard' | 'notification' = 'dashboard'
): DashboardStockAlertItem[] {
  return rows
    .filter((row) => rowMatchesMode(row.currentStock, mode))
    .filter((row) => !category || row.category === category)
    .map((row) => ({
      key:
        keyStyle === 'notification'
          ? buildStockAlertItemKey(row.productId, row.storeId, mode)
          : `${row.productId}-${row.storeId}`,
      productId: row.productId,
      name: row.name,
      sku: row.sku,
      category: row.category,
      currentStock: row.currentStock,
      storeId: row.storeId,
      storeName: row.storeName,
    }));
}
