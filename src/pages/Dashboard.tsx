import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useKreceStats } from '@/hooks/useKreceStats';
import { usePaymentMethodsData } from '@/hooks/usePaymentMethodsData';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { DashboardStoreTable } from '@/components/dashboard/DashboardStoreTable';

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
  const { company, userProfile, loading: authLoading } = useAuth();
  const { data: dashboardData, loading: dashboardLoading, error } = useDashboardData();
  const { stats: kreceStats } = useKreceStats(selectedPeriod);
  const { data: paymentMethodsDataResponse } = usePaymentMethodsData(selectedPeriod);
  const paymentData = paymentMethodsDataResponse?.data || paymentMethodsDataResponse;
  
  // Obtener datos de pagos del período anterior para comparación
  const previousPeriod: PeriodType = 
    selectedPeriod === 'today' ? 'yesterday' :
    selectedPeriod === 'yesterday' ? 'today' :
    'today';
  
  const { data: previousPaymentDataResponse } = usePaymentMethodsData(previousPeriod);
  const previousPaymentData = previousPaymentDataResponse?.data || previousPaymentDataResponse;
  
  const [refreshing, setRefreshing] = useState(false);
  const [forceShow, setForceShow] = useState(false);
  
  const loading = authLoading || dashboardLoading;
  
  // Timeout de seguridad
  useEffect(() => {
    if (loading && userProfile && company) {
      const timeout = setTimeout(() => {
        setForceShow(true);
      }, 5000);
      return () => clearTimeout(timeout);
    } else {
      setForceShow(false);
    }
  }, [loading, userProfile, company]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Función para obtener datos según el período
  const getPeriodData = () => {
    if (!dashboardData) return null;

    switch (selectedPeriod) {
      case 'today':
        return {
          sales: dashboardData.totalSalesUSD.today,
          orders: dashboardData.totalOrders.today,
          previousSales: dashboardData.totalSalesUSD.yesterday,
          previousOrders: dashboardData.totalOrders.yesterday,
          periodLabel: 'Hoy',
          previousPeriodLabel: 'Ayer'
        };
      case 'yesterday':
        return {
          sales: dashboardData.totalSalesUSD.yesterday,
          orders: dashboardData.totalOrders.yesterday,
          previousSales: dashboardData.totalSalesUSD.today,
          previousOrders: dashboardData.totalOrders.today,
          periodLabel: 'Ayer',
          previousPeriodLabel: 'Hoy'
        };
      case 'thisMonth':
        return {
          sales: dashboardData.totalSalesUSD.thisMonth,
          orders: dashboardData.totalOrders.thisMonth,
          previousSales: dashboardData.totalSalesUSD.lastMonth,
          previousOrders: dashboardData.totalOrders.lastMonth,
          periodLabel: 'Este Mes',
          previousPeriodLabel: 'Mes Anterior'
        };
      default:
        return null;
    }
  };

  const periodData = getPeriodData();

  // Calcular porcentaje de cambio
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Preparar datos para gráfico de tiendas
  const storeChartData = dashboardData?.storesSummary.map(store => ({
    name: store.name,
    sales: selectedPeriod === 'today' 
      ? store.netIncomeByPeriod.today 
      : selectedPeriod === 'yesterday'
      ? store.netIncomeByPeriod.yesterday
      : store.netIncomeByPeriod.thisMonth
  })) || [];

  // Preparar datos para gráfico de métodos de pago
  const paymentChartData = paymentData?.methods?.map((method: any) => ({
    name: method.method === 'zelle' ? 'Zelle' : 
          method.method === 'cash_usd' ? 'Efectivo USD' :
          method.method === 'cash_bs' ? 'Efectivo BS' :
          method.method === 'card_usd' ? 'Tarjeta USD' :
          method.method === 'card_bs' ? 'Tarjeta BS' :
          method.method === 'transfer_usd' ? 'Transferencia USD' :
          method.method === 'transfer_bs' ? 'Transferencia BS' :
          method.method === 'binance' ? 'Binance' :
          method.method === 'krece_initial' ? 'Krece Inicial' : method.method,
    value: method.totalUSD || 0,
    percentage: paymentData?.totalUSD > 0 ? ((method.totalUSD || 0) / paymentData.totalUSD) * 100 : 0,
    color: '#30D96B'
  })) || [];

  const totalPaymentUSD = paymentData?.totalUSD || 0;

  // Loading state con LoadingScreen
  if (loading && userProfile && company && !forceShow) {
    return <LoadingScreen message="Cargando datos del dashboard..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-legacy-text mb-2">Error al cargar datos</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!dashboardData) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="text-center py-8">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
          <p className="text-gray-600">No hay datos para mostrar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-legacy-text">Dashboard Multitienda</h1>
          <p className="text-sm text-gray-600 mt-1">
            {company?.name} - Resumen de ventas y métricas
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedPeriod('today')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              selectedPeriod === 'today'
                ? 'bg-brand-primary text-legacy-sidebar font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setSelectedPeriod('yesterday')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              selectedPeriod === 'yesterday'
                ? 'bg-brand-primary text-legacy-sidebar font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Ayer
          </button>
          <button
            onClick={() => setSelectedPeriod('thisMonth')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              selectedPeriod === 'thisMonth'
                ? 'bg-brand-primary text-legacy-sidebar font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Este Mes
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="ml-2"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturado */}
        <Card className="border-l-4 border-brand-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Total Facturado</CardTitle>
            <DollarSign className="h-4 w-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {formatCurrency(periodData?.sales || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Ventas totales • {periodData?.periodLabel}
            </p>
            {periodData && (
              <p className="text-xs text-gray-500 mt-1">
                {calculateChange(periodData.sales, periodData.previousSales).toFixed(1)}% vs {periodData.previousPeriodLabel}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ingreso Neto */}
        <Card className="border-l-4 border-brand-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Ingreso Neto</CardTitle>
            <ShoppingCart className="h-4 w-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {formatCurrency(totalPaymentUSD)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Ingreso real • {periodData?.periodLabel}
            </p>
            {previousPaymentData && (
              <p className="text-xs text-gray-500 mt-1">
                {calculateChange(totalPaymentUSD, previousPaymentData.totalUSD || 0).toFixed(1)}% vs {selectedPeriod === 'today' ? 'ayer' : selectedPeriod === 'yesterday' ? 'hoy' : 'hoy'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Financiamiento Krece */}
        <Card className="border-l-4 border-brand-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Financiamiento Krece</CardTitle>
            <CreditCard className="h-4 w-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {formatCurrency(kreceStats.totalFinancedAmountUSD || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">{periodData?.periodLabel}</p>
            {kreceStats.lastMonthFinancedAmount !== undefined && (
              <p className="text-xs text-gray-500 mt-1">
                {calculateChange(
                  kreceStats.totalFinancedAmountUSD,
                  selectedPeriod === 'today' ? kreceStats.lastMonthFinancedAmount :
                  selectedPeriod === 'yesterday' ? kreceStats.thisMonthFinancedAmount :
                  kreceStats.lastMonthFinancedAmount
                ).toFixed(1)}% vs {selectedPeriod === 'today' ? 'mes anterior' : selectedPeriod === 'yesterday' ? 'este mes' : 'mes anterior'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ingreso por Krece */}
        <Card className="border-l-4 border-brand-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Ingreso por Krece</CardTitle>
            <TrendingUp className="h-4 w-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {formatCurrency(kreceStats.totalInitialAmountUSD || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">{periodData?.periodLabel}</p>
            {kreceStats.lastMonthInitialAmount !== undefined && (
              <p className="text-xs text-gray-500 mt-1">
                {calculateChange(
                  kreceStats.totalInitialAmountUSD,
                  selectedPeriod === 'today' ? kreceStats.lastMonthInitialAmount :
                  selectedPeriod === 'yesterday' ? kreceStats.thisMonthInitialAmount :
                  kreceStats.lastMonthInitialAmount
                ).toFixed(1)}% vs {selectedPeriod === 'today' ? 'mes anterior' : selectedPeriod === 'yesterday' ? 'este mes' : 'mes anterior'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Resumen por Tienda */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-legacy-text flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Resumen por Tienda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {storeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={storeChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280" 
                    tick={{ fill: '#0D0D0D', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    tick={{ fill: '#0D0D0D', fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderColor: '#e5e7eb',
                      borderRadius: '8px',
                      color: '#000'
                    }}
                    itemStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="sales" fill="#30D96B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>No hay datos de tiendas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut Chart - Métodos de Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-legacy-text flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Métodos de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentChartData.length > 0 && totalPaymentUSD > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percentage }) => `${percentage.toFixed(0)}%`}
                    outerRadius={80}
                    innerRadius={50}
                    fill="#30D96B"
                    dataKey="value"
                  >
                    {paymentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderColor: '#e5e7eb',
                      borderRadius: '8px',
                      color: '#000'
                    }}
                    itemStyle={{ color: '#000' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>No hay datos de pagos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tablas Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Productos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-legacy-text flex items-center gap-2">
              <Package className="w-5 h-5" />
              Top Productos Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.topProducts.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.topProducts
                  .slice(0, 10)
                  .filter((product, index, self) => 
                    index === self.findIndex((p) => p.id === product.id)
                  )
                  .map((product, index) => (
                  <div
                    key={`top-product-${product.id}-${index}`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-sm font-medium text-brand-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-legacy-text text-sm">{product.name}</p>
                        <p className="text-xs text-gray-600">{product.storeName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-legacy-text text-sm">
                        {formatCurrency(product.revenueUSD)}
                      </p>
                      <p className="text-xs text-gray-600">{product.quantity} unidades</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No hay productos vendidos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Crítico */}
        {dashboardData.criticalStock.length > 0 && (
          <Card className="border-t-4 border-red-500">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Stock Crítico - {dashboardData.criticalStock.length} productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.criticalStock
                  .slice(0, 10)
                  .filter((product, index, self) => 
                    index === self.findIndex((p) => p.id === product.id)
                  )
                  .map((product, index) => (
                  <div
                    key={`critical-stock-${product.id}-${index}`}
                    className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-legacy-text text-sm">{product.name}</p>
                      <p className="text-xs text-gray-600">SKU: {product.sku} • {product.storeName}</p>
                      <p className="text-xs text-red-600 mt-1">
                        Stock: {product.currentStock} / Mín: {product.minStock}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-red-500/20 text-red-600 border border-red-500/50">
                        {product.currentStock === 0 ? 'Sin Stock' : 'Bajo Stock'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabla de Rendimiento por Sucursal (Legacy Migration) */}
      <div className="mt-8">
        <DashboardStoreTable />
      </div>
    </div>
  );
}
