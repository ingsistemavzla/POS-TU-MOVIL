import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  PieChart,
  Download,
  Star,
  Zap
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/currency';
import { PDFGenerator } from '@/utils/pdfGenerator';

interface ProductReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    id: string;
    name: string;
    unitsSold: number;
    revenue: number;
    margin: number;
    rotation: number;
  }[];
}

export function ProductsReportModal({ isOpen, onClose, data }: ProductReportModalProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [sortBy, setSortBy] = useState<'unitsSold' | 'revenue' | 'margin' | 'rotation'>('unitsSold');

  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      const pdfGenerator = new PDFGenerator();
      const pdf = pdfGenerator.generateProductsReport(data, 'Mi Empresa');
      const filename = `Reporte_Productos_${new Date().toLocaleDateString('es-VE').replace(/\//g, '-')}.pdf`;
      pdfGenerator.downloadPDF(filename);
    } else {
      // TODO: Implement Excel export
      console.log(`Exporting products report as ${format}`);
    }
  };

  const sortedData = [...data].sort((a, b) => b[sortBy] - a[sortBy]);

  const totalRevenue = data.reduce((sum, product) => sum + product.revenue, 0);
  const totalUnits = data.reduce((sum, product) => sum + product.unitsSold, 0);
  const averageMargin = data.reduce((sum, product) => sum + product.margin, 0) / data.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-success" />
              <span>Reporte de Productos Top</span>
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
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <Package className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatNumber(totalUnits)}</p>
                  <p className="text-sm text-muted-foreground">Unidades Vendidas</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold">{averageMargin.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Margen Promedio</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <Zap className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-2xl font-bold">{data.length}</p>
                  <p className="text-sm text-muted-foreground">Productos Analizados</p>
                </div>
              </Card>
            </div>

            {/* Top 5 Products */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Top 5 Productos</h3>
              <div className="space-y-3">
                {data.slice(0, 5).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{formatNumber(product.unitsSold)} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                      <p className="text-sm text-muted-foreground">{product.margin.toFixed(1)}% margen</p>
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
                <h3 className="text-lg font-semibold">Ranking de Productos</h3>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant={sortBy === 'unitsSold' ? 'default' : 'outline'}
                    onClick={() => setSortBy('unitsSold')}
                  >
                    Por Unidades
                  </Button>
                  <Button 
                    size="sm" 
                    variant={sortBy === 'revenue' ? 'default' : 'outline'}
                    onClick={() => setSortBy('revenue')}
                  >
                    Por Ingresos
                  </Button>
                  <Button 
                    size="sm" 
                    variant={sortBy === 'margin' ? 'default' : 'outline'}
                    onClick={() => setSortBy('margin')}
                  >
                    Por Margen
                  </Button>
                  <Button 
                    size="sm" 
                    variant={sortBy === 'rotation' ? 'default' : 'outline'}
                    onClick={() => setSortBy('rotation')}
                  >
                    Por Rotación
                  </Button>
                </div>
              </div>
            </Card>

            {/* Products Table */}
            <Card className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Rank</th>
                      <th className="text-left p-2">Producto</th>
                      <th className="text-right p-2">Unidades</th>
                      <th className="text-right p-2">Ingresos</th>
                      <th className="text-right p-2">Margen</th>
                      <th className="text-right p-2">Rotación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((product, index) => (
                      <tr key={product.id} className="border-b hover:bg-muted/30">
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">#{index + 1}</span>
                            {index < 3 && <Star className="w-4 h-4 text-yellow-500" />}
                          </div>
                        </td>
                        <td className="p-2 font-medium">{product.name}</td>
                        <td className="p-2 text-right">{formatNumber(product.unitsSold)}</td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(product.revenue)}</td>
                        <td className="p-2 text-right">
                          <Badge variant={product.margin > 30 ? "default" : "secondary"}>
                            {product.margin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="p-2 text-right">{product.rotation.toFixed(1)}</td>
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
                    <p className="text-sm text-muted-foreground">Producto con Mayor Ingreso</p>
                    <p className="font-semibold">{data[0]?.name || 'N/A'}</p>
                    <p className="text-sm text-success">{formatCurrency(data[0]?.revenue || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Producto Más Vendido</p>
                    <p className="font-semibold">
                      {data.sort((a, b) => b.unitsSold - a.unitsSold)[0]?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-success">
                      {formatNumber(data.sort((a, b) => b.unitsSold - a.unitsSold)[0]?.unitsSold || 0)} unidades
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mejor Margen</p>
                    <p className="font-semibold">
                      {data.sort((a, b) => b.margin - a.margin)[0]?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-success">
                      {data.sort((a, b) => b.margin - a.margin)[0]?.margin.toFixed(1) || 0}%
                    </p>
                  </div>
                </div>
              </Card>

              {/* Category Analysis */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Análisis por Categorías</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Alto Rendimiento</span>
                    <Badge variant="default">{(data.filter(p => p.revenue > totalRevenue / data.length).length / data.length * 100).toFixed(0)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Margen Alto</span>
                    <Badge variant="success">{(data.filter(p => p.margin > 30).length / data.length * 100).toFixed(0)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rotación Alta</span>
                    <Badge variant="warning">{(data.filter(p => p.rotation > 5).length / data.length * 100).toFixed(0)}%</Badge>
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
                  <p className="text-xs text-muted-foreground">Ventas por producto</p>
                </div>
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <PieChart className="w-12 h-12 text-success mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">Gráfico Circular</p>
                  <p className="text-xs text-muted-foreground">Distribución de ingresos</p>
                </div>
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">Gráfico de Líneas</p>
                  <p className="text-xs text-muted-foreground">Tendencia de ventas</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
