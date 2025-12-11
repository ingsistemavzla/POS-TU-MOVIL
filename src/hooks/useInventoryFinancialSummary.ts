import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CategoryBreakdown {
  category_name: string;
  total_cost_value: number;
  total_retail_value: number;
  profit_potential: number;
  items_count: number;
  total_quantity: number;
  percentage_of_total: number;
}

export interface FinancialSummary {
  total_cost_value: number;
  total_retail_value: number;
  profit_potential: number;
  category_breakdown: CategoryBreakdown[];
  out_of_stock_count: number;
  critical_stock_count: number;
  calculated_at?: string;
  error?: boolean;
  message?: string;
}

export function useInventoryFinancialSummary(storeId?: string | null) {
  const { userProfile, company } = useAuth();
  const [data, setData] = useState<FinancialSummary | null>(null);
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
        
        // 🔥 FILTRO DE SUCURSAL: Pasar storeId solo si no es 'all' ni null
        const storeIdParam = storeId && storeId !== 'all' ? storeId : null;

        const { data: result, error: rpcError } = await supabase.rpc(
          'get_inventory_financial_summary',
          {
            p_company_id: companyId || null,
            p_store_id: storeIdParam || null
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        // Validar que el resultado no tenga error
        if (result && typeof result === 'object' && 'error' in result && result.error) {
          throw new Error(result.message || 'Error al obtener resumen financiero');
        }

        // Normalizar los datos
        const normalizedData: FinancialSummary = {
          total_cost_value: result?.total_cost_value || 0,
          total_retail_value: result?.total_retail_value || 0,
          profit_potential: result?.profit_potential || 0,
          category_breakdown: result?.category_breakdown || [],
          out_of_stock_count: result?.out_of_stock_count || 0,
          critical_stock_count: result?.critical_stock_count || 0,
          calculated_at: result?.calculated_at
        };

        setData(normalizedData);
      } catch (err) {
        console.error('Error fetching inventory financial summary:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar resumen financiero');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile?.company_id, company?.id, storeId]);

  return {
    data,
    loading,
    error
  };
}


