/** Sin stock (rojo): suma global = 0 */
export const STOCK_OUT_OF_STOCK_QTY = 0;

/** Stock crítico (naranja): suma global 1–2 uds (< 3) */
export const STOCK_CRITICAL_MIN_QTY = 1;
export const STOCK_CRITICAL_MAX_EXCLUSIVE = 3;

/** Stock bajo (amarillo): suma global 3–4 uds (< 5) */
export const STOCK_WARNING_MIN_QTY = 3;
export const STOCK_WARNING_MAX_EXCLUSIVE = 5;

/** Normal (verde): suma global >= 5 */
export const STOCK_NORMAL_MIN_QTY = 5;

/** Identificador sintético para alertas consolidadas entre sucursales */
export const GLOBAL_STOCK_STORE_ID = 'global';
export const GLOBAL_STOCK_STORE_LABEL = 'Total global (todas las sucursales)';

export type StockAlertMode = 'out_of_stock' | 'critical' | 'warning';

export interface DashboardStockAlertItem {
  key: string;
  productId: string;
  name: string;
  sku: string;
  category: string;
  /** Suma de inventario en todas las sucursales */
  currentStock: number;
  storeId: string;
  storeName: string;
}

export function rowMatchesStockAlertMode(
  totalQty: number,
  mode: StockAlertMode
): boolean {
  if (mode === 'out_of_stock') return totalQty === STOCK_OUT_OF_STOCK_QTY;
  if (mode === 'critical') {
    return (
      totalQty >= STOCK_CRITICAL_MIN_QTY && totalQty < STOCK_CRITICAL_MAX_EXCLUSIVE
    );
  }
  return totalQty >= STOCK_WARNING_MIN_QTY && totalQty < STOCK_WARNING_MAX_EXCLUSIVE;
}

/** Productos por debajo del umbral normal (alerta roja, naranja o amarilla). */
export function isGlobalNonNormalStock(totalQty: number): boolean {
  return totalQty < STOCK_NORMAL_MIN_QTY;
}

export const STOCK_ALERT_ROW_HEIGHT_PX = 68;
export const STOCK_ALERT_ROW_GAP_PX = 8;
export const STOCK_ALERT_PANEL_VISIBLE_ROWS = 6;
export const STOCK_ALERT_MODAL_VISIBLE_ROWS = 8;

export function stockAlertScrollHeight(rows: number): number {
  return rows * STOCK_ALERT_ROW_HEIGHT_PX + (rows - 1) * STOCK_ALERT_ROW_GAP_PX;
}

export const STOCK_ALERT_SCROLLABLE_LIST_CLASS =
  'overflow-y-auto overscroll-contain pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-track]:bg-transparent';

export const STOCK_ALERT_VARIANT_CONFIG = {
  out_of_stock: {
    title: 'Sin Stock',
    rangeLabel: '0 uds (global)',
    emptyLabel: 'No hay artículos sin stock a nivel global',
    statusLabel: 'Agotado',
    cardClass: 'border-red-500/40 border-t-red-500 shadow-red-500/10',
    titleClass: 'text-red-400',
    badgeOutlineClass: 'border-red-500/50 bg-red-500/10 text-red-300',
    badgeClass: 'bg-red-500/20 text-red-300 hover:bg-red-300/20',
    inputClass: 'border-red-500/20',
    selectClass: 'border-red-500/20',
    spinnerClass: 'text-red-400',
    emptyIconClass: 'text-red-400/60',
    rowClass: 'border-red-500/25 bg-red-500/5 hover:bg-red-500/10',
    qtyClass: 'text-red-300',
    statusClass: 'border-red-600/50 bg-red-600/20 text-red-200',
    scrollHintClass: 'from-red-950/90',
  },
  critical: {
    title: 'Stock Crítico',
    rangeLabel: '1–2 uds (global)',
    emptyLabel: 'No hay artículos con entre 1 y 2 unidades en total',
    statusLabel: 'Crítico',
    cardClass: 'border-orange-500/40 border-t-orange-500 shadow-orange-500/10',
    titleClass: 'text-orange-400',
    badgeOutlineClass: 'border-orange-500/50 bg-orange-500/10 text-orange-300',
    badgeClass: 'bg-orange-500/20 text-orange-300 hover:bg-orange-300/20',
    inputClass: 'border-orange-500/20',
    selectClass: 'border-orange-500/20',
    spinnerClass: 'text-orange-400',
    emptyIconClass: 'text-orange-400/60',
    rowClass: 'border-orange-500/25 bg-orange-500/5 hover:bg-orange-500/10',
    qtyClass: 'text-orange-300',
    statusClass: 'border-orange-500/50 bg-orange-500/20 text-orange-300',
    scrollHintClass: 'from-orange-950/90',
  },
  warning: {
    title: 'Artículos con Stock Bajo',
    rangeLabel: '3–4 uds (global)',
    emptyLabel: 'No hay artículos con entre 3 y 4 unidades en total',
    statusLabel: 'Bajo Stock',
    cardClass: 'border-yellow-500/40 border-t-yellow-500 shadow-yellow-500/10',
    titleClass: 'text-yellow-400',
    badgeOutlineClass: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-300/20',
    inputClass: 'border-yellow-500/20',
    selectClass: 'border-yellow-500/20',
    spinnerClass: 'text-yellow-400',
    emptyIconClass: 'text-yellow-400/60',
    rowClass: 'border-yellow-500/25 bg-yellow-500/5 hover:bg-yellow-500/10',
    qtyClass: 'text-yellow-300',
    statusClass: 'border-yellow-500/50 bg-yellow-500/20 text-yellow-300',
    scrollHintClass: 'from-yellow-950/90',
  },
} as const;

export type StockAlertVariantConfig =
  (typeof STOCK_ALERT_VARIANT_CONFIG)[keyof typeof STOCK_ALERT_VARIANT_CONFIG];
