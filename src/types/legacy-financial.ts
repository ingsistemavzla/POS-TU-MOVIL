/**
 * TypeScript Interfaces para Funciones RPC Legacy Financial
 * 
 * Estas interfaces definen la estructura exacta de las respuestas
 * de las 3 funciones RPC críticas del sistema Legacy.
 */

// ============================================================================
// FUNCIÓN 1: get_inventory_financial_summary
// ============================================================================

export interface InventoryFinancialCategory {
  category_name: string;
  total_cost_value: number;
  total_retail_value: number;
  profit_potential: number;
  items_count: number;
  total_quantity: number;
  percentage_of_total: number;
}

export interface InventoryFinancialSummary {
  total_cost_value: number;
  total_retail_value: number;
  profit_potential: number;
  out_of_stock_count: number;
  critical_stock_count: number;
  category_breakdown: InventoryFinancialCategory[];
  calculated_at: string;
}

export interface InventoryFinancialSummaryResponse {
  error?: boolean;
  message?: string;
  code?: string;
  total_cost_value?: number;
  total_retail_value?: number;
  profit_potential?: number;
  out_of_stock_count?: number;
  critical_stock_count?: number;
  category_breakdown?: InventoryFinancialCategory[];
  calculated_at?: string;
}

// ============================================================================
// FUNCIÓN 2: get_stock_matrix_by_store
// ============================================================================

export interface StockMatrixCategory {
  category_name: string;
  stock_qty: number;
  value_cost: number;
  value_retail: number;
  products_count: number;
  low_stock_count: number;
}

export interface StockMatrixStore {
  store_id: string;
  store_name: string;
  total_items: number;
  total_stock_quantity: number;
  categories: StockMatrixCategory[];
}

export interface StockMatrixResponse {
  error?: boolean;
  message?: string;
  code?: string;
  matrix?: StockMatrixStore[];
  generated_at?: string;
}

// ============================================================================
// FUNCIÓN 3: get_dashboard_store_performance
// ============================================================================

export interface StorePerformancePeriod {
  start_date: string;
  end_date: string;
}

export interface StorePerformanceSummary {
  store_id: string;
  store_name: string;
  total_invoiced: number;
  net_income_real: number;
  estimated_profit: number;
  orders_count: number;
  avg_order_value: number;
  profit_margin_percent: number;
}

export interface DashboardStorePerformanceResponse {
  error?: boolean;
  message?: string;
  code?: string;
  summary?: StorePerformanceSummary[];
  period?: StorePerformancePeriod;
  generated_at?: string;
}

// ============================================================================
// HELPERS: Type Guards
// ============================================================================

export function isInventoryFinancialSummaryResponse(
  data: any
): data is InventoryFinancialSummaryResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    ('total_cost_value' in data || 'error' in data)
  );
}

export function isStockMatrixResponse(data: any): data is StockMatrixResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    ('matrix' in data || 'error' in data)
  );
}

export function isDashboardStorePerformanceResponse(
  data: any
): data is DashboardStorePerformanceResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    ('summary' in data || 'error' in data)
  );
}


