/**
 * Fachada de ordenamiento para Almacén → Lista de Inventario → PDF.
 * Elige estrategia según la categoría seleccionada en el diálogo.
 */

import { sortAccessoryInventoryItems } from './accessoryInventorySort';
import { compareNaturalEs } from './inventoryListSortShared';
import { sortPhoneInventoryItems } from './phoneInventorySort';
import { sortTechnicalServiceInventoryItems } from './technicalServiceInventorySort';

/** Orden de bloques cuando el filtro es «Todas las categorías». */
export const INVENTORY_PDF_CATEGORY_BLOCK_ORDER = [
  'phones',
  'accessories',
  'technical_service',
] as const;

export type InventoryPdfSortable = {
  name: string;
  category?: string | null;
};

function sortByNameOnly<T extends { name: string }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const cmp = compareNaturalEs(a.item.name, b.item.name);
      if (cmp !== 0) return cmp;
      return a.index - b.index;
    })
    .map((d) => d.item);
}

function categoryBlockRank(category: string | null | undefined): number {
  const c = (category ?? '').trim();
  const idx = (INVENTORY_PDF_CATEGORY_BLOCK_ORDER as readonly string[]).indexOf(c);
  if (idx >= 0) return idx;
  return INVENTORY_PDF_CATEGORY_BLOCK_ORDER.length; // no reconocidas al final
}

/**
 * Ordena una copia de `items` para el PDF según el filtro del diálogo.
 * No muta el array de entrada ni los campos de cada ítem.
 *
 * - `technical_service` → familias ST
 * - `phones` → marcas
 * - `accessories` → tipos
 * - `all` → bloques phones → accessories → ST → resto
 * - otro → orden natural por nombre
 */
export function sortInventoryListForPdf<T extends InventoryPdfSortable>(
  categoryFilter: string,
  items: readonly T[]
): T[] {
  if (categoryFilter === 'technical_service') {
    return sortTechnicalServiceInventoryItems(items);
  }
  if (categoryFilter === 'phones') {
    return sortPhoneInventoryItems(items);
  }
  if (categoryFilter === 'accessories') {
    return sortAccessoryInventoryItems(items);
  }
  if (categoryFilter === 'all') {
    const buckets = new Map<number, T[]>();
    for (const item of items) {
      const rank = categoryBlockRank(item.category);
      const list = buckets.get(rank);
      if (list) list.push(item);
      else buckets.set(rank, [item]);
    }

    const orderedRanks = Array.from(buckets.keys()).sort((a, b) => a - b);
    const result: T[] = [];
    for (const rank of orderedRanks) {
      const bucket = buckets.get(rank) ?? [];
      if (rank === 0) {
        result.push(...sortPhoneInventoryItems(bucket));
      } else if (rank === 1) {
        result.push(...sortAccessoryInventoryItems(bucket));
      } else if (rank === 2) {
        result.push(...sortTechnicalServiceInventoryItems(bucket));
      } else {
        result.push(...sortByNameOnly(bucket));
      }
    }
    return result;
  }

  return sortByNameOnly(items);
}
