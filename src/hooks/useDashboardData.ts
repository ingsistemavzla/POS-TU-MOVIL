import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

// Helper: obtener ventas de un período específico
// 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
const getSalesForPeriod = async (
  companyId: string, // Mantenido para compatibilidad, pero no se usa en la query
  startDate: Date,
  endDate: Date,
  storeId?: string // UI filter: Admin puede querer ver una tienda específica
) => {
  try {
    let query = supabase
      .from('sales')
      .select('id, total_usd, created_at')
      // ✅ REMOVED: .eq('company_id', companyId) - RLS handles this automatically
      .eq('status', 'completed')  // ✅ FIX: Only fetch completed sales
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // ✅ KEEP: storeId filter is for UI filtering (admin selecting specific store), not security
    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error fetching sales:', error);
      return { total: 0, count: 0, average: 0 };
    }

    const sales = data || [];
    const total = sales.reduce((sum, s) => sum + safeNum(s.total_usd), 0);
    const count = sales.length;
    const average = count > 0 ? total / count : 0;

    return { total, count, average };
  } catch (err) {
    console.warn('Error in getSalesForPeriod:', err);
    return { total: 0, count: 0, average: 0 };
  }
};

// Datos vacíos por defecto (para fallback)
const getEmptyData = (): DashboardData => ({
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
    receivables_usd: 0,
    net_income_usd: 0,
    sales_by_method_count: { cash: 0, krece: 0, cashea: 0 },
    receivables_breakdown: { krece_usd: 0, cashea_usd: 0 },
    avg_ticket_cash: 0,
    avg_ticket_krece: 0,
    avg_ticket_cashea: 0,
  },
});

export function useDashboardData() {
  const { userProfile, company } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIX: Extraer IDs estables para evitar bucle infinito
  // Los objetos userProfile y company pueden cambiar de referencia en cada render
  // pero sus IDs son estables, así que usamos solo los IDs como dependencias
  const userProfileId = userProfile?.id;
  const companyId = company?.id;
  const userCompanyId = userProfile?.company_id;

  useEffect(() => {
    const fetchData = async () => {
      // Protección: si no hay usuario o compañía, devolver datos vacíos
      if (!userProfile || !company) {
        console.log('useDashboardData: No userProfile or company, returning empty data');
        setData(getEmptyData());
        setLoading(false);
        return;
      }

      // Timeout de seguridad (30 segundos máximo)
      const timeoutId = setTimeout(() => {
        console.warn('useDashboardData: Timeout alcanzado, devolviendo datos vacíos');
        setData(getEmptyData());
        setLoading(false);
      }, 30000);

      try {
        setLoading(true);
        setError(null);

        const companyId = company.id;
        const dates = getDateRanges();

        // ============================================
        // 1. OBTENER ESTADÍSTICAS DE LA VISTA
        // ============================================
        let statsFromView = {
          totalProducts: 0,
          totalStock: 0,
          totalValue: 0,
          lowStockCount: 0,
        };

        try {
          // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
          const { data: viewData, error: viewError } = await supabase
            .from('dashboard_stats_view')
            .select('total_products, total_stock, total_value, low_stock_count')
            // ✅ REMOVED: .eq('company_id', companyId) - RLS handles this automatically
            .single();

          if (!viewError && viewData) {
            statsFromView = {
              totalProducts: safeNum(viewData.total_products),
              totalStock: safeNum(viewData.total_stock),
              totalValue: safeNum(viewData.total_value),
              lowStockCount: safeNum(viewData.low_stock_count),
            };
          }
        } catch (err) {
          console.warn('Vista dashboard_stats_view no disponible, usando valores por defecto');
        }

        // ============================================
        // 2. OBTENER TIENDAS
        // 🛡️ RLS: No necesitamos filtrar por company_id o role - RLS lo hace automáticamente
        // ============================================
        let stores: Array<{ id: string; name: string }> = [];

        try {
          // ✅ SIMPLIFIED: RLS automatically filters stores based on user's permissions
          // Managers/Cashiers only see their assigned store, Admins see all stores in their company
          const { data: storesData, error: storesError } = await supabase
            .from('stores')
            .select('id, name')
            // ✅ REMOVED: .eq('company_id', companyId) - RLS handles this automatically
            // ✅ REMOVED: Role-based filtering - RLS handles this automatically
            .eq('active', true);
          
          if (!storesError && storesData) {
            stores = storesData;
          }
        } catch (err) {
          console.warn('Error fetching stores:', err);
        }

        // Si no hay tiendas, devolver datos vacíos
        if (stores.length === 0) {
          setData(getEmptyData());
          setLoading(false);
          return;
        }

        // ============================================
        // 3. OBTENER VENTAS POR PERÍODO (Paralelizado con Promise.all)
        // 🛡️ RLS: No necesitamos filtrar por role/store - RLS lo hace automáticamente
        // ============================================
        // ✅ REMOVED: Role-based store filtering - RLS handles this automatically
        // Managers/Cashiers only see sales from their assigned store, Admins see all sales in their company

        // ✅ OPTIMIZACIÓN: Ejecutar todas las consultas de períodos en paralelo
        const [todaySales, yesterdaySales, thisMonthSales, lastMonthSales] = await Promise.all([
          getSalesForPeriod(companyId, dates.today, dates.todayEnd), // No store filter - RLS handles it
          getSalesForPeriod(companyId, dates.yesterday, dates.yesterdayEnd),
          getSalesForPeriod(companyId, dates.startOfMonth, dates.todayEnd),
          getSalesForPeriod(companyId, dates.startOfLastMonth, dates.endOfLastMonth),
        ]);

        // ============================================
        // 4-7. OBTENER DATOS ADICIONALES (Paralelizado con Promise.all)
        // 🛡️ RLS: No necesitamos filtrar por company_id o role - RLS lo hace automáticamente
        // ============================================
        const storeIds = stores.map(s => s.id);
        // ✅ REMOVED: Role-based store filtering - RLS handles this automatically

        // ✅ OPTIMIZACIÓN: Ejecutar todas las consultas independientes en paralelo
        const [
          recentSalesResult,
          topProductsResult,
          criticalStockResult,
          dailySalesResult
        ] = await Promise.all([
          // 4. Ventas recientes
          (async () => {
            try {
              // 🛡️ RLS: No necesitamos filtrar por company_id o store_id - RLS lo hace automáticamente
              const recentQuery = supabase
                .from('sales')
                .select('id, total_usd, total_bs, created_at, store_id, stores(name)')
                // ✅ REMOVED: .eq('company_id', companyId) - RLS handles this automatically
                // ✅ REMOVED: Role-based store filtering - RLS handles this automatically
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
              // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
              const { data: topData, error: topError } = await supabase
                .from('sale_items')
                .select(`
                  qty,
                  subtotal_usd,
                  products(id, name, sku),
                  sales!inner(store_id, stores(name), company_id)
                `)
                // ✅ REMOVED: .eq('sales.company_id', companyId) - RLS handles this automatically
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
          // 6. Stock crítico
          (async () => {
            try {
              // ⚠️ FILTRO CRÍTICO: JOIN con products y filtrar solo productos activos
              // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
              const { data: stockData, error: stockError } = await supabase
                .from('inventories')
                .select('qty, min_qty, products!inner(id, name, sku, active), stores(id, name)')
                .in('store_id', storeIds)
                .eq('products.active', true);  // ⚠️ Solo inventario de productos activos

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
          // 7. Ventas por día
          (async () => {
            try {
              // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
              const { data: dailyData, error: dailyError } = await supabase
                .from('sales')
                .select('total_usd, total_bs, created_at')
                // ✅ REMOVED: .eq('company_id', companyId) - RLS handles this automatically
                .gte('created_at', dates.thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: false });

              if (dailyError) throw dailyError;
              if (!dailyData) return [];

              const dailyMap = new Map<string, { sales: number; salesUSD: number; orders: number }>();
              (dailyData as any[]).forEach((sale: any) => {
                const date = new Date(sale.created_at).toISOString().split('T')[0];
                if (!dailyMap.has(date)) {
                  dailyMap.set(date, { sales: 0, salesUSD: 0, orders: 0 });
                }
                const dayData = dailyMap.get(date)!;
                dayData.sales += safeNum(sale.total_bs);
                dayData.salesUSD += safeNum(sale.total_usd);
                dayData.orders += 1;
              });

              return Array.from(dailyMap.entries())
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 30);
            } catch (err) {
              console.warn('Error fetching daily sales:', err);
              return [];
            }
          })(),
        ]);

        const recentSales: DashboardData['recentSales'] = recentSalesResult;
        const topProducts: DashboardData['topProducts'] = topProductsResult;
        const criticalStock: DashboardData['criticalStock'] = criticalStockResult;
        const dailySales: DashboardData['dailySales'] = dailySalesResult;

        // ============================================
        // 8. OBTENER MÉTRICAS POR TIENDA (Paralelizado con Promise.all)
        // ============================================
        // ✅ OPTIMIZACIÓN: Ejecutar todas las consultas de tiendas en paralelo
        const storeMetricsPromises = stores.map(async (store) => {
          try {
            const [storeToday, storeYesterday, storeThisMonth] = await Promise.all([
              getSalesForPeriod(companyId, dates.today, dates.todayEnd, store.id),
              getSalesForPeriod(companyId, dates.yesterday, dates.yesterdayEnd, store.id),
              getSalesForPeriod(companyId, dates.startOfMonth, dates.todayEnd, store.id),
            ]);

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
          } catch (err) {
            console.warn(`Error fetching metrics for store ${store.id}:`, err);
            // Retornar métricas vacías en caso de error
            return {
              storeId: store.id,
              storeName: store.name,
              sales: { today: 0, yesterday: 0, thisMonth: 0 },
              orders: { today: 0, yesterday: 0, thisMonth: 0 },
              averageOrder: { today: 0, yesterday: 0, thisMonth: 0 },
            };
          }
        });

        const storeMetrics: DashboardData['storeMetrics'] = await Promise.all(storeMetricsPromises);

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
        // 10. VENTAS POR CATEGORÍA (Simple)
        // ============================================
        let salesByCategory: DashboardData['salesByCategory'] = [];

        try {
          // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
          const { data: catData, error: catError } = await supabase
            .from('sale_items')
            .select(`
              qty,
              subtotal_usd,
              products(id, category),
              sales!inner(company_id, created_at)
            `)
            // ✅ REMOVED: .eq('sales.company_id', companyId) - RLS handles this automatically
            .gte('sales.created_at', dates.startOfMonth.toISOString())
            .limit(50);

          if (!catError && catData) {
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

            const totalCatSales = Array.from(catMap.values()).reduce((sum, c) => sum + c.totalSalesUSD, 0);

            salesByCategory = Array.from(catMap.values())
              .map(cat => ({
                ...cat,
                averageOrderValue: cat.totalQuantity > 0 ? cat.totalSalesUSD / cat.totalQuantity : 0,
                percentage: totalCatSales > 0 ? (cat.totalSalesUSD / totalCatSales) * 100 : 0,
              }))
          .sort((a, b) => b.totalSalesUSD - a.totalSalesUSD)
              .slice(0, 10);
          }
        } catch (err) {
          console.warn('Error fetching sales by category:', err);
        }

        // ============================================
        // 11. SALUD FINANCIERA REAL (Nuevo) - Por Período
        // ============================================
        // ✅ FIX: Función helper para calcular financialHealth para un período específico
        const calculateFinancialHealthForPeriod = async (
          startDate: Date,
          endDate: Date,
          totalGross: number
        ): Promise<DashboardData['financialHealth']['today']> => {
          const defaultHealth = {
            receivables_usd: 0,
            net_income_usd: 0,
            sales_by_method_count: { cash: 0, krece: 0, cashea: 0 },
            receivables_breakdown: { krece_usd: 0, cashea_usd: 0 },
            avg_ticket_cash: 0,
            avg_ticket_krece: 0,
            avg_ticket_cashea: 0,
          };

          try {
            const { data: financialSalesData, error: financialError } = await supabase
              .from('sales')
              .select(`
                id,
                total_usd,
                krece_enabled,
                krece_financed_amount_usd,
                cashea_enabled,
                cashea_financed_amount_usd
              `)
              .eq('status', 'completed')
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString());

            if (financialError || !financialSalesData) {
              return defaultHealth;
            }

            let totalReceivables = 0;
            let totalKreceReceivables = 0;
            let totalCasheaReceivables = 0;
            const methodCount = { cash: 0, krece: 0, cashea: 0 };
            const methodTotals = { cash: 0, krece: 0, cashea: 0 };

            (financialSalesData as any[]).forEach((sale: any) => {
              const totalUSD = safeNum(sale.total_usd);

              // Contar por método y acumular totales
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
            });

            // Calcular ticket promedio por método
            const avgTicketCash = methodCount.cash > 0 ? methodTotals.cash / methodCount.cash : 0;
            const avgTicketKrece = methodCount.krece > 0 ? methodTotals.krece / methodCount.krece : 0;
            const avgTicketCashea = methodCount.cashea > 0 ? methodTotals.cashea / methodCount.cashea : 0;

            // ✅ FIX: MÉTODO DE SUSTRACCIÓN SEGURO (Infalible)
            // El dinero en caja es simplemente lo que vendí MENOS lo que me deben
            const netIncome = totalGross - totalReceivables;

            return {
              receivables_usd: totalReceivables,
              net_income_usd: Math.max(0, netIncome), // Asegurar que no sea negativo (por seguridad)
              sales_by_method_count: methodCount,
              receivables_breakdown: {
                krece_usd: totalKreceReceivables,
                cashea_usd: totalCasheaReceivables,
              },
              avg_ticket_cash: avgTicketCash,
              avg_ticket_krece: avgTicketKrece,
              avg_ticket_cashea: avgTicketCashea,
            };
          } catch (err) {
            console.warn('Error calculating financial health for period:', err);
            return defaultHealth;
          }
        };

        // ✅ FIX: Calcular financialHealth para cada período en paralelo
        const [financialHealthToday, financialHealthYesterday, financialHealthMonth] = await Promise.all([
          calculateFinancialHealthForPeriod(dates.today, dates.todayEnd, todaySales.total || 0),
          calculateFinancialHealthForPeriod(dates.yesterday, dates.yesterdayEnd, yesterdaySales.total || 0),
          calculateFinancialHealthForPeriod(dates.startOfMonth, dates.todayEnd, thisMonthSales.total || 0),
        ]);

        const financialHealth: DashboardData['financialHealth'] = {
          today: financialHealthToday,
          yesterday: financialHealthYesterday,
          thisMonth: financialHealthMonth,
        };

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

        setData(dashboardData);
        clearTimeout(timeoutId);
      } catch (err) {
        console.error('Error crítico en useDashboardData:', err);
        setError(err instanceof Error ? err.message : 'Error fetching data');
        // NUNCA dejar la app en blanco - devolver datos vacíos
        setData(getEmptyData());
        clearTimeout(timeoutId);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Cleanup
    return () => {
      // El timeout se limpiará automáticamente si fetchData completa
    };
  }, [userProfileId, companyId, userCompanyId]); // ✅ FIX: Usar IDs estables en lugar de objetos completos

  return { data, loading, error };
}
