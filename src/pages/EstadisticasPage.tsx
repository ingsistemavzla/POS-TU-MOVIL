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
  ShoppingBag,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { getCategoryLabel } from '@/constants/categories';
import { sanitizeInventoryData } from '@/utils/inventoryValidation';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useInventoryFinancialSummary } from '@/hooks/useInventoryFinancialSummary';
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
  // 🔥 USAR LA MISMA FUNCIÓN QUE ALMACÉN: useInventoryFinancialSummary
  // Esto garantiza que los totales por categoría sean consistentes (75 para Servicio Técnico)
  const { data: financialSummary, loading: financialLoading } = useInventoryFinancialSummary(null); // null = todas las tiendas
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
      // 🔥 SOLUCIÓN: Usar range() para obtener todos los registros (Supabase limita a 1000 por defecto)
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
      
      // 🔥 PAGINACIÓN: Obtener todos los registros en lotes de 1000
      // Supabase tiene un límite de 1000 registros por consulta, necesitamos hacer múltiples consultas
      
      // Solo filtrar por company_id si NO es master_admin
      if (!isMasterAdmin && userProfile?.company_id) {
        inventoryQuery = inventoryQuery.eq('company_id', userProfile.company_id);
      }

      // GERENTE: Solo inventario de su tienda asignada
      if (isManager && userProfile?.assigned_store_id) {
        inventoryQuery = inventoryQuery.eq('store_id', userProfile.assigned_store_id);
      }

      // 🔥 PAGINACIÓN: Obtener todos los registros de inventario (Supabase limita a 1000 por consulta)
      const fetchAllInventory = async () => {
        const allData: any[] = [];
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const pageQuery = inventoryQuery.range(from, from + pageSize - 1);
          const { data, error } = await pageQuery;
          
          if (error) {
            console.error('Error fetching inventory page:', error);
            break;
          }

          if (data && data.length > 0) {
            allData.push(...data);
            from += pageSize;
            hasMore = data.length === pageSize; // Si devolvió menos de pageSize, no hay más
          } else {
            hasMore = false;
          }
        }

        console.log(`📊 [EstadisticasPage] Inventario obtenido: ${allData.length} registros (en ${Math.ceil(from / pageSize)} páginas)`);

        // Filtrar por tienda si es cajero o manager
        const isRestricted = (userProfile?.role === 'cashier' || userProfile?.role === 'manager') && userProfile?.assigned_store_id;
        if (isRestricted) {
          return {
            data: allData.filter((item: any) => item.store_id === userProfile.assigned_store_id),
            error: null
          };
        }

        return { data: allData, error: null };
      };

      // Ejecutar consultas en PARALELO para máxima velocidad
      const [storesResult, inventoryResult] = await Promise.all([
        storesQuery,
        fetchAllInventory()
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

      // 🔥 DEBUG: Verificar datos RAW antes de sanitizar
      const rawInventoryData = inventoryResult.data || [];
      const rawTechnicalService = rawInventoryData.filter((item: any) => 
        item.products?.category === 'technical_service'
      );
      const rawTechnicalServiceTotal = rawTechnicalService.reduce((sum: number, item: any) => 
        sum + Math.max(0, item.qty || 0), 0
      );
      console.log('📊 [EstadisticasPage] Datos RAW de Servicio Técnico:');
      console.log('  - Items encontrados:', rawTechnicalService.length);
      console.log('  - Total unidades (RAW):', rawTechnicalServiceTotal);
      console.log('  - Total registros de inventario (TODOS):', rawInventoryData.length);
      
      // 🔥 DISTRIBUCIÓN DETALLADA POR SUCURSAL (para comparar con BD)
      const distributionByStore = rawTechnicalService.reduce((acc: Record<string, { count: number, total: number, items: any[] }>, item: any) => {
        const storeId = item.store_id || 'unknown';
        const storeName = storeMap.get(storeId) || storeId;
        if (!acc[storeName]) {
          acc[storeName] = { count: 0, total: 0, items: [] };
        }
        acc[storeName].count++;
        acc[storeName].total += Math.max(0, item.qty || 0);
        acc[storeName].items.push({
          product_id: item.product_id,
          qty: item.qty,
          store_id: item.store_id
        });
        return acc;
      }, {});
      console.log('  - Distribución por tienda (RAW):', Object.entries(distributionByStore).map(([store, data]) => ({
        store,
        total: data.total,
        count: data.count,
        items: data.items.slice(0, 3) // Primeros 3 items
      })));
      console.log('  - Suma de distribución:', Object.values(distributionByStore).reduce((sum, store) => sum + store.total, 0));
      console.log('  - VALORES ESPERADOS (BD): Centro=2, La Isla=0, Store=2, Zona Gamer=71, Total=75');

      // Sanitizar datos (validación rápida)
      const sanitizedInventory = sanitizeInventoryData(inventoryResult.data || []);
      
      console.timeLog('📊 EstadisticasPage - fetchStatistics', `Datos sanitizados: ${sanitizedInventory.length} items`);
      
      // 🔥 DEBUG: Verificar datos de Servicio Técnico después de sanitizar
      const technicalServiceItems = sanitizedInventory.filter((item: any) => 
        item.products?.category === 'technical_service'
      );
      const technicalServiceTotal = technicalServiceItems.reduce((sum: number, item: any) => 
        sum + Math.max(0, item.qty || 0), 0
      );
      console.log('📊 [EstadisticasPage] Servicio Técnico (después de sanitizar):');
      console.log('  - Items encontrados:', technicalServiceItems.length);
      console.log('  - Total unidades:', technicalServiceTotal);
      console.log('  - Distribución por tienda:', technicalServiceItems.reduce((acc: Record<string, number>, item: any) => {
        const storeId = item.store_id || 'unknown';
        const storeName = storeMap.get(storeId) || storeId;
        acc[storeName] = (acc[storeName] || 0) + Math.max(0, item.qty || 0);
        return acc;
      }, {}));

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

      // 🔥 CORRECCIÓN: Agrupar por producto y tienda primero (como AlmacenPage)
      // Esto evita duplicados y asegura que cada producto-tienda se cuente solo una vez
      
      // PRIMERO: Obtener la categoría de cada producto (antes de agrupar)
      const categoryByProduct = new Map<string, string>();
      sanitizedInventory.forEach((item: any) => {
        const productId = item.product_id;
        const category = item.products?.category;
        if (category && !categoryByProduct.has(productId)) {
          categoryByProduct.set(productId, category);
        }
      });

      // SEGUNDO: Agrupar inventario por producto y tienda
      const inventoryByProductStore = new Map<string, Map<string, number>>();
      
      sanitizedInventory.forEach((item: any) => {
        const productId = item.product_id;
        const storeId = item.store_id;
        const qty = Math.max(0, item.qty || 0);
        
        if (!inventoryByProductStore.has(productId)) {
          inventoryByProductStore.set(productId, new Map());
        }
        const productStores = inventoryByProductStore.get(productId)!;
        
        // Sumar stock por tienda (si hay múltiples registros, se suman)
        productStores.set(storeId, (productStores.get(storeId) || 0) + qty);
      });

      // 🔥 DEBUG: Verificar agrupación de Servicio Técnico
      const technicalServiceProducts = Array.from(inventoryByProductStore.entries()).filter(([productId]) => {
        const category = categoryByProduct.get(productId);
        return category === 'technical_service';
      });
      console.log('📊 [EstadisticasPage] Productos de Servicio Técnico agrupados:', technicalServiceProducts.length);
      technicalServiceProducts.forEach(([productId, stores]) => {
        console.log(`  - Producto ${productId}:`, Object.fromEntries(stores));
      });

      // Totales globales por categoría
      const globalTotals = {
        phones: 0,
        accessories: 0,
        technical_service: 0,
      };

      // Ahora calcular estadísticas por tienda y globales
      inventoryByProductStore.forEach((productStores, productId) => {
        const category = categoryByProduct.get(productId);
        if (!category) return;

        // Para technical_service: sumar TODAS las tiendas (como AlmacenPage)
        // Para otras categorías: sumar por tienda individualmente
        const isTechnicalService = category === 'technical_service';
        
        if (isTechnicalService) {
          // Para technical_service: mostrar stock por tienda individualmente
          // pero el total global se calcula sumando todas las tiendas
          productStores.forEach((qty, storeId) => {
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
            statsByStore[storeId].technical_service += qty;
            statsByStore[storeId].total += qty;
          });
          
          // Agregar al total global: suma de todas las tiendas de este producto
          let productTotalQty = 0;
          productStores.forEach((qty) => {
            productTotalQty += qty;
          });
          globalTotals.technical_service += productTotalQty;
        } else {
          // Para otras categorías: procesar por tienda
          productStores.forEach((qty, storeId) => {
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
            }

            statsByStore[storeId].total += qty;
          });
        }
      });

      // 🔥 USAR TOTALES DE LA RPC (como Almacén): Reemplazar totales calculados manualmente
      // con los totales de get_inventory_financial_summary para garantizar consistencia
      let finalGlobalTotals = { ...globalTotals };
      
      if (financialSummary && financialSummary.category_breakdown) {
        console.log('📊 [EstadisticasPage] Usando totales de RPC get_inventory_financial_summary');
        
        financialSummary.category_breakdown.forEach((cat: any) => {
          const categoryName = cat.category_name?.toLowerCase() || '';
          const totalQty = cat.total_quantity || 0;
          
          if (categoryName === 'phones' || categoryName === 'teléfonos') {
            finalGlobalTotals.phones = totalQty;
            console.log('  - Teléfonos (RPC):', totalQty);
          } else if (categoryName === 'accessories' || categoryName === 'accesorios') {
            finalGlobalTotals.accessories = totalQty;
            console.log('  - Accesorios (RPC):', totalQty);
          } else if (categoryName === 'technical_service' || categoryName === 'servicio técnico') {
            finalGlobalTotals.technical_service = totalQty;
            console.log('  - Servicio Técnico (RPC):', totalQty, '(debería ser 75)');
          }
        });
      } else {
        console.log('📊 [EstadisticasPage] RPC no disponible, usando totales calculados manualmente');
      }

      // 🔥 DEBUG: Verificar totales finales y comparar con BD
      console.log('📊 [EstadisticasPage] Totales finales (después de RPC):');
      console.log('  - Total Servicio Técnico:', finalGlobalTotals.technical_service);
      const totalsByStore = Object.entries(statsByStore).reduce((acc: Record<string, number>, [storeId, stats]) => {
        acc[stats.storeName] = stats.technical_service;
        return acc;
      }, {});
      console.log('  - Total por tienda (calculado):', totalsByStore);
      console.log('  - VALORES ESPERADOS (BD):', {
        'Tu Móvil Centro': 2,
        'Tu Móvil La Isla': 0,
        'Tu Móvil Store': 2,
        'Zona Gamer Margarita': 71,
        'Total': 75
      });
      console.log('  - ¿Coinciden?', {
        'Tu Móvil Centro': totalsByStore['Tu Móvil Centro'] === 2,
        'Tu Móvil La Isla': totalsByStore['Tu Móvil La Isla'] === 0,
        'Tu Móvil Store': totalsByStore['Tu Móvil Store'] === 2,
        'Zona Gamer Margarita': totalsByStore['Zona Gamer Margarita'] === 71
      });

      setStoreStats(statsByStore);
      setGlobalCategoryTotals(finalGlobalTotals);

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
        valorTotal: totalValue.toFixed(2),
        financialSummaryDisponible: !!financialSummary,
        totalServicioTecnico: finalGlobalTotals.technical_service
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      // Solo marcar como no-loading cuando ambas consultas terminen
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchStatistics();
    }
  }, [userProfile?.company_id]);

  // 🔄 AUTO-REFRESH: Actualizar estadísticas cada 30 segundos para reflejar cambios en inventario
  useEffect(() => {
    if (!userProfile?.company_id) return;

    const interval = setInterval(() => {
      fetchStatistics();
    }, 30000); // Actualizar cada 30 segundos

    return () => clearInterval(interval);
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
            <p className="text-lg font-semibold text-white animate-pulse">Cargando estadísticas...</p>
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
              <BarChart3 className="w-8 h-8" />
              Estadísticas
            </h1>
            <Badge className="text-sm font-bold px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-lg shadow-emerald-500/30 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              V-NEON GLASS
            </Badge>
          </div>
          <p className="text-white/70">Resumen completo del inventario y productos</p>
        </div>
        <Button 
          onClick={fetchStatistics} 
          variant="outline"
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Actualizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </>
          )}
        </Button>
      </div>

      {/* Resumen del Inventario */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-md shadow-accent-primary/40 border border-accent-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/90">
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
            <p className="text-sm text-white/90 mt-2">
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
            <p className="text-sm text-white/90 mt-2">
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
            <p className="text-sm text-white/90 mt-2">
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
            <p className="text-sm text-white/90 mt-2">
              unidades en total
            </p>
            <p className="text-sm text-white/90">
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
          <p className="text-sm text-white/90">
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
              <div className="flex items-center justify-between p-4 bg-purple-500/20 rounded-lg border border-purple-500/30 shadow-md shadow-purple-500/30">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-purple-400 brightness-125" />
                  <span className="font-semibold text-white">TOTAL TELÉFONOS</span>
                </div>
                <span className="font-bold text-xl text-white">{globalCategoryTotals.phones}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-indigo-500/20 rounded-lg border border-indigo-500/30 shadow-md shadow-indigo-500/30">
                <div className="flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-indigo-400 brightness-125" />
                  <span className="font-semibold text-white">TOTAL ACCESORIOS</span>
                </div>
                <span className="font-bold text-xl text-white">{globalCategoryTotals.accessories}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-orange-500/20 rounded-lg border border-orange-500/30 shadow-md shadow-orange-500/30">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-400 brightness-125" />
                  <span className="font-semibold text-white">TOTAL SERVICIOS TÉCNICOS</span>
                </div>
                <span className="font-bold text-xl text-white">{globalCategoryTotals.technical_service}</span>
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
          <p className="text-sm text-white/90">
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-white/90">
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
              <p className="text-sm text-white/90">
                Comparativa de ticket promedio y distribución por método de pago (Este Mes)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* A) Tarjetas de Ticket Promedio */}
              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-4">Ticket Promedio por Método</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tarjeta Contado */}
                  <Card className="border-l-4 border-green-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-white/90">Contado</span>
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
                        <span className="text-sm font-medium text-white/90">Krece</span>
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
                        <span className="text-sm font-medium text-white/90">Cashea</span>
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
                <h3 className="text-sm font-semibold text-white/90 mb-4">Distribución por Método de Financiamiento</h3>
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
                  <div className="flex items-center justify-center h-[300px] text-white/90">
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




