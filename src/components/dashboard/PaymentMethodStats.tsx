import { Card } from "@/components/ui/card";
import { 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  Building2,
  TrendingUp,
  Loader2
} from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentMethodData {
  method: string;
  totalUSD: number;
  totalBS: number;
  count: number;
  percentage: number;
}

interface PaymentMethodStatsProps {
  period: 'today' | 'yesterday' | 'thisMonth';
}

const getMethodIcon = (method: string) => {
  switch (method.toLowerCase()) {
    case 'cash_usd':
      return <DollarSign className="w-5 h-5 text-green-600" />;
    case 'cash_bs':
      return <DollarSign className="w-5 h-5 text-blue-600" />;
    case 'card_usd':
    case 'card_bs':
      return <CreditCard className="w-5 h-5 text-purple-600" />;
    case 'transfer_usd':
    case 'transfer_bs':
      return <Building2 className="w-5 h-5 text-orange-600" />;
    case 'zelle':
      return <Smartphone className="w-5 h-5 text-blue-500" />;
    case 'binance':
      return <TrendingUp className="w-5 h-5 text-yellow-600" />;
    case 'krece_initial':
      return <Building2 className="w-5 h-5 text-red-600" />;
    default:
      return <DollarSign className="w-5 h-5 text-gray-600" />;
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

const getMethodColor = (method: string) => {
  switch (method.toLowerCase()) {
    case 'cash_usd':
      return 'bg-green-100 text-green-800';
    case 'cash_bs':
      return 'bg-blue-100 text-blue-800';
    case 'card_usd':
    case 'card_bs':
      return 'bg-purple-100 text-purple-800';
    case 'transfer_usd':
    case 'transfer_bs':
      return 'bg-orange-100 text-orange-800';
    case 'zelle':
      return 'bg-blue-100 text-blue-800';
    case 'binance':
      return 'bg-yellow-100 text-yellow-800';
    case 'krece_initial':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function PaymentMethodStats({ period }: PaymentMethodStatsProps) {
  const { company } = useAuth();
  const [data, setData] = useState<PaymentMethodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUSD, setTotalUSD] = useState(0);

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

        console.log('PaymentMethodStats - Fechas:', {
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

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

        console.log('PaymentMethodStats - Datos obtenidos:', {
          totalPayments: paymentsData?.length || 0,
          samplePayments: paymentsData?.slice(0, 3) || []
        });

        // Procesar datos por método de pago
        const methodMap = new Map<string, PaymentMethodData>();

        (paymentsData as any[]).forEach(payment => {
          const method = payment.payment_method || 'unknown';
          
          if (!methodMap.has(method)) {
            methodMap.set(method, {
              method,
              totalUSD: 0,
              totalBS: 0,
              count: 0,
              percentage: 0
            });
          }

          const methodData = methodMap.get(method)!;
          methodData.totalUSD += payment.amount_usd || 0;
          methodData.totalBS += payment.amount_bs || 0;
          methodData.count += 1;
        });

        // Calcular totales y porcentajes
        const totalUSD = Array.from(methodMap.values()).reduce((sum, data) => sum + data.totalUSD, 0);
        setTotalUSD(totalUSD);

        const processedData = Array.from(methodMap.values())
          .map(data => ({
            ...data,
            percentage: totalUSD > 0 ? (data.totalUSD / totalUSD) * 100 : 0
          }))
          .sort((a, b) => b.totalUSD - a.totalUSD);

        console.log('PaymentMethodStats - Datos procesados:', {
          totalMethods: processedData.length,
          totalUSD,
          methods: processedData.map(d => ({
            method: d.method,
            totalUSD: d.totalUSD,
            count: d.count,
            percentage: d.percentage
          }))
        });

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
          <h3 className="text-lg font-semibold">Ingresos por Método de Pago</h3>
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4 p-3 rounded-lg">
              <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
                <div className="h-3 bg-muted rounded animate-pulse w-16"></div>
              </div>
              <div className="text-right space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-20"></div>
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
          <h3 className="text-lg font-semibold">Ingresos por Método de Pago</h3>
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
        <h3 className="text-lg font-semibold">Ingresos por Método de Pago</h3>
        <div className="text-sm text-muted-foreground">
          Total: {formatCurrency(totalUSD)}
        </div>
      </div>
      
      {data.length > 0 ? (
        <div className="space-y-4">
          {data.map((methodData) => (
            <div key={methodData.method} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                {getMethodIcon(methodData.method)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{getMethodLabel(methodData.method)}</p>
                <p className="text-sm text-muted-foreground">
                  {methodData.count} transacciones
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">
                  {formatCurrency(methodData.totalUSD)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {methodData.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
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


