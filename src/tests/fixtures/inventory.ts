import { InventoryItem, InventoryStore } from '@/types/inventory';

export const storesFixture: InventoryStore[] = [
  { id: 'store-1', name: 'Tu Móvil Centro' },
  { id: 'store-2', name: 'La Isla' },
  { id: 'store-3', name: 'Zona Gamer' },
];

export const inventoryFixture: InventoryItem[] = [
  {
    id: 'inv-1',
    product_id: 'prod-1',
    store_id: 'store-1',
    qty: 5,
    min_qty: 3,
    product: {
      name: 'Teléfono X',
      sku: 'SKU-001',
      category: 'phones',
      sale_price_usd: 100,
    },
    store: {
      name: 'Tu Móvil Centro',
    },
  },
  {
    id: 'inv-2',
    product_id: 'prod-1',
    store_id: 'store-2',
    qty: 1,
    min_qty: 2,
    product: {
      name: 'Teléfono X',
      sku: 'SKU-001',
      category: 'phones',
      sale_price_usd: 100,
    },
    store: {
      name: 'La Isla',
    },
  },
  {
    id: 'inv-3',
    product_id: 'prod-2',
    store_id: 'store-1',
    qty: 0,
    min_qty: 1,
    product: {
      name: 'Cargador Ultra',
      sku: 'SKU-002',
      category: 'accessories',
      sale_price_usd: 25,
    },
    store: {
      name: 'Tu Móvil Centro',
    },
  },
  {
    id: 'inv-4',
    product_id: 'prod-2',
    store_id: 'store-2',
    qty: 4,
    min_qty: 3,
    product: {
      name: 'Cargador Ultra',
      sku: 'SKU-002',
      category: 'accessories',
      sale_price_usd: 25,
    },
    store: {
      name: 'La Isla',
    },
  },
];

export const inventoryManagerFixture: InventoryItem[] = inventoryFixture.filter(
  (item) => item.store_id === 'store-2',
);

