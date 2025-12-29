import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface ExecutiveSummaryData {
  summary: {
    total_invoiced: number;
    net_income_real: number;
    total_orders: number;
    avg_order_value: number;
    total_subtotal: number;
    total_cost: number;
    estimated_profit: number;
    profit_margin_percent: number;
    total_quantity: number;
  };
  stores: Array<{
    store_id: string;
    store_name: string;
    total_invoiced: number;
    net_income_real: number;
    orders_count: number;
    avg_order_value: number;
    estimated_profit: number;
    profit_margin_percent: number;
    total_quantity: number;
  }>;
  payment_methods: Array<{
    method: string;
    total_usd: number;
    total_bs: number;
    count: number;
    percentage: number;
  }>;
  krece: {
    orders: number;
    initial_total: number;
    financed_total: number;
  };
  cashea: {
    orders: number;
    initial_total: number;
    financed_total: number;
  };
  period: {
    start_date: string | null;
    end_date: string | null;
  };
  generated_at: string;
  error?: boolean;
  message?: string;
}

export interface UseExecutiveReportsParams {
  storeId?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  category?: string | null;
}

export interface UseExecutiveReportsReturn {
  data: ExecutiveSummaryData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Cache básico para evitar re-consultas innecesarias
const cache = new Map<string, { data: ExecutiveSummaryData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function getCacheKey(params: UseExecutiveReportsParams): string {
  return JSON.stringify({
    storeId: params.storeId || 'all',
    dateFrom: params.dateFrom?.toISOString() || 'all',
    dateTo: params.dateTo?.toISOString() || 'all',
    category: params.category || 'all'
  });
}

function getCachedData(key: string): ExecutiveSummaryData | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCachedData(key: string, data: ExecutiveSummaryData): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export function useExecutiveReports(params: UseExecutiveReportsParams = {}): UseExecutiveReportsReturn {
  const { userProfile } = useAuth();
  const [data, setData] = useState<ExecutiveSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userProfile?.company_id) {
      setLoading(false);
      return;
    }

    // Verificar cache
    const cacheKey = getCacheKey(params);
    const cached = getCachedData(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_executive_summary_v2', {
        p_company_id: null, // La RPC lo deduce del usuario autenticado
        p_store_id: params.storeId || null,
        p_date_from: params.dateFrom?.toISOString() || null,
        p_date_to: params.dateTo?.toISOString() || null,
        p_category: params.category || null
      });

      if (rpcError) {
        throw rpcError;
      }

      if (!rpcData) {
        throw new Error('No se recibieron datos de la RPC');
      }

      // Verificar si hay error en la respuesta
      if (rpcData.error) {
        throw new Error(rpcData.message || 'Error al obtener datos del reporte');
      }

      // Guardar en cache
      setCachedData(cacheKey, rpcData);
      setData(rpcData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener reporte ejecutivo';
      console.error('Error en useExecutiveReports:', err);
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.company_id, params.storeId, params.dateFrom, params.dateTo, params.category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    // Limpiar cache antes de refrescar
    const cacheKey = getCacheKey(params);
    cache.delete(cacheKey);
    await fetchData();
  }, [fetchData, params]);

  return {
    data,
    loading,
    error,
    refresh
  };
}



