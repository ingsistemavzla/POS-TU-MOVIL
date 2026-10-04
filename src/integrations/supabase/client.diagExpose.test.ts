import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const DIAG_FLAG = 'pos_inv_load_diag';
const EXPOSE_KEY = '__POS_SUPABASE_DIAG__';

describe('L1-05J.3 supabase diag singleton expose', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@/utils/authDiagBootstrap', () => ({}));
    vi.doMock('@/utils/inventoryLoadDiagnostics', () => ({
      createDiagnosticFetch: () => globalThis.fetch,
    }));
    const fakeClient = { __brand: 'fake-supabase-singleton', auth: {}, from: vi.fn() };
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => fakeClient,
    }));
    delete (globalThis as Record<string, unknown>)[EXPOSE_KEY];
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[EXPOSE_KEY];
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('exposes the same singleton when pos_inv_load_diag=1', async () => {
    const store: Record<string, string> = { [DIAG_FLAG]: '1' };
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    const mod = await import('@/integrations/supabase/client');
    expect((globalThis as Record<string, unknown>)[EXPOSE_KEY]).toBe(mod.supabase);
  });

  it('does not expose singleton when diag flag is off', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    await import('@/integrations/supabase/client');
    expect((globalThis as Record<string, unknown>)[EXPOSE_KEY]).toBeUndefined();
  });
});
