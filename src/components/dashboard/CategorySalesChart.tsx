import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart
} from "lucide-react";
import { formatCurrency } from "@/utils/currency";

interface CategorySalesData {
  category: string;
  totalSales: number;
  totalSalesUSD: number;
  totalQuantity: number;
  orderCount: number;
  averageOrderValue: number;
  percentage: number;
}

interface CategorySalesChartProps {
  data: CategorySalesData[];
  loading?: boolean;
}

export function CategorySalesChart({ data, loading = false }: CategorySalesChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Ventas por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando datos de categorías...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Ventas por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay datos de categorías</h3>
              <p className="text-muted-foreground">No se encontraron ventas por categoría para mostrar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSalesUSD = data.reduce((sum, category) => sum + category.totalSalesUSD, 0);

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-cyan-500'
    ];
    return colors[index % colors.length];
  };

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('electrónic') || categoryLower.includes('tech')) return '📱';
    if (categoryLower.includes('ropa') || categoryLower.includes('vestimenta')) return '👕';
    if (categoryLower.includes('hogar') || categoryLower.includes('casa')) return '🏠';
    if (categoryLower.includes('deporte') || categoryLower.includes('fitness')) return '⚽';
    if (categoryLower.includes('libro') || categoryLower.includes('papelería')) return '📚';
    if (categoryLower.includes('juguete') || categoryLower.includes('juego')) return '🎮';
    if (categoryLower.includes('comida') || categoryLower.includes('alimento')) return '🍎';
    if (categoryLower.includes('belleza') || categoryLower.includes('cosmético')) return '💄';
    if (categoryLower.includes('auto') || categoryLower.includes('coche')) return '🚗';
    return '📦';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Ventas por Categoría
        </CardTitle>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <DollarSign className="w-4 h-4 mr-1" />
            <span>Total: {formatCurrency(totalSalesUSD)}</span>
          </div>
          <div className="flex items-center">
            <ShoppingCart className="w-4 h-4 mr-1" />
            <span>{data.length} categorías</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Gráfico de barras */}
          <div className="space-y-3">
            {data.slice(0, 8).map((category, index) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getCategoryIcon(category.category)}</span>
                    <div>
                      <div className="font-medium text-sm">{category.category}</div>
                      <div className="text-xs text-muted-foreground">
                        {category.totalQuantity} unidades vendidas
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">{formatCurrency(category.totalSalesUSD)}</div>
                    <Badge variant="outline" className="text-xs">
                      {category.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                
                {/* Barra de progreso */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getCategoryColor(index)} transition-all duration-300`}
                    style={{ width: `${Math.min(category.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Resumen de métricas */}
          {data.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data[0]?.totalSalesUSD || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Categoría #1</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {data.length}
                </div>
                <div className="text-xs text-muted-foreground">Categorías Activas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {data.reduce((sum, cat) => sum + cat.totalQuantity, 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total Unidades</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(data.reduce((sum, cat) => sum + cat.averageOrderValue, 0) / data.length)}
                </div>
                <div className="text-xs text-muted-foreground">Promedio por Categoría</div>
              </div>
            </div>
          )}

          {/* Tabla detallada */}
          {data.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Detalle por Categoría
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(index)}`} />
                      <span className="font-medium text-sm">{category.category}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(category.totalSalesUSD)}</div>
                        <div className="text-xs text-muted-foreground">{category.percentage.toFixed(1)}%</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{category.totalQuantity}</div>
                        <div className="text-xs text-muted-foreground">unidades</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

