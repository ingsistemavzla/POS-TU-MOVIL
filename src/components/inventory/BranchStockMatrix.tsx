import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle,
  Loader2,
  Store,
  RefreshCw,
  FileText
} from 'lucide-react';
import { useBranchStockMatrix } from '@/hooks/useBranchStockMatrix';
import { formatCurrency } from '@/utils/currency';
import { getCategoryLabel } from '@/constants/categories';

export const BranchStockMatrix: React.FC = () => {
  const { data, loading, error } = useBranchStockMatrix();

  // Extraer todas las categorías únicas de todas las tiendas
  const allCategories = useMemo(() => {
    if (!data?.matrix) return [];
    
    const categorySet = new Set<string>();
    data.matrix.forEach(store => {
      store.categories?.forEach(cat => {
        categorySet.add(cat.category_name);
      });
    });
    
    // Ordenar categorías: phones, accessories, technical_service primero, luego el resto
    const sortedCategories = Array.from(categorySet).sort((a, b) => {
      const order: Record<string, number> = {
        'phones': 1,
        'accessories': 2,
        'technical_service': 3,
      };
      const orderA = order[a] || 999;
      const orderB = order[b] || 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });
    
    return sortedCategories;
  }, [data]);

  // Ordenar tiendas alfabéticamente
  const sortedStores = useMemo(() => {
    if (!data?.matrix) return [];
    return [...data.matrix].sort((a, b) => a.store_name.localeCompare(b.store_name));
  }, [data]);

  // Calcular el valor total de venta por tienda (suma de todos los value_retail de categorías)
  const getTotalRetailValue = (store: { categories?: Array<{ value_retail: number }> }) => {
    if (!store.categories) return 0;
    return store.categories.reduce((sum, cat) => sum + (cat.value_retail || 0), 0);
  };

  // Obtener el stock de una categoría específica para una tienda
  const getCategoryStock = (
    store: { categories?: Array<{ category_name: string; stock_qty: number }> },
    categoryName: string
  ): number => {
    if (!store.categories) return 0;
    const category = store.categories.find(cat => cat.category_name === categoryName);
    return category?.stock_qty || 0;
  };

  // Calcular totales generales
  const totals = useMemo(() => {
    if (!sortedStores || sortedStores.length === 0) {
      return {
        categoryTotals: {} as Record<string, number>,
        totalStock: 0,
        totalRetailValue: 0,
      };
    }

    const categoryTotals: Record<string, number> = {};
    let totalStock = 0;
    let totalRetailValue = 0;

    sortedStores.forEach(store => {
      // Sumar stock total
      totalStock += store.total_stock_quantity || 0;
      
      // Sumar valor de venta
      totalRetailValue += getTotalRetailValue(store);
      
      // Sumar por categoría
      allCategories.forEach(categoryName => {
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = 0;
        }
        categoryTotals[categoryName] += getCategoryStock(store, categoryName);
      });
    });

    return { categoryTotals, totalStock, totalRetailValue };
  }, [sortedStores, allCategories]);

  // Función para obtener icono de categoría
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('phone') || name.includes('teléfono')) return '📱';
    if (name.includes('accessor') || name.includes('accesorio')) return '🎧';
    if (name.includes('servicio') || name.includes('service') || name.includes('técnico')) return '🔧';
    return '📦';
  };

  // Skeleton de carga
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Distribución de Stock por Sucursal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Manejo de error
  if (error || !data) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Distribución de Stock por Sucursal</h2>
        <Card className="bg-white rounded-lg shadow-sm border border-red-200">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <div className="text-center">
                  <p className="font-semibold">Error al cargar datos</p>
                  <p className="text-sm text-gray-600">{error || 'No se pudieron cargar los datos de la matriz'}</p>
                </div>
              </div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no hay datos
  if (!data.matrix || data.matrix.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Distribución de Stock por Sucursal</h2>
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay datos de inventario</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Distribución de Stock por Sucursal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedStores.map((store) => {
          const totalRetailValue = getTotalRetailValue(store);
          
          return (
            <Card 
              key={store.store_id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-gray-900">
                    {store.store_name}
                  </CardTitle>
                  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                    {store.total_items || 0} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lista vertical de categorías */}
                <div className="space-y-2">
                  {allCategories.map(categoryName => {
                    const stock = getCategoryStock(store, categoryName);
                    if (stock === 0) return null; // No mostrar categorías sin stock
                    
                    return (
                      <div key={categoryName} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {getCategoryIcon(categoryName)} {getCategoryLabel(categoryName)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className="bg-gray-100 text-gray-700 border-gray-300 font-normal"
                        >
                          {stock.toLocaleString()}
                        </Badge>
                      </div>
                    );
                  })}
                  {allCategories.every(cat => getCategoryStock(store, cat) === 0) && (
                    <p className="text-sm text-gray-400">Sin stock disponible</p>
                  )}
                </div>
                
                {/* Footer: Valor Total */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Valor Total</span>
                    <span className="text-accent-primary font-semibold">
                      {formatCurrency(totalRetailValue)}
                    </span>
                  </div>
                </div>
                
                {/* Botón Ver Reporte */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2 text-xs"
                  onClick={() => {
                    // TODO: Implementar navegación a reporte detallado
                    console.log('Ver reporte de:', store.store_name);
                  }}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Ver Reporte
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

