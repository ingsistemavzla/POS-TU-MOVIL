import { useState, useEffect, useLayoutEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { readDashboardPageCache, writeDashboardPageCache } from '@/utils/dashboardPageCache';

/**
 * true = intentar RPC get_dashboard_sales_summary primero.
 * Si falla (SQL no aplicado / error), fallback automático a fetch+JS.
 * Apagar para forzar solo el path legacy.
 */
const USE_DASHBOARD_SALES_RPC = true;

export interface DashboardData {
  // Métricas generales
  totalSales: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
  };
  totalSalesUSD: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
  };
  totalOrders: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
  };
  averageOrderValue: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
  };
  
  // Métricas por tienda
  storeMetrics: Array<{
    storeId: string;
    storeName: string;
    sales: {
      today: number;
      yesterday: number;
      thisMonth: number;
    };
    orders: {
      today: number;
      yesterday: number;
      thisMonth: number;
    };
    averageOrder: {
      today: number;
      yesterday: number;
      thisMonth: number;
    };
  }>;
  
  // Productos más vendidos
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    revenueUSD: number;
    storeName: string;
  }>;
  
  // Ventas recientes
  recentSales: Array<{
    id: string;
    customerName: string;
    total: number;
    totalUSD: number;
    createdAt: string;
    storeName: string;
    itemsCount: number;
  }>;
  
  // Stock crítico
  criticalStock: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    storeName: string;
    sku: string;
  }>;
  
  // Ventas por día (últimos 30 días)
  dailySales: Array<{
    date: string;
    sales: number;
    salesUSD: number;
    orders: number;
  }>;
  
  // Resumen de tiendas
  storesSummary: Array<{
    id: string;
    name: string;
    totalSales: number;
    totalOrders: number;
    averageOrder: number;
    netIncome: number;
    netIncomeByPeriod: { today: number; yesterday: number; thisMonth: number };
    activeProducts: number;
  }>;
  
  // Ventas por categoría
  salesByCategory: Array<{
    category: string;
    totalSales: number;
    totalSalesUSD: number;
    totalQuantity: number;
    orderCount: number;
    averageOrderValue: number;
    percentage: number;
  }>;
  
  // ✅ NUEVO: Métricas Financieras (Salud Financiera Real) - Por Período
  financialHealth: {
    today: {
      receivables_usd: number;
      net_income_usd: number;
      sales_by_method_count: { cash: number; krece: number; cashea: number };
      receivables_breakdown: { krece_usd: number; cashea_usd: number };
      avg_ticket_cash: number;
      avg_ticket_krece: number;
      avg_ticket_cashea: number;
    };
    yesterday: {
      receivables_usd: number;
      net_income_usd: number;
      sales_by_method_count: { cash: number; krece: number; cashea: number };
      receivables_breakdown: { krece_usd: number; cashea_usd: number };
      avg_ticket_cash: number;
      avg_ticket_krece: number;
      avg_ticket_cashea: number;
    };
    thisMonth: {
      receivables_usd: number;
      net_income_usd: number;
      sales_by_method_count: { cash: number; krece: number; cashea: number };
      receivables_breakdown: { krece_usd: number; cashea_usd: number };
      avg_ticket_cash: number;
      avg_ticket_krece: number;
      avg_ticket_cashea: number;
    };
  };
}

// Helper: convertir cualquier valor a número seguro
const safeNum = (val: any): number => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return isNaN(num) ? 0 : num;
};

// Helper: calcular rangos de fechas
const getDateRanges = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);
  
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return {
    today,
    todayEnd,
    yesterday,
    yesterdayEnd,
    startOfMonth,
    startOfLastMonth,
    endOfLastMonth,
    thirtyDaysAgo,
  };
};

type SalesAgg = { total: number; count: number; average: number };

type DashboardSaleRow = {
  id: string;
  total_usd: number;
  total_bs: number | null;
  created_at: string;
  store_id: string | null;
  krece_enabled: boolean | null;
  krece_financed_amount_usd: number | null;
  cashea_enabled: boolean | null;
  cashea_financed_amount_usd: number | null;
};

const SALE_DASHBOARD_SELECT =
  'id, total_usd, total_bs, created_at, store_id, krece_enabled, krece_financed_amount_usd, cashea_enabled, cashea_financed_amount_usd';

/** Una sola descarga paginada de ventas completed en el rango (evita 4 + 3×N consultas). */
async function fetchCompletedSalesInRange(
  startDate: Date,
  endDate: Date
): Promise<DashboardSaleRow[]> {
  const all: DashboardSaleRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('sales')
      .select(SALE_DASHBOARD_SELECT)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn('Error fetching sales range:', error);
      break;
    }

    const rows = (data || []) as DashboardSaleRow[];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

function inPeriod(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function aggregateSales(
  rows: DashboardSaleRow[],
  start: Date,
  end: Date,
  storeId?: string
): SalesAgg {
  let total = 0;
  let count = 0;
  for (const s of rows) {
    if (storeId && s.store_id !== storeId) continue;
    if (!inPeriod(s.created_at, start, end)) continue;
    total += safeNum(s.total_usd);
    count += 1;
  }
  return { total, count, average: count > 0 ? total / count : 0 };
}

function financialHealthFromRows(
  rows: DashboardSaleRow[],
  start: Date,
  end: Date,
  totalGross: number
): DashboardData['financialHealth']['today'] {
  let totalReceivables = 0;
  let totalKreceReceivables = 0;
  let totalCasheaReceivables = 0;
  const methodCount = { cash: 0, krece: 0, cashea: 0 };
  const methodTotals = { cash: 0, krece: 0, cashea: 0 };

  for (const sale of rows) {
    if (!inPeriod(sale.created_at, start, end)) continue;
    const totalUSD = safeNum(sale.total_usd);

    if (sale.cashea_enabled) {
      methodCount.cashea += 1;
      methodTotals.cashea += totalUSD;
      const casheaFinanced = safeNum(sale.cashea_financed_amount_usd || 0);
      totalCasheaReceivables += casheaFinanced;
      totalReceivables += casheaFinanced;
    } else if (sale.krece_enabled) {
      methodCount.krece += 1;
      methodTotals.krece += totalUSD;
      const kreceFinanced = safeNum(sale.krece_financed_amount_usd || 0);
      totalKreceReceivables += kreceFinanced;
      totalReceivables += kreceFinanced;
    } else {
      methodCount.cash += 1;
      methodTotals.cash += totalUSD;
    }
  }

  const netIncome = totalGross - totalReceivables;
  return {
    receivables_usd: totalReceivables,
    net_income_usd: Math.max(0, netIncome),
    sales_by_method_count: methodCount,
    receivables_breakdown: {
      krece_usd: totalKreceReceivables,
      cashea_usd: totalCasheaReceivables,
    },
    avg_ticket_cash: methodCount.cash > 0 ? methodTotals.cash / methodCount.cash : 0,
    avg_ticket_krece: methodCount.krece > 0 ? methodTotals.krece / methodCount.krece : 0,
    avg_ticket_cashea: methodCount.cashea > 0 ? methodTotals.cashea / methodCount.cashea : 0,
  };
}

function dailySalesFromRows(rows: DashboardSaleRow[], thirtyDaysAgo: Date): DashboardData['dailySales'] {
  const dailyMap = new Map<string, { sales: number; salesUSD: number; orders: number }>();
  for (const sale of rows) {
    if (new Date(sale.created_at).getTime() < thirtyDaysAgo.getTime()) continue;
    const date = new Date(sale.created_at).toISOString().split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { sales: 0, salesUSD: 0, orders: 0 });
    }
    const dayData = dailyMap.get(date)!;
    dayData.sales += safeNum(sale.total_bs);
    dayData.salesUSD += safeNum(sale.total_usd);
    dayData.orders += 1;
  }
  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);
}

type RpcPeriodAgg = { total: number; count: number; average: number };

type RpcSalesSummary = {
  error?: boolean;
  message?: string;
  periods?: {
    today: RpcPeriodAgg;
    yesterday: RpcPeriodAgg;
    thisMonth: RpcPeriodAgg;
    lastMonth: RpcPeriodAgg;
  };
  store_metrics?: Array<{
    storeId: string;
    sales: { today: number; yesterday: number; thisMonth: number };
    orders: { today: number; yesterday: number; thisMonth: number };
    averageOrder: { today: number; yesterday: number; thisMonth: number };
  }>;
  daily_sales?: DashboardData['dailySales'];
  financial_health?: DashboardData['financialHealth'];
};

function salesRangeStartFromDates(dates: ReturnType<typeof getDateRanges>): Date {
  return dates.startOfLastMonth.getTime() < dates.thirtyDaysAgo.getTime()
    ? dates.startOfLastMonth
    : dates.thirtyDaysAgo;
}

/** Intenta agregación en Postgres; null = usar fallback JS. */
async function fetchSalesSummaryViaRpc(
  companyId: string,
  dates: ReturnType<typeof getDateRanges>
): Promise<RpcSalesSummary | null> {
  if (!USE_DASHBOARD_SALES_RPC) return null;

  try {
    const { data, error } = await (supabase as any).rpc('get_dashboard_sales_summary', {
      p_company_id: companyId,
      p_today_start: dates.today.toISOString(),
      p_today_end: dates.todayEnd.toISOString(),
      p_yesterday_start: dates.yesterday.toISOString(),
      p_yesterday_end: dates.yesterdayEnd.toISOString(),
      p_month_start: dates.startOfMonth.toISOString(),
      p_month_end: dates.todayEnd.toISOString(),
      p_last_month_start: dates.startOfLastMonth.toISOString(),
      p_last_month_end: dates.endOfLastMonth.toISOString(),
      p_thirty_days_ago: dates.thirtyDaysAgo.toISOString(),
      p_range_start: salesRangeStartFromDates(dates).toISOString(),
    });

    if (error) {
      console.warn('get_dashboard_sales_summary RPC error → fallback JS:', error.message || error);
      return null;
    }

    const result = data as RpcSalesSummary | null;
    if (!result || result.error || !result.periods) {
      console.warn('get_dashboard_sales_summary inválido → fallback JS:', result?.message);
      return null;
    }

    return result;
  } catch (err) {
    console.warn('get_dashboard_sales_summary exception → fallback JS:', err);
    return null;
  }
}

function mapStoreMetricsFromRpc(
  stores: Array<{ id: string; name: string }>,
  rpcMetrics: RpcSalesSummary['store_metrics']
): DashboardData['storeMetrics'] {
  const byId = new Map((rpcMetrics || []).map((m) => [m.storeId, m]));
  return stores.map((store) => {
    const m = byId.get(store.id);
    return {
      storeId: store.id,
      storeName: store.name,
      sales: {
        today: safeNum(m?.sales?.today),
        yesterday: safeNum(m?.sales?.yesterday),
        thisMonth: safeNum(m?.sales?.thisMonth),
      },
      orders: {
        today: safeNum(m?.orders?.today),
        yesterday: safeNum(m?.orders?.yesterday),
        thisMonth: safeNum(m?.orders?.thisMonth),
      },
      averageOrder: {
        today: safeNum(m?.averageOrder?.today),
        yesterday: safeNum(m?.averageOrder?.yesterday),
        thisMonth: safeNum(m?.averageOrder?.thisMonth),
      },
    };
  });
}

// Helper legacy (fallback si hace falta): obtener ventas de un período
const getSalesForPeriod = async (
  companyId: string,
  startDate: Date,
  endDate: Date,
  storeId?: string
): Promise<SalesAgg> => {
  try {
    const rows = await fetchCompletedSalesInRange(startDate, endDate);
    return aggregateSales(rows, startDate, endDate, storeId);
  } catch (err) {
    console.warn('Error in getSalesForPeriod:', err);
    return { total: 0, count: 0, average: 0 };
  }
};

const emptyFinancialPeriod = (): DashboardData['financialHealth']['today'] => ({
  receivables_usd: 0,
  net_income_usd: 0,
  sales_by_method_count: { cash: 0, krece: 0, cashea: 0 },
  receivables_breakdown: { krece_usd: 0, cashea_usd: 0 },
  avg_ticket_cash: 0,
  avg_ticket_krece: 0,
  avg_ticket_cashea: 0,
});

// Datos vacíos por defecto (para fallback)
export const getEmptyDashboardData = (): DashboardData => ({
  totalSales: { today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 },
  totalSalesUSD: { today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 },
  totalOrders: { today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 },
  averageOrderValue: { today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 },
  storeMetrics: [],
  topProducts: [],
  recentSales: [],
  criticalStock: [],
  dailySales: [],
  storesSummary: [],
  salesByCategory: [],
  financialHealth: {
    today: emptyFinancialPeriod(),
    yesterday: emptyFinancialPeriod(),
    thisMonth: emptyFinancialPeriod(),
  },
});

const getEmptyData = getEmptyDashboardData;

export function useDashboardData(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const { userProfile, company } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const userProfileId = userProfile?.id;
  const companyId = company?.id;
  const userCompanyId = userProfile?.company_id;

  // Pintar cache stale/fresca ANTES del paint cuando ya hay company
  useLayoutEffect(() => {
    if (!companyId) return;
    const cached = readDashboardPageCache(companyId, { allowStale: true });
    if (cached) {
      setData(cached);
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const fetchData = async () => {
      if (!userProfile || !company) {
        if (!cancelled) {
          setData(getEmptyData());
          setLoading(false);
        }
        return;
      }

      const cid = company.id;
      const cached = readDashboardPageCache(cid, { allowStale: true });
      const hasCachedData = !!cached;

      if (cached && !cancelled) {
        setData(cached);
        setLoading(false);
      }

      const timeoutId = setTimeout(() => {
        if (cancelled) return;
        console.warn('useDashboardData: Timeout alcanzado, devolviendo datos vacíos');
        setData((prev) => prev ?? getEmptyData());
        setLoading(false);
      }, 20000);

      try {
        // Con cache: no bloquear UI; sin cache: loading en segundo plano (UI ya muestra shell)
        if (!hasCachedData && !cancelled) {
          setLoading(true);
        }
        setError(null);
        const dates = getDateRanges();

        // ============================================
        // 1-3. Vista + tiendas + ventas (en paralelo)
        // ============================================
        let statsFromView = {
          totalProducts: 0,
          totalStock: 0,
          totalValue: 0,
          lowStockCount: 0,
        };

        const [viewOutcome, storesOutcome, rpcSummary] = await Promise.all([
          (async () => {
            try {
              const { data: viewData, error: viewError } = await supabase
                .from('dashboard_stats_view')
                .select('total_products, total_stock, total_value, low_stock_count')
                .single();
              if (!viewError && viewData) {
                return {
                  totalProducts: safeNum(viewData.total_products),
                  totalStock: safeNum(viewData.total_stock),
                  totalValue: safeNum(viewData.total_value),
                  lowStockCount: safeNum(viewData.low_stock_count),
                };
              }
            } catch {
              console.warn('Vista dashboard_stats_view no disponible, usando valores por defecto');
            }
            return null;
          })(),
          (async () => {
            try {
              const { data: storesData, error: storesError } = await supabase
                .from('stores')
                .select('id, name')
                .eq('active', true);
              if (!storesError && storesData) return storesData as Array<{ id: string; name: string }>;
            } catch (err) {
              console.warn('Error fetching stores:', err);
            }
            return [] as Array<{ id: string; name: string }>;
          })(),
          fetchSalesSummaryViaRpc(cid, dates),
        ]);

        if (viewOutcome) statsFromView = viewOutcome;
        const stores = storesOutcome;

        // Si no hay tiendas, devolver datos vacíos
        if (stores.length === 0) {
          setData(getEmptyData());
          setLoading(false);
          return;
        }

        // ============================================
        // 3b. Ventas: RPC o fallback descarga + agregación
        // ============================================
        let todaySales: SalesAgg;
        let yesterdaySales: SalesAgg;
        let thisMonthSales: SalesAgg;
        let lastMonthSales: SalesAgg;
        let dailySales: DashboardData['dailySales'];
        let storeMetrics: DashboardData['storeMetrics'];
        let financialHealth: DashboardData['financialHealth'];
        let allSalesRows: DashboardSaleRow[] | null = null;

        if (rpcSummary?.periods) {
          const p = rpcSummary.periods;
          todaySales = {
            total: safeNum(p.today?.total),
            count: safeNum(p.today?.count),
            average: safeNum(p.today?.average),
          };
          yesterdaySales = {
            total: safeNum(p.yesterday?.total),
            count: safeNum(p.yesterday?.count),
            average: safeNum(p.yesterday?.average),
          };
          thisMonthSales = {
            total: safeNum(p.thisMonth?.total),
            count: safeNum(p.thisMonth?.count),
            average: safeNum(p.thisMonth?.average),
          };
          lastMonthSales = {
            total: safeNum(p.lastMonth?.total),
            count: safeNum(p.lastMonth?.count),
            average: safeNum(p.lastMonth?.average),
          };
          dailySales = (rpcSummary.daily_sales || []).map((d) => ({
            date: d.date,
            sales: safeNum(d.sales),
            salesUSD: safeNum(d.salesUSD),
            orders: safeNum(d.orders),
          }));
          storeMetrics = mapStoreMetricsFromRpc(stores, rpcSummary.store_metrics);
          financialHealth = {
            today: {
              ...emptyFinancialPeriod(),
              ...(rpcSummary.financial_health?.today || {}),
              sales_by_method_count: {
                ...emptyFinancialPeriod().sales_by_method_count,
                ...(rpcSummary.financial_health?.today?.sales_by_method_count || {}),
              },
              receivables_breakdown: {
                ...emptyFinancialPeriod().receivables_breakdown,
                ...(rpcSummary.financial_health?.today?.receivables_breakdown || {}),
              },
            },
            yesterday: {
              ...emptyFinancialPeriod(),
              ...(rpcSummary.financial_health?.yesterday || {}),
              sales_by_method_count: {
                ...emptyFinancialPeriod().sales_by_method_count,
                ...(rpcSummary.financial_health?.yesterday?.sales_by_method_count || {}),
              },
              receivables_breakdown: {
                ...emptyFinancialPeriod().receivables_breakdown,
                ...(rpcSummary.financial_health?.yesterday?.receivables_breakdown || {}),
              },
            },
            thisMonth: {
              ...emptyFinancialPeriod(),
              ...(rpcSummary.financial_health?.thisMonth || {}),
              sales_by_method_count: {
                ...emptyFinancialPeriod().sales_by_method_count,
                ...(rpcSummary.financial_health?.thisMonth?.sales_by_method_count || {}),
              },
              receivables_breakdown: {
                ...emptyFinancialPeriod().receivables_breakdown,
                ...(rpcSummary.financial_health?.thisMonth?.receivables_breakdown || {}),
              },
            },
          };
          (['today', 'yesterday', 'thisMonth'] as const).forEach((period) => {
            const fh = financialHealth[period];
            fh.receivables_usd = safeNum(fh.receivables_usd);
            fh.net_income_usd = safeNum(fh.net_income_usd);
            fh.avg_ticket_cash = safeNum(fh.avg_ticket_cash);
            fh.avg_ticket_krece = safeNum(fh.avg_ticket_krece);
            fh.avg_ticket_cashea = safeNum(fh.avg_ticket_cashea);
            fh.receivables_breakdown.krece_usd = safeNum(fh.receivables_breakdown.krece_usd);
            fh.receivables_breakdown.cashea_usd = safeNum(fh.receivables_breakdown.cashea_usd);
            fh.sales_by_method_count.cash = safeNum(fh.sales_by_method_count.cash);
            fh.sales_by_method_count.krece = safeNum(fh.sales_by_method_count.krece);
            fh.sales_by_method_count.cashea = safeNum(fh.sales_by_method_count.cashea);
          });
        } else {
          const salesRangeStart = salesRangeStartFromDates(dates);
          allSalesRows = await fetchCompletedSalesInRange(salesRangeStart, dates.todayEnd);

          todaySales = aggregateSales(allSalesRows, dates.today, dates.todayEnd);
          yesterdaySales = aggregateSales(allSalesRows, dates.yesterday, dates.yesterdayEnd);
          thisMonthSales = aggregateSales(allSalesRows, dates.startOfMonth, dates.todayEnd);
          lastMonthSales = aggregateSales(
            allSalesRows,
            dates.startOfLastMonth,
            dates.endOfLastMonth
          );
          dailySales = dailySalesFromRows(allSalesRows, dates.thirtyDaysAgo);
          storeMetrics = stores.map((store) => {
            const storeToday = aggregateSales(allSalesRows!, dates.today, dates.todayEnd, store.id);
            const storeYesterday = aggregateSales(
              allSalesRows!,
              dates.yesterday,
              dates.yesterdayEnd,
              store.id
            );
            const storeThisMonth = aggregateSales(
              allSalesRows!,
              dates.startOfMonth,
              dates.todayEnd,
              store.id
            );
            return {
              storeId: store.id,
              storeName: store.name,
              sales: {
                today: storeToday.total,
                yesterday: storeYesterday.total,
                thisMonth: storeThisMonth.total,
              },
              orders: {
                today: storeToday.count,
                yesterday: storeYesterday.count,
                thisMonth: storeThisMonth.count,
              },
              averageOrder: {
                today: storeToday.average,
                yesterday: storeYesterday.average,
                thisMonth: storeThisMonth.average,
              },
            };
          });
          financialHealth = {
            today: financialHealthFromRows(
              allSalesRows,
              dates.today,
              dates.todayEnd,
              todaySales.total || 0
            ),
            yesterday: financialHealthFromRows(
              allSalesRows,
              dates.yesterday,
              dates.yesterdayEnd,
              yesterdaySales.total || 0
            ),
            thisMonth: financialHealthFromRows(
              allSalesRows,
              dates.startOfMonth,
              dates.todayEnd,
              thisMonthSales.total || 0
            ),
          };
        }

        // ============================================
        // 4-6. DATOS ADICIONALES (paralelizados; daily ya viene de allSalesRows)
        // ============================================
        const storeIds = stores.map(s => s.id);

        const [
          recentSalesResult,
          topProductsResult,
          criticalStockResult,
          salesByCategoryResult,
        ] = await Promise.all([
          // 4. Ventas recientes
          (async () => {
            try {
              const recentQuery = supabase
                .from('sales')
                .select('id, total_usd, total_bs, created_at, store_id, stores(name)')
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(10);

              const { data: recentData, error: recentError } = await recentQuery;
              if (recentError) throw recentError;

              return recentData?.map((sale: any) => ({
                id: sale.id,
                customerName: 'Cliente General',
                total: safeNum(sale.total_bs),
                totalUSD: safeNum(sale.total_usd),
                createdAt: sale.created_at,
                storeName: sale.stores?.name || 'N/A',
                itemsCount: 0,
              })) || [];
            } catch (err) {
              console.warn('Error fetching recent sales:', err);
              return [];
            }
          })(),
          // 5. Productos más vendidos
          (async () => {
            try {
              const { data: topData, error: topError } = await supabase
                .from('sale_items')
                .select(`
                  qty,
                  subtotal_usd,
                  products(id, name, sku),
                  sales!inner(store_id, stores(name), company_id, created_at, status)
                `)
                .eq('sales.status', 'completed')
                .gte('sales.created_at', dates.startOfMonth.toISOString())
                .limit(50);

              if (topError) throw topError;
              if (!topData) return [];

              const productMap = new Map<string, any>();
              (topData as any[]).forEach((item: any) => {
                const productId = item.products?.id;
                if (!productId) return;

                if (!productMap.has(productId)) {
                  productMap.set(productId, {
                    id: productId,
                    name: item.products?.name || 'Producto',
                    quantity: 0,
                    revenue: 0,
                    revenueUSD: 0,
                    storeName: item.sales?.stores?.name || 'N/A',
                  });
                }

                const product = productMap.get(productId)!;
                product.quantity += safeNum(item.qty);
                product.revenueUSD += safeNum(item.subtotal_usd);
                product.revenue = product.revenueUSD;
              });

              return Array.from(productMap.values())
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);
            } catch (err) {
              console.warn('Error fetching top products:', err);
              return [];
            }
          })(),
          // 6. Stock crítico (tope para no bajar todo el inventario)
          (async () => {
            try {
              const { data: stockData, error: stockError } = await supabase
                .from('inventories')
                .select('qty, min_qty, products!inner(id, name, sku, active), stores(id, name)')
                .in('store_id', storeIds)
                .eq('products.active', true)
                .limit(500);

              if (stockError) throw stockError;
              if (!stockData) return [];

              return (stockData as any[])
                .filter((item: any) => {
                  const qty = safeNum(item.qty);
                  const minQty = safeNum(item.min_qty);
                  return item.products && item.stores && qty <= minQty;
                })
                .map((item: any) => ({
                  id: item.products?.id || '',
                  name: item.products?.name || '',
                  sku: item.products?.sku || '',
                  currentStock: safeNum(item.qty),
                  minStock: safeNum(item.min_qty),
                  storeName: item.stores?.name || '',
                }))
                .slice(0, 15);
            } catch (err) {
              console.warn('Error fetching critical stock:', err);
              return [];
            }
          })(),
          // 7. Ventas por categoría (antes en serie; ahora paralelo)
          (async (): Promise<DashboardData['salesByCategory']> => {
            try {
              const { data: catData, error: catError } = await supabase
                .from('sale_items')
                .select(`
                  qty,
                  subtotal_usd,
                  products(id, category),
                  sales!inner(company_id, created_at, status)
                `)
                .eq('sales.status', 'completed')
                .gte('sales.created_at', dates.startOfMonth.toISOString())
                .limit(200);

              if (catError || !catData) return [];

              const catMap = new Map<string, any>();
              (catData as any[]).forEach((item: any) => {
                const category = item.products?.category || 'Sin Categoría';
                const qty = safeNum(item.qty);
                const totalUSD = safeNum(item.subtotal_usd);

                if (!catMap.has(category)) {
                  catMap.set(category, {
                    category,
                    totalSales: 0,
                    totalSalesUSD: 0,
                    totalQuantity: 0,
                    orderCount: 0,
                    averageOrderValue: 0,
                    percentage: 0,
                  });
                }

                const cat = catMap.get(category)!;
                cat.totalSalesUSD += totalUSD;
                cat.totalSales = cat.totalSalesUSD;
                cat.totalQuantity += qty;
                cat.orderCount += 1;
              });

              const totalCatSales = Array.from(catMap.values()).reduce(
                (sum, c) => sum + c.totalSalesUSD,
                0
              );

              return Array.from(catMap.values())
                .map((cat) => ({
                  ...cat,
                  averageOrderValue:
                    cat.totalQuantity > 0 ? cat.totalSalesUSD / cat.totalQuantity : 0,
                  percentage:
                    totalCatSales > 0 ? (cat.totalSalesUSD / totalCatSales) * 100 : 0,
                }))
                .sort((a, b) => b.totalSalesUSD - a.totalSalesUSD)
                .slice(0, 10);
            } catch (err) {
              console.warn('Error fetching sales by category:', err);
              return [];
            }
          })(),
        ]);

        const recentSales: DashboardData['recentSales'] = recentSalesResult;
        const topProducts: DashboardData['topProducts'] = topProductsResult;
        const criticalStock: DashboardData['criticalStock'] = criticalStockResult;
        const salesByCategory: DashboardData['salesByCategory'] = salesByCategoryResult;

        // ============================================
        // 9. RESUMEN DE TIENDAS
        // ============================================
        const storesSummary: DashboardData['storesSummary'] = stores.map(store => {
          const metric = storeMetrics.find(m => m.storeId === store.id);
          return {
            id: store.id,
            name: store.name,
            totalSales: metric?.sales.thisMonth || 0,
            totalOrders: metric?.orders.thisMonth || 0,
            averageOrder: metric?.averageOrder.thisMonth || 0,
            netIncome: metric?.sales.thisMonth || 0,
            netIncomeByPeriod: {
              today: metric?.sales.today || 0,
              yesterday: metric?.sales.yesterday || 0,
              thisMonth: metric?.sales.thisMonth || 0,
            },
            activeProducts: statsFromView.totalProducts,
          };
        });

        // ============================================
        // 11. SALUD FINANCIERA (ya calculada en bloque 3 RPC/fallback)
        // ============================================

        // ============================================
        // 12. CONSTRUIR RESPUESTA FINAL
        // ============================================
        const dashboardData: DashboardData = {
          totalSales: {
            today: 0,
            yesterday: 0,
            thisMonth: 0,
            lastMonth: 0,
          },
          totalSalesUSD: {
            today: todaySales.total,
            yesterday: yesterdaySales.total,
            thisMonth: thisMonthSales.total,
            lastMonth: lastMonthSales.total,
          },
          totalOrders: {
            today: todaySales.count,
            yesterday: yesterdaySales.count,
            thisMonth: thisMonthSales.count,
            lastMonth: lastMonthSales.count,
          },
          averageOrderValue: {
            today: todaySales.average,
            yesterday: yesterdaySales.average,
            thisMonth: thisMonthSales.average,
            lastMonth: lastMonthSales.average,
          },
          storeMetrics,
          topProducts,
          recentSales,
          criticalStock,
          dailySales,
          storesSummary,
          salesByCategory,
          financialHealth, // ✅ NUEVO: Salud Financiera Real
        };

        if (!cancelled) {
          setData(dashboardData);
          writeDashboardPageCache(cid, dashboardData);
        }
        clearTimeout(timeoutId);
      } catch (err) {
        console.error('Error crítico en useDashboardData:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error fetching data');
          setData((prev) => prev ?? getEmptyData());
        }
        clearTimeout(timeoutId);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [userProfileId, companyId, userCompanyId, enabled, refreshKey]);

  const refetch = () => setRefreshKey((k) => k + 1);

  return { data, loading, error, refetch };
}
