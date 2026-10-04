import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const GOTRUE_LOCKS_DEBUG_KEY = 'supabase.gotrue-js.locks.debug';

describe('L1-05J authDiagBootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sets gotrue locks.debug when pos_inv_load_diag=1', async () => {
    const store: Record<string, string> = { pos_inv_load_diag: '1' };
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
    vi.stubGlobal('window', { localStorage: globalThis.localStorage });

    await import('@/utils/authDiagBootstrap');
    expect(store[GOTRUE_LOCKS_DEBUG_KEY]).toBe('true');
  });

  it('does not set gotrue locks.debug when diag flag off', async () => {
    const store: Record<string, string> = {};
    const setItem = vi.fn((k: string, v: string) => {
      store[k] = v;
    });
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem,
      removeItem: (k: string) => {
        delete store[k];
      },
    });
    vi.stubGlobal('window', { localStorage: globalThis.localStorage });

    await import('@/utils/authDiagBootstrap');
    expect(setItem).not.toHaveBeenCalledWith(GOTRUE_LOCKS_DEBUG_KEY, 'true');
  });
});
