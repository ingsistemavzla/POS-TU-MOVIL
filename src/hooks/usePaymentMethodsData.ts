import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PaymentMethodsData {
  totalUSD: number;
  totalBS: number;
  totalTransactions: number;
  methods: Array<{
    method: string;
    totalUSD: number;
    totalBS: number;
    count: number;
    percentage: number;
  }>;
  loading: boolean;
  error: string | null;
}

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

export function usePaymentMethodsData(selectedPeriod: PeriodType = 'today') {
  const { userProfile } = useAuth();
  const [data, setData] = useState<PaymentMethodsData>({
    totalUSD: 0,
    totalBS: 0,
    totalTransactions: 0,
    methods: [],
    loading: true,
    error: null
  });

  const fetchPaymentMethodsData = async () => {
    if (!userProfile?.company_id) {
      console.log('usePaymentMethodsData: No company_id, returning empty data');
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    // Timeout de seguridad (10 segundos)
    const timeoutId = setTimeout(() => {
      console.warn('usePaymentMethodsData: Timeout alcanzado, devolviendo datos vacíos');
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Timeout al obtener datos de pagos'
      }));
    }, 10000);

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Calcular fechas según el período seleccionado
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (selectedPeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      }

      // Obtener datos de pagos con manejo de errores mejorado
      let paymentsData: any[] = [];
      let paymentsError: any = null;
      
      try {
        const result = await (supabase as any)
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
          .eq('sales.company_id', userProfile.company_id)
          .gte('sales.created_at', startDate.toISOString())
          .lte('sales.created_at', endDate.toISOString());
        
        paymentsData = result.data || [];
        paymentsError = result.error;
      } catch (err) {
        console.error('Error en query de sale_payments:', err);
        paymentsError = err;
      }

      if (paymentsError) {
        console.error('Error obteniendo datos de pagos:', paymentsError);
        // No lanzar error, devolver datos vacíos
        clearTimeout(timeoutId);
        setData(prev => ({
          ...prev,
          loading: false,
          error: paymentsError?.message || 'Error al obtener datos de pagos'
        }));
        return;
      }

      // Procesar datos por método de pago
      const methodMap = new Map<string, { totalUSD: number; totalBS: number; count: number }>();

      (paymentsData as any[]).forEach(payment => {
        const method = payment.payment_method || 'unknown';
        
        if (!methodMap.has(method)) {
          methodMap.set(method, {
            totalUSD: 0,
            totalBS: 0,
            count: 0
          });
        }

        const methodData = methodMap.get(method)!;
        methodData.totalUSD += payment.amount_usd || 0;
        methodData.totalBS += payment.amount_bs || 0;
        methodData.count += 1;
      });

      // Calcular totales
      const totalUSD = Array.from(methodMap.values()).reduce((sum, data) => sum + data.totalUSD, 0);
      const totalBS = Array.from(methodMap.values()).reduce((sum, data) => sum + data.totalBS, 0);
      const totalTransactions = Array.from(methodMap.values()).reduce((sum, data) => sum + data.count, 0);

      // Procesar métodos con porcentajes
      const methods = Array.from(methodMap.entries())
        .map(([method, data]) => ({
          method,
          totalUSD: data.totalUSD,
          totalBS: data.totalBS,
          count: data.count,
          percentage: totalUSD > 0 ? (data.totalUSD / totalUSD) * 100 : 0
        }))
        .sort((a, b) => b.totalUSD - a.totalUSD);

      setData({
        totalUSD,
        totalBS,
        totalTransactions,
        methods,
        loading: false,
        error: null
      });
      
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error fetching payment methods data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error al cargar datos de métodos de pago'
      }));
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    fetchPaymentMethodsData();
  }, [userProfile?.company_id, selectedPeriod]);

  return {
    data,
    fetchPaymentMethodsData
  };
}
