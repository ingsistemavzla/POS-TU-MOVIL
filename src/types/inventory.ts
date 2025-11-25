export interface InventoryProduct {
  id?: string;
  name: string;
  sku: string;
  category: string | null;
  sale_price_usd: number;
}

export interface InventoryStore {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  store_id: string;
  qty: number;
  min_qty: number;
  product: InventoryProduct;
  store: {
    name: string;
  };
}

export interface StoreInventorySummary {
  store_id: string;
  store_name: string;
  qty: number;
  min_qty: number;
  inventory_id: string;
  product_id: string;
  hasInventory: boolean;
}

export interface GroupedProductBySku {
  product: InventoryProduct;
  stores: StoreInventorySummary[];
  totalQty: number;
  totalValue: number;
  hasLowStock: boolean;
}

export type SortByOption = 'name' | 'sku' | 'qty' | 'price' | 'category' | 'store';

export type SortOrderOption = 'asc' | 'desc';

export interface AggregatedProduct {
  product_id: string;
  product: InventoryProduct;
  totalQty: number;
  minQty: number;
  hasLowStock: boolean;
  hasCriticalStock: boolean;
  totalValue: number;
  storeIds: string[];
}

export interface FilteredInventoryStats {
  totalValue: number;
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  criticalStock: number;
  totalStock: number;
  totalStores: number;
  products: AggregatedProduct[];
}

export interface CategoryStat {
  label: string;
  value: string;
  totalValue: number;
  totalStock: number;
  productCount: number;
}

