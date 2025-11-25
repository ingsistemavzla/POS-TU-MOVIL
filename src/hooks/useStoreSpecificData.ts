import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface StoreSpecificData {
  storeId: string;
  paymentData: {
    totalUSD: number;
    totalBS: number;
    totalTransactions: number;
  };
  kreceData: {
    totalInitialAmountUSD: number;
    totalFinancedAmountUSD: number;
  };
  loading: boolean;
  error: string | null;
}

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

export function useStoreSpecificData(storeId: string, selectedPeriod: PeriodType = 'today') {
  const { userProfile } = useAuth();
  const [data, setData] = useState<StoreSpecificData>({
    storeId,
    paymentData: {
      totalUSD: 0,
      totalBS: 0,
      totalTransactions: 0
    },
    kreceData: {
      totalInitialAmountUSD: 0,
      totalFinancedAmountUSD: 0
    },
    loading: true,
    error: null
  });

  const fetchStoreSpecificData = async () => {
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
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
          break;
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      }

      // Obtener datos de ventas específicos de la tienda (incluyendo Krece)
      const { data: salesData, error: salesError } = await (supabase as any)
        .from('sales')
        .select(`
          id,
          total_usd,
          total_bs,
          krece_enabled,
          krece_initial_amount_usd,
          krece_financed_amount_usd,
          created_at
        `)
        .eq('company_id', userProfile.company_id)
        .eq('store_id', storeId)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());

      if (salesError) {
        console.error('Error obteniendo datos de ventas de la tienda:', salesError);
        throw salesError;
      }

      // Obtener datos de pagos específicos de la tienda
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
        .lt('sales.created_at', endDate.toISOString());

      if (paymentsError) {
        console.error('Error obteniendo datos de pagos de la tienda:', paymentsError);
        // No lanzar error, continuar con los datos de ventas
      }

      // Calcular totales específicos de la tienda
      const totalUSD = (paymentsData as any[] || []).reduce((sum, payment) => sum + (payment.amount_usd || 0), 0);
      const totalBS = (paymentsData as any[] || []).reduce((sum, payment) => sum + (payment.amount_bs || 0), 0);
      const totalTransactions = (paymentsData as any[] || []).length;

      // Calcular totales de Krece desde la tabla sales
      const kreceSales = (salesData as any[] || []).filter(sale => sale.krece_enabled === true);
      
      const totalKreceInitialUSD = kreceSales.reduce((sum, sale) => sum + (sale.krece_initial_amount_usd || 0), 0);
      const totalKreceFinancedUSD = kreceSales.reduce((sum, sale) => sum + (sale.krece_financed_amount_usd || 0), 0);

      console.log(`Tienda ${storeId} - Datos obtenidos:`, {
        salesData: salesData?.length || 0,
        paymentsData: paymentsData?.length || 0,
        kreceSales: kreceSales.length,
        totalUSD,
        totalKreceInitialUSD,
        totalKreceFinancedUSD,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      setData({
        storeId,
        paymentData: {
          totalUSD,
          totalBS,
          totalTransactions
        },
        kreceData: {
          totalInitialAmountUSD: totalKreceInitialUSD,
          totalFinancedAmountUSD: totalKreceFinancedUSD
        },
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching store specific data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error al cargar datos específicos de la tienda'
      }));
    }
  };

  useEffect(() => {
    fetchStoreSpecificData();
  }, [userProfile?.company_id, storeId, selectedPeriod]);

  return {
    ...data,
    fetchStoreSpecificData
  };
}
