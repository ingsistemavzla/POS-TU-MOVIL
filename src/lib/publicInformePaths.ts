import { INFORME_RUTA_BASE, INFORMES_CATALOGO_SLUG, informePath } from '@/types/publicInforme';

const FIXED_PUBLIC_PATHS = new Set([
  '/',
  '/server',
  '/auth/callback',
  '/presupuesto-sistema-servicio-tecnico',
  '/informes',
  informePath(INFORMES_CATALOGO_SLUG),
]);

/** Rutas accesibles sin sesión (login) */
export function isPublicAppPath(pathname: string): boolean {
  if (FIXED_PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith(`${INFORME_RUTA_BASE}/`)) return true;
  return false;
}
