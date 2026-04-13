import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  totalAmount: number;      // Total USD global desde el servidor
  averageAmount: number;    // Promedio USD global desde el servidor
  categoryStats?: CategoryStats;
}

export interface CategoryTotals {
  units: number;
  amount_usd: number;
  amount_bs: number;
}

export interface CategoryStats {
  phones: CategoryTotals;
  accessories: CategoryTotals;
  technical_service: CategoryTotals;
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
  const [pageSize, setPageSize] = useState(15);
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

      const offset = (page - 1) * pageSize;
      
      // ✅ CRÍTICO: Obtener metadatos (totales reales) desde TODAS las ventas filtradas
      // Esto debe ejecutarse SIEMPRE antes de obtener las ventas paginadas
      let metadata: any = null;
      let metadataError: any = null;
      
      try {
        const result = await (supabase as any).rpc('get_sales_metadata_v2', {
          p_company_id: null, // La RPC lo deduce del usuario autenticado
          p_store_id: filters.storeId || null,
          p_date_from: filters.dateFrom || null,
          p_date_to: filters.dateTo || null,
          p_category: filters.category || null,
        });
        metadata = result.data;
        metadataError = result.error;
      } catch (err) {
        metadataError = err;
        console.warn('⚠️ [RPC] La función get_sales_metadata_v2 no existe aún. Ejecuta el script SQL sql/12_crear_rpc_metadatos_ventas.sql en Supabase.');
      }

      // Si la RPC no existe (404) o hay error, usar fallback temporal
      // PERO mostrar advertencia clara en consola
      if (metadataError) {
        const is404 = metadataError?.code === 'P0001' || 
                     metadataError?.message?.includes('does not exist') ||
                     metadataError?.message?.includes('function') ||
                     String(metadataError).includes('404');
        
        if (is404) {
          console.warn('⚠️ [RPC] La función get_sales_metadata_v2 no existe en la base de datos.');
          console.warn('⚠️ [RPC] Ejecuta el script SQL: sql/12_crear_rpc_metadatos_ventas.sql en Supabase Dashboard → SQL Editor');
          console.warn('⚠️ [RPC] Usando cálculo temporal desde página actual (datos pueden ser incorrectos)');
          // No lanzar error, usar fallback temporal
          metadata = null;
        } else {
          console.error('❌ [RPC] Error obteniendo metadatos:', metadataError);
          // Para otros errores, usar fallback también (mejor que romper la app)
          metadata = null;
        }
      }

      if (metadata && metadata.error) {
        console.warn('⚠️ [RPC] Metadatos retornaron error:', metadata.error);
        metadata = null; // Usar fallback
      }

      // ✅ CORRECCIÓN: Removido p_category porque la función get_sales_history_v2 NO lo acepta
      // ✅ ACTUALIZADO: p_category ahora se filtra en backend para mantener consistencia con metadatos.
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_sales_history_v2', {
        p_company_id: null, // La RPC lo deduce del usuario autenticado
        p_store_id: filters.storeId || null,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_category: filters.category || null,
        p_limit: pageSize,
        p_offset: offset
      });

      if (rpcError) {
        console.error('❌ [RPC] Error en get_sales_history_v2:', rpcError);
        throw new Error(rpcError.message || 'Error al obtener historial de ventas');
      }

      // ✅ CORRECCIÓN: La RPC get_sales_history_v2 retorna SETOF JSONB (array directo de ventas)
      // NO retorna { metadata, data }, retorna directamente un array de objetos JSONB
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

      console.log('📦 [RPC] Datos recibidos:', { 
        type: typeof rpcData, 
        isArray: Array.isArray(rpcData),
        length: Array.isArray(rpcData) ? rpcData.length : 1,
        firstElement: Array.isArray(rpcData) ? rpcData[0] : rpcData
      });

      // La RPC retorna un array de objetos JSONB directamente
      // Cada elemento es una venta con todos sus datos
      const rawSales: any[] = Array.isArray(rpcData) ? rpcData : [rpcData];

      // Verificar si hay error en el primer elemento
      if (rawSales.length > 0 && rawSales[0]?.error) {
        const errorMsg = rawSales[0].message || 'Error al obtener historial de ventas';
        console.error('❌ [RPC] Error en respuesta:', errorMsg);
        throw new Error(errorMsg);
      }

      // Validar que rawSales tenga datos válidos
      if (!rawSales || rawSales.length === 0) {
        console.log('📊 [RPC] Array de ventas vacío');
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

      // ✅ Usar metadatos del servidor si están disponibles, sino usar fallback temporal
      let totalCount: number;
      let serverTotalAmountUsd: number;
      let averageAmount: number;
      let categoryStats: CategoryStats;

      if (metadata && !metadata.error) {
        // ✅ Usar metadatos del servidor (totales reales desde TODAS las ventas filtradas)
        totalCount = Number(metadata.total_count) || 0;
        serverTotalAmountUsd = Number(metadata.total_amount_usd) || 0;
        averageAmount = Number(metadata.average_amount_usd) || 0;
        
        // Usar categoryStats del servidor (calculado desde TODAS las ventas filtradas)
        if (metadata.category_stats) {
          categoryStats = {
            phones: {
              units: Number(metadata.category_stats.phones?.units) || 0,
              amount_usd: Number(metadata.category_stats.phones?.amount_usd) || 0,
              amount_bs: Number(metadata.category_stats.phones?.amount_bs) || 0,
            },
            accessories: {
              units: Number(metadata.category_stats.accessories?.units) || 0,
              amount_usd: Number(metadata.category_stats.accessories?.amount_usd) || 0,
              amount_bs: Number(metadata.category_stats.accessories?.amount_bs) || 0,
            },
            technical_service: {
              units: Number(metadata.category_stats.technical_service?.units) || 0,
              amount_usd: Number(metadata.category_stats.technical_service?.amount_usd) || 0,
              amount_bs: Number(metadata.category_stats.technical_service?.amount_bs) || 0,
            },
          };
        } else {
          categoryStats = {
            phones: { units: 0, amount_usd: 0, amount_bs: 0 },
            accessories: { units: 0, amount_usd: 0, amount_bs: 0 },
            technical_service: { units: 0, amount_usd: 0, amount_bs: 0 },
          };
        }
        
        console.log('✅ [RPC] Metadatos del servidor (TOTALES REALES):', { 
          totalCount, 
          serverTotalAmountUsd, 
          averageAmount,
          categoryStats 
        });
      } else {
        // ⚠️ FALLBACK TEMPORAL: Calcular desde página actual (datos pueden ser incorrectos)
        // Esto solo se usa si la RPC get_sales_metadata_v2 no existe aún
        console.error('❌ [FALLBACK] ⚠️ IMPORTANTE: La RPC get_sales_metadata_v2 NO existe en la base de datos.');
        console.error('❌ [FALLBACK] ⚠️ Los totales mostrados son INCORRECTOS (solo página actual).');
        console.error('❌ [FALLBACK] ⚠️ ACCIÓN REQUERIDA: Ejecuta el script SQL en Supabase:');
        console.error('❌ [FALLBACK] ⚠️ Archivo: sql/12_crear_rpc_metadatos_ventas.sql');
        console.error('❌ [FALLBACK] ⚠️ Ubicación: Supabase Dashboard → SQL Editor');
        console.warn('⚠️ [FALLBACK] Calculando totales desde página actual (INCORRECTO - solo muestra 15 de 15)');
        
        serverTotalAmountUsd = rawSales.reduce((sum, sale) => {
          if (!sale || typeof sale !== 'object') {
            return sum;
          }
          return sum + (Number(sale.total_usd) || 0);
        }, 0);
        totalCount = rawSales.length; // ❌ Solo página actual (INCORRECTO - debe ser total real)
        averageAmount = totalCount > 0 ? serverTotalAmountUsd / totalCount : 0;
        
        // ⚠️ ADVERTENCIA: Estos datos son INCORRECTOS porque solo cuentan la página actual
        console.error('❌ [FALLBACK] totalCount calculado:', totalCount, '(INCORRECTO - debe ser el total real del rango)');

        // Calcular estadísticas de categoría desde la página actual (fallback)
        categoryStats = {
          phones: { units: 0, amount_usd: 0, amount_bs: 0 },
          accessories: { units: 0, amount_usd: 0, amount_bs: 0 },
          technical_service: { units: 0, amount_usd: 0, amount_bs: 0 },
        };

        rawSales.forEach((sale: any) => {
          if (!sale || typeof sale !== 'object') return;
          if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach((item: any) => {
              if (!item || typeof item !== 'object') return;
              const category = item.category || 'accessories';
              if (category === 'phones') {
                categoryStats.phones.units += Number(item.qty) || 0;
                categoryStats.phones.amount_usd += Number(item.subtotal) || 0;
              } else if (category === 'accessories') {
                categoryStats.accessories.units += Number(item.qty) || 0;
                categoryStats.accessories.amount_usd += Number(item.subtotal) || 0;
              } else if (category === 'technical_service') {
                categoryStats.technical_service.units += Number(item.qty) || 0;
                categoryStats.technical_service.amount_usd += Number(item.subtotal) || 0;
              }
            });
          }
        });

        // Calcular BS desde USD (fallback)
        categoryStats.phones.amount_bs = categoryStats.phones.amount_usd * 41.73;
        categoryStats.accessories.amount_bs = categoryStats.accessories.amount_usd * 41.73;
        categoryStats.technical_service.amount_bs = categoryStats.technical_service.amount_usd * 41.73;
      }

      const totalPages = Math.ceil(totalCount / pageSize);

      console.log(
        `📊 [RPC] Ventas obtenidas (página): ${rawSales.length}, totalCount: ${totalCount}, totalAmountUsd: ${serverTotalAmountUsd}, categoryStats:`,
        categoryStats
      );

      // ✅ REFACTOR: La RPC ya devuelve todos los datos resueltos (client_name, store_name, cashier_name)
      // Solo mapeamos directamente sin queries adicionales
      const transformedSales: Sale[] = rawSales
        .filter((sale: any) => {
          // Filtrar ventas inválidas
          if (!sale || typeof sale !== 'object' || !sale.id) {
            console.warn('⚠️ [RPC] Venta inválida filtrada:', sale);
            return false;
          }
          return true;
        })
        .map((sale: any) => ({
        id: sale.id,
        invoice_number: sale.invoice_number,
        created_at: sale.created_at || new Date().toISOString(), // ✅ Ahora la RPC retorna created_at
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
        items: (sale.items && Array.isArray(sale.items) ? sale.items : []).map((item: any) => {
          if (!item || typeof item !== 'object') {
            console.warn('⚠️ [RPC] Item inválido en transformación:', item);
            return null;
          }
          return {
            id: item.id || '',
            product_id: item.product_id || '',
            sku: item.sku || 'N/A', // ✅ Ya viene corregido de la RPC
            name: item.name || 'Producto sin nombre',
            qty: Number(item.qty) || 0,
            price: Number(item.price) || 0,
            subtotal: Number(item.subtotal) || 0,
            category: item.category || 'accessories', // ✅ Default si no hay categoría
            // Campos legacy para compatibilidad
            sale_id: sale.id,
            product_name: item.name || 'Producto sin nombre',
            product_sku: item.sku || 'N/A',
            quantity: Number(item.qty) || 0,
            unit_price_usd: Number(item.price) || 0,
            total_price_usd: Number(item.subtotal) || 0,
          };
        }).filter((item: any) => item !== null), // Filtrar items nulos
      }));

      // La RPC ya devuelve las ventas ordenadas por fecha descendente
      let sortedSales = transformedSales;

      const response: SalesResponse = {
        sales: sortedSales, // Usar las ventas ordenadas (página actual)
        totalCount, // Total real del servidor (incluye filtro de categoría en backend)
        totalPages,
        currentPage: page,
        totalAmount: serverTotalAmountUsd,
        averageAmount,
        categoryStats,
      };

      console.log('Sales data fetched successfully:', response);
      setData(response);

    } catch (err) {
      console.error('❌ [RPC] Error fetching sales data:', err);
      console.error('❌ [RPC] Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        error: err
      });
      const errorMessage = err instanceof Error 
        ? err.message 
        : (typeof err === 'object' && err !== null && 'message' in err)
          ? String(err.message)
          : 'Error al cargar las ventas';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.company_id, filters, page, pageSize]);

  const setFilters = useCallback((newFilters: Partial<SalesFilters>) => {
    setFiltersState(prev => {
      const updated: SalesFilters = { ...prev };
      
      // Si un filtro se establece como undefined, eliminarlo del estado
      Object.keys(newFilters).forEach(key => {
        const filterKey = key as keyof SalesFilters;
        if (newFilters[filterKey] === undefined) {
          delete updated[filterKey];
        } else {
          (updated as any)[filterKey] = newFilters[filterKey];
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
