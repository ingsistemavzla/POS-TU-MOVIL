import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Receipt,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  MoreHorizontal,
  Calendar as CalendarIcon,
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  FileDown,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package
} from "lucide-react";
import { useSalesData, SalesFilters } from "@/hooks/useSalesData";
import { formatCurrency } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { SaleDetailModal } from "@/components/sales/SaleDetailModal";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PRODUCT_CATEGORIES, getCategoryLabel } from "@/constants/categories";
import { generateSalesReportPdf } from "@/lib/reports/salesReport";
import type jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GenerateReportModal } from "@/components/reports/GenerateReportModal";

export default function SalesPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const {
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
    exportData
  } = useSalesData();

  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<SalesFilters>({
    paymentMethod: 'all',
    kreceOnly: false
  });
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showSaleDetail, setShowSaleDetail] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<{
    id: string;
    invoice_number: string;
  } | null>(null);
  const [deletingSale, setDeletingSale] = useState(false);
  
  // Estados para filtros rápidos
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<string>('custom');
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedSaleItems, setExpandedSaleItems] = useState<Record<string, Array<{
    id: string;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price_usd: number;
    total_price_usd: number;
    category?: string;
  }>>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
  const loadingItemsRef = useRef<Record<string, boolean>>({});
  const loadedSaleIdsRef = useRef<Set<string>>(new Set());
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [lockPdfStore, setLockPdfStore] = useState(false);
  const [pdfStoreId, setPdfStoreId] = useState<string>('all');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfPreviewDocRef = useRef<jsPDF | null>(null);
  const pdfPreviewUrlRef = useRef<string | null>(null);
  const [pdfPreviewMeta, setPdfPreviewMeta] = useState<{
    count: number;
    storeName?: string;
    dateFrom?: string;
    dateTo?: string;
  } | null>(null);
  
  // Estado para totales por categoría
  const [categoryTotals, setCategoryTotals] = useState({
    phones: 0,
    accessories: 0,
    technical_service: 0,
  });

  const handleApplyFilters = () => {
    // Convertir valores especiales antes de aplicar filtros
    const filtersToApply = {
      ...localFilters,
      paymentMethod: localFilters.paymentMethod === 'all' ? undefined : localFilters.paymentMethod
    };
    setFilters(filtersToApply);
    setShowFilters(false);
    toast({
      title: "Filtros aplicados",
      description: "Los filtros se han aplicado correctamente",
    });
  };

  // Sincronizar filtros locales cuando se abren los filtros
  const handleOpenFilters = () => {
    setLocalFilters({
      ...filters,
      paymentMethod: filters.paymentMethod || 'all',
      kreceOnly: filters.kreceOnly || false
    });
    setShowFilters(true);
  };

  const handleClearFilters = () => {
    setLocalFilters({
      paymentMethod: 'all',
      kreceOnly: false
    });
    // Limpiar también los filtros rápidos
    setSelectedStoreFilter('all');
    setSelectedCategoryFilter('all');
    setDateRangePreset('custom');
    setDateRangeStart(null);
    setDateRangeEnd(null);
    clearFilters();
    setShowFilters(false);
    toast({
      title: "Filtros limpiados",
      description: "Todos los filtros han sido eliminados",
    });
  };

  const handleExport = async () => {
    try {
      await exportData();
      toast({
        title: "Exportación exitosa",
        description: "Los datos se han exportado correctamente",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  const handleOpenPdfDialog = () => {
    setPdfStoreId(filters.storeId || selectedStoreFilter || 'all');
    setLockPdfStore(false);
    setShowPdfDialog(true);
  };

  const handleOpenStorePdfDialog = () => {
    const storeId = filters.storeId && filters.storeId !== 'all'
      ? filters.storeId
      : selectedStoreFilter !== 'all'
        ? selectedStoreFilter
        : undefined;

    if (!storeId) {
      toast({
        title: "Selecciona una sucursal",
        description: "Debes elegir una sucursal antes de generar el reporte por tienda.",
        variant: "destructive",
      });
      return;
    }

    setPdfStoreId(storeId);
    setLockPdfStore(true);
    setShowPdfDialog(true);
  };

  useEffect(() => {
    return () => {
      if (pdfPreviewUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewUrlRef.current);
        pdfPreviewUrlRef.current = null;
      }
    };
  }, []);

  // Calcular totales por categoría desde todas las ventas filtradas
  useEffect(() => {
    const calculateCategoryTotals = async () => {
      if (!userProfile?.company_id) return;

      try {
        // Usar filtros locales si están disponibles, sino usar los del hook
        const effectiveStoreId = selectedStoreFilter !== 'all' ? selectedStoreFilter : (filters.storeId && filters.storeId !== 'all' ? filters.storeId : undefined);
        const effectiveCategory = selectedCategoryFilter !== 'all' ? selectedCategoryFilter : (filters.category && filters.category !== 'all' ? filters.category : undefined);
        const effectiveDateFrom = dateRangeStart ? dateRangeStart.toISOString() : (filters.dateFrom || undefined);
        const effectiveDateTo = dateRangeEnd ? new Date(dateRangeEnd.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString() : (filters.dateTo || undefined);

        // Construir la consulta base con los mismos filtros que useSalesData
        // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
        let salesQuery = supabase
          .from('sales')
          .select('id');
          // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically

        // Aplicar filtros de fecha
        if (effectiveDateFrom) {
          salesQuery = salesQuery.gte('created_at', effectiveDateFrom);
        }
        if (effectiveDateTo) {
          salesQuery = salesQuery.lte('created_at', effectiveDateTo);
        }

        // Aplicar filtro de sucursal
        if (effectiveStoreId) {
          salesQuery = salesQuery.eq('store_id', effectiveStoreId);
        }

        // Si hay filtro de categoría, obtener sale_ids primero
        let saleIds: string[] | null = null;
        if (effectiveCategory) {
          // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
          const { data: productsData } = await supabase
            .from('products')
            .select('id')
            // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
            .eq('category', effectiveCategory);

          if (productsData && productsData.length > 0) {
            const productIds = productsData.map((p: any) => p.id);
            // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
            let saleItemsQuery = supabase
              .from('sale_items')
              .select('sale_id, sales!inner(id, company_id, store_id, created_at)')
              // ✅ REMOVED: .eq('sales.company_id', userProfile.company_id) - RLS handles this automatically
              .in('product_id', productIds);

            if (effectiveStoreId) {
              saleItemsQuery = saleItemsQuery.eq('sales.store_id', effectiveStoreId);
            }
            if (effectiveDateFrom) {
              saleItemsQuery = saleItemsQuery.gte('sales.created_at', effectiveDateFrom);
            }
            if (effectiveDateTo) {
              saleItemsQuery = saleItemsQuery.lte('sales.created_at', effectiveDateTo);
            }

            const { data: saleItemsData } = await saleItemsQuery;
            if (saleItemsData && saleItemsData.length > 0) {
              saleIds = [...new Set(saleItemsData.map((item: any) => item.sale_id))];
            } else {
              saleIds = [];
            }
          } else {
            saleIds = [];
          }
        }

        // Si hay filtro de categoría, usar los sale_ids obtenidos
        if (saleIds !== null) {
          if (saleIds.length === 0) {
            setCategoryTotals({ phones: 0, accessories: 0, technical_service: 0 });
            return;
          }
          salesQuery = salesQuery.in('id', saleIds);
        }

        // Obtener todos los sale_ids filtrados
        const { data: salesData } = await salesQuery.select('id');

        if (!salesData || salesData.length === 0) {
          setCategoryTotals({ phones: 0, accessories: 0, technical_service: 0 });
          return;
        }

        const allSaleIds = salesData.map((s: any) => s.id);

        // Obtener todos los items de todas las ventas filtradas
        const { data: allItemsData } = await supabase
          .from('sale_items')
          .select(`
            qty,
            products(category)
          `)
          .in('sale_id', allSaleIds);

        if (!allItemsData) {
          setCategoryTotals({ phones: 0, accessories: 0, technical_service: 0 });
          return;
        }

        // Calcular totales por categoría
        const totals = {
          phones: 0,
          accessories: 0,
          technical_service: 0,
        };

        allItemsData.forEach((item: any) => {
          const category = item.products?.category;
          const quantity = Number(item.qty) || 0;

          if (category === 'phones') {
            totals.phones += quantity;
          } else if (category === 'accessories') {
            totals.accessories += quantity;
          } else if (category === 'technical_service') {
            totals.technical_service += quantity;
          }
        });

        setCategoryTotals(totals);
      } catch (error) {
        console.error('Error calculando totales por categoría:', error);
        setCategoryTotals({ phones: 0, accessories: 0, technical_service: 0 });
      }
    };

    calculateCategoryTotals();
  }, [filters, userProfile?.company_id, data?.totalCount, selectedStoreFilter, selectedCategoryFilter, dateRangeStart, dateRangeEnd]);

  const closePdfPreview = () => {
    if (pdfPreviewUrlRef.current) {
      URL.revokeObjectURL(pdfPreviewUrlRef.current);
      pdfPreviewUrlRef.current = null;
    }
    pdfPreviewDocRef.current = null;
    setPdfPreviewUrl(null);
    setPdfPreviewMeta(null);
    setShowPdfPreview(false);
  };

  const handlePreviewDownload = () => {
    if (!pdfPreviewDocRef.current) {
      toast({
        title: "PDF no disponible",
        description: "Genera nuevamente el reporte para descargarlo.",
      });
      return;
    }
    pdfPreviewDocRef.current.save("reporte-ventas.pdf");
  };

  const handlePreviewPrint = () => {
    if (!pdfPreviewDocRef.current) {
      toast({
        title: "PDF no disponible",
        description: "Genera nuevamente el reporte para imprimirlo.",
      });
      return;
    }
    const printBlob = pdfPreviewDocRef.current.output('blob') as Blob;
    const printUrl = URL.createObjectURL(printBlob);
    const printWindow = window.open(printUrl, '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      toast({
        title: "Ventana bloqueada",
        description: "Permite ventanas emergentes para imprimir el PDF.",
      });
      setTimeout(() => URL.revokeObjectURL(printUrl), 2000);
      return;
    }

    const revokeUrl = () => URL.revokeObjectURL(printUrl);

    printWindow.addEventListener('load', () => {
      try {
        printWindow.focus();
        printWindow.print();
      } finally {
        setTimeout(revokeUrl, 2000);
      }
    });
  };

  const handleGenerateReport = async (reportFilters: {
    storeId: string;
    dateFrom: string;
    dateTo: string;
    categoryId?: string;
  }) => {
    try {
      if (!userProfile?.company_id) {
        toast({
          title: "Error",
          description: "No se pudo obtener la información de la empresa.",
          variant: "destructive",
        });
        return;
      }

      console.log('📊 Generando reporte con filtros:', reportFilters);

      // PASO 1: Obtener IDs de productos por categoría (si se aplica filtro de categoría)
      let categoryProductIds: string[] | null = null;
      if (reportFilters.categoryId && reportFilters.categoryId !== 'all') {
        // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id')
          // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
          .eq('category', reportFilters.categoryId);

        if (productsError) {
          console.error('❌ Error obteniendo productos de categoría:', productsError);
          toast({
            title: "Error",
            description: "No se pudo obtener los productos de la categoría seleccionada.",
            variant: "destructive",
          });
          return;
        }

        if (!productsData || productsData.length === 0) {
          toast({
            title: "Sin datos",
            description: "No hay productos en la categoría seleccionada.",
            variant: "destructive",
          });
          return;
        }

        categoryProductIds = productsData.map((p: any) => p.id);
        console.log('✅ Productos de categoría encontrados:', categoryProductIds.length);
      }

      // PASO 2: Obtener sale_ids filtrados por categoría (si aplica)
      let filteredSaleIds: string[] | null = null;
      if (categoryProductIds && categoryProductIds.length > 0) {
        console.log('🔍 Filtrando por categoría con', categoryProductIds.length, 'productos');
        
        let saleItemsQuery = supabase
          .from('sale_items')
          .select('sale_id, sales!inner(id, company_id, store_id, created_at)')
          .eq('sales.company_id', userProfile.company_id)
          .in('product_id', categoryProductIds);

        // Aplicar filtros de tienda y fecha en la consulta de sale_items
        if (reportFilters.storeId !== 'all') {
          console.log('🏪 Aplicando filtro de tienda en sale_items:', reportFilters.storeId);
          saleItemsQuery = saleItemsQuery.eq('sales.store_id', reportFilters.storeId);
        }

        if (reportFilters.dateFrom) {
          const fromDate = new Date(`${reportFilters.dateFrom}T00:00:00`).toISOString();
          console.log('📅 Aplicando filtro de fecha desde:', fromDate);
          saleItemsQuery = saleItemsQuery.gte('sales.created_at', fromDate);
        }

        if (reportFilters.dateTo) {
          const toDate = new Date(`${reportFilters.dateTo}T23:59:59`).toISOString();
          console.log('📅 Aplicando filtro de fecha hasta:', toDate);
          saleItemsQuery = saleItemsQuery.lte('sales.created_at', toDate);
        }

        const { data: saleItemsData, error: saleItemsError } = await saleItemsQuery;

        if (saleItemsError) {
          console.error('❌ Error obteniendo sale_items filtrados:', saleItemsError);
          console.error('❌ Detalles del error sale_items:', JSON.stringify(saleItemsError, null, 2));
          toast({
            title: "Error",
            description: `No se pudo obtener las ventas filtradas por categoría: ${saleItemsError.message || 'Error desconocido'}`,
            variant: "destructive",
          });
          return;
        }

        if (!saleItemsData || saleItemsData.length === 0) {
          console.log('⚠️ No hay sale_items que coincidan con los filtros');
          toast({
            title: "Sin datos",
            description: "No hay ventas que coincidan con los filtros seleccionados.",
            variant: "destructive",
          });
          return;
        }

        filteredSaleIds = [...new Set(saleItemsData.map((item: any) => item.sale_id))];
        console.log('✅ Ventas filtradas por categoría:', filteredSaleIds.length, 'ventas únicas');
      }

      // PASO 3: Consultar ventas directamente desde Supabase con TODOS los filtros aplicados
      let salesQuery = supabase
        .from('sales')
        .select(`
          id,
          invoice_number,
          customer_id,
          store_id,
          cashier_id,
          subtotal_usd,
          tax_amount_usd,
          total_usd,
          total_bs,
          payment_method,
          is_mixed_payment,
          krece_enabled,
          krece_initial_percentage,
          notes,
          created_at,
          updated_at,
          customers(id, name),
          stores(id, name)
        `)
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .order('created_at', { ascending: false });

      // Aplicar filtro de sale_ids si se filtró por categoría
      if (filteredSaleIds && filteredSaleIds.length > 0) {
        salesQuery = salesQuery.in('id', filteredSaleIds);
      } else if (reportFilters.categoryId && reportFilters.categoryId !== 'all' && categoryProductIds && categoryProductIds.length === 0) {
        // Si se filtró por categoría pero no hay productos en esa categoría, no hay ventas
        toast({
          title: "Sin datos",
          description: "No hay productos en la categoría seleccionada.",
          variant: "destructive",
        });
        return;
      }

      // Aplicar filtros de fecha (solo si NO se filtró por categoría, porque ya se aplicaron en sale_items)
      if (reportFilters.dateFrom && !filteredSaleIds) {
        const fromDate = new Date(`${reportFilters.dateFrom}T00:00:00`).toISOString();
        salesQuery = salesQuery.gte('created_at', fromDate);
      }

      if (reportFilters.dateTo && !filteredSaleIds) {
        const toDate = new Date(`${reportFilters.dateTo}T23:59:59`).toISOString();
        salesQuery = salesQuery.lte('created_at', toDate);
      }

      // Aplicar filtro de sucursal (solo si NO se filtró por categoría, porque ya se aplicó en sale_items)
      if (reportFilters.storeId !== 'all' && !filteredSaleIds) {
        salesQuery = salesQuery.eq('store_id', reportFilters.storeId);
      }

      console.log('📊 Ejecutando consulta de ventas con filtros:', {
        hasCategoryFilter: !!filteredSaleIds,
        filteredSaleIdsCount: filteredSaleIds?.length || 0,
        dateFrom: reportFilters.dateFrom,
        dateTo: reportFilters.dateTo,
        storeId: reportFilters.storeId,
      });

      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) {
        console.error('❌ Error obteniendo ventas:', salesError);
        console.error('❌ Detalles del error:', JSON.stringify(salesError, null, 2));
        toast({
          title: "Error",
          description: `No se pudo obtener las ventas para el reporte: ${salesError.message || 'Error desconocido'}`,
          variant: "destructive",
        });
        return;
      }

      if (salesError) {
        console.error('❌ Error obteniendo ventas:', salesError);
        toast({
          title: "Error",
          description: "No se pudo obtener las ventas para el reporte.",
          variant: "destructive",
        });
        return;
      }

      if (!salesData || salesData.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay ventas que coincidan con los filtros seleccionados.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Ventas obtenidas para reporte:', salesData.length);

      // PASO 4: Obtener datos relacionados (cajeros, clientes, tiendas) de forma eficiente
      const cashierIds = [...new Set(salesData.map((sale: any) => sale.cashier_id).filter(id => id))];
      const customerIds = [...new Set(salesData.map((sale: any) => sale.customer_id).filter(id => id))];
      const storeIds = [...new Set(salesData.map((sale: any) => sale.store_id).filter(id => id))];

      // Obtener datos de cajeros (users)
      const usersMap = new Map<string, { id: string; name: string; email: string }>();
      if (cashierIds.length > 0) {
        // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email')
          // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
          .in('id', cashierIds);

        if (usersData) {
          usersData.forEach((user: any) => {
            usersMap.set(user.id, user);
          });
        }
      }

      // Obtener datos de clientes
      const customersMap = new Map<string, { id: string; name: string }>();
      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .in('id', customerIds);

        if (customersData) {
          customersData.forEach((customer: any) => {
            customersMap.set(customer.id, customer);
          });
        }
      }

      // Obtener datos de tiendas
      const storesMap = new Map<string, { id: string; name: string }>();
      if (storeIds.length > 0) {
        // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
        const { data: storesData } = await supabase
          .from('stores')
          .select('id, name')
          // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
          .in('id', storeIds);

        if (storesData) {
          storesData.forEach((store: any) => {
            storesMap.set(store.id, store);
          });
        }
      }

      // PASO 5: Cargar items con categorías para todas las ventas (con filtro de categoría si aplica)
      const salesWithItems = await Promise.all(
        salesData.map(async (sale: any) => {
          let itemsQuery = supabase
            .from('sale_items')
            .select(`
              id,
              product_id,
              product_name,
              product_sku,
              qty,
              price_usd,
              subtotal_usd,
              products(category)
            `)
            .eq('sale_id', sale.id);

          // Si hay filtro de categoría, filtrar items por categoría también
          if (categoryProductIds && categoryProductIds.length > 0) {
            itemsQuery = itemsQuery.in('product_id', categoryProductIds);
          }

          const { data: itemsData, error: itemsError } = await itemsQuery;

          if (itemsError) {
            console.error('Error obteniendo items para venta:', sale.id, itemsError);
            return null; // Retornar null para filtrar después
          }

          if (!itemsData || itemsData.length === 0) {
            return null; // Filtrar ventas sin items
          }

          const items = itemsData.map((item: any) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            return {
              id: item.id,
              product_id: item.product_id,
              product_name: item.product_name || 'Producto sin nombre',
              product_sku: item.product_sku || 'N/A',
              quantity: Number(item.qty) || 0,
              unit_price_usd: Number(item.price_usd) || 0,
              total_price_usd: Number(item.subtotal_usd) || 0,
              category: product?.category || undefined,
            };
          });

          // Enriquecer datos de la venta usando los mapas
          const customer = sale.customer_id ? customersMap.get(sale.customer_id) : null;
          const store = sale.store_id ? storesMap.get(sale.store_id) : null;
          const cashier = sale.cashier_id ? usersMap.get(sale.cashier_id) : null;

          return {
            ...sale,
            customer_name: customer?.name || 'Sin cliente',
            store_name: store?.name || 'Sin sucursal',
            cashier_name: cashier?.name || cashier?.email || 'Sin cajero',
            items,
          };
        })
      );

      // Filtrar ventas nulas (sin items)
      const finalFilteredSales = salesWithItems.filter((sale): sale is NonNullable<typeof salesWithItems[0]> => sale !== null);

      if (!finalFilteredSales.length) {
        toast({
          title: "Sin datos",
          description: "No hay ventas con productos que coincidan con los filtros seleccionados.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Ventas finales para reporte:', finalFilteredSales.length);

      const appliedFilters: SalesFilters = {
        storeId: reportFilters.storeId !== 'all' ? reportFilters.storeId : undefined,
        dateFrom: reportFilters.dateFrom || undefined,
        dateTo: reportFilters.dateTo || undefined,
        category: reportFilters.categoryId || undefined,
      };

      const storeName = stores.find(store => store.id === reportFilters.storeId)?.name;
      const companyDisplayName =
        (userProfile as any)?.company?.name ??
        (userProfile as any)?.company_name ??
        "Reporte de Ventas";
      
      const pdf = generateSalesReportPdf({
        sales: finalFilteredSales,
        filters: appliedFilters,
        storeName,
        companyName: companyDisplayName,
      });
      
      if (pdfPreviewUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewUrlRef.current);
      }
      
      const blob = pdf.output('blob') as Blob;
      const blobUrl = URL.createObjectURL(blob);
      pdfPreviewDocRef.current = pdf;
      pdfPreviewUrlRef.current = blobUrl;
      setPdfPreviewUrl(blobUrl);
      setPdfPreviewMeta({
        count: finalFilteredSales.length,
        storeName,
        dateFrom: reportFilters.dateFrom,
        dateTo: reportFilters.dateTo,
      });
      setShowPdfDialog(false);
      setShowPdfPreview(true);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF.",
        variant: "destructive",
      });
    }
  };

  const getPaymentMethodBadge = (method: string, isMixed: boolean) => {
    if (isMixed) {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700">Mixto</Badge>;
    }
    
    switch (method) {
      case 'cash_usd':
        return <Badge variant="outline" className="bg-green-50 text-green-600 shadow-sm">Efectivo USD</Badge>;
      case 'cash_bs':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Efectivo BS</Badge>;
      case 'card':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700">Tarjeta</Badge>;
      case 'transfer':
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-700">Transferencia</Badge>;
      case 'binance':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Binance</Badge>;
      case 'zelle':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700">Zelle</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const getKreceBadge = (sale: any) => {
    if (sale.krece_enabled) {
      // Determinar tipo de financiamiento desde notes
      const financingType = sale.notes?.includes('financing_type:cashea') ? 'cashea' : 
                           sale.notes?.includes('financing_type:krece') ? 'krece' : 
                           'krece'; // Por defecto KRECE para compatibilidad
      
      const isCashea = financingType === 'cashea';
      
      return (
        <div className="flex space-x-1">
          <Badge variant="outline" className={isCashea ? "bg-purple-50 text-purple-700" : "bg-red-50 text-red-700"}>
            {isCashea ? 'CASHEA' : 'KRECE'}
          </Badge>
          {sale.krece_initial_percentage && (
            <Badge variant="outline" className={isCashea ? "bg-purple-100 text-purple-800" : "bg-orange-50 text-orange-700"}>
              {sale.krece_initial_percentage}%
            </Badge>
          )}
        </div>
      );
    }
    
    // Si no es financiamiento, mostrar "DE CONTADO" en verde
    return (
      <Badge variant="outline" className="bg-green-50 text-green-600 shadow-sm">
        DE CONTADO
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    // Convertir a fecha local y formatear correctamente
    const date = new Date(dateString);
    return date.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Formato 24 horas
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Usar zona horaria local
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== null && value !== ''
    ).length;
  };

  const handleViewSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setShowSaleDetail(true);
  };

  // Función para cargar items de una venta (igual que en SaleDetailModal)
  const fetchSaleItems = useCallback(async (saleId: string) => {
    // Verificar si ya está cargando usando ref
    if (loadingItemsRef.current[saleId]) {
      console.log(`ℹ️ Ya se está cargando venta ${saleId}, omitiendo carga duplicada`);
      return;
    }

    // Verificar si ya están cargados usando ref
    if (loadedSaleIdsRef.current.has(saleId)) {
      console.log(`ℹ️ Items ya cargados para venta ${saleId}, omitiendo carga`);
      return;
    }

    // Marcar como cargando
    loadingItemsRef.current[saleId] = true;
    setLoadingItems(prev => ({ ...prev, [saleId]: true }));

    try {
      console.log('📦 Cargando items de venta:', saleId);

      // Fetch sale items - OPTIMIZADO: Select Minimal
      const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select('id, product_id, product_name, qty, price_usd, subtotal_usd')
        .eq('sale_id', saleId);

      if (itemsError) {
        console.error('❌ Error obteniendo items:', itemsError);
        throw itemsError;
      }

      console.log(`📋 Items obtenidos de Supabase para venta ${saleId}:`, itemsData?.length || 0, itemsData);

      // Obtener categorías de los productos si hay items
      let itemsWithCategory = (itemsData || []).map((item: any) => ({
        id: item.id,
        product_name: item.product_name || 'Producto',
        product_sku: item.product_sku || '',
        quantity: Number(item.qty) || 0,
        unit_price_usd: Number(item.price_usd) || 0,
        total_price_usd: Number(item.subtotal_usd) || 0,
        product_id: item.product_id,
        category: undefined as string | undefined, // Se llenará después si hay product_id
      }));

      console.log(`📦 Items transformados (antes de categorías) para venta ${saleId}:`, itemsWithCategory.length, itemsWithCategory);

      // Si hay items, obtener las categorías de los productos
      if (itemsWithCategory.length > 0 && userProfile?.company_id) {
        const productIds = itemsWithCategory
          .map(item => item.product_id)
          .filter(id => id) as string[];

        if (productIds.length > 0) {
          // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('id, category')
            // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
            .in('id', productIds);

          if (!productsError && productsData) {
            const categoryMap = new Map(
              productsData.map((p: any) => [p.id, p.category])
            );

            itemsWithCategory = itemsWithCategory.map(item => ({
              ...item,
              category: categoryMap.get(item.product_id),
            }));

            console.log(`🏷️ Categorías obtenidas para venta ${saleId}:`, categoryMap);
          }
        }
      }

      console.log(`✅ Items finales cargados para venta ${saleId}:`, itemsWithCategory.length, itemsWithCategory);

      // Marcar como cargado
      loadedSaleIdsRef.current.add(saleId);
      
      setExpandedSaleItems(prev => ({
        ...prev,
        [saleId]: itemsWithCategory,
      }));

    } catch (error) {
      console.error('❌ Error cargando items de venta:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos de esta venta",
        variant: "destructive",
      });
    } finally {
      loadingItemsRef.current[saleId] = false;
      setLoadingItems(prev => ({ ...prev, [saleId]: false }));
    }
  }, [userProfile?.company_id, toast]);

  // Cargar items cuando se expande el acordeón
  useEffect(() => {
    if (expandedSaleId) {
      console.log('🔄 useEffect detectó cambio en expandedSaleId:', expandedSaleId);
      fetchSaleItems(expandedSaleId);
    } else {
      console.log('🔄 useEffect: expandedSaleId es null, no se cargarán items');
    }
  }, [expandedSaleId, fetchSaleItems]);

  const handleDeleteSale = (saleId: string, invoiceNumber: string) => {
    if (!userProfile?.company_id) {
      toast({
        title: "Error",
        description: "No se pudo identificar la empresa",
        variant: "destructive",
      });
      return;
    }

    setSaleToDelete({ id: saleId, invoice_number: invoiceNumber });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!saleToDelete || !userProfile?.company_id) return;

    setDeletingSale(true);

    try {
      // Llamar a la función RPC delete_sale_and_restore_inventory
      const { data: result, error } = await supabase.rpc('delete_sale_and_restore_inventory', {
        p_sale_id: saleToDelete.id
      });

      if (error) {
        console.error('Error deleting sale:', error);
        throw new Error(error.message);
      }

      // Verificar si la respuesta es exitosa
      // La función puede retornar un objeto con success o directamente un mensaje
      if (result) {
        const response = result as any;
        
        // Si retorna un objeto con success
        if (response.success === true || response.success === false) {
          if (response.success) {
            toast({
              title: "Venta eliminada",
              description: response.message || `La venta ${saleToDelete.invoice_number} ha sido eliminada exitosamente. Se repuso el inventario.`,
            });
            
            // Refresh the data to update the list
            refreshData();
            
            // Close modal
            setShowDeleteModal(false);
            setSaleToDelete(null);
          } else {
            throw new Error(response.error || response.message || 'Error desconocido al eliminar la venta');
          }
        } else {
          // Si retorna directamente un mensaje de éxito (string o UUID)
          toast({
            title: "Venta eliminada",
            description: `La venta ${saleToDelete.invoice_number} ha sido eliminada exitosamente. Se repuso el inventario.`,
          });
          
          // Refresh the data to update the list
          refreshData();
          
          // Close modal
          setShowDeleteModal(false);
          setSaleToDelete(null);
        }
      } else {
        throw new Error('No se recibió respuesta del servidor');
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: "Error al eliminar venta",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDeletingSale(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSaleToDelete(null);
  };

  // Obtener sucursales disponibles
  useEffect(() => {
    const fetchStores = async () => {
      if (!userProfile?.company_id) return;

      try {
        // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
        let query = (supabase as any)
          .from('stores')
          .select('id, name')
          // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
          .eq('active', true)
          .order('name');

      // 🛡️ SEGURIDAD: RLS maneja el filtrado automáticamente
      // El backend solo retorna stores que el usuario tiene permiso de ver
      // No necesitamos filtrar por roles en el frontend

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching stores:', error);
          return;
        }

        setStores(data || []);
      } catch (error) {
        console.error('Error in fetchStores:', error);
      }
    };

    fetchStores();
  }, [userProfile?.company_id, userProfile?.role, userProfile?.assigned_store_id]);

  // Calcular fechas según el rango predefinido seleccionado
  useEffect(() => {
    if (dateRangePreset === 'custom') {
      // Si es custom, usar las fechas seleccionadas manualmente
      return;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final del día de hoy
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Inicio del día

    switch (dateRangePreset) {
      case 'today':
        setDateRangeStart(new Date(startDate));
        setDateRangeEnd(new Date(today));
        break;
      case '3days':
        startDate.setDate(startDate.getDate() - 2); // Últimos 3 días (incluyendo hoy)
        setDateRangeStart(new Date(startDate));
        setDateRangeEnd(new Date(today));
        break;
      case '5days':
        startDate.setDate(startDate.getDate() - 4); // Últimos 5 días (incluyendo hoy)
        setDateRangeStart(new Date(startDate));
        setDateRangeEnd(new Date(today));
        break;
      case '10days':
        startDate.setDate(startDate.getDate() - 9); // Últimos 10 días (incluyendo hoy)
        setDateRangeStart(new Date(startDate));
        setDateRangeEnd(new Date(today));
        break;
      case '15days':
        startDate.setDate(startDate.getDate() - 14); // Últimos 15 días (incluyendo hoy)
        setDateRangeStart(new Date(startDate));
        setDateRangeEnd(new Date(today));
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 29); // Últimos 30 días (incluyendo hoy)
        setDateRangeStart(new Date(startDate));
        setDateRangeEnd(new Date(today));
        break;
      default:
        break;
    }
  }, [dateRangePreset]);

  // Aplicar filtros cuando cambien los filtros rápidos
  useEffect(() => {
    const newFilters: Partial<SalesFilters> = {};

    // Sincronizar filtros rápidos con los filtros globales
    if (selectedStoreFilter && selectedStoreFilter !== 'all') {
      newFilters.storeId = selectedStoreFilter;
    } else {
      // Si se limpia, eliminar el filtro de storeId
      newFilters.storeId = undefined;
    }

    if (selectedCategoryFilter && selectedCategoryFilter !== 'all') {
      newFilters.category = selectedCategoryFilter;
    } else {
      // Si se limpia, eliminar el filtro de category
      newFilters.category = undefined;
    }

    if (dateRangeStart) {
      // Incluir hora 00:00:00 para inicio del día
      const startDate = new Date(dateRangeStart);
      startDate.setHours(0, 0, 0, 0);
      newFilters.dateFrom = startDate.toISOString();
    } else {
      // Si se limpia, eliminar el filtro de dateFrom
      newFilters.dateFrom = undefined;
    }

    if (dateRangeEnd) {
      // Incluir hora 23:59:59 para final del día
      const endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999);
      newFilters.dateTo = endDate.toISOString();
    } else {
      // Si se limpia, eliminar el filtro de dateTo
      newFilters.dateTo = undefined;
    }

    // Actualizar solo estos filtros específicos, manteniendo otros filtros del panel avanzado
    setFilters(newFilters);
  }, [selectedStoreFilter, selectedCategoryFilter, dateRangeStart, dateRangeEnd, setFilters]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Receipt className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar ventas</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center sm:text-3xl">
            <Receipt className="w-6 h-6 mr-2 sm:w-8 sm:h-8 sm:mr-3" />
            Gestión de Ventas
          </h1>
          <Badge
            variant="secondary"
            className="w-fit text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-accent-primary text-white shadow-md shadow-accent-primary/50"
          >
            v-valid
          </Badge>
          <p className="text-sm text-muted-foreground sm:text-base sm:mt-2">
            Administra y analiza todas las ventas de tu empresa
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <Button
            variant="outline"
            onClick={handleOpenFilters}
            className="relative w-full sm:w-auto"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {getActiveFiltersCount() > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>
          <Button variant="outline" onClick={refreshData} disabled={loading} className="w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={handleExport} disabled={loading || !data?.sales.length} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            onClick={handleOpenPdfDialog}
            disabled={loading || !data?.sales.length}
            className="w-full sm:w-auto"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Generar Reportes
          </Button>
          {(filters.storeId && filters.storeId !== 'all') || selectedStoreFilter !== 'all' ? (
            <Button
              variant="secondary"
              onClick={handleOpenStorePdfDialog}
              disabled={loading || !data?.sales.length}
              className="w-full sm:w-auto"
            >
              <FileDown className="w-4 h-4 mr-2" />
              PDF Sucursal
            </Button>
          ) : null}
        </div>
      </div>

      {/* Statistics Cards */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4 sm:p-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl">{formatCurrency(data.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                en ventas totales
              </p>
            </CardContent>
          </Card>

          <Card className="p-4 sm:p-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl">{formatCurrency(data.averageAmount)}</div>
              <p className="text-xs text-muted-foreground">
                ticket promedio
              </p>
            </CardContent>
          </Card>

          <Card className="p-4 sm:p-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Páginas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl">{data.currentPage} / {data.totalPages}</div>
              <p className="text-xs text-muted-foreground">
                página actual
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card className="shadow-lg shadow-green-500/50 border border-green-500/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filtros Avanzados
                </CardTitle>
                <CardDescription>
                  Filtra las ventas por diferentes criterios
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Fecha Desde</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={localFilters.dateFrom || ''}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Fecha Hasta</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={localFilters.dateTo || ''}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>

              {/* Amount Range */}
              <div className="space-y-2">
                <Label htmlFor="minAmount">Monto Mínimo (USD)</Label>
                <Input
                  id="minAmount"
                  type="number"
                  step="0.01"
                  value={localFilters.minAmount || ''}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, minAmount: parseFloat(e.target.value) || undefined }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAmount">Monto Máximo (USD)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  step="0.01"
                  value={localFilters.maxAmount || ''}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, maxAmount: parseFloat(e.target.value) || undefined }))}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select
                  value={localFilters.paymentMethod || 'all'}
                  onValueChange={(value) => setLocalFilters(prev => ({ ...prev, paymentMethod: value === 'all' ? undefined : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="cash_usd">Efectivo USD</SelectItem>
                    <SelectItem value="cash_bs">Efectivo BS</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Term */}
              <div className="space-y-2">
                <Label htmlFor="searchTerm">Búsqueda General</Label>
                <Input
                  id="searchTerm"
                  placeholder="Factura, cliente, cédula..."
                  value={localFilters.searchTerm || ''}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, searchTerm: e.target.value || undefined }))}
                />
              </div>

              {/* Invoice Number */}
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Número de Factura</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="Ej: POS-2024-001"
                  value={localFilters.invoiceNumber || ''}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, invoiceNumber: e.target.value || undefined }))}
                />
              </div>

              {/* Krece Filter */}
              <div className="space-y-2">
                <Label>Filtro KRECE</Label>
                <Select
                  value={localFilters.kreceOnly ? 'true' : 'false'}
                  onValueChange={(value) => setLocalFilters(prev => ({ ...prev, kreceOnly: value === 'true' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Todas las ventas</SelectItem>
                    <SelectItem value="true">Solo ventas KRECE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClearFilters}>
                Limpiar Filtros
              </Button>
              <Button onClick={handleApplyFilters}>
                Aplicar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            {/* Primera fila: Título y Registros por página */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <CardTitle>Historial de Ventas</CardTitle>
                  <CardDescription>
                    {data ? `Mostrando ${data.sales.length} de ${data.totalCount} ventas` : 'Cargando ventas...'}
                  </CardDescription>
                </div>
                {/* Badges dinámicos de categorías */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Badge Teléfonos - Verde */}
                  <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm font-semibold shadow-md shadow-green-500/50">
                    Teléfonos {categoryTotals.phones}
                  </Badge>
                  {/* Badge Accesorios - Rojo */}
                  <Badge className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-sm font-semibold">
                    Accesorios {categoryTotals.accessories}
                  </Badge>
                  {/* Badge Servicio Técnico - Morado */}
                  <Badge className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-sm font-semibold">
                    Servicio {categoryTotals.technical_service}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="pageSize" className="whitespace-nowrap">Registros por página:</Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(parseInt(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Segunda fila: Filtros rápidos */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
              {/* Filtro por Sucursal */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="storeFilter" className="text-sm whitespace-nowrap">Sucursal:</Label>
                <Select value={selectedStoreFilter} onValueChange={setSelectedStoreFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Categoría */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="categoryFilter" className="text-sm whitespace-nowrap">Categoría:</Label>
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Rango de Fechas - Select de Rangos Predefinidos */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="dateRangePreset" className="text-sm whitespace-nowrap">Rango:</Label>
                <Select value={dateRangePreset} onValueChange={(value) => {
                  setDateRangePreset(value);
                  // Si se selecciona un rango predefinido, las fechas se calcularán automáticamente en el useEffect
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar rango" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Rango del día</SelectItem>
                    <SelectItem value="3days">Últimos 3 días</SelectItem>
                    <SelectItem value="5days">Últimos 5 días</SelectItem>
                    <SelectItem value="10days">Últimos 10 días</SelectItem>
                    <SelectItem value="15days">Últimos 15 días</SelectItem>
                    <SelectItem value="30days">Últimos 30 días</SelectItem>
                    <SelectItem value="custom">Rango personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inputs de Fecha con Calendario - Siempre visibles */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="dateStart" className="text-sm whitespace-nowrap">Desde:</Label>
                <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        id="dateStart"
                        type="date"
                        value={dateRangeStart ? format(dateRangeStart, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          setDateRangeStart(date);
                          setDateRangePreset('custom'); // Cambiar a custom si se edita manualmente
                        }}
                        className="w-[150px] pr-8"
                        placeholder="Seleccionar fecha"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStartCalendar(!showStartCalendar)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600 cursor-pointer hover:text-green-700"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRangeStart || undefined}
                      onSelect={(date) => {
                        setDateRangeStart(date || null);
                        setShowStartCalendar(false);
                        setDateRangePreset('custom'); // Cambiar a custom si se selecciona desde calendario
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="dateEnd" className="text-sm whitespace-nowrap">Hasta:</Label>
                <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        id="dateEnd"
                        type="date"
                        value={dateRangeEnd ? format(dateRangeEnd, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          setDateRangeEnd(date);
                          setDateRangePreset('custom'); // Cambiar a custom si se edita manualmente
                        }}
                        className="w-[150px] pr-8"
                        placeholder="Seleccionar fecha"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEndCalendar(!showEndCalendar)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600 cursor-pointer hover:text-green-700"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRangeEnd || undefined}
                      onSelect={(date) => {
                        setDateRangeEnd(date || null);
                        setShowEndCalendar(false);
                        setDateRangePreset('custom'); // Cambiar a custom si se selecciona desde calendario
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Botón para limpiar filtros rápidos */}
              {(selectedStoreFilter !== 'all' || selectedCategoryFilter !== 'all' || dateRangePreset !== 'custom' || dateRangeStart || dateRangeEnd) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedStoreFilter('all');
                    setSelectedCategoryFilter('all');
                    setDateRangePreset('custom');
                    setDateRangeStart(null);
                    setDateRangeEnd(null);
                  }}
                  className="ml-auto"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Cargando ventas...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-sm shadow-md shadow-green-500/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tienda</TableHead>
                      <TableHead>Total USD</TableHead>
                      <TableHead>Total BS</TableHead>
                      <TableHead>Método de Pago</TableHead>
                      <TableHead>KRECE</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Detalles</TableHead>
                      <TableHead>Eliminar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.sales.map((sale) => {
                      const isExpanded = expandedSaleId === sale.id;
                      // Usar items cargados dinámicamente si están disponibles, sino usar sale.items como fallback
                      const itemsToDisplay = expandedSaleItems[sale.id] || sale.items || [];
                      const hasItems = itemsToDisplay.length > 0;
                      const isLoading = loadingItems[sale.id] || false;
                      
                      return (
                        <>
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">
                              {sale.invoice_number}
                            </TableCell>
                            <TableCell>
                              {formatDate(sale.created_at)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{sale.customer_name}</div>
                                {sale.customer_id_number && (
                                  <div className="text-sm text-muted-foreground">
                                    {sale.customer_id_number}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{sale.store_name}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(sale.total_usd)}
                            </TableCell>
                            <TableCell>
                              Bs {sale.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {getPaymentMethodBadge(sale.payment_method, sale.is_mixed_payment)}
                            </TableCell>
                            <TableCell>
                              {getKreceBadge(sale)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-medium shadow-md shadow-green-500/50"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3 w-3" />
                                    Ocultar
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3" />
                                    Ver detalles
                                  </>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSale(sale.id)}
                                className="flex items-center gap-1 border-green-600 text-green-600 hover:bg-green-600 hover:text-white dark:bg-gray-800 dark:text-green-500 dark:border-green-500 shadow-sm"
                              >
                                <Eye className="h-3 w-3" />
                                Ver factura
                              </Button>
                            </TableCell>
                            <TableCell>
                              {/* 🛡️ Conditional Rendering: Solo admins pueden eliminar ventas */}
                              {userProfile?.role === 'master_admin' || userProfile?.role === 'admin' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSale(sale.id, sale.invoice_number)}
                                  className="flex items-center justify-center h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${sale.id}-details`}>
                              <TableCell colSpan={11} className="bg-muted/30 p-0">
                                <div className="p-4 space-y-2">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Package className="h-4 w-4 text-primary" />
                                    <h4 className="font-semibold text-sm">Productos de {sale.invoice_number}</h4>
                                  </div>
                                  {isLoading ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                      <div className="flex items-center justify-center gap-2">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <p className="text-sm">Cargando productos...</p>
                                      </div>
                                    </div>
                                  ) : hasItems ? (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left py-2 px-3 font-medium">SKU</th>
                                            <th className="text-left py-2 px-3 font-medium">Producto</th>
                                            <th className="text-left py-2 px-3 font-medium">Categoría</th>
                                            <th className="text-right py-2 px-3 font-medium">Cantidad</th>
                                            <th className="text-right py-2 px-3 font-medium">Precio Unit.</th>
                                            <th className="text-right py-2 px-3 font-medium">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {itemsToDisplay.map((item) => (
                                            <tr key={item.id} className="border-b last:border-b-0">
                                              <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                                                {item.product_sku || 'N/A'}
                                              </td>
                                              <td className="py-2 px-3 font-medium">
                                                {item.product_name || 'Producto sin nombre'}
                                              </td>
                                              <td className="py-2 px-3">
                                                {item.category ? (
                                                  <Badge variant="outline" className="text-xs">
                                                    {PRODUCT_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                                                  </Badge>
                                                ) : (
                                                  <span className="text-xs text-muted-foreground">Sin categoría</span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3 text-right font-medium">
                                                {item.quantity || 0}
                                              </td>
                                              <td className="py-2 px-3 text-right">
                                                {formatCurrency(item.unit_price_usd || 0)}
                                              </td>
                                              <td className="py-2 px-3 text-right font-medium text-green-600">
                                                {formatCurrency(item.total_price_usd || 0)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                      <p className="text-sm">No se encontraron productos para esta venta.</p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {data.currentPage} de {data.totalPages} ({data.totalCount} registros totales)
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(
                          data.totalPages - 4,
                          Math.max(1, page - 2)
                        )) + i;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className="w-8"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= data.totalPages}
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Sale Detail Modal */}
      <SaleDetailModal
        saleId={selectedSaleId}
        open={showSaleDetail}
        onOpenChange={setShowSaleDetail}
        onSaleDeleted={refreshData}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        saleData={saleToDelete ? {
          id: saleToDelete.id,
          invoice_number: saleToDelete.invoice_number
        } : undefined}
        loading={deletingSale}
      />

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={showPdfDialog}
        onOpenChange={(open) => {
          setShowPdfDialog(open);
          if (!open) {
            setLockPdfStore(false);
          }
        }}
        onGenerate={handleGenerateReport}
        stores={stores}
        loading={loading}
        lockStore={lockPdfStore}
        lockedStoreId={lockPdfStore ? pdfStoreId : undefined}
        showCategoryFilter={true}
        title="Generar Reporte de Ventas"
        description="Selecciona los filtros para generar el reporte en PDF."
      />

      {/* PDF Preview Modal */}
      <Dialog
        open={showPdfPreview}
        onOpenChange={(open) => {
          if (!open) {
            closePdfPreview();
          } else {
            setShowPdfPreview(true);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Vista previa del reporte</DialogTitle>
            <DialogDescription>
              {pdfPreviewMeta
                ? `${pdfPreviewMeta.count} ventas • ${pdfPreviewMeta.storeName || 'Todas las sucursales'}${pdfPreviewMeta.dateFrom || pdfPreviewMeta.dateTo ? ` • ${pdfPreviewMeta.dateFrom || 'Inicio'} - ${pdfPreviewMeta.dateTo || 'Hoy'}` : ''}`
                : 'Visualiza el contenido del reporte antes de descargar o imprimir.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 shadow-md shadow-green-500/50 rounded-sm overflow-hidden">
            {pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                title="Vista previa del PDF"
                className="w-full h-[70vh]"
              />
            ) : (
              <div className="h-[70vh] flex items-center justify-center text-sm text-muted-foreground">
                Generando vista previa...
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
            <div className="text-xs text-muted-foreground">
              Puedes descargar o imprimir directamente desde esta vista previa.
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button variant="outline" onClick={handlePreviewPrint} disabled={!pdfPreviewDocRef.current}>
                Imprimir
              </Button>
              <Button variant="secondary" onClick={handlePreviewDownload} disabled={!pdfPreviewDocRef.current}>
                Descargar PDF
              </Button>
              <Button onClick={closePdfPreview}>
                Cerrar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
