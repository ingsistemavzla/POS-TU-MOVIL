import { afterEach, describe, expect, it } from 'vitest';
import {
  __resetDiagNetworkOpsForTests,
  computeChunkDurationStats,
  computeFetchTotalMs,
  computeNetworkOpMetrics,
  roundDiagMs,
  sanitizeSupabaseResource,
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

describe('L1-05G.6 fetch resource sanitize + network gaps', () => {
  afterEach(() => {
    __resetDiagNetworkOpsForTests();
  });

  it('sanitizes rest table name without query/secrets', () => {
    expect(
      sanitizeSupabaseResource(
        'https://example.supabase.co/rest/v1/stores?select=id,name&active=eq.true'
      )
    ).toBe('stores');
    expect(
      sanitizeSupabaseResource('https://example.supabase.co/rest/v1/products?select=*')
    ).toBe('products');
    expect(sanitizeSupabaseResource('https://example.supabase.co/auth/v1/token')).toBe('auth');
  });

  it('computes pre-fetch gap vs http vs post-fetch gap', () => {
    const metrics = computeNetworkOpMetrics(
      {
        opId: 'NOP_1',
        loadId: 'L_test',
        module: 'Estadisticas',
        storeId: 'all',
        resource: 'stores',
        startMono: 1000,
        fetches: [
          {
            requestId: 'REQ_1',
            enterAt: 14000,
            responseAt: 14400,
            httpMs: 400,
            status: 200,
            aborted: false,
          },
        ],
      },
      14410
    );

    expect(metrics.AWAIT_MS).toBe(13410);
    expect(metrics.FETCH_START_GAP_MS).toBe(13000);
    expect(metrics.HTTP_FETCH_MS).toBe(400);
    expect(metrics.POST_FETCH_GAP_MS).toBe(10);
  });
});
