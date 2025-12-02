import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  AlertTriangle,
  Store,
  BarChart3,
  PieChart as PieChartIcon,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePaymentMethodsData } from '@/hooks/usePaymentMethodsData';
import { useKreceStats } from '@/hooks/useKreceStats';
import { useAuth } from '@/contexts/AuthContext';

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

// ==================== COMPONENT ====================
export const StoreDashboardPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const { company, userProfile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
  
  // Hooks de datos reales
  const { data: dashboardData, loading: dashboardLoading, error } = useDashboardData();
  const { data: paymentMethodsDataResponse } = usePaymentMethodsData(selectedPeriod);
  const { stats: kreceStats } = useKreceStats(selectedPeriod);
  
  const paymentData = paymentMethodsDataResponse?.data || paymentMethodsDataResponse;
  
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

  // Loading state
  if (dashboardLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-primary" />
            <p className="text-gray-600">Cargando datos del dashboard...</p>
          </div>
        </div>
      </div>
    );
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
      <div className="flex items-center justify-between">
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
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ventas */}
        <Card className="border-l-4 border-brand-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Total Facturado</CardTitle>
            <DollarSign className="h-4 w-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {formatCurrency(periodData?.sales || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">{periodData?.periodLabel}</p>
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
            <p className="text-xs text-gray-600 mt-1">Pagos reales • {periodData?.periodLabel}</p>
          </CardContent>
        </Card>

        {/* Transacciones */}
        <Card className="border-l-4 border-brand-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Transacciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">{periodData?.orders || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Total procesadas</p>
          </CardContent>
        </Card>

        {/* Productos Vendidos */}
        <Card className="border-l-4 border-brand-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Productos</CardTitle>
            <Package className="h-4 w-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {dashboardData.topProducts.length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Top productos</p>
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
                {dashboardData.topProducts.slice(0, 10).map((product, index) => (
                  <div
                    key={product.id}
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
        <Card className="border-t-4 border-red-500">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Stock Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.criticalStock.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.criticalStock.slice(0, 10).map((product) => (
                  <div
                    key={product.id}
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No hay productos con stock crítico</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoreDashboardPage;
