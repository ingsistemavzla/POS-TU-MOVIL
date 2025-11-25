/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';
import { groupProductsBySku, sortInventoryItems, getStoreStockVisuals } from './helpers';
import { inventoryFixture, storesFixture } from '@/tests/fixtures/inventory';

describe('inventory helpers', () => {
  it('groups products by SKU including stores without inventory', () => {
    const grouped = groupProductsBySku(inventoryFixture, storesFixture);

    expect(grouped).toHaveLength(2);

    const phoneGroup = grouped.find((group) => group.product.sku === 'SKU-001');
    expect(phoneGroup).toBeDefined();
    expect(phoneGroup?.totalQty).toBe(6);
    expect(phoneGroup?.hasLowStock).toBe(true);
    expect(phoneGroup?.stores).toHaveLength(storesFixture.length);

    const addedStore = phoneGroup?.stores.find((store) => store.store_id === 'store-3');
    expect(addedStore?.qty).toBe(0);
    expect(addedStore?.hasInventory).toBe(false);
  });

  it('sorts inventory items by the selected criteria and order', () => {
    const sortedByQtyDesc = sortInventoryItems(inventoryFixture, 'qty', 'desc');
    expect(sortedByQtyDesc[0].qty).toBe(5);
    expect(sortedByQtyDesc.at(-1)?.qty).toBe(0);

    const sortedByNameAsc = sortInventoryItems(inventoryFixture, 'name', 'asc');
    expect(sortedByNameAsc[0].product.name).toBe('Cargador Ultra');
    expect(sortedByNameAsc.at(-1)?.product.name).toBe('Teléfono X');
  });

  it('returns correct stock visuals based on quantity and minimum', () => {
    expect(getStoreStockVisuals(0, 5)).toEqual({
      quantityClass: 'text-red-600',
      statusText: 'Sin stock',
    });

    expect(getStoreStockVisuals(2, 5)).toEqual({
      quantityClass: 'text-amber-600',
      statusText: 'Stock bajo',
    });

    expect(getStoreStockVisuals(6, 5)).toEqual({
      quantityClass: 'text-emerald-600',
      statusText: '',
    });
  });
});

