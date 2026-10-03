import { supabase } from '@/integrations/supabase/client';
import { isConcreteStoreId } from '@/contexts/StoreContext';
import { sanitizeInventoryData } from '@/utils/inventoryValidation';

/** Tamaño de página PostgREST (límite por defecto ~1000). */
const PAGE_SIZE = 1000;
/** Tamaño seguro para `.in('product_id', …)` por request. */
const PRODUCT_ID_CHUNK = 150;
/** Chunks de inventories en paralelo (lectura). No ilimitado. */
const INVENTORY_CHUNK_CONCURRENCY = 3;

/** Cache en memoria corta: Almacén / Artículos / Estadísticas comparten catálogo. */
const MEMORY_TTL_MS = 3 * 60 * 1000;
/**
 * Tope de keys de inventario en memoria.
 * Operación típica: ~4 sucursales concretas + `all` (5) con stockStatus=all;
 * margen para variantes stockStatus / crecimiento sin Map ilimitado.
 */
const INVENTORY_MEM_MAX_ENTRIES = 8;

type ProductsMem = { at: number; key: string; data: CatalogProductRow[] };
type InventoryRow = { product_id: string; store_id: string; qty: number; min_qty: number };
type InvMemEntry = {
  at: number;
  lastAccess: number;
  data: InventoryRow[];
};

type InflightEntry<T> = {
  promise: Promise<T>;
  refCount: number;
  controller: AbortController;
};

let productsMem: ProductsMem | null = null;
/** Multi-key acotado: varias cacheKeys frescas coexisten (Centro no evicta Zona). */
const inventoryMem = new Map<string, InvMemEntry>();
const productsInflight = new Map<string, InflightEntry<CatalogProductRow[]>>();
const inventoryInflight = new Map<string, InflightEntry<InventoryRow[]>>();

function pruneExpiredInventoryMem(now: number): void {
  for (const [key, entry] of inventoryMem) {
    if (now - entry.at >= MEMORY_TTL_MS) {
      inventoryMem.delete(key);
    }
  }
}

function getInventoryMem(cacheKey: string): InventoryRow[] | null {
  const entry = inventoryMem.get(cacheKey);
  if (!entry) return null;
  const now = Date.now();
  if (now - entry.at >= MEMORY_TTL_MS) {
    inventoryMem.delete(cacheKey);
    return null;
  }
  entry.lastAccess = now;
  return entry.data;
}

function setInventoryMem(cacheKey: string, data: InventoryRow[]): void {
  const now = Date.now();
  pruneExpiredInventoryMem(now);

  if (!inventoryMem.has(cacheKey)) {
    while (inventoryMem.size >= INVENTORY_MEM_MAX_ENTRIES) {
      let lruKey: string | null = null;
      let lruAccess = Infinity;
      for (const [key, entry] of inventoryMem) {
        if (entry.lastAccess < lruAccess) {
          lruAccess = entry.lastAccess;
          lruKey = key;
        }
      }
      if (!lruKey) break;
      inventoryMem.delete(lruKey);
    }
  }

  inventoryMem.set(cacheKey, { at: now, lastAccess: now, data });
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; message?: string };
  return e.name === 'AbortError' || /abort/i.test(e.message || '');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

/**
 * Comparte una Promise por clave. Abort del consumidor solo cancela HTTP
 * cuando su refCount llega a 0 (no rompe a otro consumidor de la misma clave).
 */
async function joinInflight<T>(
  map: Map<string, InflightEntry<T>>,
  key: string,
  start: (signal: AbortSignal) => Promise<T>,
  consumerSignal?: AbortSignal
): Promise<T> {
  throwIfAborted(consumerSignal);

  let entry = map.get(key);
  if (!entry) {
    const controller = new AbortController();
    const created: InflightEntry<T> = {
      promise: start(controller.signal).finally(() => {
        if (map.get(key) === created) {
          map.delete(key);
        }
      }),
      refCount: 0,
      controller,
    };
    entry = created;
    map.set(key, created);
  }

  entry.refCount += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    entry!.refCount -= 1;
    if (entry!.refCount <= 0) {
      entry!.controller.abort();
      if (map.get(key) === entry) {
        map.delete(key);
      }
    }
  };

  const onConsumerAbort = () => release();
  consumerSignal?.addEventListener('abort', onConsumerAbort);

  try {
    throwIfAborted(consumerSignal);
    return await entry.promise;
  } finally {
    consumerSignal?.removeEventListener('abort', onConsumerAbort);
    if (!consumerSignal?.aborted) {
      release();
    }
  }
}

/** Invalidar cache memoria tras mutar stock (evitar UI que “vuelve” al valor viejo). */
export function invalidateInventoryCatalogMemory(): void {
  productsMem = null;
  inventoryMem.clear();
  for (const entry of productsInflight.values()) {
    entry.controller.abort();
  }
  for (const entry of inventoryInflight.values()) {
    entry.controller.abort();
  }
  productsInflight.clear();
  inventoryInflight.clear();
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

export type StockPresence = 'all' | 'in_stock' | 'out_of_stock';

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

async function loadAllActiveProducts(
  category: string | null | undefined,
  signal: AbortSignal
): Promise<CatalogProductRow[]> {
  const all: CatalogProductRow[] = [];
  let from = 0;

  while (true) {
    throwIfAborted(signal);

    let query = (supabase.from('products') as any)
      .select(PRODUCT_CATALOG_SELECT)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
      .abortSignal(signal);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    throwIfAborted(signal);
    if (error) throw error;

    const rows = (data ?? []) as CatalogProductRow[];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

/**
 * Productos activos con paginación por rango (evita truncar en ~1000).
 * Categoría opcional filtrada en servidor.
 * Cache memoria + dedup in-flight por clave de categoría.
 */
export async function fetchAllActiveProducts(options?: {
  category?: string | null;
  bypassCache?: boolean;
  signal?: AbortSignal;
}): Promise<CatalogProductRow[]> {
  const category = options?.category;
  const cacheKey = `cat:${category ?? 'all'}`;
  const signal = options?.signal;

  if (!options?.bypassCache && productsMem && productsMem.key === cacheKey) {
    if (Date.now() - productsMem.at < MEMORY_TTL_MS) {
      return productsMem.data;
    }
  }

  if (options?.bypassCache) {
    const existing = productsInflight.get(cacheKey);
    if (existing) {
      existing.controller.abort();
      productsInflight.delete(cacheKey);
    }
  }

  const data = await joinInflight(
    productsInflight,
    cacheKey,
    async (sharedSignal) => {
      const rows = await loadAllActiveProducts(category, sharedSignal);
      productsMem = { at: Date.now(), key: cacheKey, data: rows };
      return rows;
    },
    signal
  );

  return data;
}

/** Ejecuta tareas con tope de concurrencia; preserva orden de resultados por índice. */
async function mapWithConcurrencyLimit<T>(
  taskCount: number,
  concurrency: number,
  worker: (index: number) => Promise<T>,
  signal: AbortSignal
): Promise<T[]> {
  const results: T[] = new Array(taskCount);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      throwIfAborted(signal);
      const index = nextIndex;
      nextIndex += 1;
      if (index >= taskCount) return;
      results[index] = await worker(index);
    }
  }

  const poolSize = Math.max(1, Math.min(concurrency, taskCount));
  await Promise.all(Array.from({ length: poolSize }, () => runWorker()));
  return results;
}

async function loadInventoryChunk(
  chunk: string[],
  storeId: string,
  stockStatus: StockPresence,
  allStores: boolean,
  signal: AbortSignal
): Promise<InventoryRow[]> {
  const chunkRows: InventoryRow[] = [];
  let from = 0;

  while (true) {
    throwIfAborted(signal);

    let query = (supabase.from('inventories') as any)
      .select('product_id, store_id, qty, min_qty')
      .in('product_id', chunk)
      .range(from, from + PAGE_SIZE - 1)
      .abortSignal(signal);

    if (!allStores) {
      query = query.eq('store_id', storeId);
    }

    if (stockStatus === 'in_stock') {
      query = query.gt('qty', 0);
    } else if (stockStatus === 'out_of_stock') {
      query = query.eq('qty', 0);
    }

    const { data, error } = await query;
    throwIfAborted(signal);
    if (error) throw error;

    const rows = (data ?? []) as Array<{
      product_id: string;
      store_id: string;
      qty: number;
      min_qty: number | null;
    }>;
    if (rows.length === 0) break;
    chunkRows.push(
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

  return chunkRows;
}

async function loadInventoriesForProductIds(
  productIds: string[],
  storeId: string,
  stockStatus: StockPresence,
  signal: AbortSignal
): Promise<InventoryRow[]> {
  const allStores = storeId === 'all';
  const chunks: string[][] = [];
  for (let i = 0; i < productIds.length; i += PRODUCT_ID_CHUNK) {
    chunks.push(productIds.slice(i, i + PRODUCT_ID_CHUNK));
  }

  // Misma secuencia de chunks que el for serial; hasta INVENTORY_CHUNK_CONCURRENCY en vuelo.
  // Si un chunk falla, Promise.all rechaza y no se devuelve resultado parcial exitoso.
  const perChunk = await mapWithConcurrencyLimit(
    chunks.length,
    INVENTORY_CHUNK_CONCURRENCY,
    (index) => loadInventoryChunk(chunks[index], storeId, stockStatus, allStores, signal),
    signal
  );

  return perChunk.flat();
}

/**
 * Inventario de los product_id dados.
 * storeId UUID: solo esa sucursal. 'all': existencias de todas las sucursales (catálogo admin).
 * Dedup in-flight por storeId + stockStatus + huella de IDs (ALL / A / B no se mezclan).
 */
export async function fetchInventoriesForProductIds(
  productIds: string[],
  storeId: string,
  options?: { bypassCache?: boolean; stockStatus?: StockPresence; signal?: AbortSignal }
): Promise<Array<{ product_id: string; store_id: string; qty: number; min_qty: number }>> {
  const allStores = storeId === 'all';
  if (!allStores && !isConcreteStoreId(storeId)) {
    throw new Error('STORE_ID_REQUIRED');
  }
  if (productIds.length === 0) return [];

  const stockStatus: StockPresence = allStores ? 'all' : (options?.stockStatus ?? 'all');
  // Identidad del conjunto completo (orden-independiente): evita colisión length+first+last.
  const productSetKey = [...productIds].sort().join(',');
  const cacheKey = `inv:${storeId}:${stockStatus}:${productSetKey}`;
  const signal = options?.signal;

  if (!options?.bypassCache) {
    const cached = getInventoryMem(cacheKey);
    if (cached) return cached;
  }

  if (options?.bypassCache) {
    const existing = inventoryInflight.get(cacheKey);
    if (existing) {
      existing.controller.abort();
      inventoryInflight.delete(cacheKey);
    }
  }

  const data = await joinInflight(
    inventoryInflight,
    cacheKey,
    async (sharedSignal) => {
      const rows = await loadInventoriesForProductIds(
        productIds,
        storeId,
        stockStatus,
        sharedSignal
      );
      setInventoryMem(cacheKey, rows);
      return rows;
    },
    signal
  );

  return data;
}

export { isAbortError };

/** Deja solo los productos cuya fila de inventario coincide con el filtro de cantidad. */
export function productsForStockPresence<T extends { id: string }>(
  products: T[],
  inventoryData: Array<{ product_id: string }>,
  stockStatus: StockPresence
): T[] {
  if (stockStatus === 'all') return products;
  const matchingIds = new Set(inventoryData.map((row) => row.product_id));
  return products.filter((product) => matchingIds.has(product.id));
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
