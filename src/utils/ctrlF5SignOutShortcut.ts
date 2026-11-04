/**
 * Atajos de teclado para cerrar sesión (mismo flujo signOut).
 * - Ctrl+F5
 * - Ctrl+Shift+R
 * No incluye: F5, Ctrl+R (sin Shift), Shift+R, Meta/Cmd.
 */

export function isKeyboardSignOutShortcut(e: {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): boolean {
  if (!e.ctrlKey || e.metaKey || e.altKey) return false;

  const isF5 = e.key === 'F5' || e.code === 'F5';
  if (isF5) return true;

  const isR = e.key === 'r' || e.key === 'R' || e.code === 'KeyR';
  return isR && e.shiftKey;
}

/** @deprecated alias — usar isKeyboardSignOutShortcut */
export const isCtrlF5SignOutShortcut = isKeyboardSignOutShortcut;

/** Candado anti-doble ejecución (puro, testeable). */
export function createSignOutGate() {
  let busy = false;
  return {
    tryBegin(): boolean {
      if (busy) return false;
      busy = true;
      return true;
    },
    end(): void {
      busy = false;
    },
    get inFlight(): boolean {
      return busy;
    },
  };
}
