/**
 * L1-05G — Instrumentación diagnóstica DEV del ciclo de carga de inventario.
 * Solo observabilidad. No controla caches, abort, concurrency ni queries.
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
  logInventoryLoadEvent('SWEEP_END', {
    LOAD_ID: ctx.loadId,
    MODULE: ctx.module,
    STORE_ID: ctx.storeId,
    STATUS: status,
    ACTIVE_SWEEPS: activeSweeps,
  });
}

export function diagInventoryRequestStart(fields: DiagFields): void {
  if (!isInventoryLoadDiagEnabled()) return;
  activeInventoryRequests += 1;
  logInventoryLoadEvent('INVENTORY_REQUEST_START', {
    ...fields,
    ACTIVE_INVENTORY_REQUESTS: activeInventoryRequests,
  });
}

export function diagInventoryRequestEnd(fields: DiagFields): void {
  if (!isInventoryLoadDiagEnabled()) return;
  activeInventoryRequests = Math.max(0, activeInventoryRequests - 1);
  logInventoryLoadEvent('INVENTORY_REQUEST_END', {
    ...fields,
    ACTIVE_INVENTORY_REQUESTS: activeInventoryRequests,
  });
}

export function summarizeLoadTimings(args: {
  loadId: string;
  module: InventoryLoadModule;
  storeId: string;
  source: InventoryLoadSource;
  t0: number;
  productsMs?: number | null;
  inventoryMs?: number | null;
  postProcessMs?: number | null;
  cacheWriteMs?: number | null;
  serverFetchEndAt?: number | null;
  renderReadyAt?: number | null;
  status: string;
}): void {
  if (!isInventoryLoadDiagEnabled()) return;
  const end = Date.now();
  const fetchTotal =
    args.productsMs != null || args.inventoryMs != null
      ? (args.productsMs ?? 0) + (args.inventoryMs ?? 0)
      : null;
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
  productsMs: number | null;
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
