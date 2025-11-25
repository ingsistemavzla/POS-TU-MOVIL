import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Users,
  Store,
  Calendar,
  BarChart3,
  Building2,
  CreditCard,
  PiggyBank,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useKreceStats } from "@/hooks/useKreceStats";
import { usePaymentMethodsData } from "@/hooks/usePaymentMethodsData";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/utils/currency";
import { useState } from "react";
import { PaymentMethodStats } from "@/components/dashboard/PaymentMethodStats";
import { PaymentMethodSummary } from "@/components/dashboard/PaymentMethodSummary";
import { StoreSummaryCard } from "@/components/dashboard/StoreSummaryCard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StoreSummaryTable } from "@/components/dashboard/StoreSummaryTable";
import { StoreSummaryChart } from "@/components/dashboard/StoreSummaryChart";
import { PaymentMethodDonutChart } from "@/components/dashboard/PaymentMethodDonutChart";
import { TopProductsTable } from "@/components/dashboard/TopProductsTable";
import { CriticalStockCard } from "@/components/dashboard/CriticalStockCard";

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
  const { data: dashboardData, loading, error } = useDashboardData();
  const { stats: kreceStats } = useKreceStats(selectedPeriod);
  const { data: paymentMethodsData } = usePaymentMethodsData(selectedPeriod);
  const paymentData = paymentMethodsData?.data || paymentMethodsData;
  
  // Obtener datos de pagos del período anterior para comparación correcta
  const previousPeriod: 'today' | 'yesterday' | 'thisMonth' = 
    selectedPeriod === 'today' ? 'yesterday' :
    selectedPeriod === 'yesterday' ? 'today' :
    'today'; // Para thisMonth comparamos con hoy
  
  const { data: previousPaymentDataResponse } = usePaymentMethodsData(previousPeriod);
  const previousPaymentData = previousPaymentDataResponse?.data || previousPaymentDataResponse;
  
  const { company, userProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Filter data by assigned store for managers
  const getFilteredData = () => {
    if (!dashboardData) return null;
    
    // If user is admin, show all data
    if (userProfile?.role === 'admin') {
      return dashboardData;
    }
    
    // If user is manager, filter by assigned store
    if (userProfile?.role === 'manager' && userProfile?.assigned_store_id) {
      const assignedStore = dashboardData.storesSummary?.find(store => store.id === userProfile.assigned_store_id);
      const storeName = assignedStore?.name;
      
      return {
        ...dashboardData,
        // Filter store-specific data
        storesSummary: dashboardData.storesSummary?.filter(store => store.id === userProfile.assigned_store_id) || [],
        storeMetrics: dashboardData.storeMetrics?.filter(metric => metric.storeId === userProfile.assigned_store_id) || [],
        recentSales: storeName ? dashboardData.recentSales?.filter(sale => sale.storeName === storeName) || [] : [],
        topProducts: storeName ? dashboardData.topProducts?.filter(product => product.storeName === storeName) || [] : [],
        criticalStock: storeName ? dashboardData.criticalStock?.filter(product => product.storeName === storeName) || [] : [],
      };
    }
    
    // For cashiers, show limited data or no data
    if (userProfile?.role === 'cashier') {
      return {
        ...dashboardData,
        storesSummary: dashboardData.storesSummary?.filter(store => store.id === userProfile.assigned_store_id) || [],
        storeMetrics: [],
        recentSales: [],
        topProducts: [],
        criticalStock: [],
      };
    }
    
    return dashboardData;
  };

  const filteredData = getFilteredData();

  // Función para calcular el porcentaje de cambio
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para obtener el color del cambio
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Función para obtener el icono del cambio
  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (change < 0) return <ArrowDownRight className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  // Función para obtener los datos según el período seleccionado
  const getPeriodData = () => {
    if (!filteredData) return null;

    switch (selectedPeriod) {
      case 'today':
        return {
          sales: filteredData.totalSalesUSD.today,
          orders: filteredData.totalOrders.today,
          averageOrder: filteredData.averageOrderValue.today,
          previousSales: filteredData.totalSalesUSD.yesterday,
          previousOrders: filteredData.totalOrders.yesterday,
          previousAverageOrder: filteredData.averageOrderValue.yesterday,
          periodLabel: 'Hoy',
          previousPeriodLabel: 'Ayer'
        };
      case 'yesterday':
        return {
          sales: filteredData.totalSalesUSD.yesterday,
          orders: filteredData.totalOrders.yesterday,
          averageOrder: filteredData.averageOrderValue.yesterday,
          previousSales: filteredData.totalSalesUSD.today,
          previousOrders: filteredData.totalOrders.today,
          previousAverageOrder: filteredData.averageOrderValue.today,
          periodLabel: 'Ayer',
          previousPeriodLabel: 'Hoy'
        };
      case 'thisMonth':
        return {
          sales: filteredData.totalSalesUSD.thisMonth,
          orders: filteredData.totalOrders.thisMonth,
          averageOrder: filteredData.averageOrderValue.thisMonth,
          previousSales: filteredData.totalSalesUSD.lastMonth,
          previousOrders: filteredData.totalOrders.lastMonth,
          previousAverageOrder: filteredData.averageOrderValue.lastMonth,
          periodLabel: 'Este Mes',
          previousPeriodLabel: 'Mes Anterior'
        };
      default:
        return null;
    }
  };

  const periodData = getPeriodData();

  // Función para obtener los datos de tienda según el período seleccionado
  const getStoreDataForPeriod = (store: any) => {
    const storeMetrics = filteredData?.storeMetrics.find(s => s.storeId === store.id);
    if (!storeMetrics) return { sales: 0, orders: 0, averageOrder: 0 };

    switch (selectedPeriod) {
      case 'today':
        return {
          sales: storeMetrics.sales.today,
          orders: storeMetrics.orders.today,
          averageOrder: storeMetrics.averageOrder.today
        };
      case 'yesterday':
        return {
          sales: storeMetrics.sales.yesterday,
          orders: storeMetrics.orders.yesterday,
          averageOrder: storeMetrics.averageOrder.yesterday
        };
      case 'thisMonth':
        return {
          sales: storeMetrics.sales.thisMonth,
          orders: storeMetrics.orders.thisMonth,
          averageOrder: storeMetrics.averageOrder.thisMonth
        };
      default:
        return { sales: 0, orders: 0, averageOrder: 0 };
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Multitienda</h1>
            <p className="text-muted-foreground">
              {company?.name} - Cargando datos...
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
                  <div className="h-8 bg-muted rounded animate-pulse w-20"></div>
                  <div className="h-3 bg-muted rounded animate-pulse w-16"></div>
                </div>
                <div className="w-11 h-11 bg-muted rounded-lg animate-pulse"></div>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-muted-foreground">Cargando datos del dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!filteredData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Multitienda</h1>
            <p className="text-muted-foreground">
              {company?.name} - No hay datos disponibles
            </p>
          </div>
        </div>
        
        <div className="text-center py-8">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No hay datos para mostrar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black space-y-6 p-6 relative">
      {/* Badge de versión */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          v-valid
        </Badge>
      </div>
      
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl text-white">
            {userProfile?.role === 'manager' ? 'Dashboard de Tienda' : 'Dashboard Multitienda'}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {company?.name} - {
              userProfile?.role === 'manager' 
                ? `Resumen de tu tienda asignada` 
                : 'Resumen completo de todas las tiendas'
            }
          </p>
        </div>
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          {/* Selector de Período */}
          <div className="flex items-center space-x-1 bg-[#1a1a1a] rounded-lg p-1 w-full sm:w-auto border border-[#333]">
            <Button
              variant={selectedPeriod === 'today' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod('today')}
              className={`text-xs flex-1 sm:flex-none ${selectedPeriod === 'today' ? 'bg-green-600 hover:bg-green-700' : 'text-muted-foreground hover:text-white'}`}
            >
              Hoy
            </Button>
            <Button
              variant={selectedPeriod === 'yesterday' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod('yesterday')}
              className={`text-xs flex-1 sm:flex-none ${selectedPeriod === 'yesterday' ? 'bg-green-600 hover:bg-green-700' : 'text-muted-foreground hover:text-white'}`}
            >
              Ayer
            </Button>
            <Button
              variant={selectedPeriod === 'thisMonth' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod('thisMonth')}
              className={`text-xs flex-1 sm:flex-none ${selectedPeriod === 'thisMonth' ? 'bg-green-600 hover:bg-green-700' : 'text-muted-foreground hover:text-white'}`}
            >
              Este Mes
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="w-full sm:w-auto border-[#333] hover:bg-[#1a1a1a] text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* NIVEL 1: KPIs Principales - 4 Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Facturado */}
        <KpiCard
          title="Total Facturado"
          value={periodData?.sales || 0}
          period={`Ventas totales • ${selectedPeriod === 'today' ? 'Hoy' : selectedPeriod === 'yesterday' ? 'Ayer' : 'Este Mes'}`}
          change={calculateChange(periodData?.sales || 0, periodData?.previousSales || 0)}
          previousPeriod={periodData?.previousPeriodLabel?.toLowerCase() || 'ayer'}
          icon={<Receipt className="w-6 h-6" />}
          borderColor="green"
        />

        {/* 2. Ingreso Neto */}
        <KpiCard
          title="Ingreso Neto"
          value={paymentData?.totalUSD || 0}
          period={`Ingreso real • ${selectedPeriod === 'today' ? 'Hoy' : selectedPeriod === 'yesterday' ? 'Ayer' : 'Este Mes'}`}
          change={calculateChange(
            paymentData?.totalUSD || 0, 
            selectedPeriod === 'thisMonth' 
              ? (previousPaymentData?.totalUSD || 0) // Para mes, comparar con hoy
              : (previousPaymentData?.totalUSD || 0) // Para hoy/ayer, comparar con período anterior
          )}
          previousPeriod={
            selectedPeriod === 'today' ? 'ayer' :
            selectedPeriod === 'yesterday' ? 'hoy' :
            'hoy' // Para mes, comparar con hoy
          }
          icon={<DollarSign className="w-6 h-6" />}
          borderColor="green"
          isLoading={paymentData?.loading || previousPaymentData?.loading || false}
        />

        {/* 3. Financiamiento Krece */}
        <KpiCard
          title="Financiamiento Krece"
          value={kreceStats.totalFinancedAmountUSD || 0}
          period={selectedPeriod === 'today' ? 'Hoy' : selectedPeriod === 'yesterday' ? 'Ayer' : 'Este Mes'}
          change={calculateChange(
            kreceStats.totalFinancedAmountUSD,
            selectedPeriod === 'today' ? kreceStats.lastMonthFinancedAmount :
            selectedPeriod === 'yesterday' ? kreceStats.thisMonthFinancedAmount :
            kreceStats.lastMonthFinancedAmount
          )}
          previousPeriod={selectedPeriod === 'today' ? 'mes anterior' : selectedPeriod === 'yesterday' ? 'este mes' : 'mes anterior'}
          icon={<CreditCard className="w-6 h-6" />}
          borderColor="blue"
          isLoading={kreceStats.loading}
        />

        {/* 4. Ingreso por Krece */}
        <KpiCard
          title="Ingreso por Krece"
          value={kreceStats.totalInitialAmountUSD || 0}
          period={selectedPeriod === 'today' ? 'Hoy' : selectedPeriod === 'yesterday' ? 'Ayer' : 'Este Mes'}
          change={calculateChange(
            kreceStats.totalInitialAmountUSD,
            selectedPeriod === 'today' ? kreceStats.lastMonthInitialAmount :
            selectedPeriod === 'yesterday' ? kreceStats.thisMonthInitialAmount :
            kreceStats.lastMonthInitialAmount
          )}
          previousPeriod={selectedPeriod === 'today' ? 'mes anterior' : selectedPeriod === 'yesterday' ? 'este mes' : 'mes anterior'}
          icon={<TrendingUp className="w-6 h-6" />}
          borderColor="purple"
          isLoading={kreceStats.loading}
        />
      </div>

      {/* NIVEL 2: Paneles Secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Resumen por Tienda */}
        <StoreSummaryChart
          stores={filteredData.storesSummary}
          storeMetrics={filteredData.storeMetrics}
          selectedPeriod={selectedPeriod}
        />

        {/* Ingresos por Método de Pago - Gráfico Dona */}
        <PaymentMethodDonutChart period={selectedPeriod} />
      </div>

      {/* NIVEL 3: Panel Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Productos Más Vendidos */}
        <TopProductsTable products={filteredData.topProducts} />

        {/* Stock Crítico */}
        {filteredData.criticalStock.length > 0 && (
          <CriticalStockCard products={filteredData.criticalStock} />
        )}
      </div>


    </div>
  );
}
