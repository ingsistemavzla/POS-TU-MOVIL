import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StorePerformanceSummary {
  store_id: string;
  store_name: string;
  total_invoiced: number;
  net_income_real: number;
  estimated_profit: number;
  orders_count: number;
  avg_order_value: number;
  profit_margin_percent: number;
}

export interface DashboardStorePerformanceResponse {
  summary: StorePerformanceSummary[];
  period?: {
    start_date: string;
    end_date: string;
  };
  generated_at?: string;
  error?: boolean;
  message?: string;
}

export interface UseDashboardStorePerformanceOptions {
  startDate?: Date | string;
  endDate?: Date | string;
}

/**
 * Hook para obtener el rendimiento de tiendas del dashboard
 * 
 * Este hook es una alternativa al endpoint API para proyectos Vite + React
 * que llama directamente a la RPC get_dashboard_store_performance
 */
export function useDashboardStorePerformance(options: UseDashboardStorePerformanceOptions = {}) {
  const { userProfile, company } = useAuth();
  const [data, setData] = useState<DashboardStorePerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.company_id && !company?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const companyId = company?.id || userProfile?.company_id;

        // Preparar parámetros de fecha
        const rpcParams: {
          p_company_id: string;
          p_start_date?: string;
          p_end_date?: string;
        } = {
          p_company_id: companyId!,
        };

        // Convertir fechas a formato ISO si están presentes
        if (options.startDate) {
          rpcParams.p_start_date = options.startDate instanceof Date 
            ? options.startDate.toISOString() 
            : new Date(options.startDate).toISOString();
        }

        if (options.endDate) {
          rpcParams.p_end_date = options.endDate instanceof Date 
            ? options.endDate.toISOString() 
            : new Date(options.endDate).toISOString();
        }

        // Llamar a la RPC
        const { data: result, error: rpcError } = await supabase.rpc(
          'get_dashboard_store_performance',
          rpcParams
        );

        if (rpcError) {
          throw rpcError;
        }

        // Validar que el resultado no tenga error
        if (result && typeof result === 'object' && 'error' in result && result.error) {
          throw new Error(result.message || 'Error al obtener rendimiento de tiendas');
        }

        // Normalizar los datos
        const normalizedData: DashboardStorePerformanceResponse = {
          summary: result?.summary || [],
          period: result?.period,
          generated_at: result?.generated_at
        };

        setData(normalizedData);
      } catch (err) {
        console.error('Error fetching dashboard store performance:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar rendimiento de tiendas');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile?.company_id, company?.id, options.startDate, options.endDate]);

  return {
    data,
    loading,
    error
  };
}


