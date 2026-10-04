import { describe, expect, it, vi } from 'vitest';
import {
  applyDeferredProfileResult,
  canApplyDeferredAuthResult,
} from '@/utils/authProfileApply';

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
    onReady: vi.fn(),
  };
}

describe('L1-05M.1 deferred profile apply races', () => {
  it('A resolve after SIGNED_OUT does not apply any state', async () => {
    const hooks = makeHooks();
    const status = await applyDeferredProfileResult({
      mounted: true,
      epoch: 10,
      currentEpoch: 11, // SIGNED_OUT bumped epoch
      expectedUserId: 'user-a',
      currentUserId: null,
      result: {
        success: true,
        profile: { id: 'pa', auth_user_id: 'user-a' },
        company: { id: 'ca' },
      },
      hooks,
    });
    expect(status).toBe('cancelled');
    expect(hooks.setUserProfile).not.toHaveBeenCalled();
    expect(hooks.setCompany).not.toHaveBeenCalled();
    expect(hooks.setLoading).not.toHaveBeenCalled();
    expect(hooks.writeCache).not.toHaveBeenCalled();
    expect(hooks.signOut).not.toHaveBeenCalled();
  });

  it('A resolve after SIGNED_IN B does not touch B', async () => {
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
    expect(hooks.setUserProfile).not.toHaveBeenCalled();
    expect(hooks.setCompany).not.toHaveBeenCalled();
    expect(hooks.setLoading).not.toHaveBeenCalled();
    expect(hooks.writeCache).not.toHaveBeenCalled();
    expect(hooks.signOut).not.toHaveBeenCalled();
  });

  it('A profile_not_found after B is logged in does not signOut B', async () => {
    const hooks = makeHooks();
    const status = await applyDeferredProfileResult({
      mounted: true,
      epoch: 10,
      currentEpoch: 12,
      expectedUserId: 'user-a',
      currentUserId: 'user-b',
      result: { success: false, error: 'profile_not_found' },
      hooks,
    });
    expect(status).toBe('cancelled');
    expect(hooks.signOut).not.toHaveBeenCalled();
    expect(hooks.setLoading).not.toHaveBeenCalled();
  });

  it('stale result cannot setLoading of current session', async () => {
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
    expect(hooks.setIsSlowNetwork).not.toHaveBeenCalled();
  });

  it('cache write for A is not performed when B is current', async () => {
    const hooks = makeHooks();
    await applyDeferredProfileResult({
      mounted: true,
      epoch: 1,
      currentEpoch: 2,
      expectedUserId: 'user-a',
      currentUserId: 'user-b',
      result: {
        success: true,
        profile: { id: 'pa', auth_user_id: 'user-a' },
        company: { id: 'ca' },
      },
      hooks,
    });
    expect(hooks.writeCache).not.toHaveBeenCalled();
  });

  it('unmount during fetch prevents apply/signOut', async () => {
    const hooks = makeHooks();
    const status = await applyDeferredProfileResult({
      mounted: false,
      epoch: 3,
      currentEpoch: 3,
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
    expect(hooks.setUserProfile).not.toHaveBeenCalled();
    expect(hooks.signOut).not.toHaveBeenCalled();
  });

  it('current epoch success applies profile/company/loading', async () => {
    const hooks = makeHooks();
    const profile = { id: 'pa', auth_user_id: 'user-a' };
    const company = { id: 'ca' };
    const status = await applyDeferredProfileResult({
      mounted: true,
      epoch: 5,
      currentEpoch: 5,
      expectedUserId: 'user-a',
      currentUserId: 'user-a',
      result: { success: true, profile, company },
      hooks,
    });
    expect(status).toBe('applied');
    expect(hooks.setUserProfile).toHaveBeenCalledWith(profile);
    expect(hooks.setCompany).toHaveBeenCalledWith(company);
    expect(hooks.writeCache).toHaveBeenCalledWith('user-a', profile, company);
    expect(hooks.setLoading).toHaveBeenCalledWith(false);
    expect(hooks.startKeepAlive).toHaveBeenCalled();
  });

  it('current epoch profile_not_found still signs out', async () => {
    const hooks = makeHooks();
    const status = await applyDeferredProfileResult({
      mounted: true,
      epoch: 7,
      currentEpoch: 7,
      expectedUserId: 'user-a',
      currentUserId: 'user-a',
      result: { success: false, error: 'profile_not_found' },
      hooks,
    });
    expect(status).toBe('signed_out');
    expect(hooks.signOut).toHaveBeenCalledTimes(1);
    expect(hooks.setUserProfile).toHaveBeenCalledWith(null);
    expect(hooks.setLoading).toHaveBeenCalledWith(false);
  });

  it('stale real_error does not signOut new session', async () => {
    const hooks = makeHooks();
    const status = await applyDeferredProfileResult({
      mounted: true,
      epoch: 1,
      currentEpoch: 2,
      expectedUserId: 'user-a',
      currentUserId: 'user-b',
      result: { success: false, error: 'real_error' },
      hooks,
    });
    expect(status).toBe('cancelled');
    expect(hooks.signOut).not.toHaveBeenCalled();
  });

  it('canApplyDeferredAuthResult rejects cross-user', () => {
    expect(
      canApplyDeferredAuthResult({
        mounted: true,
        epoch: 1,
        currentEpoch: 1,
        expectedUserId: 'a',
        currentUserId: 'b',
      })
    ).toBe(false);
  });
});
