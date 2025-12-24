import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  DollarSign,
  AlertOctagon,
  AlertTriangle,
  Package,
  Loader2,
  Search,
  Smartphone,
  Headphones,
  Wrench
} from 'lucide-react';
import { useInventoryFinancialSummary } from '@/hooks/useInventoryFinancialSummary';
import { useStore } from '@/contexts/StoreContext';
import { formatCurrency } from '@/utils/currency';
import { getCategoryLabel } from '@/constants/categories';

interface InventoryDashboardHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
}

export const InventoryDashboardHeader: React.FC<InventoryDashboardHeaderProps> = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange
}) => {
  const { availableStores, selectedStoreId } = useStore();
  const { data, loading, error } = useInventoryFinancialSummary(selectedStoreId);

  // Calcular totales
  const totalProducts = data?.category_breakdown.reduce((sum, cat) => sum + (cat.items_count || 0), 0) || 0;
  const totalUnits = data?.category_breakdown.reduce((sum, cat) => sum + (cat.total_quantity || 0), 0) || 0;
  // 🔥 RESTAURACIÓN: Si hay filtro de sucursal, mostrar solo 1 tienda
  const totalStores = selectedStoreId && selectedStoreId !== 'all' ? 1 : availableStores.length;
  const outOfStockPercentage = totalProducts > 0 
    ? ((data?.out_of_stock_count || 0) / totalProducts * 100).toFixed(1)
    : '0';

  // Top 3 categorías
  const topCategories = data?.category_breakdown
    .sort((a, b) => b.total_retail_value - a.total_retail_value)
    .slice(0, 3) || [];

  // Skeleton de carga
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Sección 1: KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        {/* Sección 2: Categorías */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-panel rounded-lg shadow-sm border border-white/10">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Manejo de error - mostrar valores en 0
  const statsData = {
    totalValue: data?.total_retail_value || 0,
    totalProducts: totalProducts || 0,
    totalStores: totalStores || 0,
    outOfStock: data?.out_of_stock_count || 0,
    outOfStockPercentage: outOfStockPercentage,
    lowStock: data?.critical_stock_count || 0,
    totalUnits: totalUnits || 0,
  };

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: TARJETAS KPI (Grid de 4 Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tarjeta 1: Valor del Inventario */}
        <Card className="glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 border-l-emerald-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                    <DollarSign className="h-5 w-5 text-emerald-400 brightness-125" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Valor Total del Inventario</p>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(statsData.totalValue)}
                </p>
                <p className="text-xs text-white/90">
                  {statsData.totalProducts} productos registrados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 2: Alerta de Agotados */}
        <Card className="glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 border-l-red-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                    <AlertOctagon className="h-5 w-5 text-red-400 brightness-125" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Productos Sin Stock</p>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {statsData.outOfStock}
                </p>
                <p className="text-xs text-white/90 mb-2">
                  {statsData.outOfStockPercentage}% del total
                </p>
                <Badge className="bg-red-100 text-red-800 border-red-300">
                  Requiere atención inmediata
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 3: Alerta de Stock Bajo */}
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
                <p className="text-2xl font-bold text-white mb-1">
                  {statsData.lowStock}
                </p>
                <p className="text-xs text-white/90 mb-2">
                  {statsData.lowStock} críticos
                </p>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  Reabastecimiento recomendado
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 4: Volumen Físico */}
        <Card className="glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 border-l-blue-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                    <Package className="h-5 w-5 text-blue-400 brightness-125" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Unidades en Stock</p>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {statsData.totalUnits.toLocaleString()}
                </p>
                <p className="text-xs text-white/90">
                  Unidades en total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN 2: DESGLOSE POR CATEGORÍA (Grid de 3 Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topCategories.map((category, index) => {
          // 🔥 NUEVO: Determinar ícono y color según categoría
          const getCategoryIcon = (categoryName: string) => {
            const name = categoryName.toLowerCase();
            if (name.includes('phone') || name.includes('teléfono')) {
              return { Icon: Smartphone, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' };
            } else if (name.includes('accessor') || name.includes('accesorio')) {
              return { Icon: Headphones, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', borderColor: 'border-indigo-500/30' };
            } else if (name.includes('servicio') || name.includes('service') || name.includes('técnico')) {
              return { Icon: Wrench, color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/30' };
            }
            // Default
            return { Icon: Package, color: 'text-white/90', bgColor: 'bg-white/10', borderColor: 'border-white/20' };
          };

          const { Icon, color, bgColor, borderColor } = getCategoryIcon(category.category_name);

          // Determinar color del borde izquierdo según categoría
          const getBorderColor = (categoryName: string) => {
            const name = categoryName.toLowerCase();
            if (name.includes('phone') || name.includes('teléfono')) {
              return 'border-l-purple-400';
            } else if (name.includes('accessor') || name.includes('accesorio')) {
              return 'border-l-indigo-400';
            } else if (name.includes('servicio') || name.includes('service') || name.includes('técnico')) {
              return 'border-l-orange-400';
            }
            return 'border-l-white/20';
          };

          return (
            <Card key={index} className={`glass-panel rounded-lg shadow-sm border border-white/10 border-l-4 ${getBorderColor(category.category_name)}`}>
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* 🔥 NUEVO: Ícono de categoría con color (mediano) */}
                      <div className={`p-2.5 ${bgColor} rounded-lg border ${borderColor}`}>
                        <Icon className={`w-6 h-6 ${color} brightness-125`} />
                      </div>
                      <h3 className="text-base font-semibold text-white">
                        {getCategoryLabel(category.category_name)}
                      </h3>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      Stock normal
                    </Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(category.total_retail_value)}
                    </p>
                  </div>
                  <div className="space-y-1 text-xs text-white/90">
                    <p>{category.items_count} productos registrados</p>
                    <p>{category.total_quantity.toLocaleString()} unidades totales</p>
                    <p className="font-medium text-white/90">
                      {category.percentage_of_total.toFixed(1)}% del total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {topCategories.length === 0 && (
          <div className="col-span-3 text-center py-8 text-white/90">
            No hay datos de categorías disponibles
          </div>
        )}
      </div>

      {/* SECCIÓN 3: BARRA DE CONTROL (Toolbar) */}
      <Card className="glass-panel rounded-lg shadow-sm border border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Buscador */}
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/90 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre, SKU o código de barras..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 glass-input border-white/20 text-white"
                />
              </div>
            </div>

            {/* Filtro por Categoría */}
            <div className="w-full md:w-[180px]">
              <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
                <SelectTrigger className="glass-input border-white/20 text-white">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="phones">Teléfonos</SelectItem>
                  <SelectItem value="accessories">Accesorios</SelectItem>
                  <SelectItem value="technical_service">Servicio Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

