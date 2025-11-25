import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Store,
  TrendingUp,
  AlertCircle,
  ShoppingCart,
  BarChart3,
  RefreshCw,
  Smartphone,
  Headphones,
  Wrench
} from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCT_CATEGORIES } from '@/constants/categories';
import { calculateFilteredStats, getCategoryStats } from '@/lib/inventory/stats';

interface InventoryStatsCardsProps {
  selectedStore?: string;
}

export const InventoryStatsCards: React.FC<InventoryStatsCardsProps> = ({ selectedStore = 'all' }) => {
  const { userProfile } = useAuth();
  const { 
    inventory,
    stats: { totalValue, totalProducts, outOfStock, lowStock, criticalStock, averageStock, totalStores },
    loading, 
    error
  } = useInventory();

  // Mapa auxiliar para unificar unidades por categoría/sucursal con el panel de Productos
  const [storeUnitsByCategory, setStoreUnitsByCategory] = useState<Record<string, {
    storeName: string;
    phones: number;
    accessories: number;
    technical_service: number;
  }>>({});

  // Totales globales por categoría (valor, unidades y productos únicos) usando la misma lógica que el reporte
  const [globalCategoryTotals, setGlobalCategoryTotals] = useState<Record<string, {
    totalValue: number;
    totalUnits: number;
    uniqueProducts: number;
  }>>({});

  // Cargar unidades por categoría y sucursal usando la misma lógica base que ProductsPage
  useEffect(() => {
    const fetchStoreUnits = async () => {
      try {
        if (!userProfile?.company_id) return;

        // Obtener sucursales activas
        const { data: storesData, error: storesError } = await (supabase.from('stores') as any)
          .select('id, name')
          .eq('company_id', userProfile.company_id)
          .eq('active', true);

        if (storesError) {
          console.error('Error fetching stores for InventoryStatsCards:', storesError);
          return;
        }

        const storeMap = new Map<string, string>();
        (storesData || []).forEach((store: any) => {
          storeMap.set(store.id, store.name);
        });

        // Obtener inventario con JOIN a productos para obtener la categoría y el precio de venta
        const { data: inventoryData, error: inventoryError } = await (supabase.from('inventories') as any)
          .select(`
            store_id,
            qty,
            product_id,
            products!inner(
              id,
              category,
              sale_price_usd
            )
          `)
          .eq('company_id', userProfile.company_id);

        if (inventoryError) {
          console.error('Error fetching inventory for InventoryStatsCards:', inventoryError);
          return;
        }

        const stats: Record<string, {
          storeName: string;
          phones: number;
          accessories: number;
          technical_service: number;
        }> = {};

        // Acumuladores globales por categoría
        const categoryTotals: Record<string, {
          totalValue: number;
          totalUnits: number;
          productIds: Set<string>;
        }> = {
          phones: { totalValue: 0, totalUnits: 0, productIds: new Set() },
          accessories: { totalValue: 0, totalUnits: 0, productIds: new Set() },
          technical_service: { totalValue: 0, totalUnits: 0, productIds: new Set() },
        };

        // Inicializar todas las sucursales conocidas
        (storesData || []).forEach((store: any) => {
          stats[store.id] = {
            storeName: store.name,
            phones: 0,
            accessories: 0,
            technical_service: 0,
          };
        });

        // Sumar unidades por categoría y sucursal
        (inventoryData || []).forEach((item: any) => {
          const storeId = item.store_id;
          const category = item.products?.category;
          const qty = Math.max(0, item.qty || 0);

          if (!storeId) return;

          if (!stats[storeId]) {
            const storeName = storeMap.get(storeId) || 'Sucursal Desconocida';
            stats[storeId] = {
              storeName,
              phones: 0,
              accessories: 0,
              technical_service: 0,
            };
          }

          // Unidades por categoría y sucursal
          if (category === 'phones') {
            stats[storeId].phones += qty;
          } else if (category === 'accessories') {
            stats[storeId].accessories += qty;
          } else if (category === 'technical_service') {
            stats[storeId].technical_service += qty;
          }

          // Totales globales por categoría (valor y unidades) - misma lógica que el reporte
          const price = item.products?.sale_price_usd || 0;
          if (categoryTotals[category]) {
            categoryTotals[category].totalUnits += qty;
            categoryTotals[category].totalValue += qty * price;
            if (item.product_id) {
              categoryTotals[category].productIds.add(item.product_id);
            }
          }
        });

        setStoreUnitsByCategory(stats);

        // Convertir sets en contadores simples
        const normalizedTotals: Record<string, {
          totalValue: number;
          totalUnits: number;
          uniqueProducts: number;
        }> = {};

        Object.entries(categoryTotals).forEach(([key, value]) => {
          normalizedTotals[key] = {
            totalValue: value.totalValue,
            totalUnits: value.totalUnits,
            uniqueProducts: value.productIds.size,
          };
        });

        setGlobalCategoryTotals(normalizedTotals);
      } catch (err) {
        console.error('Error in InventoryStatsCards.fetchStoreUnits:', err);
      }
    };

    fetchStoreUnits();
  }, [userProfile?.company_id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Loading para cards de categorías */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, index) => (
            <Card key={`category-${index}`} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">Error al cargar estadísticas: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Filtrar inventario según la tienda seleccionada
  const filteredInventory = selectedStore === 'all' 
    ? inventory 
    : inventory.filter(item => item.store_id === selectedStore);

  const filteredStats = calculateFilteredStats(
    filteredInventory,
    totalStores,
    selectedStore,
    selectedStore,
  );
  const baseCategoryStats = getCategoryStats(
    filteredStats,
    filteredInventory,
    PRODUCT_CATEGORIES,
    selectedStore,
  );

  // Ajustar total de unidades por categoría para que coincida con la suma real
  // y con el panel de Productos. Para "Todas las tiendas" usamos la suma de
  // todas las sucursales; para una tienda específica usamos storeUnitsByCategory.
  const categoryStats = baseCategoryStats.map((cat) => {
    // Caso: todas las tiendas
    if (selectedStore === 'all') {
      // Si tenemos el mapa global, usarlo como fuente de verdad (igual que Productos y el reporte)
      const globalTotals = globalCategoryTotals[cat.value];
      if (globalTotals) {
        return {
          ...cat,
          totalStock: globalTotals.totalUnits,
          totalValue: globalTotals.totalValue,
          productCount: globalTotals.uniqueProducts,
        };
      }

      // Si aún no tenemos globalTotals (fallback), mantener el comportamiento anterior
      const hasStoreUnits = Object.keys(storeUnitsByCategory).length > 0;
      if (hasStoreUnits) {
        const totalFromStores = Object.values(storeUnitsByCategory).reduce((sum, store) => {
          if (cat.value === 'phones') return sum + store.phones;
          if (cat.value === 'accessories') return sum + store.accessories;
          if (cat.value === 'technical_service') return sum + store.technical_service;
          return sum;
        }, 0);

        return {
          ...cat,
          totalStock: totalFromStores,
        };
      }

      const totalUnitsForCategory = inventory.reduce((sum, item) => {
        const category = item.product?.category;
        if (category === cat.value) {
          return sum + Math.max(0, item.qty || 0);
        }
        return sum;
      }, 0);

      return {
        ...cat,
        totalStock: totalUnitsForCategory,
      };
    }

    // Caso: tienda específica
    if (selectedStore !== 'all' && storeUnitsByCategory[selectedStore]) {
      const store = storeUnitsByCategory[selectedStore];
      const unitsForStoreCategory =
        cat.value === 'phones'
          ? store.phones
          : cat.value === 'accessories'
          ? store.accessories
          : cat.value === 'technical_service'
          ? store.technical_service
          : cat.totalStock;

      return {
        ...cat,
        totalStock: unitsForStoreCategory,
      };
    }

    return cat;
  });

  return (
    <div className="space-y-6 mb-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold">Resumen del Inventario</h2>
        {selectedStore !== 'all' && (
          <Badge variant="outline" className="text-xs w-fit">
            <Store className="h-3 w-3 mr-1" />
            Tienda específica
          </Badge>
        )}
      </div>
      
      {/* Cards principales de estadísticas - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Card 1: Valor Total del Inventario */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Valor Total del Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(filteredStats.totalValue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredStats.totalProducts} producto{filteredStats.totalProducts !== 1 ? 's' : ''} único{filteredStats.totalProducts !== 1 ? 's' : ''} en {filteredStats.totalStores} tienda{filteredStats.totalStores > 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Productos Sin Stock */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Productos Sin Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {filteredStats.outOfStock}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredStats.totalProducts > 0 ? `${((filteredStats.outOfStock / filteredStats.totalProducts) * 100).toFixed(1)}%` : '0%'} de productos únicos
          </p>
          {filteredStats.outOfStock > 0 && (
            <Badge variant="destructive" className="mt-2 text-xs">
              Requiere atención inmediata
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Stock Bajo */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-yellow-600" />
            Stock Bajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredStats.lowStock}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredStats.criticalStock} críticos • {filteredStats.lowStock - filteredStats.criticalStock} bajo mínimo
          </p>
          {filteredStats.lowStock > 0 && (
            <Badge variant="secondary" className="mt-2 text-xs bg-yellow-100 text-yellow-800">
              Reabastecimiento recomendado
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Card 4: Unidades en Stock */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            Unidades en Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {filteredStats.totalStock.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            unidades en total
          </p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">
              {filteredStats.totalProducts > 0 ? `${filteredStats.totalProducts} producto${filteredStats.totalProducts !== 1 ? 's' : ''} único${filteredStats.totalProducts !== 1 ? 's' : ''}` : 'Sin productos'}
            </span>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Nueva sección: Valor por Categorías */}
      {categoryStats.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-muted-foreground">Valor por Categorías</h3>
            <Badge variant="outline" className="text-xs w-fit">
              Solo categorías con productos
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryStats.map((category) => {
              // Seleccionar ícono según la categoría
              const getCategoryIcon = () => {
                switch (category.value) {
                  case 'phones':
                    return <Smartphone className="h-4 w-4 text-purple-600" />;
                  case 'accessories':
                    return <Headphones className="h-4 w-4 text-purple-600" />;
                  case 'technical_service':
                    return <Wrench className="h-4 w-4 text-purple-600" />;
                  default:
                    return <Package className="h-4 w-4 text-purple-600" />;
                }
              };

              // Unificar unidades con el panel de Productos cuando hay sucursal seleccionada
              let displayTotalStock = category.totalStock;
              if (selectedStore !== 'all' && storeUnitsByCategory[selectedStore]) {
                if (category.value === 'phones') {
                  displayTotalStock = storeUnitsByCategory[selectedStore].phones;
                } else if (category.value === 'accessories') {
                  displayTotalStock = storeUnitsByCategory[selectedStore].accessories;
                } else if (category.value === 'technical_service') {
                  displayTotalStock = storeUnitsByCategory[selectedStore].technical_service;
                }
              }

              return (
                <Card key={category.value} className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      {getCategoryIcon()}
                      {category.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">
                      {formatCurrency(category.totalValue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {category.productCount} producto{category.productCount !== 1 ? 's' : ''} único{category.productCount !== 1 ? 's' : ''} • {displayTotalStock} unidad{displayTotalStock !== 1 ? 'es' : ''}
                    </p>
                    
                    {/* Porcentaje del total */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">% del total:</span>
                      <span className="text-xs font-medium text-purple-600">
                        {filteredStats.totalValue > 0 ? ((category.totalValue / filteredStats.totalValue) * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                    
                    {/* Estado del stock */}
                    {category.totalStock === 0 && (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        Sin stock
                      </Badge>
                    )}
                    {category.totalStock > 0 && category.totalStock <= 10 && (
                      <Badge variant="secondary" className="mt-2 text-xs bg-yellow-100 text-yellow-800">
                        Stock bajo
                      </Badge>
                    )}
                    {category.totalStock > 10 && (
                      <Badge variant="outline" className="mt-2 text-xs bg-green-100 text-green-700">
                        Stock normal
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
