import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CategoryStock {
  category_name: string;
  stock_qty: number;
  value_cost: number;
  value_retail: number;
  products_count: number;
  low_stock_count: number;
}

export interface StoreMatrix {
  store_id: string;
  store_name: string;
  total_items: number;
  total_stock_quantity: number;
  categories: CategoryStock[];
}

export interface StockMatrixResponse {
  matrix: StoreMatrix[];
  generated_at?: string;
  error?: boolean;
  message?: string;
}

export function useBranchStockMatrix() {
  const { userProfile, company } = useAuth();
  const [data, setData] = useState<StockMatrixResponse | null>(null);
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

        const { data: result, error: rpcError } = await supabase.rpc(
          'get_stock_matrix_by_store',
          {
            p_company_id: companyId || null
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        // Validar que el resultado no tenga error
        if (result && typeof result === 'object' && 'error' in result && result.error) {
          throw new Error(result.message || 'Error al obtener matriz de stock');
        }

        // Normalizar los datos
        const normalizedData: StockMatrixResponse = {
          matrix: result?.matrix || [],
          generated_at: result?.generated_at
        };

        setData(normalizedData);
      } catch (err) {
        console.error('Error fetching branch stock matrix:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar matriz de stock');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile?.company_id, company?.id]);

  return {
    data,
    loading,
    error
  };
}


