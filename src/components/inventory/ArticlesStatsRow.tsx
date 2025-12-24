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
          <Card key={i} className="glass-panel rounded-lg shadow-sm border border-white/10">
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
        <Card className="glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 border-l-emerald-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                    <DollarSign className="h-5 w-5 text-emerald-400 brightness-125" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Valor Total</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(statsData.totalValue)}
                </p>
                <p className="text-xs text-white/90 mt-1">
                  {statsData.totalProducts} productos registrados • {statsData.totalUnits.toLocaleString()} unidades totales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 2: Sin Stock (Rojo) */}
        <Card className="glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 border-l-red-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                    <AlertOctagon className="h-5 w-5 text-red-400 brightness-125" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Sin Stock</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {statsData.outOfStock}
                </p>
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 mt-2">
                  Atención Inmediata
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 3: Stock Bajo (Amarillo) */}
        <Card className="glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 border-l-yellow-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 brightness-125" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Stock Bajo</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {statsData.lowStock}
                </p>
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 mt-2">
                  Reabastecer
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 4: Unidades (Azul) */}
        <Card className="glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 border-l-blue-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                    <Package className="h-5 w-5 text-blue-400 brightness-125" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Unidades</p>
                </div>
                <p className="text-2xl font-bold text-white">
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
        <Card className="glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 border-l-purple-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
                    <Smartphone className="h-6 w-6 text-purple-400 brightness-125" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Teléfonos</p>
                </div>
                {/* 🔥 ORDEN CORREGIDO: Unidades primero (grande) */}
                <p className="text-2xl font-bold text-white">
                  {telefonosData.total_quantity.toLocaleString()} Unidades
                </p>
                {/* Valor y productos debajo (pequeño) */}
                <p className="text-xs text-white/90 mt-1">
                  {formatCurrency(telefonosData.total_retail_value)} • {telefonosData.items_count} productos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 2: Accesorios */}
        <Card className="glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 border-l-indigo-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                    <Headphones className="h-6 w-6 text-indigo-400 brightness-125" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Accesorios</p>
                </div>
                {/* 🔥 ORDEN CORREGIDO: Unidades primero (grande) */}
                <p className="text-2xl font-bold text-white">
                  {accesoriosData.total_quantity.toLocaleString()} Unidades
                </p>
                {/* Valor y productos debajo (pequeño) */}
                <p className="text-xs text-white/90 mt-1">
                  {formatCurrency(accesoriosData.total_retail_value)} • {accesoriosData.items_count} productos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 3: Servicio */}
        <Card className="glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 border-l-orange-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2.5 bg-orange-500/20 rounded-lg border border-orange-500/30">
                    <Wrench className="h-6 w-6 text-orange-400 brightness-125" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Servicio</p>
                </div>
                {/* 🔥 ORDEN CORREGIDO: Unidades primero (grande) */}
                <p className="text-2xl font-bold text-white">
                  {servicioData.total_quantity.toLocaleString()} Unidades
                </p>
                {/* Valor y productos debajo (pequeño) */}
                <p className="text-xs text-white/90 mt-1">
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


