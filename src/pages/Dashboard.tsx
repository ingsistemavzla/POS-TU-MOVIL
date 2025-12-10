import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  Wallet,
  Clock,
  TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useKreceStats } from '@/hooks/useKreceStats';
import { usePaymentMethodsData } from '@/hooks/usePaymentMethodsData';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LiquidityDonutChart } from '@/components/charts/LiquidityDonutChart';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { DashboardStoreTable } from '@/components/dashboard/DashboardStoreTable';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/Skeleton';

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
  
  // ✅ FIX: Extraer IDs estables para evitar bucle infinito
  const userProfileId = userProfile?.id;
  const companyId = company?.id;
  
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
  }, [loading, userProfileId, companyId]); // ✅ FIX: Usar IDs estables en lugar de objetos completos

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

  // ✅ FIX: Obtener financialHealth según el período seleccionado
  const currentFinancialHealth = 
    selectedPeriod === 'today' ? dashboardData?.financialHealth?.today :
    selectedPeriod === 'yesterday' ? dashboardData?.financialHealth?.yesterday :
    dashboardData?.financialHealth?.thisMonth;

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

  // Preparar datos para gráfico de métodos de pago (incluyendo Cashea y Krece)
  const paymentChartData = [
    ...(paymentData?.methods?.map((method: any) => ({
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
    })) || []),
    // ✅ NUEVO: Agregar Cashea y Krece como segmentos separados
    ...(currentFinancialHealth?.receivables_breakdown?.cashea_usd && currentFinancialHealth.receivables_breakdown.cashea_usd > 0 ? [{
      name: 'Cashea Financiado',
      value: currentFinancialHealth.receivables_breakdown.cashea_usd,
      percentage: paymentData?.totalUSD > 0 ? (currentFinancialHealth.receivables_breakdown.cashea_usd / paymentData.totalUSD) * 100 : 0,
      color: '#6366f1' // Índigo para Cashea
    }] : []),
    ...(currentFinancialHealth?.receivables_breakdown?.krece_usd && currentFinancialHealth.receivables_breakdown.krece_usd > 0 ? [{
      name: 'Krece Financiado',
      value: currentFinancialHealth.receivables_breakdown.krece_usd,
      percentage: paymentData?.totalUSD > 0 ? (currentFinancialHealth.receivables_breakdown.krece_usd / paymentData.totalUSD) * 100 : 0,
      color: '#3b82f6' // Azul para Krece
    }] : [])
  ];

  const totalPaymentUSD = paymentData?.totalUSD || 0;

  // ✅ NUEVO: Componente Skeleton para KPIs del Dashboard
  const DashboardKPISkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-4 border-l-4 border-gray-300">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  // ✅ NUEVO: Componente Skeleton para Cards Secundarios
  const DashboardSecondarySkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ✅ NUEVO: Componente Skeleton para Gráfica
  const DashboardChartSkeleton = () => (
    <Card className="p-6">
      <CardHeader>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );

  // ✅ NUEVO: Componente Skeleton para Resumen Ejecutivo
  const DashboardSummarySkeleton = () => (
    <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-slate-200">
      <CardHeader>
        <Skeleton className="h-6 w-64 mb-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-white rounded-lg border">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-40 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Loading state con Skeleton (solo si forceShow está activo, sino LoadingScreen)
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

      {/* ✅ NUEVO: Stats Cards (Movidas desde Reports) */}
      {loading && forceShow ? (
        <DashboardKPISkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-blue-500">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Facturado</p>
                <p className="text-2xl font-bold">{formatCurrency(periodData?.sales || 0)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 border-l-4 border-green-500">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Órdenes</p>
                <p className="text-2xl font-bold">{periodData?.orders || 0}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 border-l-4 border-purple-500">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Promedio por Orden</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    periodData?.orders && periodData.orders > 0
                      ? (periodData.sales / periodData.orders)
                      : 0
                  )}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 border-l-4 border-orange-500">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Financiamiento Krece</p>
                <p className="text-2xl font-bold">{formatCurrency(kreceStats.totalFinancedAmountUSD || 0)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* KPIs Grid - Salud Financiera Real */}
      {loading && forceShow ? (
        <DashboardSecondarySkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tarjeta 1: Venta Bruta */}
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Venta Bruta</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {formatCurrency(periodData?.sales || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Volumen total transaccionado • {periodData?.periodLabel}
            </p>
            {periodData && (
              <p className="text-xs text-gray-500 mt-1">
                {calculateChange(periodData.sales, periodData.previousSales).toFixed(1)}% vs {periodData.previousPeriodLabel}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tarjeta 2: Ingreso Neto (Caja) */}
        <Card className="border-l-4 border-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Ingreso Neto (Caja)</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(currentFinancialHealth?.net_income_usd || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Disponible real • {periodData?.periodLabel}
            </p>
            <p className="text-xs text-green-600 mt-1 font-medium">
              {periodData?.sales && periodData.sales > 0 
                ? ((currentFinancialHealth?.net_income_usd || 0) / periodData.sales * 100).toFixed(1)
                : '0'}% del total
            </p>
          </CardContent>
        </Card>

        {/* Tarjeta 3: Crédito Pendiente */}
        <Card className="border-l-4 border-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Crédito Pendiente</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(currentFinancialHealth?.receivables_usd || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Cashea + Krece • {periodData?.periodLabel}
            </p>
            {currentFinancialHealth?.receivables_breakdown && (
              <p className="text-xs text-orange-600 mt-1 font-medium">
                Krece: {formatCurrency(currentFinancialHealth.receivables_breakdown.krece_usd)} • 
                Cashea: {formatCurrency(currentFinancialHealth.receivables_breakdown.cashea_usd)}
              </p>
            )}
          </CardContent>
        </Card>
        </div>
      )}

      {/* ✅ NUEVO: Termómetro de Liquidez (Gráfico de Dona) */}
      {(() => {
        const totalSales = periodData?.sales || 0;
        const netIncome = currentFinancialHealth?.net_income_usd || 0;
        const receivables = currentFinancialHealth?.receivables_usd || 0;
        const liquidityPercentage = totalSales > 0 ? (netIncome / totalSales) * 100 : 0;
        const creditPercentage = totalSales > 0 ? (receivables / totalSales) * 100 : 0;
        
        // Determinar color y estado según salud
        const getHealthConfig = () => {
          if (liquidityPercentage >= 70) {
            return { label: 'Excelente', borderColor: 'border-green-500' };
          }
          if (liquidityPercentage >= 50) {
            return { label: 'Buena', borderColor: 'border-yellow-500' };
          }
          return { label: 'Atención', borderColor: 'border-orange-500' };
        };

        const health = getHealthConfig();

        return (
          <Card className={`border-l-4 ${health.borderColor}`}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-legacy-text flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Salud de Liquidez (Cash Flow vs Deuda)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LiquidityDonutChart
                netIncomePercentage={liquidityPercentage}
                receivablesPercentage={creditPercentage}
                className="h-[200px]"
              />
            </CardContent>
          </Card>
        );
      })()}

      {/* KPIs Secundarios - Financiamiento Detallado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Financiamiento Krece */}
        <Card className="border-l-4 border-blue-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Financiamiento Krece</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {formatCurrency(kreceStats.totalFinancedAmountUSD || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">{periodData?.periodLabel}</p>
            <p className="text-xs text-blue-600 mt-1">
              {currentFinancialHealth?.sales_by_method_count?.krece || 0} transacciones
            </p>
          </CardContent>
        </Card>

        {/* Ingreso por Krece */}
        <Card className="border-l-4 border-blue-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Ingreso por Krece</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {formatCurrency(kreceStats.totalInitialAmountUSD || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">{periodData?.periodLabel}</p>
            <p className="text-xs text-blue-600 mt-1">
              Iniciales recibidas
            </p>
          </CardContent>
        </Card>

        {/* Financiamiento Cashea */}
        <Card className="border-l-4 border-indigo-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Financiamiento Cashea</CardTitle>
            <CreditCard className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {formatCurrency(currentFinancialHealth?.receivables_breakdown?.cashea_usd || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">{periodData?.periodLabel}</p>
            <p className="text-xs text-indigo-600 mt-1">
              {currentFinancialHealth?.sales_by_method_count?.cashea || 0} transacciones
            </p>
          </CardContent>
        </Card>

        {/* Ventas Contado */}
        <Card className="border-l-4 border-green-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-legacy-text">Ventas Contado</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-legacy-text">
              {currentFinancialHealth?.sales_by_method_count?.cash || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">Transacciones • {periodData?.periodLabel}</p>
            <p className="text-xs text-green-600 mt-1">
              {periodData?.orders && periodData.orders > 0
                ? ((currentFinancialHealth?.sales_by_method_count?.cash || 0) / periodData.orders * 100).toFixed(1)
                : '0'}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Row */}
      {loading && forceShow ? (
        <DashboardChartSkeleton />
      ) : (
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
              <>
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
                {/* ✅ NUEVO: Resumen de Financiamiento */}
                {currentFinancialHealth?.receivables_usd && currentFinancialHealth.receivables_usd > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Resumen de Crédito Pendiente:</p>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Total Crédito:</span>
                        <span className="font-semibold">{formatCurrency(currentFinancialHealth.receivables_usd)}</span>
                      </div>
                      {currentFinancialHealth.receivables_breakdown.krece_usd > 0 && (
                        <div className="flex justify-between">
                          <span className="text-blue-600">Krece:</span>
                          <span className="font-medium text-blue-600">
                            {formatCurrency(currentFinancialHealth.receivables_breakdown.krece_usd)} (
                            {currentFinancialHealth.receivables_usd > 0
                              ? ((currentFinancialHealth.receivables_breakdown.krece_usd / currentFinancialHealth.receivables_usd) * 100).toFixed(1)
                              : '0'}%)
                          </span>
                        </div>
                      )}
                      {currentFinancialHealth.receivables_breakdown.cashea_usd > 0 && (
                        <div className="flex justify-between">
                          <span className="text-indigo-600">Cashea:</span>
                          <span className="font-medium text-indigo-600">
                            {formatCurrency(currentFinancialHealth.receivables_breakdown.cashea_usd)} (
                            {currentFinancialHealth.receivables_usd > 0
                              ? ((currentFinancialHealth.receivables_breakdown.cashea_usd / currentFinancialHealth.receivables_usd) * 100).toFixed(1)
                              : '0'}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>No hay datos de pagos</p>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}

      {/* ✅ NUEVO: Resumen de Cierre de Caja */}
      {loading && forceShow ? (
        <DashboardSummarySkeleton />
      ) : (
        <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-legacy-text">
            <Wallet className="w-5 h-5 text-green-600" />
            Resumen Ejecutivo para Cierre - {periodData?.periodLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Columna 1: Debe haber en Caja */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Debe haber en Caja</span>
              </div>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(currentFinancialHealth?.net_income_usd || 0)}
                </div>
              <p className="text-xs text-green-600 mt-1">
                Ingreso real disponible
              </p>
            </div>

            {/* Columna 2: Crédito Otorgado */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Crédito Otorgado {periodData?.periodLabel}</span>
              </div>
              <div className="text-2xl font-bold text-orange-700">
                {formatCurrency(currentFinancialHealth?.receivables_usd || 0)}
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {currentFinancialHealth?.receivables_breakdown && (
                  <>
                    Krece: {formatCurrency(currentFinancialHealth.receivables_breakdown.krece_usd)} • 
                    Cashea: {formatCurrency(currentFinancialHealth.receivables_breakdown.cashea_usd)}
                  </>
                )}
              </p>
            </div>

            {/* Columna 3: Total Transaccionado */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Total Transaccionado</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(periodData?.sales || 0)}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Volumen total del período
              </p>
            </div>
          </div>

          {/* Resumen adicional */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ratio de Caja:</span>
              <span className="font-semibold text-green-600">
                {periodData?.sales && periodData.sales > 0
                  ? ((currentFinancialHealth?.net_income_usd || 0) / periodData.sales * 100).toFixed(1)
                  : '0'}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

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
        <DashboardStoreTable selectedPeriod={selectedPeriod} />
      </div>
    </div>
  );
}
