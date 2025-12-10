import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Store, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  FileText,
  Smartphone,
  Headphones,
  Wrench,
  BarChart3,
  ShoppingCart,
  Wallet,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { getCategoryLabel } from '@/constants/categories';
import { sanitizeInventoryData } from '@/utils/inventoryValidation';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StoreStats {
  storeName: string;
  phones: number;
  accessories: number;
  technical_service: number;
  total: number;
}

interface CategoryStats {
  category: string;
  label: string;
  totalValue: number;
  uniqueProducts: number;
  totalUnits: number;
  percentage: number;
}

interface InventorySummary {
  totalValue: number;
  uniqueProducts: number;
  totalStores: number;
  outOfStock: number;
  outOfStockPercentage: number;
  lowStock: number;
  criticalStock: number;
  totalUnits: number;
}

export const EstadisticasPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { data: dashboardData } = useDashboardData();
  const [loading, setLoading] = useState(true);
  const [storeStats, setStoreStats] = useState<Record<string, StoreStats>>({});
  const [inventorySummary, setInventorySummary] = useState<InventorySummary>({
    totalValue: 0,
    uniqueProducts: 0,
    totalStores: 0,
    outOfStock: 0,
    outOfStockPercentage: 0,
    lowStock: 0,
    criticalStock: 0,
    totalUnits: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [globalCategoryTotals, setGlobalCategoryTotals] = useState({
    phones: 0,
    accessories: 0,
    technical_service: 0,
  });

  const fetchStatistics = async () => {
    try {
      // MASTER_ADMIN puede ver todo sin company_id
      // Otros roles requieren company_id
      const isMasterAdmin = userProfile?.role === 'master_admin';
      
      if (!isMasterAdmin && !userProfile?.company_id) {
        console.log('No company_id found for non-master user');
        setLoading(false);
        return;
      }

      console.time('📊 EstadisticasPage - fetchStatistics');

      // ═══════════════════════════════════════════════════════════════
      // ESTRATEGIA HÍBRIDA: Consultas paralelas con SELECT MÍNIMO
      // Para MASTER_ADMIN: Sin filtro de company_id (ve todo)
      // Para otros roles: Filtrado por company_id
      // ═══════════════════════════════════════════════════════════════

      // Construir query de tiendas
      let storesQuery = (supabase.from('stores') as any)
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      // Solo filtrar por company_id si NO es master_admin
      if (!isMasterAdmin && userProfile?.company_id) {
        storesQuery = storesQuery.eq('company_id', userProfile.company_id);
      }

      // GERENTE: Solo su tienda asignada
      const isManager = userProfile?.role === 'manager';
      if (isManager && userProfile?.assigned_store_id) {
        storesQuery = storesQuery.eq('id', userProfile.assigned_store_id);
      }

      // Construir query de inventario
      // ⚠️ FILTRO CRÍTICO: JOIN con products y filtrar solo productos activos
      let inventoryQuery = (supabase.from('inventories') as any)
        .select(`
          store_id,
          product_id,
          qty,
          min_qty,
          products!inner(
            category,
            sale_price_usd,
            active
          )
        `)
        .eq('products.active', true);  // ⚠️ Solo inventario de productos activos
      
      // Solo filtrar por company_id si NO es master_admin
      if (!isMasterAdmin && userProfile?.company_id) {
        inventoryQuery = inventoryQuery.eq('company_id', userProfile.company_id);
      }

      // GERENTE: Solo inventario de su tienda asignada
      if (isManager && userProfile?.assigned_store_id) {
        inventoryQuery = inventoryQuery.eq('store_id', userProfile.assigned_store_id);
      }

      // Ejecutar consultas en PARALELO para máxima velocidad
      const [storesResult, inventoryResult] = await Promise.all([
        storesQuery,
        inventoryQuery.then((result: any) => {
          // Filtrar por tienda si es cajero o manager
          const isRestricted = (userProfile?.role === 'cashier' || userProfile?.role === 'manager') && userProfile?.assigned_store_id;
          if (isRestricted) {
            return {
              ...result,
              data: result.data?.filter((item: any) => item.store_id === userProfile.assigned_store_id)
            };
          }
          return result;
        })
      ]);

      console.timeLog('📊 EstadisticasPage - fetchStatistics', 'Consultas completadas');

      if (storesResult.error) {
        console.error('Error fetching stores:', storesResult.error);
        setLoading(false);
        return;
      }

      if (inventoryResult.error) {
        console.error('Error fetching inventory:', inventoryResult.error);
        setLoading(false);
        return;
      }

      const stores = storesResult.data || [];
      const storeMap = new Map<string, string>();
      stores.forEach((store: any) => {
        storeMap.set(store.id, store.name);
      });

      // Sanitizar datos (validación rápida)
      const sanitizedInventory = sanitizeInventoryData(inventoryResult.data || []);
      
      console.timeLog('📊 EstadisticasPage - fetchStatistics', `Datos sanitizados: ${sanitizedInventory.length} items`);

      // 3. Calcular estadísticas por sucursal
      const statsByStore: Record<string, StoreStats> = {};
      
      // Inicializar todas las sucursales
      stores.forEach((store: any) => {
        statsByStore[store.id] = {
          storeName: store.name,
          phones: 0,
          accessories: 0,
          technical_service: 0,
          total: 0,
        };
      });

      // Totales globales por categoría
      const globalTotals = {
        phones: 0,
        accessories: 0,
        technical_service: 0,
      };

      // Procesar inventario
      sanitizedInventory.forEach((item: any) => {
        const storeId = item.store_id;
        const category = item.products?.category;
        const qty = Math.max(0, item.qty || 0);

        if (!statsByStore[storeId]) {
          const storeName = storeMap.get(storeId) || 'Sucursal Desconocida';
          statsByStore[storeId] = {
            storeName,
            phones: 0,
            accessories: 0,
            technical_service: 0,
            total: 0,
          };
        }

        if (category === 'phones') {
          statsByStore[storeId].phones += qty;
          globalTotals.phones += qty;
        } else if (category === 'accessories') {
          statsByStore[storeId].accessories += qty;
          globalTotals.accessories += qty;
        } else if (category === 'technical_service') {
          statsByStore[storeId].technical_service += qty;
          globalTotals.technical_service += qty;
        }

        statsByStore[storeId].total += qty;
      });

      setStoreStats(statsByStore);
      setGlobalCategoryTotals(globalTotals);

      // 4. Calcular resumen del inventario
      const productMap = new Map<string, {
        totalQty: number;
        hasStock: boolean;
        hasLowStock: boolean;
        hasCriticalStock: boolean;
        minQty: number;
        salePrice: number;
      }>();

      sanitizedInventory.forEach((item: any) => {
        const productId = item.product_id;
        const qty = Math.max(0, item.qty || 0);
        const minQty = Math.max(0, item.min_qty || 0);
        const salePrice = item.products?.sale_price_usd || 0;

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            totalQty: 0,
            hasStock: false,
            hasLowStock: false,
            hasCriticalStock: false,
            minQty: minQty,
            salePrice: salePrice,
          });
        }

        const product = productMap.get(productId)!;
        product.totalQty += qty;
        product.hasStock = product.hasStock || qty > 0;

        // Stock bajo: qty > 0 pero qty < min_qty
        if (qty > 0 && qty < minQty && minQty > 0) {
          product.hasLowStock = true;
        }

        // Stock crítico: qty > 0 pero qty < (min_qty * 0.5) o qty <= 2
        if (qty > 0 && (qty < (minQty * 0.5) || qty <= 2)) {
          product.hasCriticalStock = true;
        }
      });

      const uniqueProducts = productMap.size;
      const outOfStock = Array.from(productMap.values()).filter(p => !p.hasStock).length;
      const lowStock = Array.from(productMap.values()).filter(p => p.hasLowStock && !p.hasCriticalStock).length;
      const criticalStock = Array.from(productMap.values()).filter(p => p.hasCriticalStock).length;

      // Calcular valor total
      let totalValue = 0;
      let totalUnits = 0;
      sanitizedInventory.forEach((item: any) => {
        const qty = Math.max(0, item.qty || 0);
        const salePrice = item.products?.sale_price_usd || 0;
        totalValue += qty * salePrice;
        totalUnits += qty;
      });

      setInventorySummary({
        totalValue: Math.round(totalValue * 100) / 100,
        uniqueProducts,
        totalStores: stores.length,
        outOfStock,
        outOfStockPercentage: uniqueProducts > 0 ? Math.round((outOfStock / uniqueProducts) * 100 * 10) / 10 : 0,
        lowStock,
        criticalStock,
        totalUnits,
      });

      // 5. Calcular estadísticas por categoría
      const categoryMap = new Map<string, {
        totalValue: number;
        productIds: Set<string>;
        totalUnits: number;
      }>();

      sanitizedInventory.forEach((item: any) => {
        const category = item.products?.category || 'uncategorized';
        const qty = Math.max(0, item.qty || 0);
        const salePrice = item.products?.sale_price_usd || 0;
        const productId = item.product_id;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            totalValue: 0,
            productIds: new Set(),
            totalUnits: 0,
          });
        }

        const cat = categoryMap.get(category)!;
        cat.totalValue += qty * salePrice;
        cat.productIds.add(productId);
        cat.totalUnits += qty;
      });

      const categoryStatsArray: CategoryStats[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        label: getCategoryLabel(category),
        totalValue: Math.round(data.totalValue * 100) / 100,
        uniqueProducts: data.productIds.size,
        totalUnits: data.totalUnits,
        percentage: totalValue > 0 ? Math.round((data.totalValue / totalValue) * 100 * 10) / 10 : 0,
      })).sort((a, b) => b.totalValue - a.totalValue);

      setCategoryStats(categoryStatsArray);

      console.timeEnd('📊 EstadisticasPage - fetchStatistics');
      console.log('📊 Estadísticas calculadas:', {
        tiendas: stores.length,
        itemsInventario: sanitizedInventory.length,
        productosUnicos: uniqueProducts,
        valorTotal: totalValue.toFixed(2)
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchStatistics();
    }
  }, [userProfile?.company_id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-6">
          {/* Logo animado con zoom in y bounce */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Círculo de fondo con pulso */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse"></div>
              {/* Logo principal con animación de zoom y bounce */}
              <div className="relative w-20 h-20 rounded-sm bg-primary/10 flex items-center justify-center shadow-lg shadow-green-500/60 border-none backdrop-blur-sm">
                <ShoppingCart 
                  className="w-12 h-12 text-primary animate-zoom-bounce" 
                />
              </div>
            </div>
          </div>
          {/* Texto de carga */}
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground animate-pulse">Cargando estadísticas...</p>
            <div className="flex justify-center gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const storeStatsArray = Object.values(storeStats).sort((a, b) => 
    a.storeName.localeCompare(b.storeName)
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            Estadísticas
          </h1>
          <p className="text-muted-foreground">Resumen completo del inventario y productos</p>
        </div>
        <Button onClick={fetchStatistics} variant="outline">
          Actualizar
        </Button>
      </div>

      {/* Resumen del Inventario */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-md shadow-accent-primary/40 border border-accent-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total del Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              USD {inventorySummary.totalValue.toLocaleString('es-VE', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {inventorySummary.uniqueProducts} productos únicos en {inventorySummary.totalStores} tiendas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md shadow-status-danger/40 border border-status-danger/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-status-danger" />
              Productos Sin Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-danger">
              {inventorySummary.outOfStock}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {inventorySummary.outOfStockPercentage}% de productos únicos
            </p>
            <Badge variant="destructive" className="mt-2">
              Requiere atención inmediata
            </Badge>
          </CardContent>
        </Card>

        <Card className="shadow-md shadow-accent-primary/40 border border-accent-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-500" />
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {inventorySummary.lowStock + inventorySummary.criticalStock}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {inventorySummary.criticalStock} críticos • {inventorySummary.lowStock} bajo mínimo
            </p>
            <Badge variant="outline" className="mt-2 border-none shadow-xl shadow-yellow-500/20 text-yellow-600">
              Reabastecimiento recomendado
            </Badge>
          </CardContent>
        </Card>

        <Card className="shadow-md shadow-accent-primary/40 border border-accent-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Unidades en Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {inventorySummary.totalUnits.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              unidades en total
            </p>
            <p className="text-sm text-muted-foreground">
              {inventorySummary.uniqueProducts} productos únicos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por Sucursal */}
      <Card className="shadow-lg shadow-green-500/50 border border-green-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Resumen por Sucursal
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {inventorySummary.totalStores} sucursales
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeStatsArray.map((store) => (
              <Card key={store.storeName} className="shadow-xl shadow-green-500/20 border-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{store.storeName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Teléfonos</span>
                    </div>
                    <span className="font-semibold">{store.phones}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Accesorios</span>
                    </div>
                    <span className="font-semibold">{store.accessories}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">Servicios</span>
                    </div>
                    <span className="font-semibold">{store.technical_service}</span>
                  </div>
                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-lg">{store.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Totales Globales */}
          <div className="mt-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-sm border-none shadow-md shadow-blue-500/50">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">TOTAL TELÉFONOS</span>
                </div>
                <span className="font-bold text-xl">{globalCategoryTotals.phones}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-sm border-none shadow-md shadow-green-500/50">
                <div className="flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">TOTAL ACCESORIOS</span>
                </div>
                <span className="font-bold text-xl">{globalCategoryTotals.accessories}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950 rounded-sm border-none shadow-md shadow-orange-500/50">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold">TOTAL SERVICIOS TÉCNICOS</span>
                </div>
                <span className="font-bold text-xl">{globalCategoryTotals.technical_service}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valor por Categorías */}
      <Card className="shadow-lg shadow-green-500/50 border border-green-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Valor por Categorías
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Solo categorías con productos
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryStats.map((cat) => {
              const getStatusColor = () => {
                if (cat.percentage > 50) return 'text-green-600';
                if (cat.percentage > 20) return 'text-blue-600';
                return 'text-orange-600';
              };

              const getStatusBadge = () => {
                if (cat.percentage > 50) return 'default';
                if (cat.percentage > 20) return 'secondary';
                return 'outline';
              };

              return (
                <div
                  key={cat.category}
                  className="p-4 border-none shadow-md shadow-green-500/50 rounded-sm hover:shadow-lg hover:shadow-green-500/60 transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {cat.category === 'phones' && <Smartphone className="w-5 h-5 text-blue-500" />}
                        {cat.category === 'accessories' && <Headphones className="w-5 h-5 text-green-600" />}
                        {cat.category === 'technical_service' && <Wrench className="w-5 h-5 text-orange-500" />}
                        <h3 className="text-lg font-semibold">{cat.label}</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-semibold">USD {cat.totalValue.toLocaleString('es-VE', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}</span>
                        </div>
                        <div>
                          {cat.uniqueProducts} productos únicos • {cat.totalUnits.toLocaleString()} unidades
                        </div>
                        <div>
                          <span className={getStatusColor()}>
                            % del total: {cat.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadge()}>
                        Stock normal
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ✅ NUEVO: Análisis de Financiamiento */}
      {(() => {
        // ✅ FIX: Usar financialHealth.thisMonth para estadísticas (mes completo)
        const financialHealth = dashboardData?.financialHealth?.thisMonth;
        
        if (!financialHealth) {
          return null;
        }

        return (
          <Card className="shadow-lg shadow-green-500/50 border border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Análisis de Financiamiento
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Comparativa de ticket promedio y distribución por método de pago (Este Mes)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* A) Tarjetas de Ticket Promedio */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Ticket Promedio por Método</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tarjeta Contado */}
                  <Card className="border-l-4 border-green-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-muted-foreground">Contado</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(financialHealth.avg_ticket_cash || 0)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {financialHealth.sales_by_method_count?.cash || 0} transacciones
                      </p>
                    </CardContent>
                  </Card>

                  {/* Tarjeta Krece */}
                  <Card className="border-l-4 border-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-muted-foreground">Krece</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-700">
                        {formatCurrency(financialHealth.avg_ticket_krece || 0)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {financialHealth.sales_by_method_count?.krece || 0} transacciones
                      </p>
                    </CardContent>
                  </Card>

                  {/* Tarjeta Cashea */}
                  <Card className="border-l-4 border-indigo-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingBag className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-medium text-muted-foreground">Cashea</span>
                      </div>
                      <p className="text-2xl font-bold text-indigo-700">
                        {formatCurrency(financialHealth.avg_ticket_cashea || 0)}
                      </p>
                      <p className="text-xs text-indigo-600 mt-1">
                        {financialHealth.sales_by_method_count?.cashea || 0} transacciones
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* B) Gráfico "Comparativa de Gigantes" (Stacked Bar Chart) */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Distribución por Método de Financiamiento</h3>
                {(() => {
                  // Calcular totales por método (ticket promedio * cantidad de transacciones)
                  const cashTotal = (financialHealth.sales_by_method_count?.cash || 0) * (financialHealth.avg_ticket_cash || 0);
                  const kreceTotal = (financialHealth.sales_by_method_count?.krece || 0) * (financialHealth.avg_ticket_krece || 0);
                  const casheaTotal = (financialHealth.sales_by_method_count?.cashea || 0) * (financialHealth.avg_ticket_cashea || 0);

                // Preparar datos para el gráfico apilado
                // Si hay múltiples tiendas, mostrar por tienda; si no, mostrar total del período
                const chartData = dashboardData.storesSummary && dashboardData.storesSummary.length > 1
                  ? dashboardData.storesSummary.map(store => ({
                      name: store.name.length > 12 ? store.name.substring(0, 12) + '...' : store.name,
                      Contado: cashTotal / dashboardData.storesSummary.length, // Distribución aproximada
                      Krece: kreceTotal / dashboardData.storesSummary.length,
                      Cashea: casheaTotal / dashboardData.storesSummary.length,
                    }))
                  : [
                      {
                        name: 'Total del Período',
                        Contado: cashTotal,
                        Krece: kreceTotal,
                        Cashea: casheaTotal,
                      }
                    ];

                const hasData = cashTotal > 0 || kreceTotal > 0 || casheaTotal > 0;

                return hasData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280" 
                        tick={{ fill: '#0D0D0D', fontSize: 12 }}
                        angle={chartData.length > 1 ? -45 : 0}
                        textAnchor={chartData.length > 1 ? 'end' : 'middle'}
                        height={chartData.length > 1 ? 80 : 30}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        tick={{ fill: '#0D0D0D', fontSize: 12 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name
                        ]}
                        contentStyle={{
                          backgroundColor: '#fff',
                          borderColor: '#e5e7eb',
                          borderRadius: '8px',
                          color: '#000'
                        }}
                        itemStyle={{ color: '#000' }}
                      />
                      <Legend />
                      <Bar dataKey="Contado" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Krece" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Cashea" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <p>No hay datos de financiamiento para mostrar</p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
        );
      })()}
    </div>
  );
};




