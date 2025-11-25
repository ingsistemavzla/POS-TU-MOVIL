import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Users,
  Package,
  Store,
  Loader2,
  AlertTriangle,
  Activity,
  Bell,
  Clock,
  Target,
  FileText,
  Database,
  Settings,
  RefreshCw,
  Menu
} from "lucide-react";
import { useReportsData } from "@/hooks/useReportsData";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatNumber } from "@/utils/currency";
import { SalesReportModal } from "@/components/reports/SalesReportModal";
import { ProductsReportModal } from "@/components/reports/ProductsReportModal";
import { StoresReportModal } from "@/components/reports/StoresReportModal";
import { CashierReportModal } from "@/components/reports/CashierReportModal";
import { AdvancedFiltersModal } from "@/components/reports/AdvancedFiltersModal";
import { ExportModal } from "@/components/reports/ExportModal";
import { RealTimeStats } from "@/components/reports/RealTimeStats";
import { LiveAlerts } from "@/components/reports/LiveAlerts";
import { ActivityDashboard } from "@/components/reports/ActivityDashboard";
import { AdvancedMetrics } from "@/components/reports/AdvancedMetrics";
import { ReportsHistoryModal } from "@/components/reports/ReportsHistoryModal";
import { GenerateReportModal } from '@/components/reports/GenerateReportModal';
import { downloadSalesReportPDF, downloadInventoryReportPDF, downloadProfitabilityReportPDF } from '@/utils/pdfGenerator';
import { usePaymentMethodsData } from '@/hooks/usePaymentMethodsData';
import { useToast } from '@/hooks/use-toast';
import type { ReportMetadata, PeriodType } from '@/types/reports';

export default function Reports() {
  const reportsData = useReportsData();
  const { company, userProfile } = useAuth();
  const { toast } = useToast();
  const [activeModal, setActiveModal] = useState<'sales' | 'products' | 'stores' | 'cashiers' | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [stores, setStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Obtener datos de métodos de pago para reportes de ventas
  const { data: paymentMethodsData } = usePaymentMethodsData('today');

  // Load stores on component mount
  useEffect(() => {
    const loadStores = async () => {
      setLoadingStores(true);
      try {
        const storesData = await reportsData.getAllStores();
        setStores(storesData);
      } catch (error) {
        console.error('Error loading stores:', error);
      } finally {
        setLoadingStores(false);
      }
    };

    loadStores();
  }, [reportsData]);

  const getReportTitle = (reportType: string | null): string => {
    if (!reportType) return 'Generar Reporte';
    const titleMap: Record<string, string> = {
      'daily': 'Reporte Diario',
      'sales': 'Ventas por Período',
      'products': 'Productos Top',
      'stores': 'Rendimiento por Tienda',
      'cashiers': 'Análisis de Cajeros',
      'inventory': 'Estado de Inventario',
      'comprehensive': 'Reporte Integral'
    };
    return `Generar Reporte: ${titleMap[reportType] || reportType}`;
  };

  const handleOpenReportModal = (reportType: string) => {
    setSelectedReportType(reportType);
    setShowReportModal(true);
  };

  const getReportMetadata = (
    type: 'sales' | 'profitability' | 'inventory',
    dateFrom?: string,
    dateTo?: string,
    storeName?: string
  ): ReportMetadata => {
    const titles: Record<string, string> = {
      sales: `Reporte de Ventas${storeName ? ` - ${storeName}` : ''}`,
      profitability: `Reporte de Rentabilidad${storeName ? ` - ${storeName}` : ''}`,
      inventory: `Reporte de Inventario${storeName ? ` - ${storeName}` : ''}`
    };

    const startDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date();
    const endDate = dateTo ? new Date(`${dateTo}T23:59:59`) : new Date();

    return {
      reportId: `${type.toUpperCase()}-${Date.now().toString().slice(-8)}`,
      reportType: type,
      title: titles[type] || `Reporte ${type}`,
      period: 'today',
      dateRange: {
        startDate,
        endDate
      },
      generatedAt: new Date(),
      generatedBy: userProfile?.name || 'Usuario',
      companyName: company?.name || 'Mi Empresa'
    };
  };

  const handleGenerateReport = async (filters: {
    storeId: string;
    dateFrom: string;
    dateTo: string;
    categoryId?: string;
  }) => {
    if (!selectedReportType) return;

    try {
      setGeneratingReport(true);

      // Determinar el período basado en las fechas seleccionadas
      let period: PeriodType = 'custom';
      
      if (filters.dateFrom && filters.dateTo) {
        const fromDate = new Date(filters.dateFrom);
        const toDate = new Date(filters.dateTo);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0 && fromDate.getTime() === today.getTime()) {
          period = 'today';
        } else if (daysDiff === 1) {
          period = 'yesterday';
        } else if (daysDiff <= 7) {
          period = 'thisWeek';
        } else if (daysDiff <= 30) {
          period = 'thisMonth';
        }
      }

      const storeName = filters.storeId !== 'all' 
        ? stores.find(s => s.id === filters.storeId)?.name 
        : undefined;

      // Generar reporte según el tipo
      switch (selectedReportType) {
        case 'daily':
        case 'sales': {
          if (!reportsData.salesData) {
            toast({
              title: "Error",
              description: "No hay datos de ventas disponibles.",
              variant: "destructive",
            });
            return;
          }

          const metadata = getReportMetadata('sales', filters.dateFrom, filters.dateTo, storeName);
          
          await downloadSalesReportPDF(
            reportsData.salesData,
            metadata,
            paymentMethodsData || undefined,
            undefined, // soldProductsData - se obtiene automáticamente
            userProfile?.company_id,
            filters.storeId !== 'all' ? filters.storeId : undefined
          );

          toast({
            title: "Reporte generado",
            description: "El reporte de ventas se ha descargado exitosamente.",
          });
          break;
        }

        case 'inventory': {
          if (!reportsData.inventoryData) {
            toast({
              title: "Error",
              description: "No hay datos de inventario disponibles.",
              variant: "destructive",
            });
            return;
          }

          const metadata = getReportMetadata('inventory', filters.dateFrom, filters.dateTo, storeName);
          
          await downloadInventoryReportPDF(reportsData.inventoryData, metadata);

          toast({
            title: "Reporte generado",
            description: "El reporte de inventario se ha descargado exitosamente.",
          });
          break;
        }

        case 'products':
        case 'stores':
        case 'cashiers':
        case 'comprehensive': {
          // Para estos tipos, usar generateReport del hook que maneja la lógica específica
          // Por ahora mostrar mensaje de que se está implementando
          toast({
            title: "En desarrollo",
            description: `El reporte de ${selectedReportType} está en desarrollo.`,
          });
          console.log(`Generating ${selectedReportType} report for ${period}${filters.storeId !== 'all' ? ` (store: ${filters.storeId})` : ''}`);
          break;
        }

        default:
          toast({
            title: "Error",
            description: `Tipo de reporte desconocido: ${selectedReportType}`,
            variant: "destructive",
          });
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
      setGeneratingReport(false);
    }
  };

  const reportCards = [
    {
      title: "Reporte Diario General",
      description: "Reporte diario completo de todas las tiendas",
      icon: Calendar,
      color: "primary",
      metrics: ["Ventas del día", "Transacciones", "Productos Top"],
      lastGenerated: "Hoy 10:30 AM",
      onClick: () => reportsData.generateReport('daily', 'today'),
      generateReport: () => handleOpenReportModal('daily')
    },
    {
      title: "Reporte Diario por Tienda",
      description: "Reporte diario específico por tienda seleccionada",
      icon: Store,
      color: "success",
      metrics: ["Ventas de la tienda", "Información fiscal", "Rendimiento"],
      lastGenerated: "Hoy 09:15 AM",
      onClick: () => reportsData.generateReport('daily', 'today', selectedStore !== 'all' ? selectedStore : undefined),
      generateReport: () => handleOpenReportModal('daily')
    },
    {
      title: "Ventas por Período",
      description: "Análisis de ventas diarias, semanales y mensuales",
      icon: TrendingUp,
      color: "accent",
      metrics: ["Ingresos", "Transacciones", "Ticket Promedio"],
      lastGenerated: "Hoy 10:30 AM",
      onClick: () => setActiveModal('sales'),
      generateReport: () => handleOpenReportModal('sales')
    },
    {
      title: "Productos Top",
      description: "Productos más vendidos y análisis de inventario",
      icon: Package,
      color: "success", 
      metrics: ["Unidades vendidas", "Margen", "Rotación"],
      lastGenerated: "Hoy 09:15 AM",
      onClick: () => setActiveModal('products'),
      generateReport: () => handleOpenReportModal('products')
    },
    {
      title: "Rendimiento por Tienda",
      description: "Comparativo de performance entre tiendas",
      icon: Store,
      color: "accent",
      metrics: ["Ventas", "Clientes", "Productividad"],
      lastGenerated: "Ayer 18:00 PM",
      onClick: () => setActiveModal('stores'),
      generateReport: () => handleOpenReportModal('stores')
    },
    {
      title: "Análisis de Cajeros",
      description: "Performance individual de cada cajero",
      icon: Users,
      color: "warning",
      metrics: ["Ventas procesadas", "Tiempo promedio", "Errores"],
      lastGenerated: "Hoy 08:00 AM",
      onClick: () => setActiveModal('cashiers'),
      generateReport: () => handleOpenReportModal('cashiers')
    },
    {
      title: "Estado de Inventario",
      description: "Control de stock y productos críticos",
      icon: Database,
      color: "destructive",
      metrics: ["Stock bajo", "Sin stock", "Valor total"],
      lastGenerated: "Hoy 07:30 AM",
      onClick: () => reportsData.generateReport('inventory', 'today', selectedStore !== 'all' ? selectedStore : undefined),
      generateReport: () => handleOpenReportModal('inventory')
    },
    {
      title: "Reporte Integral",
      description: "Vista completa del negocio",
      icon: FileText,
      color: "secondary",
      metrics: ["Resumen ejecutivo", "Métricas clave", "Análisis completo"],
      lastGenerated: "Ayer 17:00 PM",
      onClick: () => reportsData.generateReport('comprehensive', 'today', selectedStore !== 'all' ? selectedStore : undefined),
      generateReport: () => handleOpenReportModal('comprehensive')
    }
  ];

  const quickStats = reportsData ? [
    { 
      label: "Ventas Mes Actual", 
      value: formatCurrency(reportsData.quickStats.currentMonthSales), 
      change: "+12.5%", 
      positive: true 
    },
    { 
      label: "Transacciones Hoy", 
      value: reportsData.quickStats.todayTransactions.toString(), 
      change: "+8.2%", 
      positive: true 
    },
    { 
      label: "Ticket Promedio", 
      value: formatCurrency(reportsData.quickStats.averageTicket), 
      change: "-2.1%", 
      positive: false 
    },
    { 
      label: "Margen Promedio", 
      value: `${reportsData.quickStats.averageMargin.toFixed(1)}%`, 
      change: "+1.8%", 
      positive: true 
    },
    { 
      label: "Tiendas Activas", 
      value: reportsData.quickStats.totalStores.toString(), 
      change: "0%", 
      positive: true 
    },
    { 
      label: "Stock Crítico", 
      value: reportsData.quickStats.criticalStock.toString(), 
      change: "-5.2%", 
      positive: true 
    }
  ] : [];

  const handleStoreChange = (storeId: string) => {
    setSelectedStore(storeId);
    reportsData.applyFilters({ storeId: storeId === 'all' ? undefined : storeId });
  };

  if (reportsData.loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Centro de Reportes</h1>
            <p className="text-muted-foreground">Cargando datos de reportes...</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 w-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6 glass-card">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
                <div className="h-8 bg-muted rounded animate-pulse w-20"></div>
                <div className="h-3 bg-muted rounded animate-pulse w-16"></div>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-muted-foreground">Cargando datos de reportes...</span>
          </div>
        </div>
      </div>
    );
  }

  if (reportsData.error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar reportes</h3>
          <p className="text-muted-foreground">{reportsData.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-4 sm:p-6 w-full">
      {/* Header - 100% Responsive */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight">Centro de Reportes</h1>
            <Badge
              variant="secondary"
              className="w-fit text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-green-400 text-black"
            >
              v3-filtread
            </Badge>
          </div>
          <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-muted-foreground">
            {company ? `Análisis y métricas de ${company.name}` : 'Análisis y métricas de tu negocio'}
          </p>
        </div>
        
        {/* Mobile Menu Button */}
        <div className="flex sm:hidden">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-full h-10"
          >
            <Menu className="w-4 h-4 mr-2" />
            Menú
          </Button>
        </div>
        
        {/* Desktop Buttons */}
        <div className="hidden sm:flex flex-col space-y-2 sm:flex-row sm:space-x-3 sm:space-y-0">
          <Button variant="outline" className="hover-glow w-full sm:w-auto h-9 sm:h-10" onClick={() => setShowFilters(true)}>
            <Filter className="w-4 h-4 mr-2" />
            <span className="hidden lg:inline">Filtros Avanzados</span>
            <span className="lg:hidden">Filtros</span>
          </Button>
          <Button className="btn-premium bg-gradient-primary glow-primary w-full sm:w-auto h-9 sm:h-10" onClick={() => setShowExport(true)}>
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden lg:inline">Exportar Todo</span>
            <span className="lg:hidden">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu - Collapsible */}
      {showMobileMenu && (
        <div className="sm:hidden space-y-3 p-4 bg-card rounded-lg border border-border/50 animate-in slide-in-from-top-2 duration-200">
          <Button variant="outline" className="w-full h-10" onClick={() => setShowFilters(true)}>
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avanzados
          </Button>
          <Button className="w-full btn-premium bg-gradient-primary glow-primary h-10" onClick={() => setShowExport(true)}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Todo
          </Button>
        </div>
      )}

      {/* Filters Bar - 100% Responsive */}
      <Card className="p-3 sm:p-4 lg:p-6 glass-card">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
            {/* Store Filter */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Store className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-medium">Tienda:</span>
              </div>
              <Select value={selectedStore} onValueChange={handleStoreChange}>
                <SelectTrigger className="w-full sm:w-40 lg:w-48 text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Tiendas</SelectItem>
                  {loadingStores ? (
                    <SelectItem value="loading" disabled>
                      Cargando tiendas...
                    </SelectItem>
                  ) : (
                    stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => reportsData.clearFilters()}
              className="hover-glow w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Limpiar Filtros</span>
              <span className="xs:hidden">Limpiar</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => reportsData.generateReport('daily')}
              disabled={reportsData.loading}
              className="hover-glow w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
            >
              {reportsData.loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="hidden xs:inline">Generando...</span>
                  <span className="xs:hidden">Gen...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="hidden xs:inline">Reporte Diario</span>
                  <span className="xs:hidden">Diario</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content with Tabs - 100% Responsive */}
      <Tabs defaultValue="reports" className="space-y-4 sm:space-y-6 w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1 overflow-x-auto">
          <TabsTrigger value="reports" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm py-2 px-1 sm:px-2 lg:px-3 h-auto">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Reportes</span>
            <span className="xs:hidden">Rep</span>
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm py-2 px-1 sm:px-2 lg:px-3 h-auto">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Tiempo Real</span>
            <span className="xs:hidden">Real</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm py-2 px-1 sm:px-2 lg:px-3 h-auto">
            <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Alertas</span>
            <span className="xs:hidden">Alert</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm py-2 px-1 sm:px-2 lg:px-3 h-auto">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Actividad</span>
            <span className="xs:hidden">Act</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm py-2 px-1 sm:px-2 lg:px-3 h-auto">
            <Target className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">KPIs</span>
            <span className="xs:hidden">KPI</span>
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4 sm:space-y-6 w-full">
          {/* Quick Stats - 4 columnas en PC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            {quickStats.map((stat, index) => (
              <Card key={stat.label} className="p-3 sm:p-4 lg:p-6 glass-card hover-glow" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{stat.label}</p>
                  <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold animate-counter leading-tight">{stat.value}</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className={`w-3 h-3 ${stat.positive ? 'text-success' : 'text-destructive'}`} />
                    <span className={`text-xs font-medium ${stat.positive ? 'text-success' : 'text-destructive'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Report Cards Grid - 2 columnas en PC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 w-full">
            {reportCards.map((report, index) => {
              const Icon = report.icon;
              return (
                <Card 
                  key={report.title}
                  className="p-3 sm:p-4 lg:p-6 glass-card hover-glow transition-all duration-200"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="space-y-3 sm:space-y-4">
                    {/* Header */}
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center ${
                          report.color === 'primary' ? 'bg-green-100' :
                          report.color === 'success' ? 'bg-green-100' :
                          report.color === 'accent' ? 'bg-purple-100' :
                          report.color === 'warning' ? 'bg-yellow-100' :
                          report.color === 'destructive' ? 'bg-red-100' :
                          report.color === 'secondary' ? 'bg-gray-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${
                            report.color === 'primary' ? 'text-green-600' :
                            report.color === 'success' ? 'text-green-600' :
                            report.color === 'accent' ? 'text-purple-600' :
                            report.color === 'warning' ? 'text-yellow-600' :
                            report.color === 'destructive' ? 'text-red-600' :
                            report.color === 'secondary' ? 'text-gray-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm sm:text-base lg:text-lg leading-tight">{report.title}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-tight">{report.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="w-full sm:w-auto justify-center text-xs">{report.color}</Badge>
                    </div>

                    {/* Metrics */}
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Métricas incluidas:</p>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {report.metrics.map((metric) => (
                          <Badge key={metric} variant="secondary" className="text-xs">
                            {metric}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pt-3 sm:pt-4 border-t border-border/50">
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs">Actualizado: {report.lastGenerated}</span>
                      </div>
                      <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0 w-full sm:w-auto">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="hover-glow w-full sm:w-auto text-xs h-8 sm:h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            report.onClick();
                          }}
                        >
                          <BarChart3 className="w-3 h-3 mr-1" />
                          <span className="hidden xs:inline">Ver</span>
                          <span className="xs:hidden">Ver</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="hover-glow w-full sm:w-auto text-xs h-8 sm:h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            report.generateReport();
                          }}
                          disabled={generatingReport || reportsData.loading}
                        >
                          {generatingReport || reportsData.loading ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <FileText className="w-3 h-3 mr-1" />
                          )}
                          <span className="hidden xs:inline">Generar Reporte</span>
                          <span className="xs:hidden">Generar</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Chart Types - 100% Responsive */}
          <Card className="p-4 sm:p-6 glass-card">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Tipos de Visualización</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 w-full">
              <Button variant="outline" className="h-16 sm:h-20 lg:h-24 flex-col space-y-1 sm:space-y-2 hover-glow p-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
                <span className="text-xs sm:text-sm lg:text-base">Gráficos de Barras</span>
              </Button>
              <Button variant="outline" className="h-16 sm:h-20 lg:h-24 flex-col space-y-1 sm:space-y-2 hover-glow p-2">
                <LineChart className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-success" />
                <span className="text-xs sm:text-sm lg:text-base">Tendencias</span>
              </Button>
              <Button variant="outline" className="h-16 sm:h-20 lg:h-24 flex-col space-y-1 sm:space-y-2 hover-glow p-2">
                <PieChart className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-accent" />
                <span className="text-xs sm:text-sm lg:text-base">Distribución</span>
              </Button>
              <Button variant="outline" className="h-16 sm:h-20 lg:h-24 flex-col space-y-1 sm:space-y-2 hover-glow p-2">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-warning" />
                <span className="text-xs sm:text-sm lg:text-base">KPIs</span>
              </Button>
            </div>
          </Card>

          {/* Recent Reports - 100% Responsive */}
          <Card className="p-4 sm:p-6 glass-card">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Reportes Recientes</h3>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hover-glow w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
                  onClick={() => setShowHistory(true)}
                >
                  <span className="hidden xs:inline">Ver Historial</span>
                  <span className="xs:hidden">Historial</span>
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              {reportsData.recentReports.map((report) => (
                <div key={report.id} className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-glow flex items-center justify-center">
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base">{report.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(report.date).toLocaleDateString('es-VE')} • {report.size}
                        {report.period && ` • ${report.period}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <Badge 
                        variant={
                          report.status === 'completed' ? 'default' : 
                          report.status === 'processing' ? 'secondary' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {report.status === 'completed' ? 'Completado' : 
                         report.status === 'processing' ? 'Procesando' : 'Fallido'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{report.format}</Badge>
                    </div>
                    {report.status === 'completed' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="hover-glow w-full sm:w-auto h-8 sm:h-9"
                        onClick={() => reportsData.downloadReport(report.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Real-time Tab */}
        <TabsContent value="realtime" className="space-y-4 sm:space-y-6 w-full">
          <RealTimeStats data={reportsData.quickStats} />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4 sm:space-y-6 w-full">
          <LiveAlerts />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4 sm:space-y-6 w-full">
          <ActivityDashboard data={reportsData.quickStats} />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4 sm:space-y-6 w-full">
          <AdvancedMetrics data={reportsData.quickStats} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SalesReportModal 
        isOpen={activeModal === 'sales'} 
        onClose={() => setActiveModal(null)}
        data={reportsData.salesByPeriod}
      />
      
      <ProductsReportModal 
        isOpen={activeModal === 'products'} 
        onClose={() => setActiveModal(null)}
        data={reportsData.topProducts}
      />
      
      <StoresReportModal 
        isOpen={activeModal === 'stores'} 
        onClose={() => setActiveModal(null)}
        data={reportsData.storePerformance}
      />
      
      <CashierReportModal 
        isOpen={activeModal === 'cashiers'} 
        onClose={() => setActiveModal(null)}
        data={reportsData.cashierPerformance}
      />
      
      <AdvancedFiltersModal 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)}
        onApplyFilters={(filters) => {
          console.log('Applied filters:', filters);
          setShowFilters(false);
        }}
      />
      
      <ExportModal 
        isOpen={showExport} 
        onClose={() => setShowExport(false)}
        onExport={(exportConfig) => {
          console.log('Export config:', exportConfig);
          setShowExport(false);
        }}
      />
      
      <ReportsHistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)}
        reports={reportsData.recentReports as any}
        onDownload={reportsData.downloadReport}
      />

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
        stores={stores.map(s => ({ id: s.id, name: s.name }))}
        loading={generatingReport || reportsData.loading}
        showCategoryFilter={selectedReportType === 'sales' || selectedReportType === 'products'}
        title={getReportTitle(selectedReportType)}
        description={
          selectedReportType === 'daily' 
            ? "Selecciona la sucursal y el rango de fechas para el reporte diario." 
            : selectedReportType === 'sales'
            ? "Selecciona sucursal, rango de fechas y categoría (opcional) para el reporte de ventas."
            : selectedReportType === 'products'
            ? "Selecciona sucursal, rango de fechas y categoría (opcional) para el reporte de productos."
            : selectedReportType === 'inventory'
            ? "Selecciona sucursal, rango de fechas y categoría (opcional) para el reporte de inventario."
            : "Selecciona los filtros para generar el reporte en PDF."
        }
      />
    </div>
  );
}