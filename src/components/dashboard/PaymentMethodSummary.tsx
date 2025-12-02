import { Card } from "@/components/ui/card";
import { 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  Building2,
  TrendingUp,
  Loader2,
  PieChart
} from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentMethodSummaryData {
  method: string;
  totalUSD: number;
  totalBS: number;
  count: number;
  percentage: number;
  color: string;
}

interface PaymentMethodSummaryProps {
  period: 'today' | 'yesterday' | 'thisMonth';
}

const getMethodColor = (method: string) => {
  switch (method.toLowerCase()) {
    case 'cash_usd':
      return '#10B981'; // green-500
    case 'cash_bs':
      return '#3B82F6'; // blue-500
    case 'card_usd':
    case 'card_bs':
      return '#8B5CF6'; // purple-500
    case 'transfer_usd':
    case 'transfer_bs':
      return '#F97316'; // orange-500
    case 'zelle':
      return '#06B6D4'; // cyan-500
    case 'binance':
      return '#EAB308'; // yellow-500
    case 'krece_initial':
      return '#EF4444'; // red-500
    default:
      return '#6B7280'; // gray-500
  }
};

const getMethodLabel = (method: string) => {
  switch (method.toLowerCase()) {
    case 'cash_usd':
      return 'Efectivo USD';
    case 'cash_bs':
      return 'Efectivo BS';
    case 'card_usd':
      return 'Tarjeta USD';
    case 'card_bs':
      return 'Tarjeta BS';
    case 'transfer_usd':
      return 'Transferencia USD';
    case 'transfer_bs':
      return 'Transferencia BS';
    case 'zelle':
      return 'Zelle';
    case 'binance':
      return 'Binance';
    case 'krece_initial':
      return 'Krece Inicial';
    case 'unknown':
      return 'Método Desconocido';
    default:
      return method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ');
  }
};

export function PaymentMethodSummary({ period }: PaymentMethodSummaryProps) {
  const { company } = useAuth();
  const [data, setData] = useState<PaymentMethodSummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUSD, setTotalUSD] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);

  useEffect(() => {
    const fetchPaymentMethodData = async () => {
      if (!company) return;

      try {
        setLoading(true);
        setError(null);

        // Calcular fechas según el período
        const today = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (period) {
          case 'today':
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
            endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
            break;
          case 'thisMonth':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
            break;
          default:
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        }

        // Obtener datos de pagos
        const { data: paymentsData, error: paymentsError } = await (supabase as any)
          .from('sale_payments')
          .select(`
            payment_method,
            amount_usd,
            amount_bs,
            sales!inner(
              company_id,
              created_at
            )
          `)
          .eq('sales.company_id', company.id)
          .gte('sales.created_at', startDate.toISOString())
          .lte('sales.created_at', endDate.toISOString());

        if (paymentsError) {
          console.error('Error obteniendo datos de pagos:', paymentsError);
          throw paymentsError;
        }

        // Procesar datos por método de pago
        const methodMap = new Map<string, PaymentMethodSummaryData>();

        (paymentsData as any[]).forEach(payment => {
          const method = payment.payment_method || 'unknown';
          
          if (!methodMap.has(method)) {
            methodMap.set(method, {
              method,
              totalUSD: 0,
              totalBS: 0,
              count: 0,
              percentage: 0,
              color: getMethodColor(method)
            });
          }

          const methodData = methodMap.get(method)!;
          methodData.totalUSD += payment.amount_usd || 0;
          methodData.totalBS += payment.amount_bs || 0;
          methodData.count += 1;
        });

        // Calcular totales y porcentajes
        const totalUSD = Array.from(methodMap.values()).reduce((sum, data) => sum + data.totalUSD, 0);
        const totalTransactions = Array.from(methodMap.values()).reduce((sum, data) => sum + data.count, 0);
        
        setTotalUSD(totalUSD);
        setTotalTransactions(totalTransactions);

        const processedData = Array.from(methodMap.values())
          .map(data => ({
            ...data,
            percentage: totalUSD > 0 ? (data.totalUSD / totalUSD) * 100 : 0
          }))
          .sort((a, b) => b.totalUSD - a.totalUSD);

        setData(processedData);
      } catch (err) {
        console.error('Error fetching payment method data:', err);
        setError(err instanceof Error ? err.message : 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentMethodData();
  }, [company, period]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Resumen de Métodos de Pago</h3>
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-sm shadow-sm shadow-green-500/30">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-20"></div>
                <div className="h-6 bg-muted rounded animate-pulse w-16"></div>
                <div className="h-3 bg-muted rounded animate-pulse w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Resumen de Métodos de Pago</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p>Error al cargar datos: {error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Resumen de Métodos de Pago</h3>
        <div className="flex items-center space-x-2">
          <PieChart className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {totalTransactions} transacciones
          </span>
        </div>
      </div>
      
      {data.length > 0 ? (
        <div className="space-y-6">
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total USD */}
            <Card className="p-5">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Total USD</p>
                <div>
                  <p className="text-2xl font-bold text-green-600 leading-tight">{formatCurrency(totalUSD)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ingresos totales • {period === 'today' ? 'Hoy' : period === 'yesterday' ? 'Ayer' : 'Este Mes'}
                  </p>
                </div>
              </div>
            </Card>
            
            {/* Transacciones */}
            <Card className="p-5">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Transacciones</p>
                <div>
                  <p className="text-2xl font-bold text-blue-600 leading-tight">{totalTransactions}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total de ventas • {period === 'today' ? 'Hoy' : period === 'yesterday' ? 'Ayer' : 'Este Mes'}
                  </p>
                </div>
              </div>
            </Card>
            
            {/* Métodos */}
            <Card className="p-5">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Métodos</p>
                <div>
                  <p className="text-2xl font-bold text-orange-600 leading-tight">{data.length}</p>
                                      <p className="text-xs text-muted-foreground mt-2">
                      Formas de pago • {period === 'today' ? 'Hoy' : period === 'yesterday' ? 'Ayer' : 'Este Mes'}
                    </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Gráfico de distribución */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Distribución por Método de Pago</h4>
            <div className="space-y-3">
              {data.map((methodData) => (
                <div key={methodData.method} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: methodData.color }}
                      ></div>
                      <span className="font-medium">{getMethodLabel(methodData.method)}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(methodData.totalUSD)}</p>
                      <p className="text-sm text-muted-foreground">
                        {methodData.percentage.toFixed(1)}% • {methodData.count} trans.
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${methodData.percentage}%`,
                        backgroundColor: methodData.color
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay datos de pagos para este período</p>
        </div>
      )}
    </Card>
  );
}
