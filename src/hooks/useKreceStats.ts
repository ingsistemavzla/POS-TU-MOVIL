import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface KreceStats {
  // Estadísticas generales
  totalKreceSales: number;
  
  // LO QUE REALMENTE INGRESÓ A LA TIENDA (Iniciales)
  totalInitialAmountUSD: number;  // Montos iniciales que ingresaron
  totalInitialAmountBS: number;   // Montos iniciales en bolívares
  
  // CUENTAS POR COBRAR DE KRECE (Monto financiado)
  totalFinancedAmountUSD: number; // Lo que Krece debe pagar
  totalFinancedAmountBS: number;  // Lo que Krece debe pagar en BS
  
  // Cuentas por cobrar
  totalPendingUSD: number;
  totalPendingBS: number;
  totalPaidUSD: number;
  totalPaidBS: number;
  totalOverdueUSD: number;
  totalOverdueBS: number;
  
  // Conteos
  countPending: number;
  countPaid: number;
  countOverdue: number;
  countActiveFinancing: number;
  
  // Estadísticas por período
  thisMonthKreceSales: number;
  thisMonthInitialAmount: number;  // Iniciales de este mes
  thisMonthFinancedAmount: number; // Financiado de este mes
  lastMonthKreceSales: number;
  lastMonthInitialAmount: number;  // Iniciales del mes pasado
  lastMonthFinancedAmount: number; // Financiado del mes pasado
  
  // Promedios
  averageInitialAmount: number;    // Promedio de iniciales
  averageFinancedAmount: number;   // Promedio de financiado
  averageInitialPercentage: number;
  
  loading: boolean;
  error: string | null;
}

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

export function useKreceStats(selectedPeriod: PeriodType = 'today') {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<KreceStats>({
    totalKreceSales: 0,
    totalInitialAmountUSD: 0,
    totalInitialAmountBS: 0,
    totalFinancedAmountUSD: 0,
    totalFinancedAmountBS: 0,
    totalPendingUSD: 0,
    totalPendingBS: 0,
    totalPaidUSD: 0,
    totalPaidBS: 0,
    totalOverdueUSD: 0,
    totalOverdueBS: 0,
    countPending: 0,
    countPaid: 0,
    countOverdue: 0,
    countActiveFinancing: 0,
    thisMonthKreceSales: 0,
    thisMonthInitialAmount: 0,
    thisMonthFinancedAmount: 0,
    lastMonthKreceSales: 0,
    lastMonthInitialAmount: 0,
    lastMonthFinancedAmount: 0,
    averageInitialAmount: 0,
    averageFinancedAmount: 0,
    averageInitialPercentage: 0,
    loading: true,
    error: null
  });

  const fetchKreceStats = async () => {
    if (!userProfile?.company_id) {
      console.log('No company_id available');
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      console.log('Fetching Krece stats for company:', userProfile.company_id, 'period:', selectedPeriod);
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
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      }

      console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());

      // 1. Obtener estadísticas de ventas con Krece para el período seleccionado
      console.log('Fetching sales with Krece for period...');
      const { data: salesStats, error: salesError } = await (supabase as any)
        .from('sales')
        .select('id, total_usd, krece_initial_amount_usd, krece_financed_amount_usd, created_at')
        .eq('company_id', userProfile.company_id)
        .eq('krece_enabled', true)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .limit(50);

      if (salesError) {
        console.error('Error fetching Krece sales:', salesError);
        throw new Error(`Error fetching sales: ${salesError.message}`);
      }

      console.log('Sales with Krece found for period:', salesStats?.length || 0);

      // 2. Intentar obtener resumen de cuentas por cobrar
      console.log('Fetching Krece accounts summary...');
      let accountsSummary = null;
      try {
        const { data: summaryData, error: accountsError } = await (supabase as any)
          .rpc('get_krece_accounts_summary', {
            p_company_id: userProfile.company_id
          });

        if (accountsError) {
          console.warn('Warning: Could not fetch accounts summary:', accountsError);
        } else {
          accountsSummary = summaryData;
          console.log('Accounts summary:', accountsSummary);
        }
      } catch (summaryError) {
        console.warn('Warning: Accounts summary function not available:', summaryError);
      }

      // 3. Obtener estadísticas de financiamientos activos
      console.log('Fetching Krece financing...');
      let financingStats = null;
      try {
        const { data: financingData, error: financingError } = await (supabase as any)
          .from('krece_financing')
          .select('id, total_amount_usd, initial_amount_usd, financed_amount_usd, status')
          .eq('status', 'active')
          .limit(50);

        if (financingError) {
          console.warn('Warning: Could not fetch Krece financing:', financingError);
        } else {
          financingStats = financingData;
          console.log('Active financing found:', financingStats?.length || 0);
        }
      } catch (financingError) {
        console.warn('Warning: Krece financing table not available:', financingError);
      }

      // 4. Calcular estadísticas por período (para comparación)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const thisMonthSales = salesStats?.filter((sale: any) => 
        new Date(sale.created_at) >= thisMonth
      ) || [];

      const lastMonthSales = salesStats?.filter((sale: any) => 
        new Date(sale.created_at) >= lastMonth && 
        new Date(sale.created_at) < thisMonth
      ) || [];

      // 5. CALCULAR CORRECTAMENTE LOS MONTOS PARA EL PERÍODO SELECCIONADO:
      
      // LO QUE REALMENTE INGRESÓ A LA TIENDA (Iniciales) - PARA EL PERÍODO SELECCIONADO
      const totalInitialAmountUSD = salesStats?.reduce((sum: number, sale: any) => 
        sum + (sale.krece_initial_amount_usd || 0), 0
      ) || 0;

      const totalInitialAmountBS = salesStats?.reduce((sum: number, sale: any) => 
        sum + ((sale.krece_initial_amount_usd || 0) * (sale.bcv_rate_used || 1)), 0
      ) || 0;

      // CUENTAS POR COBRAR DE KRECE (Monto financiado) - PARA EL PERÍODO SELECCIONADO
      const totalFinancedAmountUSD = salesStats?.reduce((sum: number, sale: any) => 
        sum + (sale.krece_financed_amount_usd || 0), 0
      ) || 0;

      const totalFinancedAmountBS = salesStats?.reduce((sum: number, sale: any) => 
        sum + ((sale.krece_financed_amount_usd || 0) * (sale.bcv_rate_used || 1)), 0
      ) || 0;

      // 6. Calcular promedios para el período seleccionado
      const averageInitialAmount = salesStats?.length > 0 
        ? totalInitialAmountUSD / salesStats.length 
        : 0;

      const averageFinancedAmount = salesStats?.length > 0 
        ? totalFinancedAmountUSD / salesStats.length 
        : 0;

      const averageInitialPercentage = salesStats?.length > 0
        ? salesStats.reduce((sum: number, sale: any) => sum + (sale.krece_initial_percentage || 0), 0) / salesStats.length
        : 0;

      // 7. Calcular montos por período (para comparación)
      const thisMonthInitialAmount = thisMonthSales.reduce((sum: number, sale: any) => 
        sum + (sale.krece_initial_amount_usd || 0), 0
      );

      const thisMonthFinancedAmount = thisMonthSales.reduce((sum: number, sale: any) => 
        sum + (sale.krece_financed_amount_usd || 0), 0
      );

      const lastMonthInitialAmount = lastMonthSales.reduce((sum: number, sale: any) => 
        sum + (sale.krece_initial_amount_usd || 0), 0
      );

      const lastMonthFinancedAmount = lastMonthSales.reduce((sum: number, sale: any) => 
        sum + (sale.krece_financed_amount_usd || 0), 0
      );

      // 8. Actualizar estado
      const newStats = {
        totalKreceSales: salesStats?.length || 0,
        
        // LO QUE INGRESÓ A LA TIENDA - PARA EL PERÍODO SELECCIONADO
        totalInitialAmountUSD,
        totalInitialAmountBS,
        
        // CUENTAS POR COBRAR DE KRECE - PARA EL PERÍODO SELECCIONADO
        totalFinancedAmountUSD,
        totalFinancedAmountBS,
        
        totalPendingUSD: accountsSummary?.[0]?.total_pending_usd || 0,
        totalPendingBS: accountsSummary?.[0]?.total_pending_bs || 0,
        totalPaidUSD: accountsSummary?.[0]?.total_paid_usd || 0,
        totalPaidBS: accountsSummary?.[0]?.total_paid_bs || 0,
        totalOverdueUSD: accountsSummary?.[0]?.total_overdue_usd || 0,
        totalOverdueBS: accountsSummary?.[0]?.total_overdue_bs || 0,
        countPending: accountsSummary?.[0]?.count_pending || 0,
        countPaid: accountsSummary?.[0]?.count_paid || 0,
        countOverdue: accountsSummary?.[0]?.count_overdue || 0,
        countActiveFinancing: financingStats?.length || 0,
        
        // Estadísticas por período (para comparación)
        thisMonthKreceSales: thisMonthSales.length,
        thisMonthInitialAmount,
        thisMonthFinancedAmount,
        lastMonthKreceSales: lastMonthSales.length,
        lastMonthInitialAmount,
        lastMonthFinancedAmount,
        
        // Promedios para el período seleccionado
        averageInitialAmount,
        averageFinancedAmount,
        averageInitialPercentage,
        
        loading: false,
        error: null
      };

      console.log('Final Krece stats for period:', selectedPeriod, newStats);
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching Krece stats:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error al cargar estadísticas de Krece'
      }));
    }
  };

  useEffect(() => {
    fetchKreceStats();
  }, [userProfile?.company_id, selectedPeriod]);

  return {
    stats,
    fetchKreceStats
  };
}
