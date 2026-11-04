import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createSignOutGate,
  isKeyboardSignOutShortcut,
} from '@/utils/ctrlF5SignOutShortcut';

/**
 * Atajos globales (con sesión): Ctrl+F5 | Ctrl+Shift+R → signOut.
 * F5 / Ctrl+R (sin Shift) no se interceptan (recarga con sesión).
 *
 * Limitación: si Chrome reserva el atajo como hard refresh y no entrega
 * un keydown cancelable, este listener no podrá evitar la recarga.
 */
export function CtrlF5SignOutShortcut() {
  const { user, session, signOut } = useAuth();
  const gateRef = useRef(createSignOutGate());
  const authenticated = !!(user || session);

  useEffect(() => {
    if (!authenticated) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isKeyboardSignOutShortcut(e)) return;

      e.preventDefault();
      e.stopPropagation();

      if (!gateRef.current.tryBegin()) return;

      void (async () => {
        try {
          await signOut();
        } catch (err) {
          console.error('[Auth] Keyboard signOut failed:', err);
        } finally {
          gateRef.current.end();
        }
      })();
    };

    // Captura: antes que handlers de página (p. ej. SalesPage).
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [authenticated, signOut]);

  return null;
}
