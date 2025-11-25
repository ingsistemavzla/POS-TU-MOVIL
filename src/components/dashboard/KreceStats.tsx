import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Receipt
} from "lucide-react";
import { useKreceStats } from "@/hooks/useKreceStats";
import { formatCurrency } from "@/utils/currency";

export function KreceStats() {
  const { stats, fetchKreceStats } = useKreceStats();

  if (stats.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardTitle>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (stats.error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error al cargar estadísticas de Krece
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{stats.error}</p>
        </CardContent>
      </Card>
    );
  }

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    if (change < 0) return <ArrowDownRight className="w-4 h-4 text-red-600" />;
    return <TrendingUp className="w-4 h-4 text-gray-600" />;
  };

  // Cambios para este mes vs mes anterior
  const initialAmountChange = calculateChange(stats.thisMonthInitialAmount, stats.lastMonthInitialAmount);
  const financedAmountChange = calculateChange(stats.thisMonthFinancedAmount, stats.lastMonthFinancedAmount);

  return (
    <div className="space-y-6">
      {/* Título de la sección */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financiamiento Krece</h2>
          <p className="text-muted-foreground">
            Estadísticas de ventas financiadas por Krece y cuentas por cobrar
          </p>
        </div>
      </div>

      {/* Tarjetas principales - LO QUE INGRESÓ A LA TIENDA vs CUENTAS POR COBRAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* LO QUE REALMENTE INGRESÓ A LA TIENDA (Iniciales) */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Ingresos Reales</CardTitle>
            <PiggyBank className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(stats.totalInitialAmountUSD, 'USD')}
            </div>
            <p className="text-xs text-green-600">
              {formatCurrency(stats.totalInitialAmountBS, 'VES')}
            </p>
            <div className="flex items-center text-xs text-green-600 mt-1">
              {getChangeIcon(initialAmountChange)}
              <span className={initialAmountChange > 0 ? 'text-green-700' : initialAmountChange < 0 ? 'text-red-600' : 'text-gray-600'}>
                {Math.abs(initialAmountChange).toFixed(1)}% vs mes anterior
              </span>
            </div>
            <p className="text-xs text-green-600 mt-1 font-medium">
              💰 Dinero que realmente ingresó a la tienda
            </p>
          </CardContent>
        </Card>

        {/* CUENTAS POR COBRAR DE KRECE (Monto financiado) */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Por Cobrar a Krece</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {formatCurrency(stats.totalFinancedAmountUSD, 'USD')}
            </div>
            <p className="text-xs text-orange-600">
              {formatCurrency(stats.totalFinancedAmountBS, 'VES')}
            </p>
            <div className="flex items-center text-xs text-orange-600 mt-1">
              {getChangeIcon(financedAmountChange)}
              <span className={financedAmountChange > 0 ? 'text-orange-700' : financedAmountChange < 0 ? 'text-red-600' : 'text-gray-600'}>
                {Math.abs(financedAmountChange).toFixed(1)}% vs mes anterior
              </span>
            </div>
            <p className="text-xs text-orange-600 mt-1 font-medium">
              📋 Lo que Krece debe pagar a la tienda
            </p>
          </CardContent>
        </Card>

        {/* Ventas con Krece */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas con Krece</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKreceSales}</div>
            <p className="text-xs text-muted-foreground">
              {stats.thisMonthKreceSales} este mes
            </p>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span className="text-blue-600">
                Promedio inicial: {formatCurrency(stats.averageInitialAmount, 'USD')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cuentas por cobrar pendientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.totalPendingUSD, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalPendingBS, 'VES')}
            </p>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                {stats.countPending} cuentas pendientes
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tarjetas secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cuentas pagadas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalPaidUSD, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalPaidBS, 'VES')}
            </p>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="text-green-600 border-green-200">
                {stats.countPaid} cuentas pagadas
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Financiamientos activos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financiamientos Activos</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.countActiveFinancing}
            </div>
            <p className="text-xs text-muted-foreground">
              En proceso de pago
            </p>
          </CardContent>
        </Card>

        {/* Porcentaje promedio de inicial */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inicial Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.averageInitialPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Del total de ventas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen mensual - SEPARADO POR INGRESOS vs CUENTAS POR COBRAR */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Mensual</CardTitle>
          <CardDescription>
            Comparación de ingresos reales vs cuentas por cobrar entre este mes y el anterior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* INGRESOS REALES (Iniciales) */}
            <div className="space-y-3 p-4 border border-green-200 rounded-lg bg-green-50">
              <h4 className="font-medium text-green-800 flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Ingresos Reales a la Tienda
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-green-600">Este Mes:</span>
                  <div className="text-xl font-bold text-green-700">
                    {formatCurrency(stats.thisMonthInitialAmount, 'USD')}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-green-600">Mes Anterior:</span>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(stats.lastMonthInitialAmount, 'USD')}
                  </div>
                </div>
                <p className="text-xs text-green-600">
                  💰 Dinero que realmente ingresó a la tienda
                </p>
              </div>
            </div>

            {/* CUENTAS POR COBRAR (Monto financiado) */}
            <div className="space-y-3 p-4 border border-orange-200 rounded-lg bg-orange-50">
              <h4 className="font-medium text-orange-800 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Cuentas por Cobrar a Krece
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-orange-600">Este Mes:</span>
                  <div className="text-xl font-bold text-orange-700">
                    {formatCurrency(stats.thisMonthFinancedAmount, 'USD')}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-orange-600">Mes Anterior:</span>
                  <div className="text-lg font-semibold text-orange-600">
                    {formatCurrency(stats.lastMonthFinancedAmount, 'USD')}
                  </div>
                </div>
                <p className="text-xs text-orange-600">
                  📋 Lo que Krece debe pagar a la tienda
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
