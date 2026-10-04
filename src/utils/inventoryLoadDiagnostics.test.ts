import { describe, expect, it } from 'vitest';
import { computeChunkDurationStats, roundDiagMs } from '@/utils/inventoryLoadDiagnostics';

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
