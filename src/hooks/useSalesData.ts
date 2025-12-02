import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getSalesSummary } from '@/lib/sales/stats';

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price_usd: number;
  total_price_usd: number;
  category?: string;
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
  customer_id: string;
  customer_name: string;
  customer_id_number?: string;
  store_id: string;
  store_name: string;
  cashier_id: string;
  cashier_name: string;
  subtotal_usd: number;
  tax_amount_usd: number;
  total_usd: number;
  total_bs: number;
  bcv_rate_used: number;
  payment_method: string;
  is_mixed_payment: boolean;
  krece_enabled: boolean;
  krece_initial_amount_usd?: number;
  krece_financed_amount_usd?: number;
  krece_initial_percentage?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
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

      console.log('Fetching sales data with filters:', filters, 'page:', page, 'pageSize:', pageSize);
      console.log('User profile company ID:', userProfile.company_id);

      // Build query with filters
      // 🛡️ RLS: No necesitamos filtrar por company_id o role - RLS lo hace automáticamente
      let query = (supabase as any)
        .from('sales')
        .select(`
          id,
          invoice_number,
          customer_id,
          customer_name,
          customer_id_number,
          store_id,
          cashier_id,
          subtotal_usd,
          tax_amount_usd,
          total_usd,
          total_bs,
          bcv_rate_used,
          payment_method,
          is_mixed_payment,
          krece_enabled,
          krece_initial_amount_usd,
          krece_financed_amount_usd,
          krece_initial_percentage,
          notes,
          created_at,
          updated_at,
          sale_items (
            id,
            product_id,
            qty,
            price_usd,
            subtotal_usd,
            product_name,
            product_sku,
            products (
              id,
              category
            )
          )
        `);
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        // ✅ REMOVED: Role-based store filtering - RLS handles this automatically

      // Filtro por categoría: DEBE APLICARSE PRIMERO porque obtiene los sale_ids
      // y luego se aplican otros filtros sobre esos IDs
      let categorySaleIds: string[] | null = null;
      if (filters.category) {
        try {
          console.log('🔍 Aplicando filtro de categoría:', filters.category);
          
          // 1. Obtener productos de la categoría especificada
          // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
          const { data: productsData, error: productsError } = await (supabase as any)
            .from('products')
            .select('id')
            // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
            .eq('category', filters.category);

          if (productsError) {
            console.error('❌ Error obteniendo productos de categoría:', productsError);
            throw productsError;
          }

          if (!productsData || productsData.length === 0) {
            console.log('⚠️ No hay productos de la categoría:', filters.category);
            categorySaleIds = []; // Array vacío para que no se obtengan resultados
          } else {
            const categoryProductIds = productsData.map((p: any) => p.id);
            console.log('📦 Productos de la categoría encontrados:', categoryProductIds.length);
            
            // 2. Obtener sale_ids que tienen productos de esta categoría
            // IMPORTANTE: Incluir filtro de tienda si existe, usando join con sales
            // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
            let saleItemsQuery = (supabase as any)
              .from('sale_items')
              .select('sale_id, sales!inner(id, store_id, company_id, created_at)')
              // ✅ REMOVED: .eq('sales.company_id', userProfile.company_id) - RLS handles this automatically
              .in('product_id', categoryProductIds);

            // Aplicar filtro de tienda si existe
            if (filters.storeId) {
              console.log('🏪 Aplicando filtro de tienda en sale_items:', filters.storeId);
              saleItemsQuery = saleItemsQuery.eq('sales.store_id', filters.storeId);
            }

            // Aplicar filtro de fecha si existe
            if (filters.dateFrom) {
              saleItemsQuery = saleItemsQuery.gte('sales.created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
              saleItemsQuery = saleItemsQuery.lte('sales.created_at', filters.dateTo);
            }

            const { data: filteredSaleItems, error: filteredError } = await saleItemsQuery;

            if (filteredError) {
              console.error('❌ Error obteniendo sale_items filtrados:', filteredError);
              throw filteredError;
            }

            if (!filteredSaleItems || filteredSaleItems.length === 0) {
              console.log('⚠️ No hay ventas con productos de esta categoría (con filtros aplicados)');
              categorySaleIds = []; // Array vacío
            } else {
              // Extraer sale_ids únicos de los resultados
              categorySaleIds = [...new Set(filteredSaleItems.map((item: any) => item.sale_id))];
              console.log('✅ Sale IDs encontrados con categoría y filtros:', categorySaleIds.length);
            }
          }
        } catch (error) {
          console.error('❌ Error filtering by category:', error);
          categorySaleIds = []; // Array vacío en caso de error
        }
      }

      // Aplicar filtro de categoría (si existe) ANTES de otros filtros
      if (categorySaleIds !== null) {
        if (categorySaleIds.length === 0) {
          // Si no hay sale_ids, retornar resultados vacíos
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        } else {
          query = query.in('id', categorySaleIds);
        }
      }

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      // NO aplicar storeId aquí si ya se aplicó en la consulta de categoría
      if (filters.storeId && !filters.category) {
        query = query.eq('store_id', filters.storeId);
      }
      if (filters.cashierId) {
        query = query.eq('cashier_id', filters.cashierId);
      }
      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters.minAmount) {
        query = query.gte('total_usd', filters.minAmount);
      }
      if (filters.maxAmount) {
        query = query.lte('total_usd', filters.maxAmount);
      }
      if (filters.kreceOnly) {
        query = query.eq('krece_enabled', true);
      }
      if (filters.invoiceNumber) {
        query = query.ilike('invoice_number', `%${filters.invoiceNumber}%`);
      }
      if (filters.searchTerm) {
        query = query.or(`
          invoice_number.ilike.%${filters.searchTerm}%,
          customers.name.ilike.%${filters.searchTerm}%,
          customers.id_number.ilike.%${filters.searchTerm}%,
          notes.ilike.%${filters.searchTerm}%
        `);
      }

      // Get total count for pagination
      const { count } = await (query as any).select('*', { count: 'exact', head: true });
      
      // CORRECCIÓN CRÍTICA: Calcular totales sobre TODAS las ventas filtradas (no solo la página actual)
      let summaryTotalAmount = 0;
      let summaryAverageAmount = 0;
      let summaryTotalCount = 0;
      
      try {
        // Obtener solo los campos necesarios para calcular totales (sin paginación)
        const { data: totalsData, error: totalsError } = await (query.clone() as any)
          .select('total_usd, store_id')
          .order('created_at', { ascending: false })
          .limit(50000); // Límite razonable para evitar timeout

        if (!totalsError && totalsData && totalsData.length > 0) {
          // Calcular totales sobre TODAS las ventas filtradas
          const allFilteredSales = totalsData.map((sale: any) => ({
            store_id: sale.store_id,
            total_usd: sale.total_usd || 0
          }));
          
          const fullSummary = getSalesSummary(allFilteredSales, filters.storeId);
          summaryTotalAmount = fullSummary.totalSales;
          summaryAverageAmount = fullSummary.averageSales;
          summaryTotalCount = fullSummary.count;
        } else if (count !== null && count !== undefined) {
          // Si no se pueden obtener los totales, usar count pero no calcular totales
          summaryTotalCount = count;
        }
      } catch (totalsError) {
        console.warn('Error calculating totals from all filtered sales, will calculate from paginated data:', totalsError);
        // Si falla, calcularemos desde los datos paginados (comportamiento anterior)
        // pero esto mostrará totales incorrectos si hay múltiples páginas
      }
      
      // Get paginated data
      const offset = (page - 1) * pageSize;
      const { data: salesData, error: salesError } = await (query as any)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (salesError) {
        throw salesError;
      }

      // Debug: Log raw sales data con información más clara
      const totalSales = salesData?.length || 0;
      const salesWithItems = salesData?.filter((s: any) => s.sale_items && s.sale_items.length > 0).length || 0;
      const firstSale = salesData?.[0];
      console.log(`📊 DATOS RAW DE SUPABASE:`, 
        `Total ventas: ${totalSales}`,
        `Ventas con items: ${salesWithItems}`,
        firstSale ? `Primera venta: ${firstSale.invoice_number} - Items: ${firstSale.sale_items?.length || 0}` : 'Sin ventas'
      );
      if (firstSale) {
        const saleItemsLength = firstSale.sale_items?.length || 0;
        const saleItemsIsArray = Array.isArray(firstSale.sale_items);
        const saleItemsType = typeof firstSale.sale_items;
        const firstItem = firstSale.sale_items?.[0] || null;
        console.log(`📋 Detalles primera venta ${firstSale.invoice_number}:`, {
          sale_items_length: saleItemsLength,
          sale_items_is_array: saleItemsIsArray,
          sale_items_type: saleItemsType,
          sale_items_value: firstSale.sale_items,
          first_item_id: firstItem?.id || 'N/A',
          first_item_product_name: firstItem?.product_name || 'N/A',
          first_item_qty: firstItem?.qty || 'N/A',
          first_item_complete: firstItem
        });
      }
      console.log(`📋 Resumen todas las ventas:`, 
        salesData?.map((s: any) => {
          const itemsCount = s.sale_items?.length || 0;
          const itemsIsArray = Array.isArray(s.sale_items);
          return `${s.invoice_number}: ${itemsCount} items (array: ${itemsIsArray})`;
        }) || []
      );

      // Transform and calculate statistics
      const transformedSales: Sale[] = (salesData || []).map((sale: any) => {
        // Asegurar que sale_items sea un array
        const saleItems = Array.isArray(sale.sale_items) 
          ? sale.sale_items 
          : (sale.sale_items ? [sale.sale_items] : []);
        
        // Log más descriptivo para debugging
        const rawItemsCount = sale.sale_items ? (Array.isArray(sale.sale_items) ? sale.sale_items.length : 1) : 0;
        const rawIsArray = Array.isArray(sale.sale_items);
        const rawType = typeof sale.sale_items;
        console.log(`🔄 Transformando venta ${sale.invoice_number}:`, 
          `Items raw count: ${rawItemsCount}`, 
          `Raw es array: ${rawIsArray}`, 
          `Raw tipo: ${rawType}`,
          `Items finales: ${saleItems.length}`,
          `Raw sale_items:`, sale.sale_items
        );
        
        // Log detallado del primer item raw si existe
        if (sale.sale_items && (Array.isArray(sale.sale_items) ? sale.sale_items.length > 0 : sale.sale_items)) {
          const firstRawItem = Array.isArray(sale.sale_items) ? sale.sale_items[0] : sale.sale_items;
          console.log(`🔍 Primer item RAW de ${sale.invoice_number}:`, {
            id: firstRawItem?.id || 'N/A',
            product_id: firstRawItem?.product_id || 'N/A',
            product_name: firstRawItem?.product_name || 'N/A',
            product_sku: firstRawItem?.product_sku || 'N/A',
            qty: firstRawItem?.qty || 'N/A',
            price_usd: firstRawItem?.price_usd || 'N/A',
            subtotal_usd: firstRawItem?.subtotal_usd || 'N/A',
            products_category: firstRawItem?.products?.category || 'N/A',
            item_completo: firstRawItem
          });
        }
        
        return {
          id: sale.id,
          invoice_number: sale.invoice_number,
          customer_id: sale.customer_id,
          // Usar customer_name denormalizado directamente de sales (guardado por process_sale)
          customer_name: sale.customer_name || 'Sin Cliente',
          customer_id_number: sale.customer_id_number || '',
          store_id: sale.store_id,
          store_name: 'Cargando...', // Placeholder, will be updated below
          cashier_id: sale.cashier_id,
          cashier_name: 'Cargando...', // Placeholder, will be updated below
          subtotal_usd: sale.subtotal_usd,
          tax_amount_usd: sale.tax_amount_usd,
          total_usd: sale.total_usd,
          total_bs: sale.total_bs,
          bcv_rate_used: sale.bcv_rate_used,
          payment_method: sale.payment_method,
          is_mixed_payment: sale.is_mixed_payment,
          krece_enabled: sale.krece_enabled,
          krece_initial_amount_usd: sale.krece_initial_amount_usd,
          krece_financed_amount_usd: sale.krece_financed_amount_usd,
          krece_initial_percentage: sale.krece_initial_percentage,
          notes: sale.notes,
          created_at: sale.created_at,
          updated_at: sale.updated_at,
          items: saleItems.map((item: any) => {
            // Los campos product_name y product_sku están directamente en sale_items
            // qty, price_usd, subtotal_usd son los nombres reales de las columnas
            const mappedItem = {
              id: item.id,
              sale_id: sale.id,
              product_id: item.product_id,
              product_name: item.product_name || item.products?.name || '',
              product_sku: item.product_sku || item.products?.sku || '',
              quantity: item.qty || item.quantity || 0,
              unit_price_usd: item.price_usd || item.unit_price_usd || 0,
              total_price_usd: item.subtotal_usd || item.total_price_usd || 0,
              category: item.products?.category || undefined,
            };
            
            // Debug: log detallado del item (solo para primeros items para no saturar)
            if (saleItems.indexOf(item) < 2) {
              const itemIndex = saleItems.indexOf(item) + 1;
              const itemName = item.product_name || item.products?.name || 'SIN NOMBRE';
              const itemSku = item.product_sku || item.products?.sku || 'SIN SKU';
              const itemQty = item.qty || item.quantity || 0;
              const itemPrice = item.price_usd || item.unit_price_usd || 0;
              const itemSubtotal = item.subtotal_usd || item.total_price_usd || 0;
              const itemCategory = item.products?.category || 'N/A';
              console.log(`📦 Item ${itemIndex} de venta ${sale.invoice_number}:`, {
                nombre: itemName,
                sku: itemSku,
                cantidad: itemQty,
                precio: itemPrice,
                subtotal: itemSubtotal,
                categoria: itemCategory,
                product_id: item.product_id || 'N/A',
                item_id: item.id || 'N/A',
                raw_item: item
              });
            }
            
            // Debug: log si hay problemas con items
            if (!item.product_name && !item.products) {
              console.warn('⚠️ Item sin nombre de producto:', { item, sale_id: sale.id });
            }
            
            return mappedItem;
          }),
        };
      });

      // Fetch related data separately for better reliability
      
      // 1. Get unique IDs for batch queries
      const cashierIds = [...new Set(transformedSales.map(sale => sale.cashier_id))];
      const customerIds = [...new Set(transformedSales.map(sale => sale.customer_id).filter(id => id))];
      const storeIds = [...new Set(transformedSales.map(sale => sale.store_id))];
      
      console.log('Unique IDs for batch queries:', {
        cashierIds,
        customerIds,
        storeIds
      });

      // 2. Fetch users (cashiers) data
      if (cashierIds.length > 0) {
        console.log('Fetching users with IDs:', cashierIds);
        // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
        const { data: usersData, error: usersError } = await (supabase as any)
          .from('users')
          .select('id, name, email')
          // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
          .in('id', cashierIds);

        if (usersError) {
          console.error('Error fetching users data:', usersError);
        } else {
          console.log('Users data fetched:', usersData);
          
          // Create a map for quick lookup
          const usersMap = new Map(usersData?.map(user => [user.id, user]) || []);
          
          // Update cashier names
          transformedSales.forEach(sale => {
            const user = usersMap.get(sale.cashier_id);
            sale.cashier_name = (user as any)?.name || (user as any)?.email || 'N/A';
          });
        }
      }

      // 3. Fetch customers data (solo como fallback si customer_name no está disponible)
      // NOTA: customer_name y customer_id_number ya vienen denormalizados de sales,
      // pero hacemos esta consulta como fallback por si acaso hay ventas antiguas sin estos campos
      if (customerIds.length > 0) {
        console.log('Fetching customers with IDs (fallback):', customerIds);
        // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
        const { data: customersData, error: customersError } = await (supabase as any)
          .from('customers')
          .select('id, name, id_number')
          // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
          .in('id', customerIds);

        if (customersError) {
          console.error('Error fetching customers data:', customersError);
        } else {
          console.log('Customers data fetched (fallback):', customersData);
          
          // Create a map for quick lookup
          const customersMap = new Map(customersData?.map(customer => [customer.id, customer]) || []);
          
          // Update customer names and ID numbers SOLO si no están disponibles en sales
          transformedSales.forEach(sale => {
            // Solo actualizar si customer_name no está disponible o es genérico
            if (!sale.customer_name || sale.customer_name === 'Sin Cliente' || sale.customer_name === 'Cargando...') {
              if (sale.customer_id) {
                const customer = customersMap.get(sale.customer_id);
                if (customer) {
                  sale.customer_name = (customer as any)?.name || 'Cliente N/A';
                  sale.customer_id_number = (customer as any)?.id_number || sale.customer_id_number || '';
                }
              } else {
                sale.customer_name = 'Sin Cliente';
                sale.customer_id_number = sale.customer_id_number || '';
              }
            }
          });
        }
      }

      // 4. Fetch stores data
      if (storeIds.length > 0) {
        console.log('Fetching stores with IDs:', storeIds);
        // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
        const { data: storesData, error: storesError } = await (supabase as any)
          .from('stores')
          .select('id, name')
          // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
          .in('id', storeIds);

        if (storesError) {
          console.error('Error fetching stores data:', storesError);
        } else {
          console.log('Stores data fetched:', storesData);
          
          // Create a map for quick lookup
          const storesMap = new Map(storesData?.map(store => [store.id, store]) || []);
          
          // Update store names
          transformedSales.forEach(sale => {
            const store = storesMap.get(sale.store_id);
            sale.store_name = (store as any)?.name || 'Tienda N/A';
          });
        }
      }

      // Asegurar que las ventas estén ordenadas por fecha/hora (más recientes primero)
      // Esto garantiza el orden correcto incluso después de las transformaciones
      const sortedSales = [...transformedSales].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Orden descendente (más recientes primero)
      });

      // Log final transformed data for debugging
      console.log('Final transformed sales with all data:', sortedSales.slice(0, 2));
      
      // Log detallado de items en las primeras ventas
      sortedSales.slice(0, 3).forEach((sale) => {
        const itemsCount = sale.items?.length || 0;
        const firstItem = sale.items?.[0] || null;
        console.log(`📋 Venta final ${sale.invoice_number}:`, {
          items_count: itemsCount,
          items_defined: sale.items !== undefined,
          items_null: sale.items === null,
          items_is_array: Array.isArray(sale.items),
          primer_item_id: firstItem?.id || 'N/A',
          primer_item_nombre: firstItem?.product_name || 'N/A',
          primer_item_cantidad: firstItem?.quantity || 'N/A'
        });
      });

      // Usar totales calculados de TODAS las ventas filtradas (no solo la página actual)
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Si no se pudieron calcular los totales desde todas las ventas, usar los de la página actual como fallback
      const finalTotalAmount = summaryTotalAmount > 0 
        ? summaryTotalAmount 
        : getSalesSummary(sortedSales, filters.storeId).totalSales;
      
      const finalAverageAmount = summaryAverageAmount > 0 
        ? summaryAverageAmount 
        : getSalesSummary(sortedSales, filters.storeId).averageSales;

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
