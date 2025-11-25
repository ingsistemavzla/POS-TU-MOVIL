import { useState, useEffect } from 'react';
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
const getSalesForPeriod = async (
  companyId: string,
  startDate: Date,
  endDate: Date,
  storeId?: string
) => {
  try {
    let query = supabase
      .from('sales')
      .select('id, total_usd, created_at')
      .eq('company_id', companyId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

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
});

export function useDashboardData() {
  const { userProfile, company } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Protección: si no hay usuario o compañía, devolver datos vacíos
      if (!userProfile || !company) {
        setData(getEmptyData());
        setLoading(false);
        return;
      }

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
          const { data: viewData, error: viewError } = await supabase
            .from('dashboard_stats_view')
            .select('total_products, total_stock, total_value, low_stock_count')
            .eq('company_id', companyId)
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
        // ============================================
        let stores: Array<{ id: string; name: string }> = [];

        try {
          if (userProfile.role === 'cashier' && userProfile.assigned_store_id) {
            const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('id, name')
            .eq('id', userProfile.assigned_store_id)
            .eq('active', true)
            .single();
          
            if (!storeError && storeData) {
              stores = [storeData];
            }
        } else {
            const { data: storesData, error: storesError } = await supabase
            .from('stores')
            .select('id, name')
              .eq('company_id', companyId)
            .eq('active', true);
          
            if (!storesError && storesData) {
              stores = storesData;
            }
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
        // 3. OBTENER VENTAS POR PERÍODO (Simple)
        // ============================================
        const todaySales = await getSalesForPeriod(
          companyId,
          dates.today,
          dates.todayEnd,
          userProfile.role === 'cashier' || userProfile.role === 'manager'
            ? userProfile.assigned_store_id || undefined
            : undefined
        );

        const yesterdaySales = await getSalesForPeriod(
          companyId,
          dates.yesterday,
          dates.yesterdayEnd,
          userProfile.role === 'cashier' || userProfile.role === 'manager'
            ? userProfile.assigned_store_id || undefined
            : undefined
        );

        const thisMonthSales = await getSalesForPeriod(
          companyId,
          dates.startOfMonth,
          dates.todayEnd,
          userProfile.role === 'cashier' || userProfile.role === 'manager'
            ? userProfile.assigned_store_id || undefined
            : undefined
        );

        const lastMonthSales = await getSalesForPeriod(
          companyId,
          dates.startOfLastMonth,
          dates.endOfLastMonth,
          userProfile.role === 'cashier' || userProfile.role === 'manager'
            ? userProfile.assigned_store_id || undefined
            : undefined
        );

        // ============================================
        // 4. OBTENER VENTAS RECIENTES (Simple)
        // ============================================
        let recentSales: DashboardData['recentSales'] = [];

        try {
          let recentQuery = supabase
            .from('sales')
            .select('id, total_usd, total_bs, created_at, store_id, stores(name)')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (userProfile.role === 'cashier' && userProfile.assigned_store_id) {
            recentQuery = recentQuery.eq('store_id', userProfile.assigned_store_id);
          } else if (userProfile.role === 'manager' && userProfile.assigned_store_id) {
            recentQuery = recentQuery.eq('store_id', userProfile.assigned_store_id);
          }

          const { data: recentData, error: recentError } = await recentQuery;

          if (!recentError && recentData) {
            recentSales = recentData.map((sale: any) => ({
              id: sale.id,
              customerName: 'Cliente General',
              total: safeNum(sale.total_bs),
              totalUSD: safeNum(sale.total_usd),
              createdAt: sale.created_at,
              storeName: sale.stores?.name || 'N/A',
              itemsCount: 0,
            }));
          }
        } catch (err) {
          console.warn('Error fetching recent sales:', err);
        }

        // ============================================
        // 5. OBTENER PRODUCTOS MÁS VENDIDOS (Simple)
        // ============================================
        let topProducts: DashboardData['topProducts'] = [];

        try {
          const { data: topData, error: topError } = await supabase
          .from('sale_items')
          .select(`
            qty,
              subtotal_usd,
            products(id, name, sku),
              sales!inner(store_id, stores(name), company_id)
            `)
            .eq('sales.company_id', companyId)
            .gte('sales.created_at', dates.startOfMonth.toISOString())
            .limit(50);

          if (!topError && topData) {
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

            topProducts = Array.from(productMap.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);
          }
        } catch (err) {
          console.warn('Error fetching top products:', err);
        }

        // ============================================
        // 6. OBTENER STOCK CRÍTICO (Simple)
        // ============================================
        let criticalStock: DashboardData['criticalStock'] = [];

        try {
          const storeIds = stores.map(s => s.id);
          const { data: stockData, error: stockError } = await supabase
            .from('inventories')
            .select('qty, min_qty, products(id, name, sku), stores(id, name)')
            .in('store_id', storeIds);

          if (!stockError && stockData) {
            criticalStock = (stockData as any[])
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
          }
        } catch (err) {
          console.warn('Error fetching critical stock:', err);
        }

        // ============================================
        // 7. OBTENER VENTAS POR DÍA (Simple)
        // ============================================
        let dailySales: DashboardData['dailySales'] = [];

        try {
          const { data: dailyData, error: dailyError } = await supabase
            .from('sales')
            .select('total_usd, total_bs, created_at')
            .eq('company_id', companyId)
            .gte('created_at', dates.thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false });

          if (!dailyError && dailyData) {
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

            dailySales = Array.from(dailyMap.entries())
              .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 30);
          }
        } catch (err) {
          console.warn('Error fetching daily sales:', err);
        }

        // ============================================
        // 8. OBTENER MÉTRICAS POR TIENDA (Simple)
        // ============================================
        const storeMetrics: DashboardData['storeMetrics'] = [];

        for (const store of stores) {
          try {
            const storeToday = await getSalesForPeriod(companyId, dates.today, dates.todayEnd, store.id);
            const storeYesterday = await getSalesForPeriod(companyId, dates.yesterday, dates.yesterdayEnd, store.id);
            const storeThisMonth = await getSalesForPeriod(companyId, dates.startOfMonth, dates.todayEnd, store.id);

            storeMetrics.push({
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
            });
          } catch (err) {
            console.warn(`Error fetching metrics for store ${store.id}:`, err);
            // Agregar métricas vacías
            storeMetrics.push({
              storeId: store.id,
              storeName: store.name,
              sales: { today: 0, yesterday: 0, thisMonth: 0 },
              orders: { today: 0, yesterday: 0, thisMonth: 0 },
              averageOrder: { today: 0, yesterday: 0, thisMonth: 0 },
            });
          }
        }

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
          const { data: catData, error: catError } = await supabase
            .from('sale_items')
            .select(`
              qty,
              subtotal_usd,
              products(id, category),
              sales!inner(company_id, created_at)
            `)
            .eq('sales.company_id', companyId)
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
        // 11. CONSTRUIR RESPUESTA FINAL
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
        };

        setData(dashboardData);
      } catch (err) {
        console.error('Error crítico en useDashboardData:', err);
        setError(err instanceof Error ? err.message : 'Error fetching data');
        // NUNCA dejar la app en blanco - devolver datos vacíos
        setData(getEmptyData());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile, company]);

  return { data, loading, error };
}
