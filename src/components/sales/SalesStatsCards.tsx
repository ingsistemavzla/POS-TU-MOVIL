import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt,
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  Package,
  BarChart3
} from "lucide-react";
import { formatCurrency } from "@/utils/currency";

interface SalesStatsCardsProps {
  totalSales: number;
  totalAmount: number;
  averageAmount: number;
  currentPage: number;
  totalPages: number;
  paymentMethodStats?: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  periodStats?: {
    period: string;
    growth: number;
    previousAmount: number;
  };
}

export function SalesStatsCards({
  totalSales,
  totalAmount,
  averageAmount,
  currentPage,
  totalPages,
  paymentMethodStats = [],
  periodStats
}: SalesStatsCardsProps) {

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash_usd':
      case 'cash_bs':
        return <DollarSign className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash_usd': return 'Efectivo USD';
      case 'cash_bs': return 'Efectivo BS';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      case 'binance': return 'Binance';
      case 'zelle': return 'Zelle';
      default: return method;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Sales */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Ventas</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSales.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            ventas registradas
          </p>
          {periodStats && (
            <div className="flex items-center mt-1">
              {periodStats.growth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingUp className="h-3 w-3 text-red-600 mr-1 transform rotate-180" />
              )}
              <span className={`text-xs ${periodStats.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(periodStats.growth).toFixed(1)}% vs {periodStats.period}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          <p className="text-xs text-muted-foreground">
            en ventas totales
          </p>
          {periodStats && periodStats.previousAmount > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              vs {formatCurrency(periodStats.previousAmount)} anterior
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(averageAmount)}</div>
          <p className="text-xs text-muted-foreground">
            ticket promedio
          </p>
          {totalSales > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              basado en {totalSales} ventas
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paginación</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentPage} / {totalPages}</div>
          <p className="text-xs text-muted-foreground">
            página actual
          </p>
          <div className="text-xs text-muted-foreground mt-1">
            {totalPages} páginas totales
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Stats */}
      {paymentMethodStats.length > 0 && (
        <>
          {paymentMethodStats.slice(0, 4).map((stat, index) => (
            <Card key={stat.method}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getPaymentMethodName(stat.method)}
                </CardTitle>
                {getPaymentMethodIcon(stat.method)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stat.amount)}</div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {stat.count} ventas
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {stat.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

