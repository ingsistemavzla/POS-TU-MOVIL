import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  parseLegacyMinimumLoadingMs,
  parsePerformanceExperienceMode,
  shouldApplyLegacyPresentation,
} from '@/config/performanceExperience';
import {
  computeShowPresentation,
  MinimumLoadingPresentationController,
} from '@/hooks/useMinimumLoadingPresentation';

describe('performanceExperience config', () => {
  it('defaults unknown mode to OPTIMIZED', () => {
    expect(parsePerformanceExperienceMode(undefined)).toBe('OPTIMIZED');
    expect(parsePerformanceExperienceMode('bogus')).toBe('OPTIMIZED');
    expect(parsePerformanceExperienceMode('LEGACY_SIMULATION')).toBe('LEGACY_SIMULATION');
  });

  it('12. duration parse is configurable with safe fallback', () => {
    expect(parseLegacyMinimumLoadingMs('15000')).toBe(15000);
    expect(parseLegacyMinimumLoadingMs('5000')).toBe(5000);
    expect(parseLegacyMinimumLoadingMs('not-a-number')).toBe(30_000);
    expect(parseLegacyMinimumLoadingMs('-1')).toBe(30_000);
  });

  it('applies only initial_entry and store_change', () => {
    expect(shouldApplyLegacyPresentation('initial_entry')).toBe(true);
    expect(shouldApplyLegacyPresentation('store_change')).toBe(true);
    expect(shouldApplyLegacyPresentation('background_refresh')).toBe(false);
    expect(shouldApplyLegacyPresentation('manual_refresh')).toBe(false);
  });
});

describe('computeShowPresentation', () => {
  it('1. OPTIMIZED is always false', () => {
    expect(
      computeShowPresentation({
        mode: 'OPTIMIZED',
        reasonApplies: true,
        dataReady: true,
        dataStatus: 'success',
        windowElapsed: false,
      })
    ).toBe(false);
  });

  it('holds until window + success', () => {
    expect(
      computeShowPresentation({
        mode: 'LEGACY_SIMULATION',
        reasonApplies: true,
        dataReady: true,
        dataStatus: 'success',
        windowElapsed: false,
      })
    ).toBe(true);
    expect(
      computeShowPresentation({
        mode: 'LEGACY_SIMULATION',
        reasonApplies: true,
        dataReady: true,
        dataStatus: 'success',
        windowElapsed: true,
      })
    ).toBe(false);
  });

  it('5/6. error/abort release immediately', () => {
    expect(
      computeShowPresentation({
        mode: 'LEGACY_SIMULATION',
        reasonApplies: true,
        dataReady: true,
        dataStatus: 'error',
        windowElapsed: false,
      })
    ).toBe(false);
    expect(
      computeShowPresentation({
        mode: 'LEGACY_SIMULATION',
        reasonApplies: true,
        dataReady: true,
        dataStatus: 'abort',
        windowElapsed: false,
      })
    ).toBe(false);
  });
});

describe('MinimumLoadingPresentationController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function make(mode: 'OPTIMIZED' | 'LEGACY_SIMULATION', minMs = 30_000) {
    let show = false;
    const c = new MinimumLoadingPresentationController(mode, minMs, (s) => {
      show = s;
    });
    return {
      c,
      get show() {
        return show;
      },
    };
  }

  it('1. OPTIMIZED = no-op', () => {
    const { c, show } = make('OPTIMIZED');
    c.beginPresentation('initial_entry');
    c.markDataReady('success');
    expect(c.showPresentation).toBe(false);
    expect(show).toBe(false);
  });

  it('2–4. LEGACY: data ready before window keeps gate; then releases', () => {
    const { c } = make('LEGACY_SIMULATION', 30_000);
    c.beginPresentation('initial_entry');
    expect(c.showPresentation).toBe(true);
    c.markDataReady('success');
    expect(c.showPresentation).toBe(true);
    vi.advanceTimersByTime(29_999);
    expect(c.showPresentation).toBe(true);
    vi.advanceTimersByTime(1);
    expect(c.showPresentation).toBe(false);
  });

  it('5. error releases immediately', () => {
    const { c } = make('LEGACY_SIMULATION');
    c.beginPresentation('initial_entry');
    c.markDataReady('error');
    expect(c.showPresentation).toBe(false);
  });

  it('6. abort releases immediately', () => {
    const { c } = make('LEGACY_SIMULATION');
    c.beginPresentation('store_change');
    c.markDataReady('abort');
    expect(c.showPresentation).toBe(false);
  });

  it('7. dispose cleans timer (no throw / no late emit)', () => {
    let emissions = 0;
    const c = new MinimumLoadingPresentationController('LEGACY_SIMULATION', 30_000, () => {
      emissions += 1;
    });
    c.beginPresentation('initial_entry');
    const before = emissions;
    c.dispose();
    vi.advanceTimersByTime(30_000);
    expect(emissions).toBe(before);
  });

  it('8. new generation invalidates prior timer', () => {
    const { c } = make('LEGACY_SIMULATION', 30_000);
    c.beginPresentation('initial_entry');
    c.markDataReady('success');
    vi.advanceTimersByTime(10_000);
    c.beginPresentation('store_change');
    expect(c.showPresentation).toBe(true);
    c.markDataReady('success');
    vi.advanceTimersByTime(29_999);
    expect(c.showPresentation).toBe(true);
    vi.advanceTimersByTime(1);
    expect(c.showPresentation).toBe(false);
  });

  it('9. background reason does not apply (and does not clear active gate)', () => {
    const { c } = make('LEGACY_SIMULATION');
    c.beginPresentation('initial_entry');
    c.markDataReady('success');
    expect(c.showPresentation).toBe(true);
    c.beginPresentation('background_refresh');
    expect(c.showPresentation).toBe(true);
  });

  it('10. manual refresh reason does not apply', () => {
    const { c } = make('LEGACY_SIMULATION');
    c.beginPresentation('manual_refresh');
    expect(c.showPresentation).toBe(false);
  });

  it('11. fresh-cache initial entry still gates visually', () => {
    const { c } = make('LEGACY_SIMULATION', 30_000);
    c.beginPresentation('initial_entry');
    c.markDataReady('success');
    expect(c.showPresentation).toBe(true);
    vi.advanceTimersByTime(30_000);
    expect(c.showPresentation).toBe(false);
  });

  it('12. duration is configurable', () => {
    const { c } = make('LEGACY_SIMULATION', 5_000);
    c.beginPresentation('initial_entry');
    c.markDataReady('success');
    vi.advanceTimersByTime(4_999);
    expect(c.showPresentation).toBe(true);
    vi.advanceTimersByTime(1);
    expect(c.showPresentation).toBe(false);
  });
});
