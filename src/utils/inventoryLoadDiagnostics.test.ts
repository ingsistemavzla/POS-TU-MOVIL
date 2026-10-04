import { describe, expect, it } from 'vitest';
import {
  computeChunkDurationStats,
  computeFetchTotalMs,
  roundDiagMs,
} from '@/utils/inventoryLoadDiagnostics';

describe('L1-05G.1 chunk duration stats', () => {
  it('returns nulls when there are no samples', () => {
    expect(computeChunkDurationStats([])).toEqual({
      SLOWEST_CHUNK_MS: null,
      FASTEST_CHUNK_MS: null,
      AVG_CHUNK_MS: null,
    });
  });

  it('computes slowest, fastest and avg', () => {
    expect(computeChunkDurationStats([100, 300, 200])).toEqual({
      SLOWEST_CHUNK_MS: 300,
      FASTEST_CHUNK_MS: 100,
      AVG_CHUNK_MS: 200,
    });
  });

  it('rounds avg', () => {
    expect(computeChunkDurationStats([10, 11])).toEqual({
      SLOWEST_CHUNK_MS: 11,
      FASTEST_CHUNK_MS: 10,
      AVG_CHUNK_MS: roundDiagMs(10.5),
    });
  });
});

describe('L1-05G.3 fetch total attribution', () => {
  it('uses phase1 wall + inventory when phase1 is present (not stores+products sum)', () => {
    expect(
      computeFetchTotalMs({
        productsMs: 1,
        storesMs: 11000,
        phase1WallMs: 11020,
        inventoryMs: 1169,
      })
    ).toBe(12189);
  });

  it('falls back to productsMs + inventoryMs without phase1 (compat Almacén)', () => {
    expect(
      computeFetchTotalMs({
        productsMs: 5000,
        inventoryMs: 1000,
      })
    ).toBe(6000);
  });
});
