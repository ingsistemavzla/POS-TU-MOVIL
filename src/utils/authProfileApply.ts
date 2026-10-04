/**
 * L1-05M.1 — Aplicación de resultado de perfil SOLO tras validar vigencia.
 * Separado del fetch para que side effects no ocurran bajo epoch stale.
 */

import { isAuthDeferredStillValid } from '@/utils/authStateChangeDefer';

export type ResolvedProfilePayload<TProfile = unknown, TCompany = unknown> = {
  success: boolean;
  isNetworkError?: boolean;
  error?: string;
  details?: string;
  profile?: TProfile | null;
  company?: TCompany | null;
};

export type DeferredApplyHooks<TProfile = unknown, TCompany = unknown> = {
  setUserProfile: (p: TProfile | null) => void;
  setCompany: (c: TCompany | null) => void;
  setLoading: (v: boolean) => void;
  setIsSlowNetwork: (v: boolean) => void;
  setUser: (u: null) => void;
  setSession: (s: null) => void;
  setUserProfileRef: (p: TProfile | null) => void;
  setSessionRef: (s: null) => void;
  writeCache: (userId: string, profile: TProfile, company: TCompany | null) => void;
  deleteCache: (userId: string) => void;
  startKeepAlive: () => void;
  stopKeepAlive: () => void;
  signOut: () => Promise<void>;
  onReady?: () => void;
};

export function canApplyDeferredAuthResult(args: {
  mounted: boolean;
  epoch: number;
  currentEpoch: number;
  expectedUserId: string | null;
  currentUserId: string | null | undefined;
}): boolean {
  return isAuthDeferredStillValid({
    ...args,
    requireUserMatch: true,
  });
}

/**
 * Aplica resultado de perfil diferido. Si no es vigente, no hace NADA
 * (ni loading, ni cache, ni signOut).
 */
export async function applyDeferredProfileResult<TProfile, TCompany>(args: {
  mounted: boolean;
  epoch: number;
  currentEpoch: number;
  expectedUserId: string | null;
  currentUserId: string | null | undefined;
  result: ResolvedProfilePayload<TProfile, TCompany>;
  hooks: DeferredApplyHooks<TProfile, TCompany>;
}): Promise<'applied' | 'cancelled' | 'signed_out' | 'failed'> {
  if (
    !canApplyDeferredAuthResult({
      mounted: args.mounted,
      epoch: args.epoch,
      currentEpoch: args.currentEpoch,
      expectedUserId: args.expectedUserId,
      currentUserId: args.currentUserId,
    })
  ) {
    return 'cancelled';
  }

  const { result, hooks, expectedUserId } = args;
  if (!expectedUserId) return 'cancelled';

  if (result.success && result.profile) {
    hooks.setUserProfileRef(result.profile);
    hooks.setUserProfile(result.profile);
    hooks.setCompany(result.company ?? null);
    hooks.writeCache(expectedUserId, result.profile, result.company ?? null);
    hooks.setIsSlowNetwork(false);
    hooks.startKeepAlive();
    hooks.setLoading(false);
    hooks.onReady?.();
    return 'applied';
  }

  if (result.error === 'profile_not_found' || result.error === 'real_error') {
    // Re-check immediately before destructive Auth side effects.
    if (
      !canApplyDeferredAuthResult({
        mounted: args.mounted,
        epoch: args.epoch,
        currentEpoch: args.currentEpoch,
        expectedUserId: args.expectedUserId,
        currentUserId: args.currentUserId,
      })
    ) {
      return 'cancelled';
    }
    hooks.deleteCache(expectedUserId);
    hooks.setUserProfileRef(null);
    hooks.setSessionRef(null);
    hooks.setUser(null);
    hooks.setSession(null);
    hooks.setUserProfile(null);
    hooks.setCompany(null);
    hooks.setLoading(false);
    hooks.setIsSlowNetwork(false);
    hooks.stopKeepAlive();
    await hooks.signOut();
    return 'signed_out';
  }

  if (result.isNetworkError || result.error) {
    hooks.setIsSlowNetwork(true);
    hooks.setLoading(false);
    return 'failed';
  }

  hooks.setLoading(false);
  return 'failed';
}
