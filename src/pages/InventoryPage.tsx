import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Package, AlertTriangle, Edit, Plus, ArrowRightLeft } from 'lucide-react';
import { InventoryForm } from '@/components/pos/InventoryForm';
import { InventoryStatsCards } from '@/components/inventory/InventoryStatsCards';
import { TransferModal } from '@/components/inventory/TransferModal';
import { TransferHistory } from '@/components/inventory/TransferHistory';
import { useInventory } from '@/contexts/InventoryContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizeInventoryData, fixNegativeStock } from '@/utils/inventoryValidation';
import { Switch } from '@/components/ui/switch';
import { PRODUCT_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import {
  groupProductsBySku,
  sortInventoryItems,
  getStoreStockVisuals,
} from '@/lib/inventory/helpers';
import {
  InventoryItem,
  InventoryStore,
  SortByOption,
  SortOrderOption,
} from '@/types/inventory';
import { GenerateReportModal } from '@/components/reports/GenerateReportModal';
import { generateInventoryReportPDFExtended } from '@/lib/reports/inventoryReport';
import { format } from 'date-fns';
import { FileDown } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { inventory, loading, fetchInventory, updateInventoryItem } = useInventory();
  const [stores, setStores] = useState<InventoryStore[]>([]);
  // Inventario crudo usado para el grid principal (misma fuente que los reportes de productos)
  const [pageInventory, setPageInventory] = useState<InventoryItem[]>([]);
  const [pageInventoryLoading, setPageInventoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [transferringProduct, setTransferringProduct] = useState<{
    id: string;
    name: string;
    sku: string;
    currentStore: {
      id: string;
      name: string;
      qty: number;
    };
  } | null>(null);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [storesLoading, setStoresLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortByOption>('name');
  const [sortOrder, setSortOrder] = useState<SortOrderOption>('asc');
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleGenerateInventoryReport = async (reportFilters: {
    storeId: string;
    dateFrom: string;
    dateTo: string;
    categoryId?: string;
  }) => {
    try {
      setGeneratingReport(true);

      // Filtrar inventario según los filtros del reporte
      let filteredInventory = [...inventory];

      // Filtrar por sucursal
      if (reportFilters.storeId !== 'all') {
        filteredInventory = filteredInventory.filter(
          item => item.store_id === reportFilters.storeId
        );
      }

      // Filtrar por categoría si está seleccionada
      if (reportFilters.categoryId && reportFilters.categoryId !== 'all') {
        filteredInventory = filteredInventory.filter(
          item => item.product?.category === reportFilters.categoryId
        );
      }

      // Calcular estadísticas del inventario filtrado
      const totalProducts = new Set(filteredInventory.map(item => item.product_id)).size;
      const totalStockValue = filteredInventory.reduce(
        (sum, item) => sum + (item.qty * (item.product?.price || 0)),
        0
      );
      const lowStockProducts = filteredInventory.filter(
        item => item.qty > 0 && item.qty <= item.min_qty
      ).length;
      const outOfStockProducts = filteredInventory.filter(
        item => item.qty === 0
      ).length;

      const storeName = stores.find(s => s.id === reportFilters.storeId)?.name;

      // Crear datos del reporte
      const reportData = {
        totalProducts,
        totalStockValue,
        lowStockProducts,
        outOfStockProducts,
        items: filteredInventory,
        storeName,
        dateFrom: reportFilters.dateFrom,
        dateTo: reportFilters.dateTo,
        categoryId: reportFilters.categoryId,
      };

      // Generar metadata del reporte
      const metadata = {
        reportId: `INV-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        period: 'custom',
        companyId: userProfile?.company_id || '',
      };

      // Generar PDF
      const pdf = await generateInventoryReportPDFExtended(reportData, metadata);

      // Descargar el PDF
      pdf.save(`Reporte_Inventario_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast({
        title: "Reporte generado",
        description: "El reporte de inventario se ha descargado exitosamente.",
      });

      setShowReportModal(false);
    } catch (error) {
      console.error("Error generating inventory report:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el reporte de inventario.",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchStores = async () => {
    try {
      if (!userProfile?.company_id) return;

      setStoresLoading(true);
      
      // If user is manager, only show their assigned store
      if (userProfile?.role === 'manager' && userProfile?.assigned_store_id) {
        const { data, error } = await (supabase as any)
          .from('stores')
          .select('id, name')
          .eq('id', userProfile.assigned_store_id)
          .eq('active', true)
          .single();

        if (error) {
          console.error('Error fetching assigned store:', error);
          toast({
            title: "Error",
            description: "No se pudo cargar tu tienda asignada",
            variant: "destructive",
          });
          return;
        }

        setStores(data ? [data] : []);
        // Auto-select the assigned store
        setSelectedStore(data?.id || 'all');
      } else {
        // Admin can see all stores
        const { data, error } = await (supabase as any)
          .from('stores')
          .select('id, name')
          .eq('company_id', userProfile.company_id)
          .eq('active', true)
          .order('name');

        if (error) {
          console.error('Error fetching stores:', error);
          toast({
            title: "Error",
            description: "No se pudieron cargar las tiendas",
            variant: "destructive",
          });
          return;
        }

        setStores(data || []);
      }
    } catch (error) {
      console.error('Error in fetchStores:', error);
      toast({
        title: "Error",
        description: "Error al cargar las tiendas",
        variant: "destructive",
      });
    } finally {
      setStoresLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchStores();
    }
  }, [userProfile?.company_id]);

  // Cargar inventario crudo para el grid (misma fuente que los reportes de productos)
  const fetchPageInventory = async () => {
    try {
      if (!userProfile?.company_id) {
        setPageInventory([]);
        return;
      }
      setPageInventoryLoading(true);

      const { data, error } = await (supabase as any)
        .from('inventories')
        .select(`
          id,
          product_id,
          store_id,
          qty,
          min_qty,
          product:products(name, sku, category, sale_price_usd),
          store:stores(name)
        `)
        .eq('company_id', userProfile.company_id);

      if (error) {
        console.error('Error fetching page inventory:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar el inventario para la vista.",
          variant: "destructive",
        });
        setPageInventory([]);
        return;
      }

      // Normalizar y sanear datos exactamente igual que en InventoryContext
      const normalized = (data || []).map((item: any) => ({
        ...item,
        min_qty: typeof item.min_qty === 'number' ? item.min_qty : 0,
      }));

      const sanitized = sanitizeInventoryData(normalized);

      setPageInventory(sanitized as InventoryItem[]);
    } catch (error) {
      console.error('Error in fetchPageInventory:', error);
      setPageInventory([]);
    } finally {
      setPageInventoryLoading(false);
    }
  };

  // Efecto para recargar inventario cuando cambie el usuario o se fuerce refresco
  useEffect(() => {
    if (userProfile?.company_id) {
      fetchInventory();
      fetchPageInventory();
    }
  }, [userProfile?.company_id, refreshKey]);

  const handleEditInventory = (item: InventoryItem | {
    id: string;
    product_id: string;
    store_id: string;
    qty: number;
    min_qty: number;
    product: {
      name: string;
      sku: string;
      category: string | null;
      sale_price_usd: number;
    };
    store: {
      name: string;
    };
  }) => {
    // Debug: verificar que los datos se estén pasando correctamente
    console.log('Datos pasados a handleEditInventory:', {
      item,
      product_id: item.product_id,
      product: item.product
    });
    
    setEditingInventory(item as InventoryItem);
  };

  const handleFormClose = () => {
    setEditingInventory(null);
  };

  const handleTransferProduct = (product: any, store: any) => {
    // CRÍTICO: Asegurar que product.id esté definido correctamente
    // Si viene de groupedItem, puede que necesite product_id
    const productId = product.id || product.product_id || store?.product_id;
    const storeId = store?.store_id || store?.id;
    const storeName = store?.store_name || store?.name;
    const storeQty = store?.qty || 0;
    
    // Validación exhaustiva de IDs
    if (!productId || productId === 'undefined' || typeof productId !== 'string' || productId.trim() === '') {
      console.error('handleTransferProduct: product.id no está definido o es inválido', { 
        product, 
        store,
        productId,
        productIdType: typeof productId,
        productKeys: product ? Object.keys(product) : null,
        storeKeys: store ? Object.keys(store) : null
      });
      toast({
        title: "Error",
        description: "No se pudo identificar el producto. Por favor, recarga la página e intenta nuevamente.",
        variant: "destructive",
      });
      return;
    }

    if (!storeId || storeId === 'undefined' || typeof storeId !== 'string' || storeId.trim() === '') {
      console.error('handleTransferProduct: store.store_id no está definido o es inválido', { 
        product, 
        store,
        storeId,
        storeIdType: typeof storeId 
      });
      toast({
        title: "Error",
        description: "No se pudo identificar la tienda. Por favor, recarga la página e intenta nuevamente.",
        variant: "destructive",
      });
      return;
    }

    // Validar formato UUID básico
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      console.error('handleTransferProduct: product.id no es un UUID válido', { 
        productId,
        product,
        store 
      });
      toast({
        title: "Error",
        description: `ID de producto inválido: ${productId}. Por favor, recarga la página e intenta nuevamente.`,
        variant: "destructive",
      });
      return;
    }

    if (!uuidRegex.test(storeId)) {
      console.error('handleTransferProduct: store.store_id no es un UUID válido', { 
        storeId,
        product,
        store 
      });
      toast({
        title: "Error",
        description: `ID de tienda inválido: ${storeId}. Por favor, recarga la página e intenta nuevamente.`,
        variant: "destructive",
      });
      return;
    }

    console.log('handleTransferProduct: Datos válidos', {
      productId,
      productName: product.name,
      productSku: product.sku,
      storeId,
      storeName,
      storeQty,
      storeMinQty: store?.min_qty
    });

    setTransferringProduct({
      id: productId,
      name: product.name || 'Producto sin nombre',
      sku: product.sku || '',
      currentStore: {
        id: storeId,
        name: storeName || 'Tienda sin nombre',
        qty: storeQty,
      },
    });
  };

  const handleTransferClose = () => {
    setTransferringProduct(null);
  };

  const handleTransferComplete = () => {
    // Refresh inventory data
    fetchInventory();
    setRefreshKey(prev => prev + 1);
  };

  const handleFormSuccess = () => {
    // Recargar inventario desde el contexto
    fetchInventory();
    
    // Si estamos en vista agrupada, también recargar las tiendas para asegurar datos frescos
    if (selectedStore === 'all') {
      fetchStores();
    }
    
    // Forzar recarga de la vista
    setRefreshKey(prev => prev + 1);
    
    handleFormClose();
    toast({
      title: "Éxito",
      description: "Inventario actualizado correctamente",
    });
  };


  // Fuente de verdad para el grid: inventario crudo de la página si existe,
  // si no, usar el del contexto como respaldo.
  const sourceInventory = pageInventory.length > 0 ? pageInventory : inventory;

  // CRÍTICO: Filtrar inventario para determinar QUÉ PRODUCTOS mostrar
  // pero NO limitar el stock por sucursal (ese se muestra completo)
  const filteredInventoryItems = sourceInventory.filter(item => {
    // Validar que el item tenga la estructura esperada
    if (!item || !item.product || !item.store) {
      console.warn('Item de inventario con estructura esperada:', item);
      return false;
    }

    const matchesSearch = 
      item.product.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      item.product.sku?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (item.product.category && getCategoryLabel(item.product.category).toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    
    // IMPORTANTE: Solo filtrar por tienda si NO estamos en vista agrupada
    // En vista agrupada, queremos mostrar TODAS las tiendas para cada producto
    const matchesStore = selectedStore === 'all' || item.store_id === selectedStore;
    
    // Filtro por categoría: usar el mismo método que en ProductsPage
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || item.product.category === categoryFilter;

    return matchesSearch && matchesStore && matchesCategory;
  });

  // Aplicar ordenamiento a los items filtrados
  const sortedInventoryItems = sortInventoryItems(filteredInventoryItems, sortBy, sortOrder);

  // Calcular stock bajo según la tienda seleccionada
  const lowStockCount = selectedStore === 'all' 
    ? sourceInventory.filter(item => item.qty > 0 && item.qty <= item.min_qty).length
    : filteredInventoryItems.filter(item => item.qty > 0 && item.qty <= item.min_qty).length;

  // CRÍTICO: SIEMPRE usar el INVENTARIO COMPLETO para agrupar por SKU
  // Esto asegura que se muestren TODAS las sucursales para cada producto,
  // independientemente de los filtros aplicados (tienda, categoría, etc.)
  // Solo filtramos por búsqueda y categoría para determinar QUÉ productos mostrar
  const allInventoryForGrouping = sourceInventory.filter(item => {
    // Solo filtrar por búsqueda y categoría, NO por tienda
    // La tienda se usa solo para determinar si el producto debe mostrarse
    if (!item || !item.product || !item.store) return false;
    
    const matchesSearch = 
      item.product.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      item.product.sku?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (item.product.category && getCategoryLabel(item.product.category).toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || item.product.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // SIEMPRE agrupar por SKU para mostrar todas las sucursales
  const groupedData = groupProductsBySku(allInventoryForGrouping, stores);

  // Filtrar productos agrupados según los filtros aplicados
  let filteredGroupedData = groupedData;

  // Si hay filtro de tienda, mostrar solo productos que tienen stock en esa tienda
  if (selectedStore !== 'all') {
    filteredGroupedData = groupedData.filter((item: any) => {
      const hasStockInSelectedStore = item.stores.some((store: any) => 
        store.store_id === selectedStore && store.qty > 0
      );
      return hasStockInSelectedStore;
    });
  }

  // Aplicar filtro de stock bajo
  if (showLowStock) {
    if (selectedStore === 'all') {
      // Filtrar productos con stock bajo en cualquier tienda
      filteredGroupedData = filteredGroupedData.filter((item: any) => item.hasLowStock);
    } else {
      // Filtrar productos con stock bajo en la tienda seleccionada
      filteredGroupedData = filteredGroupedData.filter((item: any) => {
        const storeInSelected = item.stores.find((store: any) => store.store_id === selectedStore);
        return storeInSelected && storeInSelected.qty > 0 && storeInSelected.qty <= storeInSelected.min_qty;
      });
    }
  }

  // SIEMPRE usar vista agrupada para mostrar todas las sucursales
  // Esto asegura consistencia en la UI y permite transferencias desde cualquier sucursal
  const displayData = filteredGroupedData;

  // Debug: mostrar información del filtrado
  console.log('Debug filtrado:', {
    selectedStore,
    showLowStock,
    totalInventory: inventory.length,
    filteredItems: filteredInventoryItems.length,
    groupedData: groupedData.length,
    displayData: displayData.length,
    lowStockCount,
    lowStockItems: selectedStore === 'all' 
      ? inventory.filter(item => item.qty > 0 && item.qty <= item.min_qty).map(item => ({ name: item.product.name, qty: item.qty, min_qty: item.min_qty, store: item.store.name }))
      : filteredInventoryItems.filter(item => item.qty > 0 && item.qty <= item.min_qty).map(item => ({ name: item.product.name, qty: item.qty, min_qty: item.min_qty, store: item.store.name }))
  });


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const renderStockToken = (
    key: string,
    {
      qty,
      minQty,
      label,
      onEdit,
      onTransfer,
    }: {
      qty: number;
      minQty: number;
      label: string;
      onEdit?: () => void;
      onTransfer?: () => void;
    }
  ): React.ReactNode => {
    const { quantityClass, statusText } = getStoreStockVisuals(qty, minQty);
    const showTooltip = minQty > 0;

    const content = (
      <div
        key={key}
        className="flex items-center gap-2 rounded-full border border-border/45 bg-muted/20 px-3 py-1.5 text-[11px]"
      >
        <span className="flex-1 truncate font-medium text-muted-foreground/80">{label}</span>
        <span className={`text-sm font-semibold leading-none ${quantityClass}`}>{qty}</span>
        {statusText && (
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/55">{statusText}</span>
        )}
        <div className="flex items-center gap-1 pl-1">
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-7 w-7 border border-emerald-500/80 text-emerald-500 hover:bg-emerald-500/10"
              title={`Ajustar inventario para ${label}`}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
          {onTransfer && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onTransfer}
              className="h-7 w-7 border border-sky-500/80 text-sky-500 hover:bg-sky-500/10"
              title={`Transferir inventario desde ${label}`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );

    if (showTooltip) {
      return (
        <Tooltip key={key}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="top" align="center" className="px-3 py-2">
            <div className="space-y-0.5 text-left">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">
                {qty === 1 ? '1 unidad disponible' : `${qty} unidades disponibles`}
              </p>
              <p className="text-[11px] text-muted-foreground/80">Mínimo requerido: {minQty}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  if (loading || pageInventoryLoading || storesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <div className="text-lg">Cargando inventario...</div>
          {storesLoading && <div className="text-sm text-muted-foreground">Cargando tiendas...</div>}
        </div>
      </div>
    );
  }

  // Mostrar error si hay problemas con la carga
  if (sourceInventory.length === 0 && !loading && !pageInventoryLoading && userProfile?.company_id) {
    return (
      <div className="space-y-3 xs:space-y-4 sm:space-y-6 p-3 xs:p-4 sm:p-6">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay inventario disponible</h3>
          <p className="text-muted-foreground mb-4">
            No se encontraron productos en el inventario para esta empresa.
          </p>
          <Button onClick={() => {
            fetchInventory();
            fetchStores();
          }} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 xs:space-y-4 sm:space-y-6 p-3 xs:p-4 sm:p-6">
      {/* Header con título y badge de stock bajo - Mobile First */}
      <div className="flex flex-col space-y-2 xs:space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1 xs:space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Inventario</h1>
            <Badge
              variant="secondary"
              className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-green-400 text-black"
            >
              v4-invefix
            </Badge>
          </div>
          <p className="text-xs xs:text-sm lg:text-base text-muted-foreground">
             Gestiona el inventario de productos por tienda
           </p>
         </div>
        <div className="flex items-center gap-2 flex-wrap">
          {userProfile?.role === 'admin' && (
            <Button
              variant="outline"
              onClick={() => setShowTransferHistory(true)}
              className="flex items-center gap-2 text-xs xs:text-sm"
            >
              <ArrowRightLeft className="w-3 h-3 xs:w-4 xs:h-4" />
              Historial de Transferencias
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 text-xs xs:text-sm"
          >
            <FileDown className="w-3 h-3 xs:w-4 xs:h-4" />
            Generar Reportes
          </Button>
        </div>
         {lowStockCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1 w-full xs:w-auto justify-center text-xs xs:text-sm px-2 xs:px-3 py-1 xs:py-1.5">
             <AlertTriangle className="h-3 w-3" />
             <span className="hidden xs:inline">{lowStockCount} productos con stock bajo</span>
             <span className="xs:hidden">{lowStockCount} stock bajo</span>
           </Badge>
         )}
       </div>

      {/* Cards de Estadísticas del Inventario */}
      <InventoryStatsCards selectedStore={selectedStore} />

      {/* Barra de filtros y búsqueda - Una sola fila */}
      <div className="w-full">
        <div className="flex flex-col space-y-2 xs:space-y-3 lg:flex-row lg:items-center lg:space-y-0 lg:gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Buscar productos..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full text-sm h-10"
           />
             {searchTerm !== debouncedSearchTerm && (
               <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
               </div>
             )}
         </div>
         
          {/* Select de tienda - Solo visible para admins */}
          {userProfile?.role === 'admin' && (
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-full xs:w-auto lg:w-48 text-sm h-10">
                <SelectValue placeholder="Filtrar por tienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tiendas</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Mostrar tienda asignada para gerentes */}
          {userProfile?.role === 'manager' && userProfile?.assigned_store_id && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
              <span className="text-sm font-medium">Tienda:</span>
              <span className="text-sm text-muted-foreground">
                {stores.find(s => s.id === userProfile.assigned_store_id)?.name || 'Cargando...'}
              </span>
            </div>
          )}

          {/* Select de categoría - Igual que en ProductsPage */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full xs:w-auto lg:w-48 text-sm h-10">
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

          {/* Controles de ordenamiento */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap hidden lg:inline">
              Ordenar por:
            </label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortByOption)}>
              <SelectTrigger className="w-full xs:w-auto lg:w-40 text-sm h-10">
                <SelectValue placeholder="Campo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
                <SelectItem value="qty">Cantidad</SelectItem>
                <SelectItem value="price">Precio</SelectItem>
                <SelectItem value="category">Categoría</SelectItem>
                <SelectItem value="store">Tienda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap hidden lg:inline">
              Orden:
            </label>
            <Select
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as SortOrderOption)}
            >
              <SelectTrigger className="w-full xs:w-auto lg:w-36 text-sm h-10">
                <SelectValue placeholder="Orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascendente</SelectItem>
                <SelectItem value="desc">Descendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Switch de stock bajo - Toggle */}
           <div className="flex items-center gap-2">
             <Switch
               isSelected={showLowStock}
               onChange={setShowLowStock}
             >
               <AlertTriangle className="h-4 w-4 text-red-600" />
               <span className="hidden xs:inline font-medium text-sm text-gray-700">
                 Solo Stock Bajo
               </span>
               <span className="xs:hidden font-medium text-sm text-gray-700">
                 Stock Bajo
               </span>
             </Switch>
             {showLowStock && lowStockCount > 0 && (
               <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold">
                 {lowStockCount}
               </span>
             )}
           </div>
        </div>
       </div>

      {/* Grid de productos - Vista compacta */}
      <TooltipProvider delayDuration={150}>
        <div className="grid grid-cols-1 gap-3 xs:gap-3 sm:gap-4 md:grid-cols-2">
          {displayData.map((item, index) => {
            if ('stores' in item) {
              const groupedItem = item as any;
              const storesTokens = groupedItem.stores.map((store: any) => {
                const canEdit = userProfile?.role === 'admin' || userProfile?.role === 'manager';
                const canTransfer = userProfile?.role === 'admin' && store.qty > 0;

                return renderStockToken(`${groupedItem.product.sku}-${store.store_id}`, {
                  qty: store.qty,
                  minQty: store.min_qty,
                  label: store.store_name,
                  onEdit: canEdit
                    ? () =>
                        handleEditInventory({
                          id: store.inventory_id || '',
                          product_id: groupedItem.product.id,
                          store_id: store.store_id,
                          qty: store.qty,
                          min_qty: store.min_qty,
                          product: groupedItem.product,
                          store: { name: store.store_name },
                        })
                    : undefined,
                  onTransfer: canTransfer
                    ? () => handleTransferProduct(groupedItem.product, store)
                    : undefined,
                });
              });

              return (
                <Card key={`${groupedItem.product.sku}-${index}`} className="h-full border-border/70">
                  <CardContent className="flex h-full flex-col gap-4 p-4 xs:p-5 lg:p-6">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="flex-1 text-base sm:text-lg font-semibold leading-tight text-foreground">
                          {groupedItem.product.name}
                        </h3>
                        {groupedItem.product.category && (
                          <Badge className="rounded-full bg-neutral-900/90 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-white/80">
                            {getCategoryLabel(groupedItem.product.category)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/75">
                        <span className="truncate">
                          SKU:{' '}
                          <span className="font-medium text-foreground/75">{groupedItem.product.sku}</span>
                        </span>
                        {(groupedItem.totalQty === 0 || groupedItem.hasLowStock) && (
                          <Badge className="rounded-full bg-red-500/75 px-2 py-[2px] text-[10px] font-medium uppercase tracking-wide text-white/85">
                            Stock bajo
                          </Badge>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="flex flex-col gap-0.5 text-[11px] sm:text-xs">
                          <span className="text-muted-foreground/65 text-[10px] uppercase tracking-[0.14em] leading-none">
                            Stock total
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span
                              className={`text-base font-semibold ${
                                groupedItem.totalQty === 0
                                  ? 'text-red-600'
                                  : groupedItem.hasLowStock
                                  ? 'text-red-500'
                                  : 'text-emerald-500'
                              }`}
                            >
                              {groupedItem.totalQty}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">
                              {groupedItem.stores.length} tienda
                              {groupedItem.stores.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 text-[11px] sm:text-xs">
                          <span className="text-muted-foreground/65 text-[10px] uppercase tracking-[0.14em] leading-none">
                            Precio
                          </span>
                          <span className="text-base font-semibold text-foreground">
                            {formatCurrency(groupedItem.product.sale_price_usd)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 text-[11px] sm:text-xs">
                          <span className="text-muted-foreground/65 text-[10px] uppercase tracking-[0.14em] leading-none">
                            Valor total
                          </span>
                          <span className="text-base font-semibold text-sky-500">
                            {formatCurrency(groupedItem.totalValue)}
                          </span>
                        </div>
                      </div>
                    </div>

                  <div className="space-y-2 border-t border-border/60 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Stock por tienda
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">{storesTokens}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            const individualItem = item as InventoryItem;
            const storeLabel = individualItem.store.name;
            const canEditSingle = userProfile?.role === 'admin' || userProfile?.role === 'manager';
            const canTransferSingle = userProfile?.role === 'admin' && individualItem.qty > 0;
            const singleToken = renderStockToken(individualItem.id, {
              qty: individualItem.qty,
              minQty: individualItem.min_qty,
              label: storeLabel,
              onEdit: canEditSingle ? () => handleEditInventory(individualItem) : undefined,
              onTransfer: canTransferSingle
                ? () =>
                    handleTransferProduct(individualItem.product, {
                      store_id: individualItem.store_id,
                      store_name: individualItem.store.name,
                      qty: individualItem.qty,
                      min_qty: individualItem.min_qty,
                      inventory_id: individualItem.id,
                      product_id: individualItem.product_id,
                    })
                : undefined,
            });

            const isLowStockSingle = individualItem.qty === 0 || individualItem.qty < individualItem.min_qty;

            return (
              <Card key={individualItem.id} className="h-full border-border/70">
                <CardContent className="flex h-full flex-col gap-4 p-4 xs:p-5 lg:p-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="flex-1 text-base sm:text-lg font-semibold leading-tight text-foreground">
                        {individualItem.product.name}
                      </h3>
                      <Badge className="rounded-full bg-neutral-900/90 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-white/80">
                        {storeLabel}
                      </Badge>
                      {individualItem.product.category && (
                        <Badge className="rounded-full bg-neutral-900/90 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-white/80">
                          {getCategoryLabel(individualItem.product.category)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/75">
                      <span className="truncate">
                        SKU:{' '}
                        <span className="font-medium text-foreground/75">
                          {individualItem.product.sku}
                        </span>
                      </span>
                      {isLowStockSingle && (
                        <Badge className="rounded-full bg-red-500/75 px-2 py-[2px] text-[10px] font-medium uppercase tracking-wide text-white/85">
                          Stock bajo
                        </Badge>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="flex flex-col gap-0.5 text-[11px] sm:text-xs">
                        <span className="text-muted-foreground/65 text-[10px] uppercase tracking-[0.14em] leading-none">
                          Stock
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-base font-semibold ${
                              individualItem.qty === 0
                                ? 'text-red-600'
                                : individualItem.qty < individualItem.min_qty
                                ? 'text-red-500'
                                : 'text-emerald-500'
                            }`}
                          >
                            {individualItem.qty}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            Mínimo: {individualItem.min_qty}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 text-[11px] sm:text-xs">
                        <span className="text-muted-foreground/65 text-[10px] uppercase tracking-[0.14em] leading-none">
                          Precio
                        </span>
                        <span className="text-base font-semibold text-foreground">
                          {formatCurrency(individualItem.product.sale_price_usd)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-[11px] sm:text-xs">
                        <span className="text-muted-foreground/65 text-[10px] uppercase tracking-[0.14em] leading-none">
                          Valor total
                        </span>
                        <span className="text-base font-semibold text-sky-500">
                          {formatCurrency(individualItem.qty * individualItem.product.sale_price_usd)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-border/60 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Stock de la tienda
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">{singleToken}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Estado vacío - Mobile First */}
      {displayData.length === 0 && (
        <div className="text-center py-6 xs:py-8 sm:py-12">
          <Package className="mx-auto h-6 w-6 xs:h-8 xs:w-8 sm:h-12 sm:w-12 text-muted-foreground mb-2 xs:mb-3 sm:mb-4" />
          <div className="text-xs xs:text-sm sm:text-base text-muted-foreground px-3 xs:px-4">
            {showLowStock ? (
              <div className="space-y-2">
                <div>No hay productos con stock bajo</div>
                <div className="text-xs">Todos los productos tienen stock suficiente</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowLowStock(false)}
                  className="mt-2"
                >
                  Mostrar todos los productos
                </Button>
              </div>
            ) : searchTerm || selectedStore !== 'all' ? (
              'No se encontraron productos que coincidan con los filtros'
            ) : (
              'No hay inventario registrado'
            )}
          </div>
        </div>
      )}

      {/* Modal de formulario */}
      {editingInventory && (
        <InventoryForm
          inventory={editingInventory}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de transferencia */}
      <TransferModal
        isOpen={!!transferringProduct}
        onClose={handleTransferClose}
        product={transferringProduct}
        onTransferComplete={handleTransferComplete}
      />

      {/* Modal de historial de transferencias */}
      <TransferHistory
        isOpen={showTransferHistory}
        onClose={() => setShowTransferHistory(false)}
      />

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        onGenerate={handleGenerateInventoryReport}
        stores={stores.map(s => ({ id: s.id, name: s.name }))}
        loading={generatingReport}
        showCategoryFilter={true}
        title="Generar Reporte de Inventario"
        description="Selecciona los filtros para generar el reporte de inventario en PDF."
      />
    </div>
  );
};
