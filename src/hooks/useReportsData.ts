import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SalesReportData, ProfitabilityReportData, InventoryReportData, PeriodType, DateRange } from '@/types/reports';

export function useReportsData(period: PeriodType = 'today', customRange?: DateRange) {
  const { userProfile } = useAuth();
  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityReportData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReportData | null>(null);
  const [cashierPerformance, setCashierPerformance] = useState<any[]>([]);
  const [storePerformance, setStorePerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDateRange = (): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return {
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          startDate: yesterday,
          endDate: today
        };
      case 'thisMonth':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        };
      case 'custom':
        return customRange || { startDate: today, endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      default:
        return {
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
    }
  };

  const fetchSalesReportData = async (): Promise<SalesReportData> => {
    if (!userProfile?.company_id) throw new Error('No company ID available');
    
    const { startDate, endDate } = getDateRange();
    
    // Fetch sales data with Krece information
    const { data: salesData, error: salesError } = await (supabase as any)
      .from('sales')
      .select(`
        id,
        total_usd,
        payment_method,
        krece_enabled,
        krece_initial_amount_usd,
        krece_financed_amount_usd,
        is_mixed_payment,
        created_at,
        stores!inner(id, name)
      `)
      // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());

    if (salesError) throw salesError;

    // Fetch payment methods data
    const { data: paymentsData, error: paymentsError } = await (supabase as any)
      .from('sale_payments')
      .select(`
        payment_method,
        amount_usd,
        sales!inner(
          company_id,
          created_at,
          store_id,
          stores!inner(id, name)
        )
      `)
      .eq('sales.company_id', userProfile.company_id)
      .gte('sales.created_at', startDate.toISOString())
      .lt('sales.created_at', endDate.toISOString());

    if (paymentsError) throw paymentsError;

    // Process sales data
    const totalSales = salesData.reduce((sum: number, sale: any) => sum + (sale.total_usd || 0), 0);
    const totalOrders = salesData.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    // Calculate Krece totals
    const totalKreceFinancing = salesData
      .filter((sale: any) => sale.krece_enabled)
      .reduce((sum: number, sale: any) => sum + (sale.krece_financed_amount_usd || 0), 0);
    
    const totalKreceInitial = salesData
      .filter((sale: any) => sale.krece_enabled)
      .reduce((sum: number, sale: any) => sum + (sale.krece_initial_amount_usd || 0), 0);

    // Process payment methods
    const paymentMethods = {
      cash: 0,
      card: 0,
      transfer: 0,
      krece: 0,
      mixed: 0
    };

    paymentsData.forEach((payment: any) => {
      const method = payment.payment_method?.toLowerCase();
      const amount = payment.amount_usd || 0;
      
      if (method === 'efectivo' || method === 'cash') {
        paymentMethods.cash += amount;
      } else if (method === 'tarjeta' || method === 'card') {
        paymentMethods.card += amount;
      } else if (method === 'transferencia' || method === 'transfer') {
        paymentMethods.transfer += amount;
      } else if (method === 'krece') {
        paymentMethods.krece += amount;
      } else if (method === 'mixto' || method === 'mixed') {
        paymentMethods.mixed += amount;
      }
    });

    // Get unique stores
    const storesMap = new Map();
    salesData.forEach((sale: any) => {
      if (sale.stores && !storesMap.has(sale.stores.id)) {
        storesMap.set(sale.stores.id, sale.stores);
      }
    });

    // Process store breakdown
    const storeBreakdown = Array.from(storesMap.values()).map((store: any) => {
      const storeSales = salesData.filter((sale: any) => sale.stores?.id === store.id);
      const storePayments = paymentsData.filter((payment: any) => payment.sales?.stores?.id === store.id);
      
      const storeTotalSales = storeSales.reduce((sum: number, sale: any) => sum + (sale.total_usd || 0), 0);
      const storeTotalOrders = storeSales.length;
      const storeAvgOrder = storeTotalOrders > 0 ? storeTotalSales / storeTotalOrders : 0;
      
      const storeKreceFinancing = storeSales
        .filter((sale: any) => sale.krece_enabled)
        .reduce((sum: number, sale: any) => sum + (sale.krece_financed_amount_usd || 0), 0);
      
      const storeKreceInitial = storeSales
        .filter((sale: any) => sale.krece_enabled)
        .reduce((sum: number, sale: any) => sum + (sale.krece_initial_amount_usd || 0), 0);

      const storePaymentMethods = {
        cash: 0,
        card: 0,
        transfer: 0,
        krece: 0,
        mixed: 0
      };

      storePayments.forEach((payment: any) => {
        const method = payment.payment_method?.toLowerCase();
        const amount = payment.amount_usd || 0;
        
        if (method === 'efectivo' || method === 'cash') {
          storePaymentMethods.cash += amount;
        } else if (method === 'tarjeta' || method === 'card') {
          storePaymentMethods.card += amount;
        } else if (method === 'transferencia' || method === 'transfer') {
          storePaymentMethods.transfer += amount;
        } else if (method === 'krece') {
          storePaymentMethods.krece += amount;
        } else if (method === 'mixto' || method === 'mixed') {
          storePaymentMethods.mixed += amount;
        }
      });

      return {
        storeId: store.id,
        storeName: store.name,
        totalSales: storeTotalSales,
        totalOrders: storeTotalOrders,
        averageOrderValue: storeAvgOrder,
        kreceFinancing: storeKreceFinancing,
        kreceInitial: storeKreceInitial,
        paymentMethods: storePaymentMethods
      };
    });

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      totalKreceFinancing,
      totalKreceInitial,
      paymentMethods,
      storeBreakdown
    };
  };

  const fetchProfitabilityReportData = async (): Promise<ProfitabilityReportData> => {
    if (!userProfile?.company_id) throw new Error('No company ID available');
    
    const { startDate, endDate } = getDateRange();
    
    // Fetch sale items with product information for profit calculation
    const { data: saleItemsData, error: itemsError } = await (supabase as any)
      .from('sale_items')
      .select(`
        id,
        qty,
        price_usd,
        subtotal_usd,
        products!inner(
          id,
          name,
          sku,
          cost_usd
        ),
        sales!inner(
          id,
          company_id,
          store_id,
          created_at,
          stores!inner(id, name)
        )
      `)
      .eq('sales.company_id', userProfile.company_id)
      .gte('sales.created_at', startDate.toISOString())
      .lt('sales.created_at', endDate.toISOString());

    if (itemsError) throw itemsError;

    // Calculate overall profitability
    const totalRevenue = saleItemsData.reduce((sum: number, item: any) => sum + (item.subtotal_usd || 0), 0);
    const totalCost = saleItemsData.reduce((sum: number, item: any) => {
      const cost = (item.products?.cost_usd || 0) * (item.qty || 0);
      return sum + cost;
    }, 0);
    
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Store breakdown
    const storesMap = new Map();
    saleItemsData.forEach((item: any) => {
      const storeId = item.sales?.stores?.id;
      const storeName = item.sales?.stores?.name;
      
      if (storeId && !storesMap.has(storeId)) {
        storesMap.set(storeId, {
          storeId,
          storeName,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0
        });
      }
      
      if (storeId) {
        const store = storesMap.get(storeId);
        store.revenue += item.subtotal_usd || 0;
        store.cost += (item.products?.cost_usd || 0) * (item.qty || 0);
      }
    });

    const storeBreakdown = Array.from(storesMap.values()).map((store: any) => ({
      ...store,
      profit: store.revenue - store.cost,
      margin: store.revenue > 0 ? ((store.revenue - store.cost) / store.revenue) * 100 : 0
    }));

    // Top selling products by profit
    const productsMap = new Map();
    saleItemsData.forEach((item: any) => {
      const productId = item.products?.id;
      
      if (productId) {
        if (!productsMap.has(productId)) {
          productsMap.set(productId, {
            productId,
            productName: item.products?.name || 'Producto',
            sku: item.products?.sku || '',
            quantitySold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0
          });
        }
        
        const product = productsMap.get(productId);
        product.quantitySold += item.qty || 0;
        product.revenue += item.subtotal_usd || 0;
        product.cost += (item.products?.cost_usd || 0) * (item.qty || 0);
      }
    });

    const topSellingProducts = Array.from(productsMap.values())
      .map((product: any) => ({
        ...product,
        profit: product.revenue - product.cost,
        margin: product.revenue > 0 ? ((product.revenue - product.cost) / product.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20);

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      storeBreakdown,
      topSellingProducts
    };
  };

  const fetchInventoryReportData = async (): Promise<InventoryReportData> => {
    if (!userProfile?.company_id) throw new Error('No company ID available');
    
    // Fetch inventory data with product and store information
    // ⚠️ FILTRO CRÍTICO: Solo productos activos para reportes precisos
    const { data: inventoryData, error: inventoryError } = await (supabase as any)
      .from('inventories')
      .select(`
        id,
        product_id,
        store_id,
        qty,
        min_qty,
        products!inner(
          id,
          name,
          sku,
          cost_usd,
          company_id,
          active
        ),
        stores!inner(
          id,
          name
        )
      `)
      .eq('products.company_id', userProfile.company_id)
      .eq('products.active', true)  // ⚠️ Solo productos activos
      .limit(50);

    if (inventoryError) throw inventoryError;

    const totalProducts = new Set(inventoryData.map((item: any) => item.product_id)).size;
    const totalStockValue = inventoryData.reduce((sum: number, item: any) => {
      return sum + (item.qty || 0) * (item.products?.cost_usd || 0);
    }, 0);

    const lowStockProducts = inventoryData.filter((item: any) => 
      (item.qty || 0) <= (item.min_qty || 0) && (item.qty || 0) > 0
    ).length;

    const outOfStockProducts = inventoryData.filter((item: any) => 
      (item.qty || 0) === 0
    ).length;

    // Store inventory breakdown
    const storesMap = new Map();
    inventoryData.forEach((item: any) => {
      const storeId = item.stores?.id;
      const storeName = item.stores?.name;
      
      if (storeId && !storesMap.has(storeId)) {
        storesMap.set(storeId, {
          storeId,
          storeName,
          totalProducts: new Set(),
          totalValue: 0,
          lowStockCount: 0,
          outOfStockCount: 0
        });
      }
      
      if (storeId) {
        const store = storesMap.get(storeId);
        store.totalProducts.add(item.product_id);
        store.totalValue += (item.qty || 0) * (item.products?.cost_usd || 0);
        
        if ((item.qty || 0) <= (item.min_qty || 0) && (item.qty || 0) > 0) {
          store.lowStockCount++;
        }
        
        if ((item.qty || 0) === 0) {
          store.outOfStockCount++;
        }
      }
    });

    const storeInventory = Array.from(storesMap.values()).map((store: any) => ({
      ...store,
      totalProducts: store.totalProducts.size
    }));

    return {
      totalProducts,
      totalStockValue,
      lowStockProducts,
      outOfStockProducts,
      storeInventory,
      productBreakdown: [] // To be implemented
    };
  };

  const fetchReports = async () => {
    if (!userProfile?.company_id) {
      console.warn('No company_id available for fetching reports');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching reports for period:', period);
      console.log('Date range:', getDateRange());
      
      // Fetch all reports in parallel
      const [salesReport, profitabilityReport, inventoryReport, cashierData, storeData] = await Promise.all([
        fetchSalesReportData(),
        fetchProfitabilityReportData(),
        fetchInventoryReportData(),
        getCashierPerformance(),
        getStorePerformance()
      ]);
      
      console.log('Sales report data:', salesReport);
      console.log('Profitability report data:', profitabilityReport);
      console.log('Inventory report data:', inventoryReport);
      console.log('Cashier performance data:', cashierData);
      console.log('Store performance data:', storeData);
      
      setSalesData(salesReport);
      setProfitabilityData(profitabilityReport);
      setInventoryData(inventoryReport);
      setCashierPerformance(cashierData);
      setStorePerformance(storeData);
      
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [userProfile?.company_id, period, customRange]);

  // Función para obtener rendimiento de cajeros
  const getCashierPerformance = async () => {
    if (!userProfile?.company_id) return [];
    
    const { startDate, endDate } = getDateRange();
    
    try {
      // Obtener ventas con información del cajero
      const { data: salesData, error: salesError } = await (supabase as any)
        .from('sales')
        .select(`
          id,
          total_usd,
          created_at,
          user_id,
          users!inner(name, role)
        `)
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .limit(50);

      if (salesError) throw salesError;

      // Agrupar por cajero
      const cashierGroups = salesData.reduce((groups: any, sale: any) => {
        const cashierName = sale.users?.name || 'Desconocido';
        if (!groups[cashierName]) {
          groups[cashierName] = {
            id: sale.user_id || 'unknown',
            name: cashierName,
            salesProcessed: 0,
            totalSales: 0,
            averageTime: 0,
            errors: 0,
            performance: 0
          };
        }
        groups[cashierName].salesProcessed++;
        groups[cashierName].totalSales += sale.total_usd || 0;
        return groups;
      }, {});

      // Calcular métricas de rendimiento
      const cashierPerformance = Object.values(cashierGroups).map((cashier: any) => {
        const averageTime = Math.random() * 10 + 5; // Simulado por ahora
        const errors = Math.floor(Math.random() * 5); // Simulado por ahora
        const performance = Math.max(60, 100 - (errors * 5) - (averageTime * 2)); // Cálculo simulado
        
        return {
          ...cashier,
          averageTime: parseFloat(averageTime.toFixed(1)),
          errors,
          performance: parseFloat(performance.toFixed(1))
        };
      });

      return cashierPerformance.sort((a: any, b: any) => b.salesProcessed - a.salesProcessed);
    } catch (error) {
      console.error('Error fetching cashier performance:', error);
      return [];
    }
  };

  // Función para obtener rendimiento de tiendas
  const getStorePerformance = async () => {
    if (!userProfile?.company_id) return [];
    
    const { startDate, endDate } = getDateRange();
    
    try {
      // Obtener ventas con información de tienda
      const { data: salesData, error: salesError } = await (supabase as any)
        .from('sales')
        .select(`
          id,
          total_usd,
          created_at,
          store_id,
          stores!inner(name)
        `)
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .limit(50);

      if (salesError) throw salesError;

      // Agrupar por tienda
      const storeGroups = salesData.reduce((groups: any, sale: any) => {
        const storeName = sale.stores?.name || 'Desconocida';
        if (!groups[storeName]) {
          groups[storeName] = {
            id: sale.store_id || 'unknown',
            name: storeName,
            salesProcessed: 0,
            totalSales: 0,
            averageTime: 0,
            errors: 0,
            performance: 0
          };
        }
        groups[storeName].salesProcessed++;
        groups[storeName].totalSales += sale.total_usd || 0;
        return groups;
      }, {});

      // Calcular métricas de rendimiento
      const storePerformance = Object.values(storeGroups).map((store: any) => {
        const averageTime = Math.random() * 8 + 4; // Simulado por ahora
        const errors = Math.floor(Math.random() * 3); // Simulado por ahora
        const performance = Math.max(70, 100 - (errors * 8) - (averageTime * 1.5)); // Cálculo simulado
        
        return {
          ...store,
          averageTime: parseFloat(averageTime.toFixed(1)),
          errors,
          performance: parseFloat(performance.toFixed(1))
        };
      });

      return storePerformance.sort((a: any, b: any) => b.salesProcessed - a.salesProcessed);
    } catch (error) {
      console.error('Error fetching store performance:', error);
      return [];
    }
  };

  // Función para obtener todas las tiendas
  const getAllStores = async () => {
    if (!userProfile?.company_id) return [];
    
    try {
      // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
      const { data: stores, error } = await (supabase as any)
        .from('stores')
        .select('id, name, active')
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return stores || [];
    } catch (error) {
      console.error('Error fetching stores:', error);
      return [];
    }
  };

  // Función para generar reportes
  const generateReport = async (type: string, period: string, storeId?: string) => {
    console.log(`Generating ${type} report for ${period}${storeId ? ` (store: ${storeId})` : ''}`);
    // Implementar lógica de generación de reportes
  };

  return {
    salesData,
    profitabilityData,
    inventoryData,
    cashierPerformance,
    storePerformance,
    loading,
    error,
    refetch: fetchReports,
    getAllStores,
    generateReport
  };
}