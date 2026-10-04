import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  beginAuthTimedOp,
  endAuthTimedOp,
  logAuthLoadEvent,
} from '@/utils/authLoadDiagnostics';

describe('L1-05J auth load diagnostics', () => {
  beforeEach(() => {
    const localStorage = {
      getItem: (k: string) => (k === 'pos_inv_load_diag' ? '1' : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal('localStorage', localStorage);
    // isInventoryLoadDiagEnabled exige window (no solo localStorage).
    vi.stubGlobal('window', { localStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('logs start/end with duration when diag enabled', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const t0 = beginAuthTimedOp('AUTH_REFRESH_EXPLICIT_START', { SOURCE: 'test' });
    endAuthTimedOp('AUTH_REFRESH_EXPLICIT_END', t0, { SOURCE: 'test', STATUS: 'ok' });
    expect(info).toHaveBeenCalled();
    const endCall = info.mock.calls.find((c) => c[1] === 'AUTH_REFRESH_EXPLICIT_END');
    expect(endCall).toBeTruthy();
    expect(endCall?.[2]).toMatchObject({
      EVENT: 'AUTH_REFRESH_EXPLICIT_END',
      SOURCE: 'test',
      STATUS: 'ok',
    });
    expect(typeof endCall?.[2]?.DURATION_MS).toBe('number');
  });

  it('emits AUTH_EVENT with correlation fields when diag enabled', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    logAuthLoadEvent('AUTH_EVENT', {
      AUTH_EVENT: 'TOKEN_REFRESHED',
      SESSION_PRESENT: true,
      USER_ID_PRESENT: false,
      SOURCE: 'test',
    });
    const call = info.mock.calls.find((c) => c[1] === 'AUTH_EVENT');
    expect(call?.[2]).toMatchObject({
      EVENT: 'AUTH_EVENT',
      AUTH_EVENT: 'TOKEN_REFRESHED',
      SESSION_PRESENT: true,
      USER_ID_PRESENT: false,
      SOURCE: 'test',
      DIAG_ENABLED: true,
    });
    expect(typeof call?.[2]?.AT_MS).toBe('number');
  });
});

