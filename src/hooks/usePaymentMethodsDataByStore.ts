import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PaymentMethodsDataByStore {
  storeId: string;
  storeName: string;
  totalUSD: number;
  totalBS: number;
  totalTransactions: number;
  loading: boolean;
  error: string | null;
}

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

export function usePaymentMethodsDataByStore(storeId: string, selectedPeriod: PeriodType = 'today') {
  const { userProfile } = useAuth();
  const [data, setData] = useState<PaymentMethodsDataByStore>({
    storeId,
    storeName: '',
    totalUSD: 0,
    totalBS: 0,
    totalTransactions: 0,
    loading: true,
    error: null
  });

  const fetchPaymentMethodsDataByStore = async () => {
    if (!userProfile?.company_id || !storeId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

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

      // Obtener datos de pagos por tienda
      const { data: paymentsData, error: paymentsError } = await (supabase as any)
        .from('sale_payments')
        .select(`
          payment_method,
          amount_usd,
          amount_bs,
          sales!inner(
            company_id,
            store_id,
            created_at
          )
        `)
        .eq('sales.company_id', userProfile.company_id)
        .eq('sales.store_id', storeId)
        .gte('sales.created_at', startDate.toISOString())
        .lte('sales.created_at', endDate.toISOString());

      if (paymentsError) {
        console.error('Error obteniendo datos de pagos por tienda:', paymentsError);
        throw paymentsError;
      }

      // Calcular totales
      const totalUSD = (paymentsData as any[]).reduce((sum, payment) => sum + (payment.amount_usd || 0), 0);
      const totalBS = (paymentsData as any[]).reduce((sum, payment) => sum + (payment.amount_bs || 0), 0);
      const totalTransactions = (paymentsData as any[]).length;

      // Obtener nombre de la tienda
      const { data: storeData } = await (supabase as any)
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single();

      setData({
        storeId,
        storeName: storeData?.name || '',
        totalUSD,
        totalBS,
        totalTransactions,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching payment methods data by store:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error al cargar datos de métodos de pago por tienda'
      }));
    }
  };

  useEffect(() => {
    fetchPaymentMethodsDataByStore();
  }, [userProfile?.company_id, storeId, selectedPeriod]);

  return {
    data,
    fetchPaymentMethodsDataByStore
  };
}
