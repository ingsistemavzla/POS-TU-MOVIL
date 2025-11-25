import {
  GroupedProductBySku,
  InventoryItem,
  InventoryStore,
  SortByOption,
  SortOrderOption,
  StoreInventorySummary,
} from '@/types/inventory';
import { getCategoryLabel } from '@/constants/categories';

export interface StoreStockVisuals {
  quantityClass: string;
  statusText: string;
}

export const groupProductsBySku = (
  inventoryItems: InventoryItem[],
  stores: InventoryStore[],
): GroupedProductBySku[] => {
  const grouped = new Map<string, GroupedProductBySku>();

  inventoryItems.forEach((item) => {
    const key = item.product.sku;

    if (!grouped.has(key)) {
      grouped.set(key, {
        product: {
          ...item.product,
          id: item.product_id,
        },
        stores: [],
        totalQty: 0,
        totalValue: 0,
        hasLowStock: false,
      });
    }

    const group = grouped.get(key)!;

    const storeEntry: StoreInventorySummary = {
      store_id: item.store_id,
      store_name: item.store.name,
      qty: item.qty,
      min_qty: item.min_qty,
      inventory_id: item.id,
      product_id: item.product_id,
      hasInventory: item.qty > 0,
    };

    group.stores.push(storeEntry);
    group.totalQty += item.qty;
    group.totalValue += item.qty * (item.product.sale_price_usd || 0);

    if (item.qty > 0 && item.qty <= item.min_qty) {
      group.hasLowStock = true;
    }
  });

  grouped.forEach((group) => {
    const existingStoreIds = new Set(group.stores.map((store) => store.store_id));

    stores.forEach((store) => {
      if (!existingStoreIds.has(store.id)) {
        group.stores.push({
          store_id: store.id,
          store_name: store.name,
          qty: 0,
          min_qty: 0,
          inventory_id: '',
          product_id: group.product.id,
          hasInventory: false,
        });
      }
    });

    group.stores.sort((a, b) => a.store_name.localeCompare(b.store_name));
  });

  return Array.from(grouped.values());
};

export const sortInventoryItems = (
  items: InventoryItem[],
  sortBy: SortByOption,
  sortOrder: SortOrderOption,
): InventoryItem[] => {
  return [...items].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortBy) {
      case 'name':
        aValue = a.product.name?.toLowerCase() || '';
        bValue = b.product.name?.toLowerCase() || '';
        break;
      case 'sku':
        aValue = a.product.sku?.toLowerCase() || '';
        bValue = b.product.sku?.toLowerCase() || '';
        break;
      case 'qty':
        aValue = a.qty || 0;
        bValue = b.qty || 0;
        break;
      case 'price':
        aValue = a.product.sale_price_usd || 0;
        bValue = b.product.sale_price_usd || 0;
        break;
      case 'category':
        aValue = getCategoryLabel(a.product.category).toLowerCase();
        bValue = getCategoryLabel(b.product.category).toLowerCase();
        break;
      case 'store':
        aValue = a.store.name?.toLowerCase() || '';
        bValue = b.store.name?.toLowerCase() || '';
        break;
      default:
        aValue = a.product.name?.toLowerCase() || '';
        bValue = b.product.name?.toLowerCase() || '';
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

export const getStoreStockVisuals = (qty: number, minQty: number): StoreStockVisuals => {
  // Desactivar temporalmente la lógica basada en minQty.
  // Solo marcar "Sin stock" cuando qty = 0; cualquier qty > 0 se muestra como normal.
  if (qty === 0) {
    return {
      quantityClass: 'text-red-600',
      statusText: 'Sin stock',
    };
  }

  return {
    quantityClass: 'text-emerald-600',
    statusText: '',
  };
};

