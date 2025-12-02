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
  Search
} from 'lucide-react';
import { useInventoryFinancialSummary } from '@/hooks/useInventoryFinancialSummary';
import { formatCurrency } from '@/utils/currency';
import { getCategoryLabel } from '@/constants/categories';

interface InventoryDashboardHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  storeFilter: string;
  onStoreFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  stores: Array<{ id: string; name: string }>;
}

export const InventoryDashboardHeader: React.FC<InventoryDashboardHeaderProps> = ({
  searchTerm,
  onSearchChange,
  storeFilter,
  onStoreFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  stores
}) => {
  const { data, loading, error } = useInventoryFinancialSummary();

  // Calcular totales
  const totalProducts = data?.category_breakdown.reduce((sum, cat) => sum + (cat.items_count || 0), 0) || 0;
  const totalUnits = data?.category_breakdown.reduce((sum, cat) => sum + (cat.total_quantity || 0), 0) || 0;
  const totalStores = stores.length;
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
        {/* Sección 2: Categorías */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white rounded-lg shadow-sm border border-gray-200">
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
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Valor Total del Inventario</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {formatCurrency(statsData.totalValue)}
                </p>
                <p className="text-xs text-gray-500">
                  {statsData.totalProducts} productos en {statsData.totalStores} tiendas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 2: Alerta de Agotados */}
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertOctagon className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Productos Sin Stock</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {statsData.outOfStock}
                </p>
                <p className="text-xs text-gray-500 mb-2">
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
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {statsData.lowStock}
                </p>
                <p className="text-xs text-gray-500 mb-2">
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
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Unidades en Stock</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {statsData.totalUnits.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  Unidades en total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN 2: DESGLOSE POR CATEGORÍA (Grid de 3 Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topCategories.map((category, index) => (
          <Card key={index} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <CardContent className="p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">
                    {getCategoryLabel(category.category_name)}
                  </h3>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                    Stock normal
                  </Badge>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(category.total_retail_value)}
                  </p>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>{category.items_count} productos únicos</p>
                  <p>{category.total_quantity.toLocaleString()} unidades totales</p>
                  <p className="font-medium text-gray-700">
                    {category.percentage_of_total.toFixed(1)}% del total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {topCategories.length === 0 && (
          <div className="col-span-3 text-center py-8 text-gray-500">
            No hay datos de categorías disponibles
          </div>
        )}
      </div>

      {/* SECCIÓN 3: BARRA DE CONTROL (Toolbar) */}
      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Buscador */}
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre, SKU o código de barras..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 bg-white border-gray-200"
                />
              </div>
            </div>

            {/* Filtro por Tienda */}
            <div className="w-full md:w-[180px]">
              <Select value={storeFilter} onValueChange={onStoreFilterChange}>
                <SelectTrigger className="bg-white border-gray-200">
                  <SelectValue placeholder="Todas las tiendas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tiendas</SelectItem>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Categoría */}
            <div className="w-full md:w-[180px]">
              <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
                <SelectTrigger className="bg-white border-gray-200">
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

