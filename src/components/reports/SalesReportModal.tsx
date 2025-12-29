import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Calendar,
  Download,
  BarChart3,
  LineChart,
  PieChart
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/currency';
import { PDFGenerator } from '@/utils/pdfGenerator';
import { ExecutiveReportCharts } from './ExecutiveReportCharts';
import { useExecutiveReports } from '@/hooks/useExecutiveReports';

interface SalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: {
    period: string;
    totalUsd: number;
    totalBs: number;
    transactions: number;
    averageTicket: number;
    uniqueCustomers: number;
    growth: number;
  }[];
  executiveData?: any; // Datos de la nueva RPC
  dateFrom?: Date;
  dateTo?: Date;
  storeId?: string | null;
  category?: string | null;
}

export function SalesReportModal({ isOpen, onClose, data, executiveData, dateFrom, dateTo, storeId, category }: SalesReportModalProps) {
  const [activeTab, setActiveTab] = useState('summary');
  
  // Obtener datos ejecutivos si no se proporcionan
  const { data: executiveReportData, loading: loadingExecutive, refresh } = useExecutiveReports({
    storeId: storeId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    category: category || undefined
  });
  
  const finalExecutiveData = executiveData || executiveReportData;

  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      const pdfGenerator = new PDFGenerator();
      const pdf = pdfGenerator.generateSalesReport(data, 'Mi Empresa');
      const filename = `Reporte_Ventas_${new Date().toLocaleDateString('es-VE').replace(/\//g, '-')}.pdf`;
      pdfGenerator.downloadPDF(filename);
    } else {
      // TODO: Implement Excel export
      console.log(`Exporting sales report as ${format}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Reporte de Ventas por Período</span>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => handleExport('excel')}>
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="charts">Gráficos</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="comparison">Comparación</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.map((period, index) => (
                <Card key={period.period} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{period.period}</h3>
                      <Badge variant={period.growth >= 0 ? "default" : "destructive"}>
                        {period.growth >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {period.growth.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ventas USD</span>
                        <span className="font-semibold">{formatCurrency(period.totalUsd)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ventas Bs</span>
                        <span className="font-semibold">{formatCurrency(period.totalBs, 'VES')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Transacciones</span>
                        <span className="font-semibold">{formatNumber(period.transactions)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ticket Promedio</span>
                        <span className="font-semibold">{formatCurrency(period.averageTicket)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Clientes Únicos</span>
                        <span className="font-semibold">{formatNumber(period.uniqueCustomers)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Key Metrics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Métricas Clave</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatCurrency(data[0]?.totalUsd || 0)}</p>
                  <p className="text-sm text-muted-foreground">Ventas Totales (7 días)</p>
                </div>
                <div className="text-center p-4 bg-success/5 rounded-lg">
                  <ShoppingCart className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatNumber(data[0]?.transactions || 0)}</p>
                  <p className="text-sm text-muted-foreground">Transacciones (7 días)</p>
                </div>
                <div className="text-center p-4 bg-accent/5 rounded-lg">
                  <Users className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatNumber(data[0]?.uniqueCustomers || 0)}</p>
                  <p className="text-sm text-muted-foreground">Clientes Únicos (7 días)</p>
                </div>
                <div className="text-center p-4 bg-warning/5 rounded-lg">
                  <Calendar className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatCurrency(data[0]?.averageTicket || 0)}</p>
                  <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <ExecutiveReportCharts 
              data={finalExecutiveData} 
              loading={loadingExecutive}
            />
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Detalles por Período</h3>
              <div className="space-y-4">
                {data.map((period, index) => (
                  <div key={period.period} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{period.period}</h4>
                      <Badge variant={period.growth >= 0 ? "default" : "destructive"}>
                        {period.growth >= 0 ? '+' : ''}{period.growth.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Ventas USD</p>
                        <p className="font-semibold">{formatCurrency(period.totalUsd)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ventas Bs</p>
                        <p className="font-semibold">{formatCurrency(period.totalBs, 'VES')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Transacciones</p>
                        <p className="font-semibold">{formatNumber(period.transactions)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ticket Promedio</p>
                        <p className="font-semibold">{formatCurrency(period.averageTicket)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Clientes Únicos</p>
                        <p className="font-semibold">{formatNumber(period.uniqueCustomers)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Comparación de Períodos</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.map((period, index) => (
                    <div key={period.period} className="text-center p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">{period.period}</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Crecimiento</p>
                          <p className={`text-lg font-bold ${period.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {period.growth >= 0 ? '+' : ''}{period.growth.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Eficiencia</p>
                          <p className="text-lg font-bold">
                            {((period.totalUsd / period.transactions) / (data[0]?.totalUsd / data[0]?.transactions || 1) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
