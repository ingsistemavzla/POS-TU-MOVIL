/** Marca visible y meta SEO fuera de la pantalla de login */

export const INVENTORY_SYSTEM_NAME = 'Inventory System';

export const INVENTORY_SYSTEM_META_DESCRIPTION =
  'Multi-store inventory management system. Stock control, product catalog, transfers and operational reports.';

export const INVENTORY_SYSTEM_META_KEYWORDS =
  'inventory system, stock management, multistore inventory, warehouse, product catalog, inventory control';

export const LOGIN_DOCUMENT_TITLE = 'Tu Móvil Margarita - Iniciar sesión';

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Meta y título para rutas autenticadas y páginas públicas (no login) */
export function applyInventorySystemDocumentMeta(pageTitle?: string) {
  const title = pageTitle ? `${pageTitle} · ${INVENTORY_SYSTEM_NAME}` : INVENTORY_SYSTEM_NAME;
  document.title = title;
  setMeta('description', INVENTORY_SYSTEM_META_DESCRIPTION);
  setMeta('keywords', INVENTORY_SYSTEM_META_KEYWORDS);
  setMeta('og:title', title, 'property');
  setMeta('og:description', INVENTORY_SYSTEM_META_DESCRIPTION, 'property');
  setMeta('og:site_name', INVENTORY_SYSTEM_NAME, 'property');
  setMeta('twitter:title', title);
  setMeta('twitter:description', INVENTORY_SYSTEM_META_DESCRIPTION);
}

/** Pestaña del navegador en login — conserva marca Tu Móvil Margarita */
export function applyLoginDocumentMeta() {
  document.title = LOGIN_DOCUMENT_TITLE;
}
