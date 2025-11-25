import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Store, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  BarChart3,
  PieChart,
  Download,
  Trophy,
  Target
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/currency';
import { PDFGenerator } from '@/utils/pdfGenerator';

interface StoresReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    id: string;
    name: string;
    sales: number;
    customers: number;
    productivity: number;
    growth: number;
  }[];
}

export function StoresReportModal({ isOpen, onClose, data }: StoresReportModalProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [sortBy, setSortBy] = useState<'sales' | 'customers' | 'productivity' | 'growth'>('sales');

  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      const pdfGenerator = new PDFGenerator();
      const pdf = pdfGenerator.generateStoresReport(data, 'Mi Empresa');
      const filename = `Reporte_Tiendas_${new Date().toLocaleDateString('es-VE').replace(/\//g, '-')}.pdf`;
      pdfGenerator.downloadPDF(filename);
    } else {
      // TODO: Implement Excel export
      console.log(`Exporting stores report as ${format}`);
    }
  };

  const sortedData = [...data].sort((a, b) => b[sortBy] - a[sortBy]);

  const totalSales = data.reduce((sum, store) => sum + store.sales, 0);
  const totalCustomers = data.reduce((sum, store) => sum + store.customers, 0);
  const averageProductivity = data.reduce((sum, store) => sum + store.productivity, 0) / data.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Store className="w-5 h-5 text-accent" />
              <span>Reporte de Rendimiento por Tienda</span>
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
                  <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
                  <p className="text-sm text-muted-foreground">Ventas Totales</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <Users className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatNumber(totalCustomers)}</p>
                  <p className="text-sm text-muted-foreground">Clientes Totales</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <Target className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatCurrency(averageProductivity)}</p>
                  <p className="text-sm text-muted-foreground">Productividad Promedio</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <Store className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-2xl font-bold">{data.length}</p>
                  <p className="text-sm text-muted-foreground">Tiendas Analizadas</p>
                </div>
              </Card>
            </div>

            {/* Top 3 Stores */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Top 3 Tiendas</h3>
              <div className="space-y-3">
                {data.slice(0, 3).map((store, index) => (
                  <div key={store.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{store.name}</p>
                        <p className="text-sm text-muted-foreground">{formatNumber(store.customers)} clientes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(store.sales)}</p>
                      <p className="text-sm text-muted-foreground">{store.growth >= 0 ? '+' : ''}{store.growth.toFixed(1)}% crecimiento</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ranking" className="space-y-6">
            {/* Sorting Controls */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ranking de Tiendas</h3>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant={sortBy === 'sales' ? 'default' : 'outline'}
                    onClick={() => setSortBy('sales')}
                  >
                    Por Ventas
                  </Button>
                  <Button 
                    size="sm" 
                    variant={sortBy === 'customers' ? 'default' : 'outline'}
                    onClick={() => setSortBy('customers')}
                  >
                    Por Clientes
                  </Button>
                  <Button 
                    size="sm" 
                    variant={sortBy === 'productivity' ? 'default' : 'outline'}
                    onClick={() => setSortBy('productivity')}
                  >
                    Por Productividad
                  </Button>
                  <Button 
                    size="sm" 
                    variant={sortBy === 'growth' ? 'default' : 'outline'}
                    onClick={() => setSortBy('growth')}
                  >
                    Por Crecimiento
                  </Button>
                </div>
              </div>
            </Card>

            {/* Stores Table */}
            <Card className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Rank</th>
                      <th className="text-left p-2">Tienda</th>
                      <th className="text-right p-2">Ventas</th>
                      <th className="text-right p-2">Clientes</th>
                      <th className="text-right p-2">Productividad</th>
                      <th className="text-right p-2">Crecimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((store, index) => (
                      <tr key={store.id} className="border-b hover:bg-muted/30">
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">#{index + 1}</span>
                            {index < 3 && <Trophy className="w-4 h-4 text-yellow-500" />}
                          </div>
                        </td>
                        <td className="p-2 font-medium">{store.name}</td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(store.sales)}</td>
                        <td className="p-2 text-right">{formatNumber(store.customers)}</td>
                        <td className="p-2 text-right">{formatCurrency(store.productivity)}</td>
                        <td className="p-2 text-right">
                          <Badge variant={store.growth >= 0 ? "default" : "destructive"}>
                            {store.growth >= 0 ? '+' : ''}{store.growth.toFixed(1)}%
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
                    <p className="text-sm text-muted-foreground">Tienda con Mayor Ventas</p>
                    <p className="font-semibold">{data[0]?.name || 'N/A'}</p>
                    <p className="text-sm text-success">{formatCurrency(data[0]?.sales || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tienda con Más Clientes</p>
                    <p className="font-semibold">
                      {data.sort((a, b) => b.customers - a.customers)[0]?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-success">
                      {formatNumber(data.sort((a, b) => b.customers - a.customers)[0]?.customers || 0)} clientes
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mejor Productividad</p>
                    <p className="font-semibold">
                      {data.sort((a, b) => b.productivity - a.productivity)[0]?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-success">
                      {formatCurrency(data.sort((a, b) => b.productivity - a.productivity)[0]?.productivity || 0)}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Growth Analysis */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Análisis de Crecimiento</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Crecimiento Positivo</span>
                    <Badge variant="default">{(data.filter(s => s.growth > 0).length / data.length * 100).toFixed(0)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Alto Rendimiento</span>
                    <Badge variant="success">{(data.filter(s => s.sales > totalSales / data.length).length / data.length * 100).toFixed(0)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Productividad Alta</span>
                    <Badge variant="warning">{(data.filter(s => s.productivity > averageProductivity).length / data.length * 100).toFixed(0)}%</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Visualizaciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <BarChart3 className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">Gráfico de Barras</p>
                  <p className="text-xs text-muted-foreground">Ventas por tienda</p>
                </div>
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <PieChart className="w-12 h-12 text-success mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">Gráfico Circular</p>
                  <p className="text-xs text-muted-foreground">Distribución de ventas</p>
                </div>
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">Gráfico de Líneas</p>
                  <p className="text-xs text-muted-foreground">Tendencia de crecimiento</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
