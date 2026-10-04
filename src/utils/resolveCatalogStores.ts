/**
 * L1-05H — Resolver sucursales para catálogo (Estadísticas / Almacén)
 * sin re-fetch redundante cuando StoreContext ya tiene datos suficientes.
 *
 * master_admin: StoreContext solo carga stores de `company` (si existe);
 * Estadísticas históricamente pedía todas las activas → fallback de red.
 */

export type CatalogStoreRow = { id: string; name: string };

export function mapAvailableStoresToCatalog(
  availableStores: Array<{ id: string; name: string }>
): CatalogStoreRow[] {
  return availableStores.map((s) => ({ id: s.id, name: s.name }));
}

/**
 * true → usar availableStores (sin storesQuery en el hot path).
 * false → fallback de red (master_admin o contexto aún vacío).
 */
export function canUseStoreContextForCatalog(args: {
  role?: string | null;
  availableStores: Array<{ id: string; name: string }>;
}): boolean {
  if (args.role === 'master_admin') return false;
  return args.availableStores.length > 0;
}
