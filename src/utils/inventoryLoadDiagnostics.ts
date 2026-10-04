/**
 * L1-05G / L1-05G.1 / L1-05G.3 / L1-05G.6 — Instrumentación diagnóstica del ciclo de carga.
 * Solo observabilidad. No controla caches, abort, concurrency ni queries.
 *
 * L1-05G.1: DURATION_MS monotónico en PRODUCTS / REQUEST / SWEEP + chunk stats.
 * L1-05G.3: STORES_MS / PRODUCTS_MS / PHASE1_WALL_MS.
 * L1-05G.6: wrapper fetch diagnóstico (FETCH_ENTER/RESPONSE, HTTP_FETCH_MS, gaps).
 *           Correlación LOAD_ID in-memory (sin headers ni cambio de semántica HTTP).
 *
 * Activación:
 * - import.meta.env.DEV, o
 * - localStorage.setItem('pos_inv_load_diag', '1')
 */

export type InventoryLoadModule = 'Almacen' | 'Articulos' | 'Estadisticas';

export type InventoryLoadSource =
  | 'PAGE_CACHE'
  | 'INVENTORY_MEM'
  | 'INFLIGHT_JOIN'
  | 'SERVER_FETCH';

export type InventoryLoadAbortReason =
  | 'STORE_CHANGE'
  | 'ROUTE_CHANGE'
  | 'UNMOUNT'
  | 'REFRESH'
  | 'NEW_GENERATION'
  | 'UNKNOWN';

export type InventoryLoadDiagContext = {
  loadId: string;
  module: InventoryLoadModule;
  storeId: string;
  /** Sink opcional: el fetch reporta SOURCE real sin cambiar el return value. */
  observeInventorySource?: (source: InventoryLoadSource) => void;
};

const DIAG_FLAG_KEY = 'pos_inv_load_diag';
const LOG_PREFIX = '[INV_LOAD_DIAG]';

let activeInventoryRequests = 0;
let activeSweeps = 0;
let loadSeq = 0;

/** Solo diag: inicio monotónico de sweep por LOAD_ID. */
const sweepStartMonoByLoadId = new Map<string, number>();
/** Solo diag: duraciones de chunks terminados dentro del sweep actual. */
const sweepChunkDurationsByLoadId = new Map<string, number[]>();
/** Solo diag: inicio monotónico de request por LOAD_ID:CHUNK_INDEX. */
const inventoryRequestStartMono = new Map<string, number>();

/** Reloj monotónico para duraciones de diagnóstico (L1-05G.1). */
export function diagNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export function roundDiagMs(ms: number): number {
  return Math.round(ms);
}

/** Stats de chunks para SWEEP_END (puro; testeable). */
export function computeChunkDurationStats(durationsMs: number[]): {
  SLOWEST_CHUNK_MS: number | null;
  FASTEST_CHUNK_MS: number | null;
  AVG_CHUNK_MS: number | null;
} {
  if (durationsMs.length === 0) {
    return { SLOWEST_CHUNK_MS: null, FASTEST_CHUNK_MS: null, AVG_CHUNK_MS: null };
  }
  let slowest = durationsMs[0];
  let fastest = durationsMs[0];
  let sum = 0;
  for (const d of durationsMs) {
    if (d > slowest) slowest = d;
    if (d < fastest) fastest = d;
    sum += d;
  }
  return {
    SLOWEST_CHUNK_MS: roundDiagMs(slowest),
    FASTEST_CHUNK_MS: roundDiagMs(fastest),
    AVG_CHUNK_MS: roundDiagMs(sum / durationsMs.length),
  };
}

function requestTimingKey(loadId: unknown, chunkIndex: unknown): string | null {
  if (loadId == null || chunkIndex == null) return null;
  return `${String(loadId)}:${String(chunkIndex)}`;
}

export function isInventoryLoadDiagEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (import.meta.env.DEV) return true;
    return window.localStorage.getItem(DIAG_FLAG_KEY) === '1';
  } catch {
    return !!import.meta.env.DEV;
  }
}

export function createInventoryLoadId(): string {
  loadSeq += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `L${Date.now().toString(36)}_${loadSeq}_${rand}`;
}

export function getActiveInventoryRequests(): number {
  return activeInventoryRequests;
}

export function getActiveSweeps(): number {
  return activeSweeps;
}

type DiagFields = Record<string, string | number | boolean | null | undefined>;

export function logInventoryLoadEvent(event: string, fields: DiagFields = {}): void {
  if (!isInventoryLoadDiagEnabled()) return;

  const payload: DiagFields = {
    EVENT: event,
    ACTIVE_SWEEPS: activeSweeps,
    ACTIVE_INVENTORY_REQUESTS: activeInventoryRequests,
    ...fields,
  };

  // Una línea JSON estable para filtrar en DevTools Console.
  console.info(LOG_PREFIX, event, payload);
}

export function diagSweepStart(ctx: InventoryLoadDiagContext): void {
  if (!isInventoryLoadDiagEnabled()) return;
  activeSweeps += 1;
  sweepStartMonoByLoadId.set(ctx.loadId, diagNow());
  sweepChunkDurationsByLoadId.set(ctx.loadId, []);
  logInventoryLoadEvent('SWEEP_START', {
    LOAD_ID: ctx.loadId,
    MODULE: ctx.module,
    STORE_ID: ctx.storeId,
    ACTIVE_SWEEPS: activeSweeps,
  });
}

export function diagSweepEnd(
  ctx: InventoryLoadDiagContext,
  status: 'success' | 'aborted' | 'error'
): void {
  if (!isInventoryLoadDiagEnabled()) return;
  activeSweeps = Math.max(0, activeSweeps - 1);
  const startMono = sweepStartMonoByLoadId.get(ctx.loadId);
  sweepStartMonoByLoadId.delete(ctx.loadId);
  const chunkDurations = sweepChunkDurationsByLoadId.get(ctx.loadId) ?? [];
  sweepChunkDurationsByLoadId.delete(ctx.loadId);
  const durationMs =
    startMono != null ? roundDiagMs(diagNow() - startMono) : null;
  const chunkStats = computeChunkDurationStats(chunkDurations);

  logInventoryLoadEvent('SWEEP_END', {
    LOAD_ID: ctx.loadId,
    MODULE: ctx.module,
    STORE_ID: ctx.storeId,
    STATUS: status,
    DURATION_MS: durationMs,
    SLOWEST_CHUNK_MS: chunkStats.SLOWEST_CHUNK_MS,
    FASTEST_CHUNK_MS: chunkStats.FASTEST_CHUNK_MS,
    AVG_CHUNK_MS: chunkStats.AVG_CHUNK_MS,
    CHUNK_SAMPLES: chunkDurations.length,
    ACTIVE_SWEEPS: activeSweeps,
  });
}

export function diagInventoryRequestStart(fields: DiagFields): void {
  if (!isInventoryLoadDiagEnabled()) return;
  activeInventoryRequests += 1;
  const key = requestTimingKey(fields.LOAD_ID, fields.CHUNK_INDEX);
  if (key) inventoryRequestStartMono.set(key, diagNow());
  logInventoryLoadEvent('INVENTORY_REQUEST_START', {
    ...fields,
    ACTIVE_INVENTORY_REQUESTS: activeInventoryRequests,
  });
}

export function diagInventoryRequestEnd(fields: DiagFields): void {
  if (!isInventoryLoadDiagEnabled()) return;
  activeInventoryRequests = Math.max(0, activeInventoryRequests - 1);
  const key = requestTimingKey(fields.LOAD_ID, fields.CHUNK_INDEX);
  let durationMs: number | null = null;
  if (key) {
    const startMono = inventoryRequestStartMono.get(key);
    inventoryRequestStartMono.delete(key);
    if (startMono != null) {
      durationMs = roundDiagMs(diagNow() - startMono);
      const loadId = fields.LOAD_ID != null ? String(fields.LOAD_ID) : null;
      if (loadId != null) {
        const bucket = sweepChunkDurationsByLoadId.get(loadId);
        if (bucket) bucket.push(durationMs);
      }
    }
  }

  logInventoryLoadEvent('INVENTORY_REQUEST_END', {
    ...fields,
    LOAD_ID: fields.LOAD_ID ?? null,
    MODULE: fields.MODULE ?? null,
    STORE_ID: fields.STORE_ID ?? null,
    CHUNK_INDEX: fields.CHUNK_INDEX ?? null,
    TOTAL_CHUNKS: fields.TOTAL_CHUNKS ?? null,
    STATUS: fields.STATUS ?? null,
    DURATION_MS: durationMs,
    ACTIVE_INVENTORY_REQUESTS: activeInventoryRequests,
  });
}

/**
 * FETCH_TOTAL (L1-05G.3):
 * - Si hay PHASE1_WALL_MS (Estadísticas): wall fase1 + inventory (no suma stores+products en paralelo).
 * - Si no: compat G/G.1 → productsMs + inventoryMs (Almacén/Artículos aún miden wall de Promise.all en productsMs).
 */
export function computeFetchTotalMs(args: {
  productsMs?: number | null;
  storesMs?: number | null;
  phase1WallMs?: number | null;
  inventoryMs?: number | null;
}): number | null {
  const hasPhase1 = args.phase1WallMs != null;
  const hasProducts = args.productsMs != null;
  const hasInventory = args.inventoryMs != null;
  if (!hasPhase1 && !hasProducts && !hasInventory) return null;
  if (hasPhase1) {
    return (args.phase1WallMs ?? 0) + (args.inventoryMs ?? 0);
  }
  return (args.productsMs ?? 0) + (args.inventoryMs ?? 0);
}

export function summarizeLoadTimings(args: {
  loadId: string;
  module: InventoryLoadModule;
  storeId: string;
  source: InventoryLoadSource;
  t0: number;
  productsMs?: number | null;
  storesMs?: number | null;
  phase1WallMs?: number | null;
  inventoryMs?: number | null;
  postProcessMs?: number | null;
  cacheWriteMs?: number | null;
  serverFetchEndAt?: number | null;
  renderReadyAt?: number | null;
  status: string;
}): void {
  if (!isInventoryLoadDiagEnabled()) return;
  const end = Date.now();
  const fetchTotal = computeFetchTotalMs({
    productsMs: args.productsMs,
    storesMs: args.storesMs,
    phase1WallMs: args.phase1WallMs,
    inventoryMs: args.inventoryMs,
  });
  const networkToUiGap =
    args.serverFetchEndAt != null && args.renderReadyAt != null
      ? Math.max(0, args.renderReadyAt - args.serverFetchEndAt)
      : null;

  logInventoryLoadEvent('LOAD_SUMMARY', {
    LOAD_ID: args.loadId,
    MODULE: args.module,
    STORE_ID: args.storeId,
    SOURCE: args.source,
    START: args.t0,
    END: end,
    DURATION: end - args.t0,
    STATUS: args.status,
    FETCH_TOTAL: fetchTotal,
    PRODUCTS_MS: args.productsMs ?? null,
    STORES_MS: args.storesMs ?? null,
    PHASE1_WALL_MS: args.phase1WallMs ?? null,
    INVENTORY_MS: args.inventoryMs ?? null,
    POST_PROCESS: args.postProcessMs ?? null,
    CACHE_WRITE: args.cacheWriteMs ?? null,
    TOTAL_LOAD: end - args.t0,
    NETWORK_TO_UI_GAP_MS: networkToUiGap,
  });
}

/** Estado mutable por carga de página (solo diag). */
export type PageLoadDiagState = {
  loadId: string;
  module: InventoryLoadModule;
  storeId: string;
  t0: number;
  source: InventoryLoadSource;
  /** Duración real de fetchAllActiveProducts (Estadísticas G.3); en otras páginas puede ser wall phase1. */
  productsMs: number | null;
  /** Duración real de storesQuery (L1-05G.3). */
  storesMs: number | null;
  /** Wall del Promise.all(stores, products) (L1-05G.3). */
  phase1WallMs: number | null;
  inventoryMs: number | null;
  postProcessMs: number | null;
  cacheWriteMs: number | null;
  serverFetchEndAt: number | null;
  renderReadyAt: number | null;
  status: string;
};

export function createPageLoadDiagState(
  module: InventoryLoadModule,
  storeId: string,
  source: InventoryLoadSource = 'SERVER_FETCH'
): PageLoadDiagState {
  return {
    loadId: createInventoryLoadId(),
    module,
    storeId,
    t0: Date.now(),
    source,
    productsMs: null,
    storesMs: null,
    phase1WallMs: null,
    inventoryMs: null,
    postProcessMs: null,
    cacheWriteMs: null,
    serverFetchEndAt: null,
    renderReadyAt: null,
    status: 'pending',
  };
}

export function logLoadStart(
  state: PageLoadDiagState,
  extra?: { prevLoadId?: string | null; abortReason?: InventoryLoadAbortReason | null }
): void {
  logInventoryLoadEvent('LOAD_START', {
    LOAD_ID: state.loadId,
    MODULE: state.module,
    STORE_ID: state.storeId,
    SOURCE: state.source,
    START: state.t0,
    PREV_LOAD_ID: extra?.prevLoadId ?? null,
    ABORT_REASON_PENDING: extra?.abortReason ?? null,
  });
}

export function logRenderReady(state: PageLoadDiagState): void {
  state.renderReadyAt = Date.now();
  logInventoryLoadEvent('RENDER_READY', {
    LOAD_ID: state.loadId,
    MODULE: state.module,
    STORE_ID: state.storeId,
    SOURCE: state.source,
    AT: state.renderReadyAt,
    SINCE_START_MS: state.renderReadyAt - state.t0,
  });
}

export function logLoadEnd(state: PageLoadDiagState, status: string): void {
  state.status = status;
  logInventoryLoadEvent('LOAD_END', {
    LOAD_ID: state.loadId,
    MODULE: state.module,
    STORE_ID: state.storeId,
    SOURCE: state.source,
    STATUS: status,
    DURATION: Date.now() - state.t0,
  });
  summarizeLoadTimings({
    loadId: state.loadId,
    module: state.module,
    storeId: state.storeId,
    source: state.source,
    t0: state.t0,
    productsMs: state.productsMs,
    storesMs: state.storesMs,
    phase1WallMs: state.phase1WallMs,
    inventoryMs: state.inventoryMs,
    postProcessMs: state.postProcessMs,
    cacheWriteMs: state.cacheWriteMs,
    serverFetchEndAt: state.serverFetchEndAt,
    renderReadyAt: state.renderReadyAt,
    status,
  });
}

export function logAbortRequested(
  loadId: string | null | undefined,
  module: InventoryLoadModule,
  storeId: string,
  reason: InventoryLoadAbortReason,
  prevLoadId?: string | null
): void {
  logInventoryLoadEvent('ABORT_REQUESTED', {
    LOAD_ID: loadId ?? null,
    PREV_LOAD_ID: prevLoadId ?? null,
    MODULE: module,
    STORE_ID: storeId,
    REASON: reason,
  });
}

export function toDiagContext(state: PageLoadDiagState): InventoryLoadDiagContext {
  return {
    loadId: state.loadId,
    module: state.module,
    storeId: state.storeId,
    observeInventorySource: (source) => {
      state.source = source;
    },
  };
}

/* =============================================================================
 * L1-05G.6 — Fetch wrapper diagnóstico + correlación in-memory LOAD_ID
 * ============================================================================= */

export type DiagNetworkResource =
  | 'stores'
  | 'products'
  | 'inventories'
  | 'auth'
  | 'rpc'
  | 'function'
  | 'other'
  | 'unknown';

type DiagNetworkFetchSample = {
  requestId: string;
  enterAt: number;
  responseAt: number | null;
  httpMs: number | null;
  status: number | null;
  aborted: boolean;
};

type DiagNetworkOp = {
  opId: string;
  loadId: string;
  module: InventoryLoadModule;
  storeId: string;
  resource: DiagNetworkResource;
  startMono: number;
  fetches: DiagNetworkFetchSample[];
  ended: boolean;
};

export type DiagNetworkOpMetrics = {
  OP_ID: string;
  LOAD_ID: string;
  MODULE: InventoryLoadModule;
  STORE_ID: string;
  RESOURCE: DiagNetworkResource;
  AWAIT_MS: number;
  FETCH_START_GAP_MS: number | null;
  HTTP_FETCH_MS: number | null;
  HTTP_FETCH_SUM_MS: number | null;
  POST_FETCH_GAP_MS: number | null;
  FETCH_COUNT: number;
  REQUEST_IDS: string;
};

let networkOpSeq = 0;
let fetchReqSeq = 0;
const openNetworkOps: DiagNetworkOp[] = [];
const requestIdToOpId = new Map<string, string>();

const nativeFetch: typeof fetch =
  typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : ((...args: Parameters<typeof fetch>) => fetch(...args));

/** Recurso seguro desde URL Supabase (sin query/credenciales). */
export function sanitizeSupabaseResource(input: RequestInfo | URL): DiagNetworkResource {
  try {
    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    if (!raw) return 'unknown';
    if (raw.includes('/auth/v1/')) return 'auth';
    if (raw.includes('/functions/v1/')) return 'function';
    const rpc = raw.match(/\/rest\/v1\/rpc\/([a-zA-Z0-9_]+)/);
    if (rpc) return 'rpc';
    const table = raw.match(/\/rest\/v1\/([a-zA-Z0-9_]+)/);
    if (!table) return 'other';
    const name = table[1];
    if (name === 'stores' || name === 'products' || name === 'inventories') return name;
    return 'other';
  } catch {
    return 'unknown';
  }
}

export function computeNetworkOpMetrics(
  op: {
    opId: string;
    loadId: string;
    module: InventoryLoadModule;
    storeId: string;
    resource: DiagNetworkResource;
    startMono: number;
    fetches: DiagNetworkFetchSample[];
  },
  endMono: number
): DiagNetworkOpMetrics {
  const awaitMs = roundDiagMs(endMono - op.startMono);
  const first = op.fetches[0];
  const lastWithResponse = [...op.fetches].reverse().find((f) => f.responseAt != null);
  const httpSum = op.fetches.reduce((acc, f) => acc + (f.httpMs ?? 0), 0);
  const httpCount = op.fetches.filter((f) => f.httpMs != null).length;
  return {
    OP_ID: op.opId,
    LOAD_ID: op.loadId,
    MODULE: op.module,
    STORE_ID: op.storeId,
    RESOURCE: op.resource,
    AWAIT_MS: awaitMs,
    FETCH_START_GAP_MS:
      first != null ? roundDiagMs(first.enterAt - op.startMono) : null,
    HTTP_FETCH_MS: first?.httpMs ?? null,
    HTTP_FETCH_SUM_MS: httpCount > 0 ? roundDiagMs(httpSum) : null,
    POST_FETCH_GAP_MS:
      lastWithResponse?.responseAt != null
        ? roundDiagMs(endMono - lastWithResponse.responseAt)
        : null,
    FETCH_COUNT: op.fetches.length,
    REQUEST_IDS: op.fetches.map((f) => f.requestId).join(',') || '',
  };
}

function matchOpenNetworkOp(resource: DiagNetworkResource): DiagNetworkOp | null {
  // Preferir op abierta del mismo resource que aún no tiene fetch (pre-gap limpio).
  for (let i = openNetworkOps.length - 1; i >= 0; i -= 1) {
    const op = openNetworkOps[i];
    if (op.ended) continue;
    if (op.resource !== resource) continue;
    if (op.fetches.length === 0) return op;
  }
  // Products/inventories multipágina: asociar al op abierto más reciente del resource.
  for (let i = openNetworkOps.length - 1; i >= 0; i -= 1) {
    const op = openNetworkOps[i];
    if (!op.ended && op.resource === resource) return op;
  }
  return null;
}

/** Marca inicio de await de red correlacionable (stores/products/inventories). */
export function beginDiagNetworkOp(args: {
  loadId: string;
  module: InventoryLoadModule;
  storeId: string;
  resource: DiagNetworkResource;
}): string | null {
  if (!isInventoryLoadDiagEnabled()) return null;
  networkOpSeq += 1;
  const opId = `NOP_${Date.now().toString(36)}_${networkOpSeq}`;
  openNetworkOps.push({
    opId,
    loadId: args.loadId,
    module: args.module,
    storeId: args.storeId,
    resource: args.resource,
    startMono: diagNow(),
    fetches: [],
    ended: false,
  });
  return opId;
}

/** Cierra op y devuelve métricas AWAIT / START_GAP / HTTP / POST_GAP. */
export function endDiagNetworkOp(opId: string | null | undefined): DiagNetworkOpMetrics | null {
  if (!opId || !isInventoryLoadDiagEnabled()) return null;
  const idx = openNetworkOps.findIndex((o) => o.opId === opId);
  if (idx < 0) return null;
  const op = openNetworkOps[idx];
  op.ended = true;
  const endMono = diagNow();
  const metrics = computeNetworkOpMetrics(op, endMono);
  openNetworkOps.splice(idx, 1);
  for (const f of op.fetches) {
    requestIdToOpId.delete(f.requestId);
  }
  logInventoryLoadEvent('NETWORK_OP_SUMMARY', {
    ...metrics,
    STORES_AWAIT_MS: op.resource === 'stores' ? metrics.AWAIT_MS : null,
    STORES_FETCH_START_GAP_MS: op.resource === 'stores' ? metrics.FETCH_START_GAP_MS : null,
    STORES_HTTP_FETCH_MS: op.resource === 'stores' ? metrics.HTTP_FETCH_MS : null,
    STORES_POST_FETCH_GAP_MS: op.resource === 'stores' ? metrics.POST_FETCH_GAP_MS : null,
    PRODUCTS_AWAIT_MS: op.resource === 'products' ? metrics.AWAIT_MS : null,
    PRODUCTS_FETCH_START_GAP_MS: op.resource === 'products' ? metrics.FETCH_START_GAP_MS : null,
    PRODUCTS_HTTP_FETCH_MS: op.resource === 'products' ? metrics.HTTP_FETCH_MS : null,
    PRODUCTS_POST_FETCH_GAP_MS: op.resource === 'products' ? metrics.POST_FETCH_GAP_MS : null,
  });
  return metrics;
}

function isAbortLikeError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError';
}

async function instrumentedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  fetchReqSeq += 1;
  const requestId = `REQ_${Date.now().toString(36)}_${fetchReqSeq}`;
  const resource = sanitizeSupabaseResource(input);
  const enterAt = diagNow();
  const matched = matchOpenNetworkOp(resource);
  if (matched) {
    matched.fetches.push({
      requestId,
      enterAt,
      responseAt: null,
      httpMs: null,
      status: null,
      aborted: false,
    });
    requestIdToOpId.set(requestId, matched.opId);
  }

  logInventoryLoadEvent('FETCH_ENTER', {
    REQUEST_ID: requestId,
    LOAD_ID: matched?.loadId ?? null,
    MODULE: matched?.module ?? null,
    STORE_ID: matched?.storeId ?? null,
    RESOURCE: resource,
    OP_ID: matched?.opId ?? null,
    FETCH_ENTER_AT: roundDiagMs(enterAt),
    FETCH_START_GAP_MS:
      matched != null ? roundDiagMs(enterAt - matched.startMono) : null,
  });

  try {
    const response = await nativeFetch(input, init);
    const responseAt = diagNow();
    const httpMs = roundDiagMs(responseAt - enterAt);
    if (matched) {
      const sample = matched.fetches.find((f) => f.requestId === requestId);
      if (sample) {
        sample.responseAt = responseAt;
        sample.httpMs = httpMs;
        sample.status = response.status;
      }
    }
    logInventoryLoadEvent('FETCH_RESPONSE', {
      REQUEST_ID: requestId,
      LOAD_ID: matched?.loadId ?? null,
      MODULE: matched?.module ?? null,
      STORE_ID: matched?.storeId ?? null,
      RESOURCE: resource,
      OP_ID: matched?.opId ?? null,
      FETCH_RESPONSE_AT: roundDiagMs(responseAt),
      HTTP_FETCH_MS: httpMs,
      STATUS: response.status,
      ABORTED: false,
    });
    return response;
  } catch (err) {
    const responseAt = diagNow();
    const httpMs = roundDiagMs(responseAt - enterAt);
    const aborted = isAbortLikeError(err);
    if (matched) {
      const sample = matched.fetches.find((f) => f.requestId === requestId);
      if (sample) {
        sample.responseAt = responseAt;
        sample.httpMs = httpMs;
        sample.aborted = aborted;
      }
    }
    logInventoryLoadEvent('FETCH_RESPONSE', {
      REQUEST_ID: requestId,
      LOAD_ID: matched?.loadId ?? null,
      MODULE: matched?.module ?? null,
      STORE_ID: matched?.storeId ?? null,
      RESOURCE: resource,
      OP_ID: matched?.opId ?? null,
      FETCH_RESPONSE_AT: roundDiagMs(responseAt),
      HTTP_FETCH_MS: httpMs,
      STATUS: null,
      ABORTED: aborted,
    });
    throw err;
  }
}

/**
 * Fetch para createClient. Con diag OFF: solo reenvía a fetch nativo (overhead mínimo).
 * No altera headers, URL, body, retry ni abort.
 */
export function createDiagnosticFetch(): typeof fetch {
  const wrapped: typeof fetch = (input, init) => {
    if (!isInventoryLoadDiagEnabled()) {
      return nativeFetch(input, init);
    }
    return instrumentedFetch(input, init);
  };
  return wrapped;
}

/** Solo tests. */
export function __resetDiagNetworkOpsForTests(): void {
  openNetworkOps.length = 0;
  requestIdToOpId.clear();
  networkOpSeq = 0;
  fetchReqSeq = 0;
}
