import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface KreceStatsByStore {
  storeId: string;
  storeName: string;
  totalInitialAmountUSD: number;
  totalFinancedAmountUSD: number;
  loading: boolean;
  error: string | null;
}

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

export function useKreceStatsByStore(storeId: string, selectedPeriod: PeriodType = 'today') {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<KreceStatsByStore>({
    storeId,
    storeName: '',
    totalInitialAmountUSD: 0,
    totalFinancedAmountUSD: 0,
    loading: true,
    error: null
  });

  const fetchKreceStatsByStore = async () => {
    if (!userProfile?.company_id || !storeId) {
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));

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

      // Obtener datos de Krece por tienda
      const { data: kreceData, error: kreceError } = await (supabase as any)
        .from('sales')
        .select(`
          id,
          total_usd,
          krece_initial_amount,
          krece_financed_amount,
          stores!inner(
            id,
            name
          )
        `)
        .eq('company_id', userProfile.company_id)
        .eq('stores.id', storeId)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .not('krece_initial_amount', 'is', null);

      if (kreceError) {
        console.error('Error obteniendo datos de Krece por tienda:', kreceError);
        throw kreceError;
      }

      // Calcular totales
      const totalInitialAmountUSD = (kreceData as any[]).reduce((sum, sale) => sum + (sale.krece_initial_amount || 0), 0);
      const totalFinancedAmountUSD = (kreceData as any[]).reduce((sum, sale) => sum + (sale.krece_financed_amount || 0), 0);
      const storeName = (kreceData as any[])[0]?.stores?.name || '';

      setStats({
        storeId,
        storeName,
        totalInitialAmountUSD,
        totalFinancedAmountUSD,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching Krece stats by store:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error al cargar datos de Krece por tienda'
      }));
    }
  };

  useEffect(() => {
    fetchKreceStatsByStore();
  }, [userProfile?.company_id, storeId, selectedPeriod]);

  return {
    stats,
    fetchKreceStatsByStore
  };
}
