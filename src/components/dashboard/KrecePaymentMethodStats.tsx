import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Loader2,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/currency";

interface PaymentMethodStat {
  payment_method: string;
  total_initial_amount_usd: number;
  total_initial_amount_bs: number;
  count_sales: number;
}

export function KrecePaymentMethodStats() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<PaymentMethodStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethodStats = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await (supabase as any)
        .rpc('get_krece_payment_method_stats', {
          p_company_id: userProfile.company_id
        });

      if (error) {
        console.error('Error fetching payment method stats:', error);
        throw error;
      }

      setStats(data || []);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar estadísticas de métodos de pago');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethodStats();
  }, [userProfile?.company_id]);

  const getPaymentMethodIcon = (method: string) => {
    const lowerMethod = method.toLowerCase();
    if (lowerMethod.includes('efectivo') || lowerMethod.includes('cash')) {
      return <DollarSign className="w-4 h-4" />;
    }
    if (lowerMethod.includes('tarjeta') || lowerMethod.includes('card')) {
      return <CreditCard className="w-4 h-4" />;
    }
    if (lowerMethod.includes('transferencia') || lowerMethod.includes('transfer')) {
      return <TrendingUp className="w-4 h-4" />;
    }
    return <BarChart3 className="w-4 h-4" />;
  };

  const getPaymentMethodColor = (method: string) => {
    const lowerMethod = method.toLowerCase();
    if (lowerMethod.includes('efectivo') || lowerMethod.includes('cash')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (lowerMethod.includes('tarjeta') || lowerMethod.includes('card')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (lowerMethod.includes('transferencia') || lowerMethod.includes('transfer')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Métodos de Pago Krece
          </CardTitle>
          <CardDescription>
            Estadísticas de métodos de pago para iniciales de Krece
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando estadísticas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Error al cargar estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Métodos de Pago Krece
          </CardTitle>
          <CardDescription>
            Estadísticas de métodos de pago para iniciales de Krece
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos de métodos de pago de Krece</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Métodos de Pago Krece
        </CardTitle>
        <CardDescription>
          Estadísticas de métodos de pago para iniciales de Krece
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-sm shadow-sm shadow-green-500/30">
              <div className="flex items-center gap-3">
                {getPaymentMethodIcon(stat.payment_method)}
                <div>
                  <div className="font-medium">{stat.payment_method}</div>
                  <div className="text-sm text-muted-foreground">
                    {stat.count_sales} venta{stat.count_sales !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {formatCurrency(stat.total_initial_amount_usd, 'USD')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(stat.total_initial_amount_bs, 'BS')}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Iniciales:</span>
            <div className="text-right">
              <div className="font-semibold">
                {formatCurrency(
                  stats.reduce((sum, stat) => sum + stat.total_initial_amount_usd, 0), 
                  'USD'
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(
                  stats.reduce((sum, stat) => sum + stat.total_initial_amount_bs, 0), 
                  'BS'
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



