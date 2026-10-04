import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('L1-05M AuthContext onAuthStateChange contract', () => {
  const src = readFileSync(resolve(__dirname, './AuthContext.tsx'), 'utf8');

  it('registers a non-async onAuthStateChange callback', () => {
    expect(src).toMatch(/onAuthStateChange\(\(event,\s*session\)\s*=>/);
    expect(src).not.toMatch(/onAuthStateChange\(\s*async\s*\(/);
  });

  it('defers auth work with scheduleAuthDeferredWork / setTimeout path', () => {
    expect(src).toContain('scheduleAuthDeferredWork');
    expect(src).toContain('handleAuthStateDeferred');
    expect(src).not.toMatch(/queueMicrotask\s*\(/);
  });

  it('does not await network helpers inside the direct callback body marker', () => {
    const start = src.indexOf('onAuthStateChange((event, session) =>');
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, start + 4500);
    expect(body).not.toMatch(/await\s+fetchUserProfile/);
    expect(body).not.toMatch(/await\s+supabase\.auth\.signOut/);
    expect(body).not.toMatch(/await\s+evictSessionForMaintenance/);
  });

  it('uses userProfileRef and authEpochRef for sync decisions', () => {
    expect(src).toContain('userProfileRef');
    expect(src).toContain('authEpochRef');
    expect(src).toContain('planAuthStateSync');
  });

  it('deferred profile fetch uses applyEffects false + gated apply', () => {
    expect(src).toContain('applyEffects: false');
    expect(src).toContain('applyDeferredProfileResult');
  });

  it('uses planLoadingForAuthSync for loading ownership', () => {
    expect(src).toContain('planLoadingForAuthSync');
  });
});

