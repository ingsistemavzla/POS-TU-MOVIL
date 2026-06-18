import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  applyInventorySystemDocumentMeta,
  applyLoginDocumentMeta,
} from '@/constants/inventorySystemBranding';
import { isPublicAppPath } from '@/lib/publicInformePaths';

/** Meta/título solo en rutas públicas; login y panel autenticado sin cambios */
export function InventorySystemDocumentMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/' || pathname.startsWith('/auth')) {
      applyLoginDocumentMeta();
      return;
    }

    if (isPublicAppPath(pathname)) {
      if (pathname.startsWith('/informe/') || pathname === '/informes') {
        applyInventorySystemDocumentMeta('Operational reports');
      } else if (pathname === '/server') {
        applyInventorySystemDocumentMeta('System status');
      } else if (pathname === '/presupuesto-sistema-servicio-tecnico') {
        applyInventorySystemDocumentMeta('Technical service');
      } else {
        applyInventorySystemDocumentMeta();
      }
    }
  }, [pathname]);

  return null;
}
