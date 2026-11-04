import { describe, expect, it } from 'vitest';
import {
  createSignOutGate,
  isKeyboardSignOutShortcut,
} from './ctrlF5SignOutShortcut';

const base = {
  metaKey: false,
  altKey: false,
  shiftKey: false,
};

describe('isKeyboardSignOutShortcut', () => {
  it('matches Ctrl+F5', () => {
    expect(
      isKeyboardSignOutShortcut({
        ...base,
        key: 'F5',
        code: 'F5',
        ctrlKey: true,
      })
    ).toBe(true);
  });

  it('matches Ctrl+Shift+R', () => {
    expect(
      isKeyboardSignOutShortcut({
        ...base,
        key: 'R',
        code: 'KeyR',
        ctrlKey: true,
        shiftKey: true,
      })
    ).toBe(true);
  });

  it('rejects plain F5', () => {
    expect(
      isKeyboardSignOutShortcut({
        ...base,
        key: 'F5',
        ctrlKey: false,
      })
    ).toBe(false);
  });

  it('rejects Ctrl+R without Shift', () => {
    expect(
      isKeyboardSignOutShortcut({
        ...base,
        key: 'r',
        code: 'KeyR',
        ctrlKey: true,
        shiftKey: false,
      })
    ).toBe(false);
  });

  it('rejects Shift+R without Ctrl', () => {
    expect(
      isKeyboardSignOutShortcut({
        ...base,
        key: 'r',
        ctrlKey: false,
        shiftKey: true,
      })
    ).toBe(false);
  });

  it('rejects Alt+Ctrl+F5', () => {
    expect(
      isKeyboardSignOutShortcut({
        ...base,
        key: 'F5',
        ctrlKey: true,
        altKey: true,
      })
    ).toBe(false);
  });

  it('rejects Meta+F5', () => {
    expect(
      isKeyboardSignOutShortcut({
        ...base,
        key: 'F5',
        ctrlKey: false,
        metaKey: true,
      })
    ).toBe(false);
  });

  it('rejects Meta+Shift+R', () => {
    expect(
      isKeyboardSignOutShortcut({
        ...base,
        key: 'r',
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
      })
    ).toBe(false);
  });
});

describe('createSignOutGate', () => {
  it('prevents overlapping signOut starts until end()', () => {
    const gate = createSignOutGate();
    expect(gate.tryBegin()).toBe(true);
    expect(gate.tryBegin()).toBe(false);
    expect(gate.inFlight).toBe(true);
    gate.end();
    expect(gate.tryBegin()).toBe(true);
  });
});
