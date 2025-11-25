import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface StoreData {
  storeId: string;
  storeName: string;
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
  paymentData: {
    totalUSD: number;
    totalBS: number;
    totalTransactions: number;
  };
  kreceData: {
    totalInitialAmountUSD: number;
    totalFinancedAmountUSD: number;
  };
}

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

export function useAllStoresData(storeIds: string[], selectedPeriod: PeriodType = 'today') {
  const { userProfile } = useAuth();
  const [data, setData] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllStoresData = async () => {
    if (!userProfile?.company_id || storeIds.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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

      const storesData: StoreData[] = [];

      // Obtener datos para cada tienda
      for (const storeId of storeIds) {
        // Obtener datos de ventas de la tienda
        const { data: salesData, error: salesError } = await (supabase as any)
          .from('sales')
          .select(`
            id,
            total_usd,
            krece_initial_amount,
            krece_financed_amount,
            created_at
          `)
          .eq('company_id', userProfile.company_id)
          .eq('store_id', storeId)
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString());

        if (salesError) {
          console.error('Error obteniendo datos de ventas:', salesError);
          continue;
        }

        // Obtener datos de pagos de la tienda
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
          console.error('Error obteniendo datos de pagos:', paymentsError);
          continue;
        }

        // Obtener nombre de la tienda
        const { data: storeInfo } = await (supabase as any)
          .from('stores')
          .select('name')
          .eq('id', storeId)
          .single();

        // Calcular totales
        const totalSales = (salesData as any[]).reduce((sum, sale) => sum + (sale.total_usd || 0), 0);
        const totalOrders = (salesData as any[]).length;
        const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

        const totalUSD = (paymentsData as any[]).reduce((sum, payment) => sum + (payment.amount_usd || 0), 0);
        const totalBS = (paymentsData as any[]).reduce((sum, payment) => sum + (payment.amount_bs || 0), 0);
        const totalTransactions = (paymentsData as any[]).length;

        const totalInitialAmountUSD = (salesData as any[]).reduce((sum, sale) => sum + (sale.krece_initial_amount || 0), 0);
        const totalFinancedAmountUSD = (salesData as any[]).reduce((sum, sale) => sum + (sale.krece_financed_amount || 0), 0);

        storesData.push({
          storeId,
          storeName: storeInfo?.name || '',
          totalSales,
          totalOrders,
          averageOrder,
          paymentData: {
            totalUSD,
            totalBS,
            totalTransactions
          },
          kreceData: {
            totalInitialAmountUSD,
            totalFinancedAmountUSD
          }
        });
      }

      setData(storesData);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching all stores data:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar datos de tiendas');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStoresData();
  }, [userProfile?.company_id, storeIds.join(','), selectedPeriod]);

  return {
    data,
    loading,
    error,
    fetchAllStoresData
  };
}
