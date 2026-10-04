import { describe, expect, it, vi } from 'vitest';
import {
  planAuthStateSync,
  planLoadingForAuthSync,
} from '@/utils/authStateChangeDefer';
import { applyDeferredProfileResult } from '@/utils/authProfileApply';

function makeHooks() {
  return {
    setUserProfile: vi.fn(),
    setCompany: vi.fn(),
    setLoading: vi.fn(),
    setIsSlowNetwork: vi.fn(),
    setUser: vi.fn(),
    setSession: vi.fn(),
    setUserProfileRef: vi.fn(),
    setSessionRef: vi.fn(),
    writeCache: vi.fn(),
    deleteCache: vi.fn(),
    startKeepAlive: vi.fn(),
    stopKeepAlive: vi.fn(),
    signOut: vi.fn(async () => {}),
  };
}

describe('L1-05M.3 loading ownership', () => {
  it('pending A then TOKEN_REFRESHED B with userProfileRef clears loading', async () => {
    let loading = true; // A scheduled profile miss
    const epochA = 1;
    let epochCurrent = 1;

    // B: TOKEN_REFRESHED with profile ref match
    const planB = planAuthStateSync({
      event: 'TOKEN_REFRESHED',
      userId: 'user-a',
      maintenanceActive: false,
      profileAuthUserId: 'user-a',
      hasCachedProfile: false,
    });
    expect(planB.action).toBe('fast_path_profile_match');
    epochCurrent = 2; // B invalidates A
    const loadB = planLoadingForAuthSync(planB, 'TOKEN_REFRESHED');
    expect(loadB).toBe('set_false');
    if (loadB === 'set_false') loading = false;

    // A late completion must not change loading
    const hooks = makeHooks();
    const status = await applyDeferredProfileResult({
      mounted: true,
      epoch: epochA,
      currentEpoch: epochCurrent,
      expectedUserId: 'user-a',
      currentUserId: 'user-a',
      result: {
        success: true,
        profile: { id: 'pa', auth_user_id: 'user-a' },
        company: { id: 'ca' },
      },
      hooks,
    });
    expect(status).toBe('cancelled');
    expect(hooks.setLoading).not.toHaveBeenCalled();
    expect(loading).toBe(false);
  });

  it('pending A then TOKEN_REFRESHED B with cache clears loading', async () => {
    let loading = true;
    const epochA = 1;
    let epochCurrent = 1;

    const planB = planAuthStateSync({
      event: 'TOKEN_REFRESHED',
      userId: 'user-a',
      maintenanceActive: false,
      profileAuthUserId: null,
      hasCachedProfile: true,
    });
    expect(planB.action).toBe('restore_from_cache');
    epochCurrent = 2;
    const loadB = planLoadingForAuthSync(planB, 'TOKEN_REFRESHED');
    expect(loadB).toBe('set_false');
    if (loadB === 'set_false') loading = false;

    const hooks = makeHooks();
    await applyDeferredProfileResult({
      mounted: true,
      epoch: epochA,
      currentEpoch: epochCurrent,
      expectedUserId: 'user-a',
      currentUserId: 'user-a',
      result: {
        success: true,
        profile: { id: 'pa', auth_user_id: 'user-a' },
        company: { id: 'ca' },
      },
      hooks,
    });
    expect(hooks.setLoading).not.toHaveBeenCalled();
    expect(loading).toBe(false);
  });

  it('TOKEN_REFRESHED profile miss does not clear loading prematurely', () => {
    const plan = planAuthStateSync({
      event: 'TOKEN_REFRESHED',
      userId: 'user-a',
      maintenanceActive: false,
      profileAuthUserId: null,
      hasCachedProfile: false,
    });
    expect(plan.action).toBe('schedule_profile_fetch');
    expect(planLoadingForAuthSync(plan, 'TOKEN_REFRESHED')).toBe('set_true');
    expect(planLoadingForAuthSync(plan, 'TOKEN_REFRESHED')).not.toBe('set_false');
  });

  it('SIGNED_IN profile miss still sets loading true', () => {
    const plan = planAuthStateSync({
      event: 'SIGNED_IN',
      userId: 'user-a',
      maintenanceActive: false,
      profileAuthUserId: null,
      hasCachedProfile: false,
    });
    expect(plan.action).toBe('schedule_profile_fetch');
    expect(planLoadingForAuthSync(plan, 'SIGNED_IN')).toBe('set_true');
  });

  it('current deferred success still applies loading false', async () => {
    const hooks = makeHooks();
    const status = await applyDeferredProfileResult({
      mounted: true,
      epoch: 5,
      currentEpoch: 5,
      expectedUserId: 'user-a',
      currentUserId: 'user-a',
      result: {
        success: true,
        profile: { id: 'pa', auth_user_id: 'user-a' },
        company: { id: 'ca' },
      },
      hooks,
    });
    expect(status).toBe('applied');
    expect(hooks.setLoading).toHaveBeenCalledWith(false);
  });

  it('stale deferred cannot change loading', async () => {
    const hooks = makeHooks();
    await applyDeferredProfileResult({
      mounted: true,
      epoch: 1,
      currentEpoch: 2,
      expectedUserId: 'user-a',
      currentUserId: 'user-b',
      result: { success: false, error: 'timeout', isNetworkError: true },
      hooks,
    });
    expect(hooks.setLoading).not.toHaveBeenCalled();
  });

  it('A→logout→B still cannot apply A loading/profile', async () => {
    const hooks = makeHooks();
    const status = await applyDeferredProfileResult({
      mounted: true,
      epoch: 10,
      currentEpoch: 12,
      expectedUserId: 'user-a',
      currentUserId: 'user-b',
      result: {
        success: true,
        profile: { id: 'pa', auth_user_id: 'user-a' },
        company: { id: 'ca' },
      },
      hooks,
    });
    expect(status).toBe('cancelled');
    expect(hooks.setLoading).not.toHaveBeenCalled();
    expect(hooks.setUserProfile).not.toHaveBeenCalled();
    expect(hooks.signOut).not.toHaveBeenCalled();
  });
});
