const prefetched = new Set<string>();

const routeLoaders: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/Dashboard'),
  '/presupuesto-sistema-servicio-tecnico': () => import('@/pages/PresupuestoServicioTecnicoPage'),
  '/informes': () => import('@/pages/PublicInformesCatalogPage'),
  '/pos': () => import('@/pages/POS'),
  '/almacen': () => import('@/pages/AlmacenPage').then((m) => m),
  '/articulos': () => import('@/pages/ArticulosPage').then((m) => m),
  '/sales': () => import('@/pages/SalesPage'),
  '/estadisticas': () => import('@/pages/EstadisticasPage').then((m) => m),
  '/historial': () => import('@/pages/HistorialPage').then((m) => m),
};

export function prefetchAppRoute(href: string): void {
  const path = href.split('?')[0];
  if (prefetched.has(path)) return;
  const loader = routeLoaders[path];
  if (!loader) return;
  prefetched.add(path);
  void loader();
}
