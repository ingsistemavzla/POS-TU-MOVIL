import { describe, expect, it } from 'vitest';
import {
  canUseStoreContextForCatalog,
  mapAvailableStoresToCatalog,
} from '@/utils/resolveCatalogStores';

describe('L1-05H resolveCatalogStores', () => {
  const stores = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
  ];

  it('maps id/name only', () => {
    expect(mapAvailableStoresToCatalog(stores)).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
  });

  it('uses StoreContext for admin/manager when stores are loaded', () => {
    expect(canUseStoreContextForCatalog({ role: 'admin', availableStores: stores })).toBe(true);
    expect(canUseStoreContextForCatalog({ role: 'manager', availableStores: stores })).toBe(true);
  });

  it('forces network fallback for master_admin', () => {
    expect(
      canUseStoreContextForCatalog({ role: 'master_admin', availableStores: stores })
    ).toBe(false);
  });

  it('forces network fallback when StoreContext is empty', () => {
    expect(canUseStoreContextForCatalog({ role: 'admin', availableStores: [] })).toBe(false);
  });
});
