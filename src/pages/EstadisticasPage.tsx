import React, { useState, useEffect, useLayoutEffect } from 'react';
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
  Loader2,
  Eye,
  HelpCircle,
} from 'lucide-react';
import { getCategoryLabel, normalizeStatsCategory } from '@/constants/categories';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { sanitizeInventoryData } from '@/utils/inventoryValidation';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useInventoryFinancialSummary } from '@/hooks/useInventoryFinancialSummary';
import { formatCurrency } from '@/utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  fetchAllActiveProducts,
  fetchInventoriesForProductIds,
} from '@/utils/inventoryCatalogFetch';
import {
  readEstadisticasPageCache,
  writeEstadisticasPageCache,
} from '@/utils/estadisticasPageCache';

/** Splash: mínimo breve; máximo 5s o hasta que haya datos (lo que ocurra primero). */
const STATS_SPLASH_MIN_MS = 400;
const STATS_SPLASH_MAX_MS = 5000;

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
  totalCostValue: number;
  uniqueProducts: number;
  totalUnits: number;
  percentage: number;
  costPercentage: number;
}

interface UncategorizedProductRow {
  productId: string;
  sku: string;
  name: string;
  categoryInDb: string | null;
  totalUnits: number;
  totalValue: number;
  stockByStore: { storeName: string; qty: number }[];
}

interface InventorySummary {
  totalValue: number;
  totalCostValue: number;
  uniqueProducts: number;
  totalStores: number;
  outOfStock: number;
  outOfStockPercentage: number;
  lowStock: number;
  criticalStock: number;
  totalUnits: number;
}

/** Placeholders fijos: las 3 cards de categoría siempre ocupan espacio (sin salto de layout). */
const EMPTY_CATEGORY_CARDS: CategoryStats[] = [
  {
    category: 'phones',
    label: 'Teléfonos',
    totalValue: 0,
    totalCostValue: 0,
    uniqueProducts: 0,
    totalUnits: 0,
    percentage: 0,
    costPercentage: 0,
  },
  {
    category: 'accessories',
    label: 'Accesorios',
    totalValue: 0,
    totalCostValue: 0,
    uniqueProducts: 0,
    totalUnits: 0,
    percentage: 0,
    costPercentage: 0,
  },
  {
    category: 'technical_service',
    label: 'Servicio Técnico',
    totalValue: 0,
    totalCostValue: 0,
    uniqueProducts: 0,
    totalUnits: 0,
    percentage: 0,
    costPercentage: 0,
  },
];

export const EstadisticasPage: React.FC = () => {
  const { userProfile } = useAuth();
  // Diferir dashboard + RPC financiera: primero inventario; no saturan la red al abrir
  const [financeEnabled, setFinanceEnabled] = useState(false);
  const { data: dashboardData } = useDashboardData({ enabled: financeEnabled });
  const { data: financialSummary } = useInventoryFinancialSummary(null, {
    enabled: financeEnabled,
  });
  const [showBriefSplash, setShowBriefSplash] = useState(true);
  const [splashMinDone, setSplashMinDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedOnceRef = React.useRef(false);
  const [storeStats, setStoreStats] = useState<Record<string, StoreStats>>({});
  const [inventorySummary, setInventorySummary] = useState<InventorySummary>({
    totalValue: 0,
    totalCostValue: 0,
    uniqueProducts: 0,
    totalStores: 0,
    outOfStock: 0,
    outOfStockPercentage: 0,
    lowStock: 0,
    criticalStock: 0,
    totalUnits: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [uncategorizedProducts, setUncategorizedProducts] = useState<UncategorizedProductRow[]>([]);
  const [uncategorizedDialogOpen, setUncategorizedDialogOpen] = useState(false);
  const [globalCategoryTotals, setGlobalCategoryTotals] = useState({
    phones: 0,
    accessories: 0,
    technical_service: 0,
  });
  /** false = precio venta (sale_price_usd); true = costo (cost_usd), alineado con Cierres diarios */
  const [showCostValue, setShowCostValue] = useState(false);

  const hasPaintedData =
    inventorySummary.uniqueProducts > 0 ||
    categoryStats.length > 0 ||
    Object.keys(storeStats).length > 0;

  // Splash: mínimo 0.4s; cierra al tener datos o a los 5s (lo primero)
  useEffect(() => {
    const minT = window.setTimeout(() => setSplashMinDone(true), STATS_SPLASH_MIN_MS);
    const maxT = window.setTimeout(() => setShowBriefSplash(false), STATS_SPLASH_MAX_MS);
    return () => {
      window.clearTimeout(minT);
      window.clearTimeout(maxT);
    };
  }, []);

  useEffect(() => {
    if (splashMinDone && hasPaintedData) {
      setShowBriefSplash(false);
    }
  }, [splashMinDone, hasPaintedData]);

  // Pintar cache ANTES del paint → evita “Cargando estadísticas…” largo al reabrir
  useLayoutEffect(() => {
    const companyId = userProfile?.company_id;
    if (!companyId) return;
    const cached = readEstadisticasPageCache(companyId, { allowStale: true });
    if (!cached) return;
    setStoreStats(cached.storeStats as Record<string, StoreStats>);
    setInventorySummary(cached.inventorySummary as InventorySummary);
    setCategoryStats(cached.categoryStats as CategoryStats[]);
    setUncategorizedProducts(cached.uncategorizedProducts as UncategorizedProductRow[]);
    setGlobalCategoryTotals(cached.globalCategoryTotals);
    hasLoadedOnceRef.current = true;
    setLoading(false);
    setFinanceEnabled(true);
  }, [userProfile?.company_id]);

  const fetchStatistics = async (opts?: { background?: boolean; forceRefresh?: boolean }) => {
    try {
      // MASTER_ADMIN puede ver todo sin company_id
      // Otros roles requieren company_id
      const isMasterAdmin = userProfile?.role === 'master_admin';
      
      if (!isMasterAdmin && !userProfile?.company_id) {
        console.log('No company_id found for non-master user');
        setLoading(false);
        return;
      }

      if (opts?.background && hasLoadedOnceRef.current) {
        setIsRefreshing(true);
      }
      // No forzar pantalla completa de loading: el panel ya está visible

      console.time('📊 EstadisticasPage - fetchStatistics');

      // Tiendas (misma lógica de roles)
      let storesQuery = (supabase.from('stores') as any)
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (!isMasterAdmin && userProfile?.company_id) {
        storesQuery = storesQuery.eq('company_id', userProfile.company_id);
      }

      const isManager = userProfile?.role === 'manager';
      if (isManager && userProfile?.assigned_store_id) {
        storesQuery = storesQuery.eq('id', userProfile.assigned_store_id);
      }

      const isRestricted =
        (userProfile?.role === 'cashier' || userProfile?.role === 'manager') &&
        !!userProfile?.assigned_store_id;
      const restrictedStoreId = isRestricted ? userProfile!.assigned_store_id! : null;

      // Como Almacén: productos paginados + inventario por IDs (sin JOIN pesado)
      const bypassCache = !!opts?.forceRefresh;
      const [storesResult, productsData] = await Promise.all([
        storesQuery,
        fetchAllActiveProducts({ bypassCache }),
      ]);

      if (storesResult.error) {
        console.error('Error fetching stores:', storesResult.error);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const productIds = productsData.map((p) => p.id);
      let inventoryRows: Array<{
        product_id: string;
        store_id: string;
        qty: number;
        min_qty: number;
      }> = [];
      try {
        inventoryRows = await fetchInventoriesForProductIds(productIds, {
          storeId: restrictedStoreId,
          bypassCache,
        });
      } catch (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      console.timeLog('📊 EstadisticasPage - fetchStatistics', 'Consultas completadas');

      const stores = storesResult.data || [];
      const storeMap = new Map<string, string>();
      stores.forEach((store: any) => {
        storeMap.set(store.id, store.name);
      });

      const productById = new Map(productsData.map((p) => [p.id, p]));

      // Misma forma que antes (products embebido) para no tocar el cálculo
      const inventoryResultData = inventoryRows
        .map((row) => {
          const product = productById.get(row.product_id);
          if (!product) return null;
          return {
            store_id: row.store_id,
            product_id: row.product_id,
            qty: row.qty,
            min_qty: row.min_qty,
            products: {
              category: product.category,
              sale_price_usd: product.sale_price_usd,
              cost_usd: product.cost_usd,
              active: product.active,
              sku: product.sku,
              name: product.name,
            },
          };
        })
        .filter(Boolean);

      const sanitizedInventory = sanitizeInventoryData(inventoryResultData || []);

      console.timeLog(
        '📊 EstadisticasPage - fetchStatistics',
        `Datos listos: ${sanitizedInventory.length} filas inventario / ${productsData.length} productos`
      );
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

      // Calcular valor total (venta y costo — mismo criterio que Cierres diarios)
      let totalValue = 0;
      let totalCostValue = 0;
      let totalUnits = 0;
      sanitizedInventory.forEach((item: any) => {
        const qty = Math.max(0, item.qty || 0);
        const salePrice = item.products?.sale_price_usd || 0;
        const costUsd = item.products?.cost_usd || 0;
        totalValue += qty * salePrice;
        totalCostValue += qty * costUsd;
        totalUnits += qty;
      });

      setInventorySummary({
        totalValue: Math.round(totalValue * 100) / 100,
        totalCostValue: Math.round(totalCostValue * 100) / 100,
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
        totalCostValue: number;
        productIds: Set<string>;
        totalUnits: number;
      }>();

      const uncategorizedMap = new Map<
        string,
        {
          sku: string;
          name: string;
          categoryInDb: string | null;
          totalUnits: number;
          totalValue: number;
          stockByStore: Map<string, number>;
        }
      >();

      sanitizedInventory.forEach((item: any) => {
        const rawCategory = item.products?.category ?? null;
        const category = normalizeStatsCategory(rawCategory);
        const qty = Math.max(0, item.qty || 0);
        const salePrice = item.products?.sale_price_usd || 0;
        const costUsd = item.products?.cost_usd || 0;
        const productId = item.product_id;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            totalValue: 0,
            totalCostValue: 0,
            productIds: new Set(),
            totalUnits: 0,
          });
        }

        const cat = categoryMap.get(category)!;
        cat.totalValue += qty * salePrice;
        cat.totalCostValue += qty * costUsd;
        cat.productIds.add(productId);
        cat.totalUnits += qty;

        if (category === 'uncategorized') {
          if (!uncategorizedMap.has(productId)) {
            uncategorizedMap.set(productId, {
              sku: item.products?.sku || '—',
              name: item.products?.name || 'Sin nombre',
              categoryInDb: rawCategory,
              totalUnits: 0,
              totalValue: 0,
              stockByStore: new Map(),
            });
          }
          const row = uncategorizedMap.get(productId)!;
          row.totalUnits += qty;
          row.totalValue += qty * salePrice;
          if (qty > 0) {
            const storeId = item.store_id;
            const storeName = storeMap.get(storeId) || 'Sucursal';
            row.stockByStore.set(storeName, (row.stockByStore.get(storeName) || 0) + qty);
          }
        }
      });

      const uncategorizedRows: UncategorizedProductRow[] = Array.from(uncategorizedMap.entries())
        .map(([productId, row]) => ({
          productId,
          sku: row.sku,
          name: row.name,
          categoryInDb: row.categoryInDb,
          totalUnits: row.totalUnits,
          totalValue: Math.round(row.totalValue * 100) / 100,
          stockByStore: Array.from(row.stockByStore.entries())
            .map(([storeName, qty]) => ({ storeName, qty }))
            .filter((s) => s.qty > 0)
            .sort((a, b) => a.storeName.localeCompare(b.storeName)),
        }))
        .sort((a, b) => b.totalValue - a.totalValue || a.name.localeCompare(b.name));

      setUncategorizedProducts(uncategorizedRows);

      const categoryStatsArray: CategoryStats[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        label: getCategoryLabel(category),
        totalValue: Math.round(data.totalValue * 100) / 100,
        totalCostValue: Math.round(data.totalCostValue * 100) / 100,
        uniqueProducts: data.productIds.size,
        totalUnits: data.totalUnits,
        percentage: totalValue > 0 ? Math.round((data.totalValue / totalValue) * 100 * 10) / 10 : 0,
        costPercentage: totalCostValue > 0 ? Math.round((data.totalCostValue / totalCostValue) * 100 * 10) / 10 : 0,
      })).sort((a, b) => b.totalValue - a.totalValue);

      setCategoryStats(categoryStatsArray);

      if (userProfile?.company_id) {
        writeEstadisticasPageCache(userProfile.company_id, {
          storeStats: statsByStore,
          inventorySummary: {
            totalValue: Math.round(totalValue * 100) / 100,
            totalCostValue: Math.round(totalCostValue * 100) / 100,
            uniqueProducts,
            totalStores: stores.length,
            outOfStock,
            outOfStockPercentage:
              uniqueProducts > 0 ? Math.round((outOfStock / uniqueProducts) * 100 * 10) / 10 : 0,
            lowStock,
            criticalStock,
            totalUnits,
          },
          categoryStats: categoryStatsArray,
          uncategorizedProducts: uncategorizedRows,
          globalCategoryTotals: finalGlobalTotals,
        });
      }

      console.timeEnd('📊 EstadisticasPage - fetchStatistics');
      console.log('📊 Estadísticas calculadas:', {
        tiendas: stores.length,
        itemsInventario: sanitizedInventory.length,
        productosUnicos: uniqueProducts,
        valorTotal: totalValue.toFixed(2),
        valorCosto: totalCostValue.toFixed(2),
        financialSummaryDisponible: !!financialSummary,
        totalServicioTecnico: finalGlobalTotals.technical_service
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
      setIsRefreshing(false);
      // Cargar bloque de financiamiento en segundo plano (no bloquea UI)
      setFinanceEnabled(true);
    }
  };

  useEffect(() => {
    if (!userProfile?.company_id) return;

    const hadCache = hasLoadedOnceRef.current;
    // Con cache: refresh en background. Sin cache: fetch (panel ya visible tras splash)
    fetchStatistics({ background: hadCache });
  }, [userProfile?.company_id]);

  // AUTO-REFRESH cada 3 min (antes 30s): menos saturación al cambiar de pantallas
  useEffect(() => {
    if (!userProfile?.company_id) return;

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchStatistics({ background: true });
    }, 180000);

    return () => clearInterval(interval);
  }, [userProfile?.company_id]);

  if (showBriefSplash) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
      }}>
        <div className="text-center space-y-6">
          <div className="glass-panel border border-green-500/30 rounded-lg p-8 shadow-lg shadow-green-500/20">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"></div>
                <div className="relative w-20 h-20 rounded-lg glass-panel border border-green-500/30 flex items-center justify-center shadow-lg shadow-green-500/50">
                  <ShoppingCart className="w-12 h-12 text-green-400 animate-zoom-bounce" />
                </div>
              </div>
            </div>
            <p className="text-lg font-semibold text-white animate-pulse">Cargando estadísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  const storeStatsArray = Object.values(storeStats).sort((a, b) => 
    a.storeName.localeCompare(b.storeName)
  );
  const isUpdating = loading || isRefreshing;
  // Siempre 4 cards: valor total + 3 categorías (reales o placeholder)
  const categoryCardsToShow: CategoryStats[] = (() => {
    if (categoryStats.length === 0) return EMPTY_CATEGORY_CARDS;
    const byCat = new Map(categoryStats.map((c) => [c.category, c]));
    const ordered = EMPTY_CATEGORY_CARDS.map(
      (placeholder) => byCat.get(placeholder.category) || placeholder
    );
    // Incluir “sin categoría” u otras si existen
    const extras = categoryStats.filter(
      (c) => !EMPTY_CATEGORY_CARDS.some((p) => p.category === c.category)
    );
    return [...ordered, ...extras];
  })();

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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={showCostValue ? 'default' : 'outline'}
            onClick={() => setShowCostValue((v) => !v)}
            className={`flex items-center gap-2 ${
              showCostValue
                ? 'bg-amber-600/90 hover:bg-amber-600 text-white border-amber-500/50'
                : 'border-white/20 text-white/90 hover:bg-white/10'
            }`}
            title={
              showCostValue
                ? 'Mostrar valores a precio de venta (Precio Venta USD)'
                : 'Mostrar valores a costo de entrada (Costo USD) — alineado con Cierres diarios'
            }
          >
            <Wallet className="h-4 w-4" />
            {showCostValue ? 'Ver valor de venta' : 'Ver valor de costo'}
          </Button>
          <Button 
            onClick={() => fetchStatistics({ background: true, forceRefresh: true })} 
            variant="outline"
            disabled={loading || isRefreshing}
            className="flex items-center gap-2"
          >
            {loading || isRefreshing ? (
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
      </div>

      {showCostValue && (
        <p className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
          Mostrando <strong>Costo (USD)</strong> — mismo criterio que Historial → Cierres diarios. Pulsa «Ver valor de venta» para volver al precio al público.
        </p>
      )}

      {/* Resumen del Inventario */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`shadow-md border ${
            showCostValue
              ? 'shadow-amber-500/40 border-amber-500/30'
              : 'shadow-purple-500/40 border-purple-500/30'
          }`}
          style={{
            background: 'rgba(9, 9, 9, 0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle
              className={`text-sm font-medium flex items-center gap-2 ${
                showCostValue ? 'text-amber-400' : 'text-purple-400'
              }`}
            >
              <DollarSign className={`w-4 h-4 ${showCostValue ? 'text-amber-400' : 'text-purple-400'}`} />
              {showCostValue ? 'Valor Total a Costo' : 'Valor Total del Inventario'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold transition-opacity duration-300 ${
                isUpdating && !hasPaintedData ? 'opacity-50 animate-pulse' : 'opacity-100'
              }`}
              style={{ color: showCostValue ? '#f59e0b' : '#a855f7' }}
            >
              USD{' '}
              {(showCostValue ? inventorySummary.totalCostValue : inventorySummary.totalValue).toLocaleString(
                'es-VE',
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </div>
            <p className="text-xs text-white/55 mt-1">
              {showCostValue ? 'Costo (USD) · entrada de mercancía' : 'Precio Venta (USD) · precio al público'}
            </p>
            <p
              className={`text-sm text-white/90 mt-2 transition-opacity duration-300 ${
                isUpdating && !hasPaintedData ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {inventorySummary.uniqueProducts} productos registrados en total
            </p>
            <p
              className={`text-sm text-white/70 mt-1 transition-opacity duration-300 ${
                isUpdating && !hasPaintedData ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {inventorySummary.totalUnits.toLocaleString()} unidades en total en todo el inventario
            </p>
            <p
              className={`text-xs text-white/60 mt-1 transition-opacity duration-300 ${
                isUpdating && !hasPaintedData ? 'opacity-50' : 'opacity-100'
              }`}
            >
              en {inventorySummary.totalStores} tiendas
            </p>
          </CardContent>
        </Card>

        {/* Cards de Categorías — siempre montadas (placeholder o datos reales) */}
        {categoryCardsToShow.map((cat) => {
          const isUncategorized = cat.category === 'uncategorized';
          const valuesPending = isUpdating && !hasPaintedData;

          const getCategoryIcon = () => {
            if (cat.category === 'phones') return <Smartphone className="w-4 h-4 text-blue-400" />;
            if (cat.category === 'accessories') return <Headphones className="w-4 h-4 text-green-400" />;
            if (isUncategorized) return <HelpCircle className="w-4 h-4 text-slate-300" />;
            return <Wrench className="w-4 h-4 text-orange-400" />;
          };

          const getCategoryColor = () => {
            if (cat.category === 'phones') return {
              border: 'border-blue-500/40',
              shadow: 'shadow-blue-500/40',
              bg: 'rgba(8, 15, 35, 0.6)',
              text: 'text-blue-400'
            };
            if (cat.category === 'accessories') return {
              border: 'border-green-500/40',
              shadow: 'shadow-green-500/40',
              bg: 'rgba(5, 21, 12, 0.6)',
              text: 'text-green-400'
            };
            if (isUncategorized) return {
              border: 'border-slate-500/40',
              shadow: 'shadow-slate-500/30',
              bg: 'rgba(20, 20, 24, 0.65)',
              text: 'text-slate-300'
            };
            return {
              border: 'border-orange-500/40',
              shadow: 'shadow-orange-500/40',
              bg: 'rgba(38, 13, 5, 0.6)',
              text: 'text-orange-400'
            };
          };

          const colors = getCategoryColor();

          return (
            <Card key={cat.category} className={`shadow-md ${colors.shadow} border ${colors.border}`} style={{
              background: colors.bg,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}>
              <CardHeader className="pb-3 relative">
                <CardTitle className={`text-sm font-medium flex items-center gap-2 pr-28 ${colors.text}`}>
                  {getCategoryIcon()}
                  {isUncategorized ? 'Sin categoría' : cat.label}
                </CardTitle>
                {isUncategorized && uncategorizedProducts.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute right-3 top-3 h-7 gap-1 border-slate-400/50 bg-white/10 px-2 py-0 text-[11px] font-medium leading-tight text-slate-100 rounded-xl hover:bg-white/20 hover:text-white"
                    title="Ver detalle de productos sin categoría"
                    aria-label="Ver detalles de productos sin categoría"
                    onClick={() => setUncategorizedDialogOpen(true)}
                  >
                    <Eye className="h-4 w-4 shrink-0" />
                    Ver detalles
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-xl font-bold transition-opacity duration-300 ${
                    valuesPending ? 'opacity-50 animate-pulse' : 'opacity-100'
                  } ${showCostValue ? 'text-amber-400' : colors.text}`}
                >
                  USD{' '}
                  {(showCostValue ? cat.totalCostValue : cat.totalValue).toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-white/55 mt-1">
                  {showCostValue ? 'Costo (USD)' : 'Precio Venta (USD)'}
                </p>
                <p
                  className={`text-sm text-white/90 mt-2 transition-opacity duration-300 ${
                    valuesPending ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {cat.uniqueProducts} productos agregados
                </p>
                <p
                  className={`text-sm text-white/70 mt-1 transition-opacity duration-300 ${
                    valuesPending ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  Total unidades: {cat.totalUnits.toLocaleString()}
                </p>
                <p
                  className={`text-sm text-white/60 mt-1 transition-opacity duration-300 ${
                    valuesPending ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  % del total: {showCostValue ? cat.costPercentage : cat.percentage}%
                </p>
                <Badge variant="outline" className="mt-2 text-xs border-white/20">
                  {showCostValue ? 'A costo · Cierres' : 'Stock normal'}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
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

      {/* Estado del Inventario */}
      <Card className="shadow-lg shadow-green-500/50 border border-green-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Estado del Inventario
          </CardTitle>
          <p className="text-sm text-white/90">
            Análisis de stock y productos
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Productos Sin Stock */}
            <div className="p-4 border-none shadow-md shadow-red-500/50 rounded-sm hover:shadow-lg hover:shadow-red-500/60 transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5 text-status-danger" />
                    <h3 className="text-lg font-semibold">Productos Sin Stock</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-white/90">
                    <div>
                      <span className="font-semibold text-status-danger text-xl">
                        {inventorySummary.outOfStock}
                      </span>
                    </div>
                    <div>
                      {inventorySummary.outOfStockPercentage}% de productos únicos
                    </div>
                    <div>
                      <span className="text-status-danger">
                        Requiere atención inmediata
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">
                    Requiere atención inmediata
                  </Badge>
                </div>
              </div>
            </div>

            {/* Stock Bajo */}
            <div className="p-4 border-none shadow-md shadow-yellow-500/50 rounded-sm hover:shadow-lg hover:shadow-yellow-500/60 transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold">Stock Bajo</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-white/90">
                    <div>
                      <span className="font-semibold text-yellow-600 text-xl">
                        {inventorySummary.lowStock + inventorySummary.criticalStock}
                      </span>
                    </div>
                    <div>
                      {inventorySummary.criticalStock} críticos • {inventorySummary.lowStock} bajo mínimo
                    </div>
                    <div>
                      <span className="text-yellow-600">
                        Reabastecimiento recomendado
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-none shadow-xl shadow-yellow-500/20 text-yellow-600">
                    Reabastecimiento recomendado
                  </Badge>
                </div>
              </div>
            </div>

            {/* Unidades en Stock */}
            <div className="p-4 border-none shadow-md shadow-green-500/50 rounded-sm hover:shadow-lg hover:shadow-green-500/60 transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Unidades en Stock</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-white/90">
                    <div>
                      <span className="font-semibold text-xl">
                        {inventorySummary.totalUnits.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      unidades en total
                    </div>
                    <div>
                      {inventorySummary.uniqueProducts} productos únicos
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Stock disponible
                  </Badge>
                </div>
              </div>
            </div>
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

      <Dialog open={uncategorizedDialogOpen} onOpenChange={setUncategorizedDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-slate-300" />
              Productos sin categoría
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Productos activos cuya categoría no es Teléfonos, Accesorios ni Servicio Técnico. Asigne
              categoría en Artículos para que aparezcan en el resumen por sucursal.
            </DialogDescription>
          </DialogHeader>

          {uncategorizedProducts.length === 0 ? (
            <p className="text-sm text-white/80 py-4">No hay productos sin categoría con stock registrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-left">
                    <th className="px-3 py-2 font-semibold">SKU</th>
                    <th className="px-3 py-2 font-semibold">Producto</th>
                    <th className="px-3 py-2 font-semibold">Categoría en BD</th>
                    <th className="px-3 py-2 font-semibold text-right">Uds</th>
                    <th className="px-3 py-2 font-semibold text-right">USD</th>
                    <th className="px-3 py-2 font-semibold">Stock por sucursal</th>
                  </tr>
                </thead>
                <tbody>
                  {uncategorizedProducts.map((row) => (
                    <tr key={row.productId} className="border-t border-white/10">
                      <td className="px-3 py-2 font-mono text-xs">{row.sku}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 text-white/70">
                        {row.categoryInDb == null || row.categoryInDb.trim() === ''
                          ? '(vacío / null)'
                          : row.categoryInDb}
                      </td>
                      <td className="px-3 py-2 text-right">{row.totalUnits}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {row.totalValue.toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-xs text-white/80">
                        {row.stockByStore.length > 0
                          ? row.stockByStore.map((s) => `${s.storeName}: ${s.qty}`).join(' · ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/20 bg-white/5 font-semibold">
                    <td className="px-3 py-2" colSpan={3}>
                      Total ({uncategorizedProducts.length} productos)
                    </td>
                    <td className="px-3 py-2 text-right">
                      {uncategorizedProducts.reduce((s, r) => s + r.totalUnits, 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {uncategorizedProducts
                        .reduce((s, r) => s + r.totalValue, 0)
                        .toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};




