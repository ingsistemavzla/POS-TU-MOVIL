/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';
import { calculateFilteredStats, getCategoryStats } from './stats';
import { inventoryFixture, storesFixture } from '@/tests/fixtures/inventory';
import { PRODUCT_CATEGORIES } from '@/constants/categories';

describe('inventory stats helpers', () => {
  it('calculates filtered stats for all stores', () => {
    const stats = calculateFilteredStats(inventoryFixture, storesFixture.length, 'all');

    expect(stats.totalValue).toBe(700);
    expect(stats.totalProducts).toBe(2);
    expect(stats.outOfStock).toBe(0);
    expect(stats.lowStock).toBe(1);
    expect(stats.criticalStock).toBe(1);
    expect(stats.totalStock).toBe(10);
    expect(stats.totalStores).toBe(storesFixture.length);
    expect(stats.products).toHaveLength(2);
  });

  it('calculates filtered stats for a single store', () => {
    const stats = calculateFilteredStats(
      inventoryFixture,
      storesFixture.length,
      'all',
      'store-2',
    );

    expect(stats.totalValue).toBe(200);
    expect(stats.totalProducts).toBe(2);
    expect(stats.totalStores).toBe(1);
    expect(stats.lowStock).toBe(1);
    expect(stats.totalStock).toBe(5);
  });

  it('returns category stats only for categories with products', () => {
    const stats = calculateFilteredStats(inventoryFixture, storesFixture.length, 'all');
    const categories = getCategoryStats(stats, inventoryFixture, PRODUCT_CATEGORIES);

    expect(categories).toHaveLength(2);

    const phonesCategory = categories.find((category) => category.value === 'phones');
    expect(phonesCategory).toBeDefined();
    expect(phonesCategory?.totalValue).toBe(600);
    expect(phonesCategory?.totalStock).toBe(6);
    expect(phonesCategory?.productCount).toBe(1);

    const accessoriesCategory = categories.find((category) => category.value === 'accessories');
    expect(accessoriesCategory?.totalValue).toBe(100);
  });

  it('filters category stats by store', () => {
    const stats = calculateFilteredStats(
      inventoryFixture,
      storesFixture.length,
      'all',
      'store-2',
    );
    const categories = getCategoryStats(
      stats,
      inventoryFixture,
      PRODUCT_CATEGORIES,
      'store-2',
    );

    const phonesCategory = categories.find((category) => category.value === 'phones');
    expect(phonesCategory?.totalStock).toBe(1);

    const accessoriesCategory = categories.find((category) => category.value === 'accessories');
    expect(accessoriesCategory?.totalStock).toBe(4);
  });
});

