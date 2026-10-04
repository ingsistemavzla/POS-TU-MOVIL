/**
 * L1-05M — Diferimiento seguro del trabajo Auth fuera de onAuthStateChange.
 * Usa setTimeout(0) (macrotask) para que auth-js libere navigator.lock
 * antes de PostgREST/signOut. No usar queueMicrotask ni Promise.then.
 */

export type AuthDeferredKind = 'profile_fetch' | 'maintenance_evict';

export type AuthDeferredSnapshot = {
  epoch: number;
  event: string;
  userId: string | null;
  kind: AuthDeferredKind;
};

export type AuthSyncPlan =
  | { action: 'noop' }
  | { action: 'maintenance_schedule' }
  | { action: 'signed_out_cleanup' }
  | { action: 'no_session' }
  | { action: 'fast_path_profile_match' }
  | { action: 'restore_from_cache'; userId: string }
  | { action: 'schedule_profile_fetch'; userId: string };

/**
 * Decide trabajo sync vs deferred a partir de refs/cache (sin I/O).
 */
export function planAuthStateSync(input: {
  event: string;
  userId: string | null;
  maintenanceActive: boolean;
  /** auth_user_id del perfil en ref (no closure stale). */
  profileAuthUserId: string | null;
  hasCachedProfile: boolean;
}): AuthSyncPlan {
  if (input.maintenanceActive) {
    return input.userId
      ? { action: 'maintenance_schedule' }
      : { action: 'signed_out_cleanup' };
  }

  if (input.event === 'SIGNED_OUT') {
    return { action: 'signed_out_cleanup' };
  }

  if (input.event === 'SIGNED_IN' || input.event === 'INITIAL_SESSION') {
    if (!input.userId) return { action: 'no_session' };
    if (input.profileAuthUserId && input.profileAuthUserId === input.userId) {
      return { action: 'fast_path_profile_match' };
    }
    if (input.hasCachedProfile) {
      return { action: 'restore_from_cache', userId: input.userId };
    }
    return { action: 'schedule_profile_fetch', userId: input.userId };
  }

  if (input.event === 'TOKEN_REFRESHED') {
    if (!input.userId) return { action: 'noop' };
    if (input.profileAuthUserId && input.profileAuthUserId === input.userId) {
      return { action: 'fast_path_profile_match' };
    }
    if (input.hasCachedProfile) {
      return { action: 'restore_from_cache', userId: input.userId };
    }
    return { action: 'schedule_profile_fetch', userId: input.userId };
  }

  return { action: 'noop' };
}

/**
 * L1-05M.3 — Ownership de loading por epoch vigente.
 * Si el sync path ya resolvió perfil (ref/cache), el epoch nuevo debe
 * setLoading(false). Profile miss NO baja loading prematuramente.
 */
export type LoadingSyncAction = 'set_true' | 'set_false' | 'unchanged';

export function planLoadingForAuthSync(
  plan: AuthSyncPlan,
  event: string
): LoadingSyncAction {
  if (plan.action === 'signed_out_cleanup' || plan.action === 'no_session') {
    return 'set_false';
  }
  if (plan.action === 'fast_path_profile_match') {
    return 'set_false';
  }
  if (plan.action === 'restore_from_cache') {
    return 'set_false';
  }
  if (plan.action === 'schedule_profile_fetch') {
    if (
      event === 'SIGNED_IN' ||
      event === 'INITIAL_SESSION' ||
      event === 'TOKEN_REFRESHED'
    ) {
      return 'set_true';
    }
    return 'unchanged';
  }
  return 'unchanged';
}

export function scheduleAuthDeferredWork(run: () => void | Promise<void>): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    void run();
  }, 0);
}

export function isAuthDeferredStillValid(args: {
  mounted: boolean;
  epoch: number;
  currentEpoch: number;
  expectedUserId: string | null;
  currentUserId: string | null | undefined;
  requireUserMatch: boolean;
}): boolean {
  if (!args.mounted) return false;
  if (args.epoch !== args.currentEpoch) return false;
  if (args.requireUserMatch) {
    if (!args.expectedUserId) return false;
    if (args.expectedUserId !== args.currentUserId) return false;
  }
  return true;
}
