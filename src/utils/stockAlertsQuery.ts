import { supabase } from '@/integrations/supabase/client';
import {
  DashboardStockAlertItem,
  GLOBAL_STOCK_STORE_ID,
  GLOBAL_STOCK_STORE_LABEL,
  STOCK_NORMAL_MIN_QTY,
  StockAlertMode,
  rowMatchesStockAlertMode,
} from '@/constants/stockAlerts';
import { buildStockAlertItemKey } from '@/utils/stockAlertKeys';

/** Fila agregada por producto (suma global entre sucursales). */
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

async function fetchInventoryPages(companyId: string): Promise<RawInventoryRow[]> {
  const all: RawInventoryRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('inventories')
      .select(SELECT)
      .eq('company_id', companyId)
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

function aggregateGlobalStock(rows: RawInventoryRow[]): StockAlertInventoryRow[] {
  const byProduct = new Map<
    string,
    Omit<StockAlertInventoryRow, 'currentStock' | 'storeId' | 'storeName'> & {
      totalStock: number;
    }
  >();

  for (const row of rows) {
    if (!row.products) continue;

    const productId = row.products.id;
    const qty = Math.max(0, row.qty ?? 0);
    const existing = byProduct.get(productId);

    if (existing) {
      existing.totalStock += qty;
      continue;
    }

    byProduct.set(productId, {
      productId,
      name: row.products.name,
      sku: row.products.sku,
      category: row.products.category,
      totalStock: qty,
    });
  }

  return Array.from(byProduct.values())
    .filter((row) => row.totalStock < STOCK_NORMAL_MIN_QTY)
    .map((row) => ({
      productId: row.productId,
      name: row.name,
      sku: row.sku,
      category: row.category,
      currentStock: row.totalStock,
      storeId: GLOBAL_STOCK_STORE_ID,
      storeName: GLOBAL_STOCK_STORE_LABEL,
    }))
    .sort((a, b) => a.currentStock - b.currentStock);
}

/**
 * Inventario activo agrupado por producto (GROUP BY product_id).
 * Una fila por producto con SUM(qty) global; solo incluye totales < 5 uds.
 */
export async function fetchAllStockAlertRows(
  companyId: string
): Promise<StockAlertInventoryRow[]> {
  const rows = await fetchInventoryPages(companyId);
  return aggregateGlobalStock(rows);
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
