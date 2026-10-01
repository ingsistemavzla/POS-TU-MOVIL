import { supabase } from '@/integrations/supabase/client';
import { isConcreteStoreId } from '@/contexts/StoreContext';
import {
  DashboardStockAlertItem,
  STOCK_NORMAL_MIN_QTY,
  StockAlertMode,
  rowMatchesStockAlertMode,
} from '@/constants/stockAlerts';
import { buildStockAlertItemKey } from '@/utils/stockAlertKeys';

/** Fila de stock bajo de una sucursal concreta. */
export interface StockAlertInventoryRow {
  productId: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  storeId: string;
  storeName: string;
}

const PAGE_SIZE = 1000;

const SELECT = 'qty, product_id, products!inner(id, name, sku, category, active)';

interface RawInventoryRow {
  qty: number | null;
  product_id: string;
  products: {
    id: string;
    name: string;
    sku: string;
    category: string;
    active: boolean;
  } | null;
}

async function fetchInventoryPages(companyId: string, storeId: string): Promise<RawInventoryRow[]> {
  const all: RawInventoryRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('inventories')
      .select(SELECT)
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('products.active', true)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const rows = (data ?? []) as RawInventoryRow[];
    if (rows.length === 0) break;

    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

function rowsForStore(
  rows: RawInventoryRow[],
  storeId: string,
  storeName: string
): StockAlertInventoryRow[] {
  return rows
    .filter((row) => row.products)
    .map((row) => ({
      productId: row.products!.id,
      name: row.products!.name,
      sku: row.products!.sku,
      category: row.products!.category,
      currentStock: Math.max(0, row.qty ?? 0),
      storeId,
      storeName,
    }))
    .filter((row) => row.currentStock < STOCK_NORMAL_MIN_QTY)
    .sort((a, b) => a.currentStock - b.currentStock);
}

/** Stock bajo de una sucursal. No suma cantidades entre tiendas. */
export async function fetchAllStockAlertRows(
  companyId: string,
  storeId: string,
  storeName: string
): Promise<StockAlertInventoryRow[]> {
  if (!isConcreteStoreId(storeId)) {
    throw new Error('STORE_ID_REQUIRED');
  }
  const rows = await fetchInventoryPages(companyId, storeId);
  return rowsForStore(rows, storeId, storeName);
}

export function rowMatchesMode(qty: number, mode: StockAlertMode): boolean {
  return rowMatchesStockAlertMode(qty, mode);
}

export function filterStockAlertItems(
  rows: StockAlertInventoryRow[],
  mode: StockAlertMode,
  category?: string | null,
  keyStyle: 'dashboard' | 'notification' = 'dashboard'
): DashboardStockAlertItem[] {
  return rows
    .filter((row) => rowMatchesStockAlertMode(row.currentStock, mode))
    .filter((row) => !category || row.category === category)
    .map((row) => ({
      key:
        keyStyle === 'notification'
          ? buildStockAlertItemKey(row.productId, mode)
          : row.productId,
      productId: row.productId,
      name: row.name,
      sku: row.sku,
      category: row.category,
      currentStock: row.currentStock,
      storeId: row.storeId,
      storeName: row.storeName,
    }));
}
