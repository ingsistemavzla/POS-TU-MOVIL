import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getSalesSummary } from '@/lib/sales/stats';

export interface SaleItem {
  id: string;
  product_id: string;
  sku: string; // ✅ NUEVO: viene de la RPC ya corregido
  name: string; // ✅ NUEVO: nombre del campo en la RPC
  qty: number; // ✅ NUEVO: nombre del campo en la RPC
  price: number; // ✅ NUEVO: nombre del campo en la RPC
  subtotal: number; // ✅ NUEVO: nombre del campo en la RPC
  category?: string;
  // Campos legacy (para compatibilidad)
  sale_id?: string;
  product_name?: string;
  product_sku?: string;
  quantity?: number;
  unit_price_usd?: number;
  total_price_usd?: number;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  payment_method: string;
  amount_usd: number;
  amount_bs: number;
}

export interface Sale {
  id: string;
  invoice_number: string;
  created_at: string;
  created_at_fmt?: string; // ✅ NUEVO: fecha formateada de la RPC
  client_name?: string; // ✅ NUEVO: nombre del campo en la RPC
  client_doc?: string; // ✅ NUEVO: nombre del campo en la RPC
  customer_id?: string;
  customer_name: string; // Legacy: mantener para compatibilidad
  customer_id_number?: string; // Legacy: mantener para compatibilidad
  store_id: string;
  store_name: string; // ✅ Ya viene resuelto de la RPC
  cashier_id: string;
  cashier_name: string; // ✅ Ya viene resuelto de la RPC
  subtotal_usd: number;
  tax_amount_usd: number;
  total_usd: number;
  total_bs: number; // ✅ Ya viene calculado de la RPC
  bcv_rate_used: number;
  payment_method?: string; // ✅ Ya viene traducido de la RPC (ej: "Efectivo USD", "Zelle")
  payment_status_label?: string; // Legacy: mantener para compatibilidad
  financing_label?: string; // ✅ NUEVO: "KRECE 25%", "CASHEA" o "CONTADO" de la RPC
  is_mixed_payment: boolean;
  krece_enabled: boolean;
  krece_initial_amount_usd?: number;
  krece_financed_amount_usd?: number;
  krece_initial_amount_bs?: number; // ✅ NUEVO: BS guardado
  krece_financed_amount_bs?: number; // ✅ NUEVO: BS guardado
  krece_initial_percentage?: number; // ✅ Ya viene calculado de la RPC
  cashea_enabled: boolean; // ✅ NUEVO: Campo Cashea
  cashea_initial_amount_usd?: number; // ✅ NUEVO: Campo Cashea
  cashea_financed_amount_usd?: number; // ✅ NUEVO: Campo Cashea
  cashea_initial_amount_bs?: number; // ✅ NUEVO: Campo Cashea BS guardado
  cashea_financed_amount_bs?: number; // ✅ NUEVO: Campo Cashea BS guardado
  cashea_initial_percentage?: number; // ✅ NUEVO: Porcentaje Cashea
  notes?: string;
  updated_at?: string;
  items?: SaleItem[];
  payments?: SalePayment[];
}

export interface SalesFilters {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  storeId?: string;
  cashierId?: string;
  paymentMethod?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
  kreceOnly?: boolean;
  invoiceNumber?: string;
}

export interface SalesResponse {
  sales: Sale[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  totalAmount: number;
  averageAmount: number;
}

export interface UseSalesDataReturn {
  data: SalesResponse | null;
  loading: boolean;
  error: string | null;
  filters: SalesFilters;
  page: number;
  pageSize: number;
  setFilters: (filters: Partial<SalesFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearFilters: () => void;
  refreshData: () => Promise<void>;
  exportData: () => Promise<void>;
}

export function useSalesData(): UseSalesDataReturn {
  const { userProfile } = useAuth();
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFiltersState] = useState<SalesFilters>({});

  const fetchSalesData = useCallback(async () => {
    if (!userProfile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 [RPC] Fetching sales data with get_sales_history_v2:', filters, 'page:', page, 'pageSize:', pageSize);

      // ✅ NUEVO: Usar RPC get_sales_history_v2 en lugar de query manual
      const offset = (page - 1) * pageSize;
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_sales_history_v2', {
        p_company_id: null, // La RPC lo deduce del usuario autenticado
        p_store_id: filters.storeId || null,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_limit: pageSize,
        p_offset: offset
      });

      if (rpcError) {
        throw rpcError;
      }

      // La RPC retorna SETOF JSONB, que Supabase convierte en un array
      // Si no hay datos, puede ser null, undefined, o array vacío
      if (!rpcData) {
        console.log('📊 [RPC] No hay datos retornados');
        const response: SalesResponse = {
          sales: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          totalAmount: 0,
          averageAmount: 0,
        };
        setData(response);
        return;
      }

      // Verificar si hay error en la respuesta (puede venir como primer elemento del array)
      if (Array.isArray(rpcData) && rpcData.length > 0 && rpcData[0]?.error) {
        throw new Error(rpcData[0].message || 'Error al obtener historial de ventas');
      }

      // La RPC retorna un array JSONB directamente
      const salesData: any[] = Array.isArray(rpcData) ? rpcData : [];

      console.log(`📊 [RPC] Ventas obtenidas: ${salesData.length}`);

      // ✅ REFACTOR: La RPC ya devuelve todos los datos resueltos (client_name, store_name, cashier_name)
      // Solo mapeamos directamente sin queries adicionales
      const transformedSales: Sale[] = salesData.map((sale: any) => ({
        id: sale.id,
        invoice_number: sale.invoice_number,
        created_at: sale.created_at,
        created_at_fmt: sale.created_at_fmt, // ✅ Ya viene formateado
        client_name: sale.client_name,
        client_doc: sale.client_doc,
        customer_id: sale.customer_id,
        customer_name: sale.client_name || 'Sin Cliente', // ✅ Usar client_name de la RPC
        customer_id_number: sale.client_doc || '', // ✅ Usar client_doc de la RPC
        store_id: sale.store_id,
        store_name: sale.store_name || 'Tienda N/A', // ✅ Ya viene resuelto de la RPC
        cashier_id: sale.cashier_id,
        cashier_name: sale.cashier_name || 'N/A', // ✅ Ya viene resuelto de la RPC
        subtotal_usd: sale.subtotal_usd || sale.total_usd,
        tax_amount_usd: sale.tax_amount_usd || 0,
        total_usd: sale.total_usd,
        total_bs: sale.total_bs, // ✅ Ya viene calculado de la RPC
        bcv_rate_used: sale.bcv_rate_used,
        payment_method: sale.payment_method, // ✅ Ya viene traducido de la RPC
        payment_status_label: sale.financing_label || sale.payment_status_label, // ✅ Compatibilidad: usar financing_label
        financing_label: sale.financing_label, // ✅ "KRECE 25%", "CASHEA" o "CONTADO"
        is_mixed_payment: sale.is_mixed_payment || false,
        krece_enabled: sale.krece_enabled || false,
        krece_initial_amount_usd: sale.krece_initial_amount_usd || 0,
        krece_financed_amount_usd: sale.krece_financed_amount_usd || 0,
        krece_initial_amount_bs: sale.krece_initial_amount_bs || 0, // ✅ NUEVO: BS guardado
        krece_financed_amount_bs: sale.krece_financed_amount_bs || 0, // ✅ NUEVO: BS guardado
        krece_initial_percentage: sale.krece_initial_percentage || 0, // ✅ Ya viene calculado de la RPC
        cashea_enabled: sale.cashea_enabled || false, // ✅ NUEVO: Campo Cashea
        cashea_initial_amount_usd: sale.cashea_initial_amount_usd || 0, // ✅ NUEVO: Campo Cashea
        cashea_financed_amount_usd: sale.cashea_financed_amount_usd || 0, // ✅ NUEVO: Campo Cashea
        cashea_initial_amount_bs: sale.cashea_initial_amount_bs || 0, // ✅ NUEVO: Campo Cashea BS guardado
        cashea_financed_amount_bs: sale.cashea_financed_amount_bs || 0, // ✅ NUEVO: Campo Cashea BS guardado
        cashea_initial_percentage: sale.cashea_initial_percentage || 0, // ✅ NUEVO: Porcentaje Cashea
        notes: sale.notes,
        items: (sale.items || []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          sku: item.sku, // ✅ Ya viene corregido de la RPC
          name: item.name,
          qty: item.qty,
          price: item.price,
          subtotal: item.subtotal,
          category: item.category,
          // Campos legacy para compatibilidad
          sale_id: sale.id,
          product_name: item.name,
          product_sku: item.sku,
          quantity: item.qty,
          unit_price_usd: item.price,
          total_price_usd: item.subtotal,
        })),
      }));

      // La RPC ya devuelve las ventas ordenadas por fecha descendente
      const sortedSales = transformedSales;

      // Calcular totales desde los datos obtenidos
      // NOTA: La RPC solo devuelve la página actual, así que los totales son aproximados
      const totalCount = salesData.length; // Aproximado (solo página actual)
      const totalPages = Math.ceil(totalCount / pageSize);

      // Calcular totales desde los datos de la página actual
      const summary = getSalesSummary(
        sortedSales.map(s => ({ store_id: s.store_id, total_usd: s.total_usd })),
        filters.storeId
      );
      const finalTotalAmount = summary.totalSales;
      const finalAverageAmount = summary.averageSales;

      const response: SalesResponse = {
        sales: sortedSales, // Usar las ventas ordenadas (página actual)
        totalCount,
        totalPages,
        currentPage: page,
        totalAmount: finalTotalAmount, // Total de TODAS las ventas filtradas
        averageAmount: finalAverageAmount, // Promedio de TODAS las ventas filtradas
      };

      console.log('Sales data fetched successfully:', response);
      setData(response);

    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.company_id, filters, page, pageSize]);

  const setFilters = useCallback((newFilters: Partial<SalesFilters>) => {
    setFiltersState(prev => {
      const updated = { ...prev };
      
      // Si un filtro se establece como undefined, eliminarlo del estado
      Object.keys(newFilters).forEach(key => {
        const filterKey = key as keyof SalesFilters;
        if (newFilters[filterKey] === undefined) {
          delete updated[filterKey];
        } else {
          updated[filterKey] = newFilters[filterKey] as any;
        }
      });
      
      return updated;
    });
    setPage(1); // Reset to first page when filters change
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setPage(1);
  }, []);

  const refreshData = useCallback(async () => {
    await fetchSalesData();
  }, [fetchSalesData]);

  const exportData = useCallback(async () => {
    if (!data?.sales.length) {
      console.warn('No data to export');
      return;
    }

    try {
      // Create CSV content
      const headers = [
        'Factura',
        'Fecha',
        'Cliente',
        'Cédula',
        'Tienda',
        'Cajero',
        'Subtotal USD',
        'IVA USD',
        'Total USD',
        'Total BS',
        'Tasa BCV',
        'Método de Pago',
        'Pago Mixto',
        'Krece',
        'Inicial Krece USD',
        'Financiado Krece USD',
        'Notas'
      ];

      const csvContent = [
        headers.join(','),
        ...data.sales.map(sale => [
          `"${sale.invoice_number}"`,
          `"${new Date(sale.created_at).toLocaleString('es-VE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          })}"`,
          `"${sale.customer_name}"`,
          `"${sale.customer_id_number || ''}"`,
          `"${sale.store_name}"`,
          `"${sale.cashier_name}"`,
          sale.subtotal_usd.toFixed(2),
          sale.tax_amount_usd.toFixed(2),
          sale.total_usd.toFixed(2),
          sale.total_bs.toFixed(2),
          sale.bcv_rate_used.toFixed(2),
          `"${sale.payment_method}"`,
          sale.is_mixed_payment ? 'Sí' : 'No',
          sale.krece_enabled ? 'Sí' : 'No',
          (sale.krece_initial_amount_usd || 0).toFixed(2),
          (sale.krece_financed_amount_usd || 0).toFixed(2),
          `"${sale.notes || ''}"`
        ].join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `ventas-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('Sales data exported successfully');

    } catch (err) {
      console.error('Error exporting sales data:', err);
      throw new Error('Error al exportar los datos');
    }
  }, [data?.sales]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  return {
    data,
    loading,
    error,
    filters,
    page,
    pageSize,
    setFilters,
    setPage,
    setPageSize,
    clearFilters,
    refreshData,
    exportData,
  };
}
