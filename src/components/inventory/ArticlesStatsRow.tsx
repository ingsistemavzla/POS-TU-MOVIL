import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign,
  AlertOctagon,
  AlertTriangle,
  Package,
  Loader2,
  Smartphone,
  Headphones,
  Wrench
} from 'lucide-react';
import { useInventoryFinancialSummary } from '@/hooks/useInventoryFinancialSummary';
import { useStore } from '@/contexts/StoreContext';
import { formatCurrency } from '@/utils/currency';

export const ArticlesStatsRow: React.FC = () => {
  const { selectedStoreId } = useStore();
  const { data, loading, error } = useInventoryFinancialSummary(selectedStoreId);

  // Calcular total de productos (suma de items_count de todas las categorías)
  const totalProducts = data?.category_breakdown.reduce((sum, cat) => sum + (cat.items_count || 0), 0) || 0;
  
  // Calcular total de unidades (suma de total_quantity de todas las categorías)
  const totalUnits = data?.category_breakdown.reduce((sum, cat) => sum + (cat.total_quantity || 0), 0) || 0;

  // Skeleton de carga
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <CardContent className="p-5">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Manejo de error - mostrar valores en 0
  const statsData = {
    totalValue: data?.total_retail_value || 0,
    totalProducts: totalProducts || 0,
    outOfStock: data?.out_of_stock_count || 0,
    lowStock: data?.critical_stock_count || 0,
    totalUnits: totalUnits || 0,
  };

  // 🔥 NUEVO: Obtener datos de categorías específicas
  // Buscar por valor de BD ('phones', 'accessories', 'technical_service') o por label
  const getCategoryData = (...categoryNames: string[]) => {
    for (const categoryName of categoryNames) {
      const category = data?.category_breakdown.find(
        cat => cat.category_name.toLowerCase() === categoryName.toLowerCase()
      );
      if (category) {
        return {
          items_count: category.items_count || 0,
          total_retail_value: category.total_retail_value || 0,
          total_quantity: category.total_quantity || 0,
        };
      }
    }
    // Si no se encuentra ninguna, retornar valores en 0
    return {
      items_count: 0,
      total_retail_value: 0,
      total_quantity: 0,
    };
  };

  // Buscar por valor de BD primero, luego por label como fallback
  const telefonosData = getCategoryData('phones', 'Teléfonos', 'teléfonos');
  const accesoriosData = getCategoryData('accessories', 'Accesorios', 'accesorios');
  const servicioData = getCategoryData('technical_service', 'Servicio Técnico', 'servicio técnico', 'Servicio', 'servicio');

  return (
    <>
      {/* 4 Cards de KPIs Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Tarjeta 1: Valor Total (Verde) */}
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Valor Total</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(statsData.totalValue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {statsData.totalProducts} productos registrados • {statsData.totalUnits.toLocaleString()} unidades totales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 2: Sin Stock (Rojo) */}
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertOctagon className="h-5 w-5 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Sin Stock</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {statsData.outOfStock}
                </p>
                <Badge className="bg-red-100 text-red-800 border-red-300 mt-2">
                  Atención Inmediata
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 3: Stock Bajo (Amarillo) */}
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {statsData.lowStock}
                </p>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 mt-2">
                  Reabastecer
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 4: Unidades (Azul) */}
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Unidades</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {statsData.totalUnits.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🔥 NUEVO: 3 Cards de Categorías (mismo ancho total que las 4 de arriba) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Tarjeta 1: Teléfonos */}
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2.5 bg-purple-50 rounded-lg">
                    <Smartphone className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Teléfonos</p>
                </div>
                {/* 🔥 ORDEN CORREGIDO: Unidades primero (grande) */}
                <p className="text-2xl font-bold text-gray-900">
                  {telefonosData.total_quantity.toLocaleString()} Unidades
                </p>
                {/* Valor y productos debajo (pequeño) */}
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(telefonosData.total_retail_value)} • {telefonosData.items_count} productos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 2: Accesorios */}
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2.5 bg-indigo-50 rounded-lg">
                    <Headphones className="h-6 w-6 text-indigo-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Accesorios</p>
                </div>
                {/* 🔥 ORDEN CORREGIDO: Unidades primero (grande) */}
                <p className="text-2xl font-bold text-gray-900">
                  {accesoriosData.total_quantity.toLocaleString()} Unidades
                </p>
                {/* Valor y productos debajo (pequeño) */}
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(accesoriosData.total_retail_value)} • {accesoriosData.items_count} productos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 3: Servicio */}
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2.5 bg-orange-50 rounded-lg">
                    <Wrench className="h-6 w-6 text-orange-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Servicio</p>
                </div>
                {/* 🔥 ORDEN CORREGIDO: Unidades primero (grande) */}
                <p className="text-2xl font-bold text-gray-900">
                  {servicioData.total_quantity.toLocaleString()} Unidades
                </p>
                {/* Valor y productos debajo (pequeño) */}
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(servicioData.total_retail_value)} • {servicioData.items_count} productos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};


