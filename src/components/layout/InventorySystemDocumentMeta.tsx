import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  applyInventorySystemDocumentMeta,
  applyLoginDocumentMeta,
} from '@/constants/inventorySystemBranding';
import { isPublicAppPath } from '@/lib/publicInformePaths';

/** Sincroniza title/meta según ruta; login mantiene título Tu Móvil Margarita */
export function InventorySystemDocumentMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/' || pathname.startsWith('/auth')) {
      applyLoginDocumentMeta();
      return;
    }

    if (pathname.startsWith('/informe/') || pathname === '/informes') {
      applyInventorySystemDocumentMeta('Operational reports');
      return;
    }

    if (pathname === '/server') {
      applyInventorySystemDocumentMeta('System status');
      return;
    }

    if (pathname === '/presupuesto-sistema-servicio-tecnico') {
      applyInventorySystemDocumentMeta('Technical service');
      return;
    }

    if (isPublicAppPath(pathname)) {
      applyInventorySystemDocumentMeta();
      return;
    }

    applyInventorySystemDocumentMeta();
  }, [pathname]);

  return null;
}
