import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Download,
  Trophy,
  Target,
  Zap
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/currency';
import { PDFGenerator } from '@/utils/pdfGenerator';

interface CashierReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    id: string;
    name: string;
    salesProcessed: number;
    averageTime: number;
    errors: number;
    performance: number;
  }[];
}

export function CashierReportModal({ isOpen, onClose, data }: CashierReportModalProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [sortBy, setSortBy] = useState<'salesProcessed' | 'averageTime' | 'performance' | 'errors'>('salesProcessed');

  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      const pdfGenerator = new PDFGenerator();
      const pdf = pdfGenerator.generateCashiersReport(data, 'Mi Empresa');
      const filename = `Reporte_Cajeros_${new Date().toLocaleDateString('es-VE').replace(/\//g, '-')}.pdf`;
      pdfGenerator.downloadPDF(filename);
    } else {
      // TODO: Implement Excel export
      console.log(`Exporting cashier report as ${format}`);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'averageTime') {
      return a[sortBy] - b[sortBy]; // Lower time is better
    }
    if (sortBy === 'errors') {
      return a[sortBy] - b[sortBy]; // Lower errors is better
    }
    return b[sortBy] - a[sortBy]; // Higher is better for sales and performance
  });

  const totalSales = data.reduce((sum, cashier) => sum + cashier.salesProcessed, 0);
  const averageTime = data.reduce((sum, cashier) => sum + cashier.averageTime, 0) / data.length;
  const totalErrors = data.reduce((sum, cashier) => sum + cashier.errors, 0);
  const averagePerformance = data.reduce((sum, cashier) => sum + cashier.performance, 0) / data.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-warning" />
              <span>Reporte de Rendimiento de Cajeros</span>
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
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="analysis">Análisis</TabsTrigger>
            <TabsTrigger value="charts">Gráficos</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatNumber(totalSales)}</p>
                  <p className="text-sm text-muted-foreground">Ventas Procesadas</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-2xl font-bold">{averageTime.toFixed(1)} min</p>
                  <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <Target className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold">{averagePerformance.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Performance Promedio</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-2xl font-bold">{totalErrors}</p>
                  <p className="text-sm text-muted-foreground">Errores Totales</p>
                </div>
              </Card>
            </div>

            {/* Top 3 Cashiers */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Top 3 Cajeros</h3>
              <div className="space-y-3">
                {data.slice(0, 3).map((cashier, index) => (
                  <div key={cashier.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{cashier.name}</p>
                        <p className="text-sm text-muted-foreground">{cashier.salesProcessed} ventas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{cashier.performance.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">{cashier.averageTime.toFixed(1)} min promedio</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Performance Insights */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Insights de Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-success/5 rounded-lg">
                  <Zap className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-lg font-semibold">
                    {data.filter(c => c.performance >= 90).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Excelente (≥90%)</p>
                </div>
                <div className="text-center p-4 bg-warning/5 rounded-lg">
                  <Target className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-lg font-semibold">
                    {data.filter(c => c.performance >= 70 && c.performance < 90).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Bueno (70-89%)</p>
                </div>
                <div className="text-center p-4 bg-destructive/5 rounded-lg">
                  <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                  <p className="text-lg font-semibold">
                    {data.filter(c => c.performance < 70).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Necesita Mejora (&lt;70%)</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ranking" className="space-y-6">
            {/* Sorting Controls */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ranking de Cajeros</h3>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant={sortBy === 'salesProcessed' ? 'default' : 'outline'}
                    onClick={() => setSortBy('salesProcessed')}
                  >
                    Por Ventas
                  </Button>
                  <Button 
                    size="sm" 
                    variant={sortBy === 'performance' ? 'default' : 'outline'}
                    onClick={() => setSortBy('performance')}
                  >
                    Por Performance
                  </Button>
                  <Button 
                    size="sm" 
                    variant={sortBy === 'averageTime' ? 'default' : 'outline'}
                    onClick={() => setSortBy('averageTime')}
                  >
                    Por Tiempo
                  </Button>
                  <Button 
                    size="sm" 
                    variant={sortBy === 'errors' ? 'default' : 'outline'}
                    onClick={() => setSortBy('errors')}
                  >
                    Por Errores
                  </Button>
                </div>
              </div>
            </Card>

            {/* Cashiers Table */}
            <Card className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Rank</th>
                      <th className="text-left p-2">Cajero</th>
                      <th className="text-right p-2">Ventas</th>
                      <th className="text-right p-2">Tiempo Promedio</th>
                      <th className="text-right p-2">Performance</th>
                      <th className="text-right p-2">Errores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((cashier, index) => (
                      <tr key={cashier.id} className="border-b hover:bg-muted/30">
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">#{index + 1}</span>
                            {index < 3 && <Trophy className="w-4 h-4 text-yellow-500" />}
                          </div>
                        </td>
                        <td className="p-2 font-medium">{cashier.name}</td>
                        <td className="p-2 text-right font-semibold">{formatNumber(cashier.salesProcessed)}</td>
                        <td className="p-2 text-right">{cashier.averageTime.toFixed(1)} min</td>
                        <td className="p-2 text-right">
                          <Badge variant={cashier.performance >= 90 ? "default" : cashier.performance >= 70 ? "secondary" : "destructive"}>
                            {cashier.performance.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="p-2 text-right">
                          <Badge variant={cashier.errors === 0 ? "default" : cashier.errors <= 2 ? "secondary" : "destructive"}>
                            {cashier.errors}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Performance Analysis */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Análisis de Performance</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cajero con Más Ventas</p>
                    <p className="font-semibold">{data[0]?.name || 'N/A'}</p>
                    <p className="text-sm text-success">{formatNumber(data[0]?.salesProcessed || 0)} ventas</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mejor Performance</p>
                    <p className="font-semibold">
                      {data.sort((a, b) => b.performance - a.performance)[0]?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-success">
                      {data.sort((a, b) => b.performance - a.performance)[0]?.performance.toFixed(1) || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Más Rápido</p>
                    <p className="font-semibold">
                      {data.sort((a, b) => a.averageTime - b.averageTime)[0]?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-success">
                      {data.sort((a, b) => a.averageTime - b.averageTime)[0]?.averageTime.toFixed(1) || 0} min promedio
                    </p>
                  </div>
                </div>
              </Card>

              {/* Efficiency Analysis */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Análisis de Eficiencia</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sin Errores</span>
                    <Badge variant="default">{(data.filter(c => c.errors === 0).length / data.length * 100).toFixed(0)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Performance Alta</span>
                    <Badge variant="success">{(data.filter(c => c.performance >= 80).length / data.length * 100).toFixed(0)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tiempo Óptimo</span>
                    <Badge variant="warning">{(data.filter(c => c.averageTime <= 3).length / data.length * 100).toFixed(0)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Necesita Entrenamiento</span>
                    <Badge variant="destructive">{(data.filter(c => c.performance < 70 || c.errors > 3).length / data.length * 100).toFixed(0)}%</Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recomendaciones</h3>
              <div className="space-y-3">
                {data.filter(c => c.performance < 70).map(cashier => (
                  <div key={cashier.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                    <div>
                      <p className="font-medium text-destructive">{cashier.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Performance: {cashier.performance.toFixed(1)}% • Errores: {cashier.errors}
                      </p>
                    </div>
                    <Badge variant="destructive">Necesita Entrenamiento</Badge>
                  </div>
                ))}
                {data.filter(c => c.averageTime > 5).map(cashier => (
                  <div key={cashier.id} className="flex items-center justify-between p-3 bg-warning/5 rounded-lg border border-warning/20">
                    <div>
                      <p className="font-medium text-warning">{cashier.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Tiempo promedio: {cashier.averageTime.toFixed(1)} min
                      </p>
                    </div>
                    <Badge variant="secondary">Optimizar Procesos</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Visualizaciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <BarChart3 className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">Gráfico de Barras</p>
                  <p className="text-xs text-muted-foreground">Ventas por cajero</p>
                </div>
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <PieChart className="w-12 h-12 text-success mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">Gráfico Circular</p>
                  <p className="text-xs text-muted-foreground">Distribución de performance</p>
                </div>
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">Gráfico de Líneas</p>
                  <p className="text-xs text-muted-foreground">Tendencia de eficiencia</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
