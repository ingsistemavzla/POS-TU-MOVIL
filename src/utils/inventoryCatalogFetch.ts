import { supabase } from '@/integrations/supabase/client';
import { sanitizeInventoryData } from '@/utils/inventoryValidation';

/** Tamaño de página PostgREST (límite por defecto ~1000). */
const PAGE_SIZE = 1000;
/** Tamaño seguro para `.in('product_id', …)` por request. */
const PRODUCT_ID_CHUNK = 150;

/** Cache en memoria corta: Almacén / Artículos / Estadísticas comparten catálogo. */
const MEMORY_TTL_MS = 3 * 60 * 1000;

type ProductsMem = { at: number; key: string; data: CatalogProductRow[] };
type InvMem = {
  at: number;
  key: string;
  data: Array<{ product_id: string; store_id: string; qty: number; min_qty: number }>;
};

let productsMem: ProductsMem | null = null;
let inventoryMem: InvMem | null = null;

/** Invalidar cache memoria tras mutar stock (evitar UI que “vuelve” al valor viejo). */
export function invalidateInventoryCatalogMemory(): void {
  productsMem = null;
  inventoryMem = null;
}

export const PRODUCT_CATALOG_SELECT =
  'id, sku, barcode, name, category, cost_usd, sale_price_usd, tax_rate, active, created_at';

export interface CatalogProductRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  cost_usd: number;
  sale_price_usd: number;
  tax_rate: number;
  active: boolean;
  created_at: string;
}

export interface CatalogStoreRow {
  id: string;
  name: string;
}

export interface CatalogStoreInventory {
  store_id: string;
  store_name: string;
  qty: number;
}

export interface CatalogBuildResult {
  products: Array<
    CatalogProductRow & {
      total_stock: number;
      stockByStore: Record<string, number>;
    }
  >;
  storeInventories: Record<string, CatalogStoreInventory[]>;
}

/**
 * Productos activos con paginación por rango (evita truncar en ~1000).
 * Categoría opcional filtrada en servidor.
 * Cache memoria ~90s para reabrir Estadísticas / Almacén sin repetir red.
 */
export async function fetchAllActiveProducts(options?: {
  category?: string | null;
  bypassCache?: boolean;
}): Promise<CatalogProductRow[]> {
  const category = options?.category;
  const cacheKey = `cat:${category ?? 'all'}`;

  if (!options?.bypassCache && productsMem && productsMem.key === cacheKey) {
    if (Date.now() - productsMem.at < MEMORY_TTL_MS) {
      return productsMem.data;
    }
  }

  const all: CatalogProductRow[] = [];
  let from = 0;

  while (true) {
    let query = (supabase.from('products') as any)
      .select(PRODUCT_CATALOG_SELECT)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as CatalogProductRow[];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  productsMem = { at: Date.now(), key: cacheKey, data: all };
  return all;
}

/**
 * Inventario solo de los product_id dados (sin JOIN a products).
 * Chunk + range para no saturar PostgREST.
 * Cache memoria ~90s (misma clave de tienda + cantidad de IDs).
 */
export async function fetchInventoriesForProductIds(
  productIds: string[],
  options?: { storeId?: string | null; bypassCache?: boolean }
): Promise<Array<{ product_id: string; store_id: string; qty: number; min_qty: number }>> {
  if (productIds.length === 0) return [];

  const storeId = options?.storeId ?? null;
  const cacheKey = `inv:${storeId ?? 'all'}:${productIds.length}:${productIds[0]}:${productIds[productIds.length - 1]}`;

  if (!options?.bypassCache && inventoryMem && inventoryMem.key === cacheKey) {
    if (Date.now() - inventoryMem.at < MEMORY_TTL_MS) {
      return inventoryMem.data;
    }
  }

  const all: Array<{ product_id: string; store_id: string; qty: number; min_qty: number }> = [];

  for (let i = 0; i < productIds.length; i += PRODUCT_ID_CHUNK) {
    const chunk = productIds.slice(i, i + PRODUCT_ID_CHUNK);
    let from = 0;

    while (true) {
      let query = (supabase.from('inventories') as any)
        .select('product_id, store_id, qty, min_qty')
        .in('product_id', chunk)
        .range(from, from + PAGE_SIZE - 1);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        product_id: string;
        store_id: string;
        qty: number;
        min_qty: number | null;
      }>;
      if (rows.length === 0) break;
      all.push(
        ...rows.map((r) => ({
          product_id: r.product_id,
          store_id: r.store_id,
          qty: r.qty,
          min_qty: r.min_qty ?? 0,
        }))
      );
      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  inventoryMem = { at: Date.now(), key: cacheKey, data: all };
  return all;
}

/** Arma total_stock + matriz por tienda (mismas reglas que Almacén/Artículos). */
export function buildCatalogWithStock(
  productsData: CatalogProductRow[],
  inventoryData: Array<{ product_id: string; store_id: string; qty: number }>,
  storesData: CatalogStoreRow[]
): CatalogBuildResult {
  const stockByProductStore = new Map<string, Record<string, number>>();
  const inventoriesByProduct: Record<string, CatalogStoreInventory[]> = {};

  if (inventoryData.length > 0) {
    const sanitized = sanitizeInventoryData(inventoryData);
    sanitized.forEach((item: any) => {
      const productId = item.product_id;
      const storeId = item.store_id;
      const qty = Math.max(0, item.qty || 0);

      if (!stockByProductStore.has(productId)) {
        stockByProductStore.set(productId, {});
      }
      stockByProductStore.get(productId)![storeId] = qty;

      if (!inventoriesByProduct[productId]) {
        inventoriesByProduct[productId] = [];
      }
      const store = storesData.find((s) => s.id === storeId);
      inventoriesByProduct[productId].push({
        store_id: storeId,
        store_name: store?.name || 'Tienda Desconocida',
        qty,
      });
    });
  }

  productsData.forEach((product) => {
    if (!inventoriesByProduct[product.id]) {
      inventoriesByProduct[product.id] = [];
    }
    storesData.forEach((store) => {
      const exists = inventoriesByProduct[product.id].some((inv) => inv.store_id === store.id);
      if (!exists) {
        inventoriesByProduct[product.id].push({
          store_id: store.id,
          store_name: store.name,
          qty: 0,
        });
      }
    });
    inventoriesByProduct[product.id].sort((a, b) => a.store_name.localeCompare(b.store_name));
  });

  const products = productsData.map((product) => {
    const stockByStore = stockByProductStore.get(product.id) || {};
    const totalStock = Object.values(stockByStore).reduce((sum, qty) => sum + (qty || 0), 0);
    return {
      ...product,
      total_stock: totalStock,
      stockByStore,
    };
  });

  return { products, storeInventories: inventoriesByProduct };
}
