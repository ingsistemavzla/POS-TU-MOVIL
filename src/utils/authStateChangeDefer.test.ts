import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isAuthDeferredStillValid,
  planAuthStateSync,
  scheduleAuthDeferredWork,
} from '@/utils/authStateChangeDefer';

describe('L1-05M authStateChangeDefer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('schedules deferred work with setTimeout(0), not microtask', () => {
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const run = vi.fn();
    scheduleAuthDeferredWork(run);
    expect(spy).toHaveBeenCalled();
    const delay = spy.mock.calls[0]?.[1];
    expect(delay).toBe(0);
    expect(run).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not use queueMicrotask for defer', () => {
    const qm = vi.spyOn(globalThis, 'queueMicrotask');
    scheduleAuthDeferredWork(() => {});
    expect(qm).not.toHaveBeenCalled();
  });

  it('plans profile fetch when cache/profile miss on SIGNED_IN', () => {
    expect(
      planAuthStateSync({
        event: 'SIGNED_IN',
        userId: 'u1',
        maintenanceActive: false,
        profileAuthUserId: null,
        hasCachedProfile: false,
      })
    ).toEqual({ action: 'schedule_profile_fetch', userId: 'u1' });
  });

  it('plans fast path when profile ref matches on TOKEN_REFRESHED', () => {
    expect(
      planAuthStateSync({
        event: 'TOKEN_REFRESHED',
        userId: 'u1',
        maintenanceActive: false,
        profileAuthUserId: 'u1',
        hasCachedProfile: false,
      })
    ).toEqual({ action: 'fast_path_profile_match' });
  });

  it('plans restore_from_cache without schedule when cache hit', () => {
    expect(
      planAuthStateSync({
        event: 'TOKEN_REFRESHED',
        userId: 'u1',
        maintenanceActive: false,
        profileAuthUserId: null,
        hasCachedProfile: true,
      })
    ).toEqual({ action: 'restore_from_cache', userId: 'u1' });
  });

  it('plans signed_out_cleanup for SIGNED_OUT', () => {
    expect(
      planAuthStateSync({
        event: 'SIGNED_OUT',
        userId: null,
        maintenanceActive: false,
        profileAuthUserId: 'u1',
        hasCachedProfile: true,
      })
    ).toEqual({ action: 'signed_out_cleanup' });
  });

  it('plans maintenance_schedule when maintenance + user present', () => {
    expect(
      planAuthStateSync({
        event: 'TOKEN_REFRESHED',
        userId: 'u1',
        maintenanceActive: true,
        profileAuthUserId: 'u1',
        hasCachedProfile: true,
      })
    ).toEqual({ action: 'maintenance_schedule' });
  });

  it('invalidates deferred when epoch advances (SIGNED_OUT / new event)', () => {
    expect(
      isAuthDeferredStillValid({
        mounted: true,
        epoch: 1,
        currentEpoch: 2,
        expectedUserId: 'u1',
        currentUserId: 'u1',
        requireUserMatch: true,
      })
    ).toBe(false);
  });

  it('invalidates deferred when userId no longer matches', () => {
    expect(
      isAuthDeferredStillValid({
        mounted: true,
        epoch: 3,
        currentEpoch: 3,
        expectedUserId: 'u1',
        currentUserId: 'u2',
        requireUserMatch: true,
      })
    ).toBe(false);
  });

  it('rejects old epoch applying profile / signOut on new session', () => {
    const oldEpochOk = isAuthDeferredStillValid({
      mounted: true,
      epoch: 5,
      currentEpoch: 5,
      expectedUserId: 'u1',
      currentUserId: 'u1',
      requireUserMatch: true,
    });
    expect(oldEpochOk).toBe(true);
    const afterNewSession = isAuthDeferredStillValid({
      mounted: true,
      epoch: 5,
      currentEpoch: 6,
      expectedUserId: 'u1',
      currentUserId: 'u2',
      requireUserMatch: true,
    });
    expect(afterNewSession).toBe(false);
  });

  it('rejects deferred after unmount', () => {
    expect(
      isAuthDeferredStillValid({
        mounted: false,
        epoch: 1,
        currentEpoch: 1,
        expectedUserId: 'u1',
        currentUserId: 'u1',
        requireUserMatch: true,
      })
    ).toBe(false);
  });
});
