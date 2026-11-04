import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthCache, clearAllCache } from './clearCache';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

describe('clearAuthCache', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal('sessionStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes supabase/auth keys from localStorage without wiping unrelated keys', () => {
    localStorage.setItem('sb-test-auth-token', '{"access_token":"x"}');
    localStorage.setItem('supabase.auth.token', 'x');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('pos_maintenance_mode', 'false');
    sessionStorage.setItem('dashboard-cache', 'keep-me');
    sessionStorage.setItem('auth_cache_cleared', 'true');

    clearAuthCache();

    expect(localStorage.getItem('sb-test-auth-token')).toBeNull();
    expect(localStorage.getItem('supabase.auth.token')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('pos_maintenance_mode')).toBe('false');
    expect(sessionStorage.getItem('dashboard-cache')).toBe('keep-me');
    expect(sessionStorage.getItem('auth_cache_cleared')).toBeNull();
  });

  it('does not wipe unrelated sessionStorage keys', () => {
    sessionStorage.setItem('unrelated-tab-state', '1');
    clearAuthCache();
    expect(sessionStorage.getItem('unrelated-tab-state')).toBe('1');
  });
});

describe('clearAllCache', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal('sessionStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves theme/language/maintenance and does not wipe all sessionStorage', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('language', 'es');
    localStorage.setItem('pos_maintenance_mode', 'true');
    localStorage.setItem('sb-auth', 'gone');
    sessionStorage.setItem('other', 'kept-if-not-auth');

    clearAllCache();

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('language')).toBe('es');
    expect(localStorage.getItem('pos_maintenance_mode')).toBe('true');
    expect(localStorage.getItem('sb-auth')).toBeNull();
    expect(sessionStorage.getItem('other')).toBe('kept-if-not-auth');
  });
});
