import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  Package,
  BarChart3,
  Clock,
  Loader2,
  Eye,
  Building2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ShieldCheck,
  X,
  CheckCircle2,
  HelpCircle,
  Info
} from "lucide-react";
import { useReportsData } from "@/hooks/useReportsData";
import { usePaymentMethodsData } from "@/hooks/usePaymentMethodsData";
import { useExecutiveReports } from "@/hooks/useExecutiveReports";
import { supabase } from "@/integrations/supabase/client";
import { Sale } from "@/hooks/useSalesData";
import { 
  downloadSalesReportPDF, 
  downloadProfitabilityReportPDF, 
  downloadInventoryReportPDF 
} from "@/utils/pdfGenerator";
import { formatCurrency } from "@/utils/currency";
import { useAuth } from "@/contexts/AuthContext";
import { PeriodType, ReportMetadata } from "@/types/reports";
import { useToast } from "@/hooks/use-toast";
import { ScheduledReportsCard } from "@/components/reports/ScheduledReportsCard";
import { ReportsHistoryCard } from "@/components/reports/ReportsHistoryCard";
import { GenerateReportModal } from '@/components/reports/GenerateReportModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ReportsNew() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'thisMonth'>('today');
  const { salesData, profitabilityData, inventoryData, loading, error, fetchCurrencyAuditData } = useReportsData(selectedPeriod);
  const { data: paymentMethodsData } = usePaymentMethodsData(selectedPeriod);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const { company, userProfile } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'sales' | 'profitability' | 'inventory' | null>(null);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  
  // ✅ NUEVO: Estado para Auditoría Cambiaria
  const [showCurrencyAudit, setShowCurrencyAudit] = useState(false);
  const [currencyAuditData, setCurrencyAuditData] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditDateFrom, setAuditDateFrom] = useState<string>('');
  const [auditDateTo, setAuditDateTo] = useState<string>('');
  const [auditStoreId, setAuditStoreId] = useState<string>('all');

  // Load stores on component mount
  useEffect(() => {
    const loadStores = async () => {
      if (!userProfile?.company_id) return;
      
      setLoadingStores(true);
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name')
          .eq('company_id', userProfile.company_id)
          .order('name', { ascending: true });

        if (error) {
          console.error('Error loading stores:', error);
          return;
        }

        setStores(data || []);
      } catch (error) {
        console.error('Error loading stores:', error);
      } finally {
        setLoadingStores(false);
      }
    };

    loadStores();
  }, [userProfile?.company_id]);

  const periodLabels: Record<PeriodType, string> = {
    today: "Hoy",
    yesterday: "Ayer",
    thisWeek: "Esta Semana",
    lastWeek: "Semana Pasada", 
    thisMonth: "Este Mes",
    lastMonth: "Mes Pasado",
    custom: "Personalizado"
  };

  const getReportMetadata = (
    type: 'sales' | 'profitability' | 'inventory',
    dateFrom?: string,
    dateTo?: string,
    storeName?: string
  ): ReportMetadata => {
    const titles = {
      sales: `Reporte de Ventas${storeName ? ` - ${storeName}` : ''}`,
      profitability: `Reporte de Rentabilidad${storeName ? ` - ${storeName}` : ''}`,
      inventory: `Reporte de Inventario${storeName ? ` - ${storeName}` : ''}`
    };

    const startDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date();
    const endDate = dateTo ? new Date(`${dateTo}T23:59:59`) : new Date();
    
    return {
      reportId: `RPT-${Date.now().toString().slice(-8)}`,
      reportType: type,
      title: titles[type],
      period: selectedPeriod,
      dateRange: {
        startDate,
        endDate
      },
      generatedAt: new Date(),
      generatedBy: userProfile?.name || 'Usuario',
      companyName: company?.name || 'Mi Empresa'
    };
  };

  const handleOpenReportModal = (reportType: 'sales' | 'profitability' | 'inventory') => {
    setSelectedReportType(reportType);
    setShowReportModal(true);
  };

  const handleGenerateReport = async (filters: {
    storeId: string;
    dateFrom: string;
    dateTo: string;
    categoryId?: string;
  }) => {
    if (!selectedReportType) return;

    try {
      setGeneratingPDF(true);

      const storeName = filters.storeId !== 'all' 
        ? stores.find(s => s.id === filters.storeId)?.name 
        : undefined;

      switch (selectedReportType) {
        case 'sales': {
          if (!company?.id || !userProfile?.company_id) {
            toast({
              title: "Error",
              description: "No se pudo identificar la empresa. Por favor, inicia sesión nuevamente.",
              variant: "destructive"
            });
            return;
          }

          // Validar que el rango de fechas esté presente (obligatorio)
          if (!filters.dateFrom || !filters.dateTo) {
            toast({
              title: "Rango de fechas requerido",
              description: "Por favor, selecciona un rango de fechas antes de generar el reporte.",
              variant: "destructive",
            });
            return;
          }

          // Construir fechas desde y hasta
          const dateFrom = new Date(`${filters.dateFrom}T00:00:00`);
          const dateTo = new Date(`${filters.dateTo}T23:59:59`);

          // Validar que las fechas sean válidas
          if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
            toast({
              title: "Fechas inválidas",
              description: "Las fechas seleccionadas no son válidas. Por favor, selecciona fechas correctas.",
              variant: "destructive",
            });
            return;
          }

          // Validar que dateFrom no sea mayor que dateTo
          if (dateFrom > dateTo) {
            toast({
              title: "Rango de fechas inválido",
              description: "La fecha 'desde' no puede ser mayor que la fecha 'hasta'.",
              variant: "destructive",
            });
            return;
          }

          console.log('📊 Generando reporte con filtros:', {
            storeId: filters.storeId,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            categoryId: filters.categoryId || 'Todas las categorías'
          });

          // ✅ NUEVO: Usar RPC get_executive_summary_v2 para obtener datos agregados
          const { data: executiveData, error: executiveError } = await (supabase as any).rpc('get_executive_summary_v2', {
            p_company_id: null, // La RPC lo deduce del usuario autenticado
            p_store_id: filters.storeId !== 'all' ? filters.storeId : null,
            p_date_from: dateFrom.toISOString(),
            p_date_to: dateTo.toISOString(),
            p_category: filters.categoryId && filters.categoryId !== 'all' ? filters.categoryId : null
          });

          if (executiveError) {
            console.error('❌ Error obteniendo datos ejecutivos:', executiveError);
            toast({
              title: "Error",
              description: `Error al obtener datos del reporte: ${executiveError.message}`,
              variant: "destructive",
            });
            return;
          }

          if (!executiveData || executiveData.error) {
            console.error('❌ Error en respuesta de RPC:', executiveData);
            toast({
              title: "Error",
              description: executiveData?.message || 'No se pudieron obtener los datos del reporte',
              variant: "destructive",
            });
            return;
          }

          // Obtener ventas filtradas directamente desde Supabase (para detalles del PDF)
          // Nota: Las relaciones en Supabase pueden ser arrays u objetos según la configuración
          let salesQuery = (supabase as any)
            .from('sales')
            .select(`
              id,
              invoice_number,
              customer_id,
              customer_name,
              store_id,
              cashier_id,
              subtotal_usd,
              tax_amount_usd,
              total_usd,
              total_bs,
              payment_method,
              is_mixed_payment,
              krece_enabled,
              krece_initial_amount_usd,
              krece_financed_amount_usd,
              created_at,
              stores:store_id(id, name),
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
                  name,
                  sku,
                  category
                )
              )
            `)
            .eq('company_id', userProfile.company_id)
            .gte('created_at', dateFrom.toISOString())
            .lte('created_at', dateTo.toISOString())
            .order('created_at', { ascending: false });

          // Filtrar por sucursal (si no es "all")
          if (filters.storeId && filters.storeId !== 'all') {
            console.log('🏪 Filtrando por sucursal:', filters.storeId);
            salesQuery = salesQuery.eq('store_id', filters.storeId);
          }

          // Filtrar por categoría SOLO si está seleccionada Y no es "all"
          // Si categoryId es undefined, null, o "all", NO se filtra (todas las categorías)
          if (filters.categoryId && filters.categoryId !== 'all') {
            console.log('📦 Filtrando por categoría:', filters.categoryId);
            
            try {
              // Primero obtener los productos de la categoría
              const { data: categoryProducts, error: productsError } = await (supabase as any)
                .from('products')
                .select('id')
                .eq('company_id', userProfile.company_id)
                .eq('category', filters.categoryId);

              if (productsError) {
                console.error('❌ Error obteniendo productos de categoría:', productsError);
                toast({
                  title: "Error",
                  description: `Error al obtener productos de la categoría: ${productsError.message}`,
                  variant: "destructive",
                });
                return;
              }

              if (!categoryProducts || categoryProducts.length === 0) {
                toast({
                  title: "Sin datos",
                  description: "No hay productos en la categoría seleccionada para este período.",
                  variant: "destructive",
                });
                return;
              }

              const categoryProductIds = categoryProducts.map((p: any) => p.id);
              console.log(`✅ Encontrados ${categoryProductIds.length} productos en la categoría`);

              // Obtener sale_ids que tienen productos de esta categoría
              // IMPORTANTE: También aplicar filtros de fecha y sucursal aquí para consistencia
              let saleItemsQuery = (supabase as any)
                .from('sale_items')
                .select(`
                  sale_id,
                  sales!inner(
                    id,
                    company_id,
                    store_id,
                    created_at
                  )
                `)
                .eq('sales.company_id', userProfile.company_id)
                .in('product_id', categoryProductIds);
              
              // Aplicar filtros de fecha
              saleItemsQuery = saleItemsQuery
                .gte('sales.created_at', dateFrom.toISOString())
                .lte('sales.created_at', dateTo.toISOString());
              
              // Aplicar filtro de sucursal si existe
              if (filters.storeId && filters.storeId !== 'all') {
                saleItemsQuery = saleItemsQuery.eq('sales.store_id', filters.storeId);
              }
              
              const { data: saleItems, error: itemsError } = await saleItemsQuery;

              if (itemsError) {
                console.error('❌ Error obteniendo sale_items:', itemsError);
                toast({
                  title: "Error",
                  description: `Error al obtener ventas de la categoría: ${itemsError.message}`,
                  variant: "destructive",
                });
                return;
              }

              if (!saleItems || saleItems.length === 0) {
                toast({
                  title: "Sin datos",
                  description: "No hay ventas con productos de la categoría seleccionada en el rango de fechas especificado.",
                  variant: "destructive",
                });
                return;
              }

              const saleIds = [...new Set(saleItems.map((item: any) => item.sale_id))];
              console.log(`✅ Encontradas ${saleIds.length} ventas con productos de la categoría`);
              
              // Aplicar filtro por sale_ids
              if (saleIds.length > 0) {
                salesQuery = salesQuery.in('id', saleIds);
              } else {
                // Si no hay sale_ids, retornar vacío
                toast({
                  title: "Sin datos",
                  description: "No hay ventas que coincidan con los filtros seleccionados.",
                  variant: "destructive",
                });
                return;
              }
            } catch (error) {
              console.error('❌ Error en filtro de categoría:', error);
              toast({
                title: "Error",
                description: `Error al filtrar por categoría: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                variant: "destructive",
              });
              return;
            }
          } else {
            console.log('📦 Sin filtro de categoría (todas las categorías)');
          }

          console.log('🔍 Ejecutando consulta de ventas...');
          const { data: filteredSales, error: salesError } = await salesQuery;

          if (salesError) {
            console.error('❌ Error obteniendo ventas filtradas:', salesError);
            console.error('Detalles del error:', JSON.stringify(salesError, null, 2));
            toast({
              title: "Error",
              description: `No se pudieron obtener las ventas filtradas: ${salesError.message || 'Error desconocido'}. Por favor, verifica los filtros seleccionados.`,
              variant: "destructive",
            });
            return;
          }

          console.log(`✅ Ventas obtenidas: ${filteredSales?.length || 0}`);

          if (!filteredSales || filteredSales.length === 0) {
            const filterDesc = [
              filters.storeId !== 'all' ? `Sucursal: ${storeName || filters.storeId}` : 'Todas las sucursales',
              filters.categoryId ? `Categoría: ${filters.categoryId}` : 'Todas las categorías',
              `Rango: ${filters.dateFrom} - ${filters.dateTo}`
            ].join(', ');
            
            toast({
              title: "Sin datos",
              description: `No hay ventas que coincidan con los filtros seleccionados (${filterDesc}). Por favor, intenta con otros filtros o un rango de fechas diferente.`,
              variant: "destructive",
            });
            return;
          }

          // Transformar los datos al formato que espera downloadSalesReportPDF
          const totalSales = filteredSales.reduce((sum: number, sale: any) => sum + (sale.total_usd || 0), 0);
          const totalOrders = filteredSales.length;
          const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
          const totalKreceFinancing = filteredSales
            .filter((sale: any) => sale.krece_enabled)
            .reduce((sum: number, sale: any) => sum + (sale.krece_financed_amount_usd || 0), 0);

          // Obtener datos de métodos de pago filtrados
          let paymentsQuery = (supabase as any)
            .from('sale_payments')
            .select(`
              payment_method,
              amount_usd,
              amount_bs,
              sales!inner(
                id,
                company_id,
                store_id,
                created_at
              )
            `)
            .eq('sales.company_id', userProfile.company_id)
            .gte('sales.created_at', dateFrom.toISOString())
            .lte('sales.created_at', dateTo.toISOString());

          if (filters.storeId !== 'all') {
            paymentsQuery = paymentsQuery.eq('sales.store_id', filters.storeId);
          }

          // Filtrar pagos por categoría usando los sale_ids filtrados (si se filtró por categoría)
          if (filters.categoryId && filters.categoryId !== 'all') {
            const saleIds = filteredSales.map((s: any) => s.id);
            if (saleIds.length > 0) {
              paymentsQuery = paymentsQuery.in('sales.id', saleIds);
            }
          }

          const { data: paymentsData, error: paymentsError } = await paymentsQuery;

          // Calcular métodos de pago (aunque haya error, continuar)
          let paymentMethodsDataFiltered = {
            totalUSD: 0,
            totalBS: 0,
            totalTransactions: 0,
            methods: [] as Array<{
              method: string;
              totalUSD: number;
              totalBS: number;
              count: number;
              percentage: number;
            }>
          };

          if (paymentsData && !paymentsError) {
            const totalUSD = paymentsData.reduce((sum: number, p: any) => sum + (p.amount_usd || 0), 0);
            const totalBS = paymentsData.reduce((sum: number, p: any) => sum + (p.amount_bs || 0), 0);
            const methodMap = new Map<string, { usd: number; bs: number; count: number }>();

            paymentsData.forEach((payment: any) => {
              const method = payment.payment_method || 'Desconocido';
              const current = methodMap.get(method) || { usd: 0, bs: 0, count: 0 };
              methodMap.set(method, {
                usd: current.usd + (payment.amount_usd || 0),
                bs: current.bs + (payment.amount_bs || 0),
                count: current.count + 1
              });
            });

            const methods = Array.from(methodMap.entries()).map(([method, data]) => ({
              method,
              totalUSD: data.usd,
              totalBS: data.bs,
              count: data.count,
              percentage: totalUSD > 0 ? (data.usd / totalUSD) * 100 : 0
            }));

            paymentMethodsDataFiltered = {
              totalUSD,
              totalBS,
              totalTransactions: paymentsData.length,
              methods
            };
          }

          // Calcular desglose por tienda
          const storesMap = new Map<string, any>();
          filteredSales.forEach((sale: any) => {
            const store = Array.isArray(sale.stores) ? sale.stores[0] : sale.stores;
            if (store && store.id) {
              if (!storesMap.has(store.id)) {
                storesMap.set(store.id, {
                  storeId: store.id,
                  storeName: store.name || 'Sin nombre',
                  sales: [],
                  payments: []
                });
              }
              storesMap.get(store.id).sales.push(sale);
            }
          });

          const storeBreakdown = Array.from(storesMap.values()).map((store: any) => {
            const storeTotalSales = store.sales.reduce((sum: number, s: any) => sum + (s.total_usd || 0), 0);
            const storeTotalOrders = store.sales.length;
            const storeAvgOrder = storeTotalOrders > 0 ? storeTotalSales / storeTotalOrders : 0;
            
            return {
              storeId: store.storeId,
              storeName: store.storeName,
              totalSales: storeTotalSales,
              totalOrders: storeTotalOrders,
              averageOrderValue: storeAvgOrder,
              kreceFinancing: store.sales
                .filter((s: any) => s.krece_enabled)
                .reduce((sum: number, s: any) => sum + (s.krece_financed_amount_usd || 0), 0),
              kreceInitial: store.sales
                .filter((s: any) => s.krece_enabled)
                .reduce((sum: number, s: any) => sum + (s.krece_initial_amount_usd || 0), 0),
              paymentMethods: {
                cash: 0,
                card: 0,
                transfer: 0,
                krece: 0,
                mixed: 0
              }
            };
          });

          // Crear SalesReportData filtrado
          const filteredSalesData = {
            totalSales,
            totalOrders,
            averageOrderValue,
            totalKreceFinancing,
            totalKreceInitial: filteredSales
              .filter((s: any) => s.krece_enabled)
              .reduce((sum: number, s: any) => sum + (s.krece_initial_amount_usd || 0), 0),
            paymentMethods: {
              cash: 0,
              card: 0,
              transfer: 0,
              krece: 0,
              mixed: 0
            },
            storeBreakdown,
            sales: filteredSales as any[]
          };

          const metadata = getReportMetadata('sales', filters.dateFrom, filters.dateTo, storeName);
          
          await downloadSalesReportPDF(
            filteredSalesData, 
            metadata, 
            paymentMethodsDataFiltered, 
            undefined, 
            company.id, 
            filters.storeId !== 'all' ? filters.storeId : undefined
          );

          toast({
            title: "Reporte generado",
            description: "El reporte de ventas se ha descargado exitosamente.",
            variant: "success"
          });
          break;
        }

        case 'profitability': {
          if (!profitabilityData) {
            toast({
              title: "Error",
              description: "No hay datos de rentabilidad disponibles.",
              variant: "destructive",
            });
            return;
          }

          const metadata = getReportMetadata('profitability', filters.dateFrom, filters.dateTo, storeName);
          await downloadProfitabilityReportPDF(profitabilityData, metadata);

          toast({
            title: "Reporte generado",
            description: "El reporte de rentabilidad se ha descargado exitosamente.",
            variant: "success"
          });
          break;
        }

        case 'inventory': {
          if (!inventoryData) {
            toast({
              title: "Error",
              description: "No hay datos de inventario disponibles.",
              variant: "destructive",
            });
            return;
          }

          const metadata = getReportMetadata('inventory', filters.dateFrom, filters.dateTo, storeName);
          await downloadInventoryReportPDF(inventoryData, metadata);

          toast({
            title: "Reporte generado",
            description: "El reporte de inventario se ha descargado exitosamente.",
            variant: "success"
          });
          break;
        }
      }

      setShowReportModal(false);
      setSelectedReportType(null);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: `No se pudo generar el reporte: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando datos de reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Reportes Ejecutivos</h1>
            <Badge
              variant="secondary"
              className="w-fit text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-green-400 text-black"
            >
              v-valid
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Sistema completo de reportes con generación automática y PDFs de alta calidad
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            Ver Dashboard
          </Button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        {/* Sales Report */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Reporte de Ventas</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Ventas totales, desglose por tienda, financiamiento Krece y métodos de pago
                </p>
              </div>
            </div>
            
           
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Datos del período: {periodLabels[selectedPeriod]}
              </p>
              <p className="font-semibold">
                {salesData ? `${formatCurrency(salesData.totalSales)} • ${salesData.totalOrders} órdenes` : 'Cargando...'}
              </p>
              
            </div>

            <div className="flex space-x-2">
              <Button 
                className="flex-1" 
                onClick={() => handleOpenReportModal('sales')}
                disabled={!salesData || generatingPDF}
              >
                {generatingPDF ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generar Reporte
                  </>
                )}
              </Button>
              
              {salesData && (
                <Button variant="outline" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Profitability Report - Deshabilitado */}
        <Card className="p-6 hover:shadow-lg transition-shadow opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Reporte de Rentabilidad</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Análisis de ganancias basado en costos de productos y márgenes
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Datos del período: {periodLabels[selectedPeriod]}
              </p>
              <p className="font-semibold">
                {profitabilityData ? 
                  `${formatCurrency(profitabilityData.grossProfit)} • ${profitabilityData.profitMargin.toFixed(1)}% margen` : 
                  'Cargando...'
                }
              </p>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300 font-medium">
                Disponible en fases de actualización y mantenimiento
              </p>
            </div>

            <div className="flex space-x-2">
              <Button 
                className="flex-1" 
                disabled
                variant="outline"
              >
                <FileText className="mr-2 h-4 w-4" />
                Generar Reporte
              </Button>
              
              <Button variant="outline" size="icon" disabled>
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Inventory Report - Deshabilitado */}
        <Card className="p-6 hover:shadow-lg transition-shadow opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Reporte de Inventario</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Estado actual del inventario, stock bajo y movimientos por tienda
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Estado actual del inventario
              </p>
              <p className="font-semibold">
                {inventoryData ? 
                  `${inventoryData.totalProducts} productos • ${formatCurrency(inventoryData.totalStockValue)} valor` : 
                  'Cargando...'
                }
              </p>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300 font-medium">
                Disponible en fases de actualización y mantenimiento
              </p>
            </div>

            <div className="flex space-x-2">
              <Button 
                className="flex-1" 
                disabled
                variant="outline"
              >
                <FileText className="mr-2 h-4 w-4" />
                Generar Reporte
              </Button>
              
              <Button variant="outline" size="icon" disabled>
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Financial Report */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Reporte Financiero</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Flujo de caja, cuentas por cobrar y estado financiero general
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Datos del período: {periodLabels[selectedPeriod]}
              </p>
              <p className="font-semibold">Herramientas de Auditoría</p>
            </div>

            <div className="flex space-x-2">
              <Button 
                variant="outline"
                className="flex-1" 
                onClick={() => {
                  // Establecer fechas por defecto (este mes)
                  const now = new Date();
                  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  
                  setAuditDateFrom(startOfMonth.toISOString().split('T')[0]);
                  setAuditDateTo(endOfMonth.toISOString().split('T')[0]);
                  setShowCurrencyAudit(true);
                }}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Auditar Tasas
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* ✅ NUEVO: Modal de Auditoría Cambiaria */}
      <TooltipProvider>
        <Dialog open={showCurrencyAudit} onOpenChange={setShowCurrencyAudit}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Auditoría de Integridad Cambiaria
              </DialogTitle>
              <DialogDescription>
                Valida matemáticamente si los Bolívares guardados coinciden con la Tasa BCV del día
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b">
              <div>
                <label className="text-sm font-medium mb-1 block">Fecha Desde</label>
                <Input
                  type="date"
                  value={auditDateFrom}
                  onChange={(e) => setAuditDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Fecha Hasta</label>
                <Input
                  type="date"
                  value={auditDateTo}
                  onChange={(e) => setAuditDateTo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sucursal</label>
                <Select value={auditStoreId} onValueChange={setAuditStoreId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas" />
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
              <div className="flex items-end">
                <Button
                  onClick={async () => {
                    if (!auditDateFrom || !auditDateTo) {
                      toast({
                        title: "Fechas requeridas",
                        description: "Por favor, selecciona un rango de fechas",
                        variant: "destructive"
                      });
                      return;
                    }

                    try {
                      setLoadingAudit(true);
                      const startDate = new Date(`${auditDateFrom}T00:00:00`);
                      const endDate = new Date(`${auditDateTo}T23:59:59`);
                      const data = await fetchCurrencyAuditData(
                        startDate,
                        endDate,
                        auditStoreId !== 'all' ? auditStoreId : undefined
                      );
                      setCurrencyAuditData(data);
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Error al cargar datos de auditoría",
                        variant: "destructive"
                      });
                    } finally {
                      setLoadingAudit(false);
                    }
                  }}
                  disabled={loadingAudit || !auditDateFrom || !auditDateTo}
                  className="w-full"
                >
                  {loadingAudit ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Consultar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Resumen Superior */}
            {currencyAuditData.length > 0 && (() => {
              const totalDiscrepancy = currencyAuditData
                .filter(r => r.status === 'MISMATCH')
                .reduce((sum, r) => sum + Math.abs(r.difference), 0);
              const mismatchCount = currencyAuditData.filter(r => r.status === 'MISMATCH').length;
              const matchCount = currencyAuditData.filter(r => r.status === 'MATCH').length;
              const legacyCount = currencyAuditData.filter(r => r.status === 'LEGACY').length;

              return (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Discrepancia Detectada</p>
                      <p className="text-2xl font-bold text-red-600">
                        Bs. {totalDiscrepancy.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Descuadres</p>
                      <p className="text-2xl font-bold text-red-600">{mismatchCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Exactos</p>
                      <p className="text-2xl font-bold text-green-600">{matchCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Antiguos</p>
                      <p className="text-2xl font-bold text-gray-600">{legacyCount}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ✅ NUEVO: Leyenda Visual (Guía de Lectura) */}
            {currencyAuditData.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Guía de Lectura:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Correcto (Exacto)</p>
                      <p className="text-xs text-green-700">El monto guardado coincide con la tasa del día.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">Discrepancia (Descuadre)</p>
                      <p className="text-xs text-orange-700">Hay una diferencia matemática. Requiere revisión.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Sin Tasa (Antiguo)</p>
                      <p className="text-xs text-gray-600">Venta antigua sin registro de tasa BCV.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla Scrollable */}
            <div className="flex-1 overflow-hidden border rounded-lg">
              <div className="h-full overflow-y-auto max-h-[60vh]">
                {loadingAudit ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : currencyAuditData.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>Selecciona un rango de fechas y haz clic en "Consultar" para ver los datos</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[100px]">Fecha</TableHead>
                        <TableHead className="w-[120px]">Factura</TableHead>
                        <TableHead className="w-[100px]">Tasa del Día</TableHead>
                        <TableHead className="w-[120px]">Venta ($)</TableHead>
                        <TableHead className="w-[130px]">Registrado (Bs)</TableHead>
                        <TableHead className="w-[130px]">
                          <div className="flex items-center gap-1">
                            Calculado (Bs)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Este es el valor matemático ideal: Dólares multiplicados por la Tasa del BCV de ese momento.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="w-[130px]">Diferencia</TableHead>
                        <TableHead className="w-[100px]">Veredicto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currencyAuditData.map((record) => {
                        const getRowStyle = () => {
                          switch (record.status) {
                            case 'MISMATCH':
                              return 'bg-red-50 hover:bg-red-100';
                            case 'MATCH':
                              return 'hover:bg-green-50';
                            case 'LEGACY':
                              return 'bg-gray-50 hover:bg-gray-100 italic';
                            default:
                              return '';
                          }
                        };

                        const getStatusBadge = () => {
                          switch (record.status) {
                            case 'MISMATCH':
                              return (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  Descuadre
                                </Badge>
                              );
                            case 'MATCH':
                              return (
                                <Badge className="bg-green-600 flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Exacto
                                </Badge>
                              );
                            case 'LEGACY':
                              return (
                                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                  <Clock className="w-3 h-3" />
                                  Antiguo
                                </Badge>
                              );
                            default:
                              return null;
                          }
                        };

                        return (
                          <TableRow key={record.id} className={getRowStyle()}>
                            <TableCell className="font-medium">
                              {new Date(record.created_at).toLocaleDateString('es-VE', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </TableCell>
                            <TableCell>{record.invoice_number}</TableCell>
                            <TableCell>
                              {record.bcv_rate_used
                                ? record.bcv_rate_used.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : 'N/A'}
                            </TableCell>
                            <TableCell>{formatCurrency(record.total_usd)}</TableCell>
                            <TableCell>
                              {record.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {record.theoretical_bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className={record.difference !== 0 ? 'font-semibold' : ''}>
                              <span className={record.difference > 0 ? 'text-green-600' : record.difference < 0 ? 'text-red-600' : ''}>
                                {record.difference > 0 ? '+' : ''}
                                {record.difference.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            {/* Footer con Exportación */}
            {currencyAuditData.length > 0 && (
              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Total de registros: {currencyAuditData.length}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Generar CSV
                    const headers = ['Fecha', 'Factura', 'Tasa BCV', 'Total USD', 'BS Guardado', 'BS Teórico', 'Diferencia', 'Estado'];
                    const rows = currencyAuditData.map(record => [
                      new Date(record.created_at).toLocaleDateString('es-VE'),
                      record.invoice_number,
                      record.bcv_rate_used?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A',
                      record.total_usd.toFixed(2),
                      record.total_bs.toFixed(2),
                      record.theoretical_bs.toFixed(2),
                      record.difference.toFixed(2),
                      record.status
                    ]);

                    const csvContent = [
                      headers.join(','),
                      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                    ].join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `auditoria_cambiaria_${auditDateFrom}_${auditDateTo}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    toast({
                      title: "CSV descargado",
                      description: "El reporte de auditoría se ha descargado exitosamente"
                    });
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar CSV
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </TooltipProvider>

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={showReportModal}
        onOpenChange={(open) => {
          setShowReportModal(open);
          if (!open) {
            setSelectedReportType(null);
          }
        }}
        onGenerate={handleGenerateReport}
        stores={stores}
        loading={generatingPDF || loading}
        showCategoryFilter={selectedReportType === 'sales'}
        title={
          selectedReportType === 'sales' 
            ? 'Generar Reporte: Ventas por Período'
            : selectedReportType === 'profitability'
            ? 'Generar Reporte: Rentabilidad'
            : selectedReportType === 'inventory'
            ? 'Generar Reporte: Inventario'
            : 'Generar Reporte'
        }
        description={
          selectedReportType === 'sales'
            ? "Selecciona sucursal, rango de fechas y categoría (opcional) para el reporte de ventas."
            : selectedReportType === 'profitability'
            ? "Selecciona sucursal y rango de fechas para el reporte de rentabilidad."
            : selectedReportType === 'inventory'
            ? "Selecciona sucursal, rango de fechas y categoría (opcional) para el reporte de inventario."
            : "Selecciona los filtros para generar el reporte en PDF."
        }
      />
    </div>
  );
}
