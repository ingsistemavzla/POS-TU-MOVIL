/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';
import { getSalesSummary } from './stats';
import { salesFixture } from '@/tests/fixtures/sales';

describe('sales stats helpers', () => {
  it('calculates totals for all stores', () => {
    const summary = getSalesSummary(salesFixture);

    expect(summary.totalSales).toBe(600);
    expect(summary.averageSales).toBe(200);
    expect(summary.count).toBe(3);
  });

  it('filters totals by store', () => {
    const summary = getSalesSummary(salesFixture, 'store-1');

    expect(summary.totalSales).toBe(300);
    expect(summary.averageSales).toBe(150);
    expect(summary.count).toBe(2);
  });
});

