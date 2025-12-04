import { useQuery } from '@tanstack/react-query';
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
}

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

// Función para calcular fechas según el período
const getDateRange = (period: PeriodType) => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
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

  return { startDate, endDate };
};

// Función de fetch con toda la lógica (mantiene fallback intacto)
const fetchKreceStatsData = async (companyId: string, selectedPeriod: PeriodType): Promise<KreceStats> => {
  console.log('Fetching Krece stats for company:', companyId, 'period:', selectedPeriod);

  const { startDate, endDate } = getDateRange(selectedPeriod);
  console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());

  // ✅ OPTIMIZACIÓN: Ejecutar todas las consultas independientes en paralelo
  console.log('Fetching Krece stats for period...');
  
  const [
    salesResult,
    accountsSummaryResult,
    financingStatsResult
  ] = await Promise.all([
    // 1. Estadísticas de ventas con Krece para el período seleccionado
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('sales')
          .select('id, total_usd, krece_initial_amount_usd, krece_financed_amount_usd, created_at, bcv_rate_used, krece_initial_percentage')
          .eq('company_id', companyId)
          .eq('krece_enabled', true)
          .eq('status', 'completed')  // ✅ FIX: Only fetch completed sales
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString())
          .limit(50);

        if (error) {
          console.error('Error fetching Krece sales:', error);
          throw new Error(`Error fetching sales: ${error.message}`);
        }

        console.log('Sales with Krece found for period:', data?.length || 0);
        return data;
      } catch (err) {
        throw err;
      }
    })(),
    // 2. Resumen de cuentas por cobrar (con fallback a consulta directa)
    (async () => {
      try {
        // Intentar RPC primero
        const { data: summaryData, error: accountsError } = await (supabase as any)
          .rpc('get_krece_accounts_summary', {
            p_company_id: companyId
          });

        if (!accountsError && summaryData) {
          console.log('Accounts summary (RPC):', summaryData);
          return summaryData;
        }

        // Fallback: Consulta directa a la tabla
        console.warn('RPC get_krece_accounts_summary not available, using direct query fallback');
        const { data: accountsData, error: directError } = await (supabase as any)
          .from('krece_accounts_receivable')
          .select('status, amount_usd, amount_bs')
          .eq('company_id', companyId);

        if (directError) {
          console.warn('Warning: Could not fetch accounts receivable:', directError);
          return null;
        }

        // Calcular resumen manualmente
        const summary = {
          total_pending_usd: accountsData?.filter((a: any) => a.status === 'pending')
            .reduce((sum: number, a: any) => sum + (Number(a.amount_usd) || 0), 0) || 0,
          total_pending_bs: accountsData?.filter((a: any) => a.status === 'pending')
            .reduce((sum: number, a: any) => sum + (Number(a.amount_bs) || 0), 0) || 0,
          total_paid_usd: accountsData?.filter((a: any) => a.status === 'paid')
            .reduce((sum: number, a: any) => sum + (Number(a.amount_usd) || 0), 0) || 0,
          total_paid_bs: accountsData?.filter((a: any) => a.status === 'paid')
            .reduce((sum: number, a: any) => sum + (Number(a.amount_bs) || 0), 0) || 0,
          total_overdue_usd: accountsData?.filter((a: any) => a.status === 'overdue')
            .reduce((sum: number, a: any) => sum + (Number(a.amount_usd) || 0), 0) || 0,
          total_overdue_bs: accountsData?.filter((a: any) => a.status === 'overdue')
            .reduce((sum: number, a: any) => sum + (Number(a.amount_bs) || 0), 0) || 0,
          count_pending: accountsData?.filter((a: any) => a.status === 'pending').length || 0,
          count_paid: accountsData?.filter((a: any) => a.status === 'paid').length || 0,
          count_overdue: accountsData?.filter((a: any) => a.status === 'overdue').length || 0
        };

        console.log('Accounts summary (direct query):', summary);
        return [summary];
      } catch (summaryError) {
        console.warn('Warning: Accounts summary not available:', summaryError);
        return null;
      }
    })(),
    // 3. Estadísticas de financiamientos activos
    (async () => {
      try {
        const { data: financingData, error: financingError } = await (supabase as any)
          .from('krece_financing')
          .select('id, initial_amount_usd, financed_amount_usd, status')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .limit(50);

        if (financingError) {
          console.warn('Warning: Could not fetch Krece financing:', financingError);
          return null;
        }
        console.log('Active financing found:', financingData?.length || 0);
        return financingData;
      } catch (financingError) {
        console.warn('Warning: Krece financing table not available:', financingError);
        return null;
      }
    })(),
  ]);

  const salesStats = salesResult;
  const accountsSummary = accountsSummaryResult;
  const financingStats = financingStatsResult;

  // 4. Calcular estadísticas por período (para comparación)
  const now = new Date();
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

  // 8. Construir objeto de estadísticas
  const stats: KreceStats = {
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
  };

  console.log('Final Krece stats for period:', selectedPeriod, stats);
  return stats;
};

export function useKreceStats(selectedPeriod: PeriodType = 'today') {
  const { userProfile } = useAuth();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<KreceStats>({
    queryKey: ['kreceStats', userProfile?.company_id, selectedPeriod],
    queryFn: () => {
      if (!userProfile?.company_id) {
        throw new Error('No company_id available');
      }
      return fetchKreceStatsData(userProfile.company_id, selectedPeriod);
    },
    enabled: !!userProfile?.company_id, // Solo ejecutar si hay company_id
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2, // Reintentar 2 veces en caso de error
    retryDelay: 1000, // Esperar 1 segundo entre reintentos
  });

  // Retornar datos con valores por defecto si no hay datos
  const stats: KreceStats = data || {
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
  };

  return {
    stats,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Error al cargar estadísticas de Krece') : null,
    refetch
  };
}
