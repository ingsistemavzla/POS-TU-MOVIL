import { invalidateInventoryCatalogMemory } from '@/utils/inventoryCatalogFetch';
import { clearInventoryPageCache } from '@/utils/inventoryPageCache';
import { clearEstadisticasPageCache } from '@/utils/estadisticasPageCache';

/**
 * Tras una mutación exitosa que altera inventario / catálogo visible:
 * limpia memoria de catálogo + page caches de Almacén/Artículos + Estadísticas
 * para que L1-05B no clasifique snapshots pre-mutación como `fresh`.
 */
export function invalidateInventoryDerivedCaches(): void {
  invalidateInventoryCatalogMemory();
  clearInventoryPageCache();
  clearEstadisticasPageCache();
}
