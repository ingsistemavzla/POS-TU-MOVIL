import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Package,
  Store,
  DollarSign,
  Save,
  X,
  ArrowRightLeft
} from 'lucide-react';
import { ProductForm } from '../components/pos/ProductForm';
import { useToast } from '@/hooks/use-toast';
import { PRODUCT_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import { sanitizeInventoryData } from '@/utils/inventoryValidation';
import { ArticlesStatsRow } from '@/components/inventory/ArticlesStatsRow';
import { StoreFilterBar } from '@/components/inventory/StoreFilterBar';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  cost_usd: number;
  sale_price_usd: number;
  tax_rate: number;
  active: boolean;
  created_at: string;
  total_stock?: number;
  stockByStore?: Record<string, number>;
}


interface StoreInventory {
  store_id: string;
  store_name: string;
  qty: number;
  editing?: boolean;
  tempQty?: number;
}

export const ArticulosPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedStoreId, availableStores } = useStore();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [storeInventories, setStoreInventories] = useState<Record<string, StoreInventory[]>>({});
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [transferring, setTransferring] = useState<Record<string, { from: string; to: string; qty: number }>>({});
  const [editingPopover, setEditingPopover] = useState<{ productId: string; storeId: string } | null>(null);
  const [transferPopover, setTransferPopover] = useState<{ productId: string; storeId: string } | null>(null);
  const [editQty, setEditQty] = useState<number>(0);

  // Cargar productos e inventario - REUTILIZA LA MISMA LÓGICA DE AlmacenPage
  const fetchData = async () => {
    try {
      console.log('[ArticulosPage] fetchData iniciado');
      if (!userProfile?.company_id) {
        console.log('[ArticulosPage] No hay company_id, saliendo');
        setProducts([]);
        setLoading(false);
        return;
      }

      // Cargar productos (sin JOIN a vista que puede no existir)
      // ⚠️ FILTRO CRÍTICO: Solo productos activos para evitar contar stock de productos eliminados
      const { data: productsData, error: productsError } = await (supabase.from('products') as any)
        .select('id, sku, barcode, name, category, cost_usd, sale_price_usd, tax_rate, active, created_at')
        // ✅ SINCRONIZADO CON ALMACÉN: RLS handles company_id automatically
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .eq('active', true)  // ⚠️ Solo productos activos
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        console.error('Error details:', {
          message: productsError.message,
          code: productsError.code,
          details: productsError.details,
          hint: productsError.hint
        });
        toast({
          title: "Error",
          description: `No se pudieron cargar los productos: ${productsError.message || 'Error desconocido'}`,
          variant: "destructive",
        });
        setProducts([]);
        setLoading(false);
        return;
      }

      if (!productsData) {
        console.warn('No se recibieron datos de productos');
        setProducts([]);
        setLoading(false);
        return;
      }

      // GERENTE: Solo su tienda asignada
      const isManager = userProfile.role === 'manager';
      
      // Usar availableStores del StoreContext en lugar de cargar localmente
      const storesData = availableStores;

      // Cargar inventario
      // ⚠️ FILTRO CRÍTICO: JOIN con products para filtrar solo productos activos
      // 🛡️ EXCEPCIÓN QUIRÚRGICA: Cargar TODOS los datos de inventario (sin filtro de sucursal)
      // para garantizar que productos de Servicio Técnico tengan datos completos de todas las sucursales
      // El filtrado por sucursal se hará en memoria después para otras categorías
      let inventoryQuery = (supabase.from('inventories') as any)
        .select('product_id, store_id, qty, products!inner(active)')
        // ✅ SINCRONIZADO CON ALMACÉN: RLS handles company_id automatically
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .eq('products.active', true);  // ⚠️ Solo inventario de productos activos

      // 🔥 NO APLICAR FILTRO DE SUCURSAL EN SQL: Cargar todos los datos
      // El filtrado se hará en memoria para otras categorías, pero Servicio Técnico necesita todos los datos

      // 🔥 PAGINACIÓN: Obtener todos los registros (Supabase limita a 1000 por defecto)
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

        console.log(`[ArticulosPage] Inventario obtenido: ${allData.length} registros (en ${Math.ceil(from / pageSize)} páginas)`);
        return { data: allData, error: null };
      };

      const { data: inventoryData, error: inventoryError } = await fetchAllInventory();

      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
        console.error('Inventory error details:', {
          message: inventoryError.message,
          code: inventoryError.code,
          details: inventoryError.details,
          hint: inventoryError.hint
        });
        toast({
          title: "Advertencia",
          description: "No se pudo cargar el inventario completo",
          variant: "warning",
        });
      }

      // Procesar inventario (solo para stock por tienda, NO para total)
      const stockByProductStore = new Map<string, Record<string, number>>();
      const inventoriesByProduct: Record<string, StoreInventory[]> = {};

      if (inventoryData && inventoryData.length > 0) {
        const sanitized = sanitizeInventoryData(inventoryData);
        
        sanitized.forEach((item: any) => {
          const productId = item.product_id;
          const storeId = item.store_id;
          const qty = Math.max(0, item.qty || 0);

          // Stock por tienda (solo para visualización, no para cálculo de total)
          if (!stockByProductStore.has(productId)) {
            stockByProductStore.set(productId, {});
          }
          stockByProductStore.get(productId)![storeId] = qty;

          // Inventarios por producto
          if (!inventoriesByProduct[productId]) {
            inventoriesByProduct[productId] = [];
          }
          const store = storesData?.find((s: Store) => s.id === storeId);
          inventoriesByProduct[productId].push({
            store_id: storeId,
            store_name: store?.name || 'Tienda Desconocida',
            qty: qty,
          });
        });
      }

      // 🔥 RESTAURACIÓN: Determinar la sucursal activa para el filtro
      const activeStoreId = selectedStoreId && selectedStoreId !== 'all' 
        ? selectedStoreId 
        : (isManager && userProfile.assigned_store_id 
          ? userProfile.assigned_store_id 
          : null);

      // 🔥 RESTAURACIÓN: Si hay filtro de sucursal, solo mostrar productos con stock en esa sucursal
      // Si no hay filtro, asegurar que todos los productos tengan inventario para todas las tiendas
      if (activeStoreId) {
        // FILTRADO POR SUCURSAL: Solo productos con stock en la sucursal seleccionada
        productsData?.forEach((product: Product) => {
          if (!inventoriesByProduct[product.id]) {
            inventoriesByProduct[product.id] = [];
          }
          // Solo agregar la sucursal seleccionada
          const exists = inventoriesByProduct[product.id].some(
            inv => inv.store_id === activeStoreId
          );
          if (!exists) {
            const store = storesData?.find((s: Store) => s.id === activeStoreId);
            inventoriesByProduct[product.id].push({
              store_id: activeStoreId,
              store_name: store?.name || 'Tienda Desconocida',
              qty: 0,
            });
          }
        });
      } else {
        // SIN FILTRO: Asegurar que todos los productos tengan inventario para todas las tiendas
        productsData?.forEach((product: Product) => {
          if (!inventoriesByProduct[product.id]) {
            inventoriesByProduct[product.id] = [];
          }
          storesData?.forEach((store: Store) => {
            const exists = inventoriesByProduct[product.id].some(
              inv => inv.store_id === store.id
            );
            if (!exists) {
              inventoriesByProduct[product.id].push({
                store_id: store.id,
                store_name: store.name,
                qty: 0,
              });
            }
          });
          inventoriesByProduct[product.id].sort((a, b) => 
            a.store_name.localeCompare(b.store_name)
          );
        });
      }

      // ✅ CORRECCIÓN: Calcular total_stock SIEMPRE sumando todas las tiendas (consistencia con Almacén)
      // El filtro de tienda solo afecta qué productos se muestran, pero el total_stock siempre es la suma global
      const productsWithStock = (productsData || []).map((product: any) => {
        const stockByStore = stockByProductStore.get(product.id) || {};
        
        // ✅ SIEMPRE sumar todas las tiendas para mantener consistencia con panel Almacén
        // El filtro de tienda (activeStoreId) solo afecta la visualización de detalles, no el total
        const totalStock = Object.values(stockByStore).reduce((sum, qty) => sum + (qty || 0), 0);
        
        // 🔍 DEBUG: Log para verificar cálculo de stock
        if (product.sku === 'R5CY71TZ3JM' || product.name.toLowerCase().includes('samsung galaxy a26')) {
          console.log(`[ArticulosPage] Producto ${product.sku} (${product.name}):`, {
            stockByStore,
            totalStock,
            inventoryCount: inventoriesByProduct[product.id]?.length || 0,
            inventories: inventoriesByProduct[product.id]?.map(inv => ({ store: inv.store_name, qty: inv.qty }))
          });
        }
        
        return {
          ...product,
          total_stock: totalStock,
          stockByStore: stockByStore,
        };
      }).filter((product: any) => {
        // 🔥 RESTAURACIÓN: Si hay filtro de sucursal, solo mostrar productos con stock > 0 en esa sucursal
        if (activeStoreId) {
          // 🛡️ EXCEPCIÓN QUIRÚRGICA: Servicio Técnico siempre visible (incluso con stock 0)
          // Esto permite que servicios técnicos aparezcan aunque no tengan inventario físico
          if (product.category === 'technical_service') {
            return true; // Siempre mostrar Servicio Técnico
          }
          // Para otras categorías, mantener lógica de stock físico
          return product.total_stock > 0;
        }
        // Sin filtro, mostrar todos los productos
        return true;
      });

      console.log('[ArticulosPage] Productos procesados:', {
        total: productsWithStock.length,
        technical_service: productsWithStock.filter(p => p.category === 'technical_service').length,
        technical_service_total_stock: productsWithStock
          .filter(p => p.category === 'technical_service')
          .reduce((sum, p) => sum + (p.total_stock || 0), 0)
      });

      setProducts(productsWithStock);
      setStoreInventories(inventoriesByProduct);
    } catch (error) {
      console.error('Error in fetchData:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (userProfile?.company_id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.company_id, selectedStoreId]);

  // Abrir popover de edición - NUEVA UX
  const openEditPopover = (productId: string, storeId: string) => {
    const inventory = storeInventories[productId]?.find(inv => inv.store_id === storeId);
    setEditQty(inventory?.qty || 0);
    setEditingPopover({ productId, storeId });
  };

  // Guardar edición de stock - REUTILIZA LA MISMA FUNCIÓN DE AlmacenPage (LÓGICA INTACTA)
  const saveStock = async (productId: string, storeId: string) => {
    if (!editingPopover || editingPopover.productId !== productId || editingPopover.storeId !== storeId) {
      return;
    }

    const newQty = Math.max(0, Math.floor(editQty));

    try {
      const { error } = await (supabase as any).rpc('update_store_inventory', {
        p_product_id: productId,
        p_store_id: storeId,
        p_qty: newQty,
      });

      if (error) {
        throw error;
      }

      // Actualizar estado local
      setStoreInventories(prev => {
        const updated = { ...prev };
        updated[productId] = updated[productId].map(inv => {
          if (inv.store_id === storeId) {
            return { ...inv, qty: newQty };
          }
          return inv;
        });
        return updated;
      });

      // Cerrar popover
      setEditingPopover(null);

      // Recargar datos desde el backend para obtener total_stock actualizado
      await fetchData();

      toast({
        title: "Stock actualizado",
        description: `Stock actualizado a ${newQty} unidades`,
        variant: "success",
      });
    } catch (error: any) {
      console.error('Error updating stock:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el stock",
        variant: "destructive",
      });
    }
  };

  // Abrir popover de transferencia - NUEVA UX
  const openTransferPopover = (productId: string, fromStoreId: string) => {
    setTransferring(prev => ({
      ...prev,
      [productId]: { from: fromStoreId, to: '', qty: 0 },
    }));
    setTransferPopover({ productId, storeId: fromStoreId });
  };

  // Ejecutar transferencia - REUTILIZA LA MISMA FUNCIÓN DE AlmacenPage (LÓGICA INTACTA)
  const executeTransfer = async (productId: string) => {
    const transfer = transferring[productId];
    // 🛡️ VALIDACIÓN CRÍTICA: Prevenir valores negativos o cero
    const safeQty = Math.max(0, Math.floor(transfer?.qty || 0));
    if (!transfer || !transfer.to || safeQty <= 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos de la transferencia con una cantidad válida mayor a 0",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any).rpc('transfer_inventory', {
        p_product_id: productId,
        p_from_store_id: transfer.from,
        p_to_store_id: transfer.to,
        p_quantity: safeQty, // 🛡️ Usar valor validado
        p_company_id: userProfile?.company_id,
        p_transferred_by: userProfile?.id,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Transferencia exitosa",
        description: `Se transfirieron ${safeQty} unidades`,
        variant: "success",
      });

      // Limpiar transferencia y cerrar popover
      setTransferring(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      setTransferPopover(null);

      // Recargar datos
      await fetchData();
    } catch (error: any) {
      console.error('Error transferring:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo realizar la transferencia",
        variant: "destructive",
      });
    }
  };

  // Eliminar producto - REUTILIZA LA MISMA FUNCIÓN DE AlmacenPage
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;

    try {
      const { data, error } = await (supabase as any).rpc('delete_product', {
        p_product_id: deletingProduct.id,
      });

      if (error) {
        throw error;
      }

      // Verificar respuesta
      if (data && !data.success) {
        throw new Error(data.message || 'Error al eliminar el producto');
      }

      toast({
        title: "Producto desactivado",
        description: data?.note 
          ? `El producto "${deletingProduct.name}" ha sido desactivado. ${data.note}`
          : `El producto "${deletingProduct.name}" ha sido desactivado exitosamente. Ya no aparecerá en el POS, pero se mantiene en el historial.`,
        variant: "success",
      });

      // Cerrar modal y recargar datos
      setDeletingProduct(null);
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el producto",
        variant: "destructive",
      });
    }
  };

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    // ✅ FILTRO DE SUCURSAL ELIMINADO: Ahora se hace a nivel SQL, no en JavaScript
    // El filtro por tienda ya se aplicó en la consulta SQL, así que todos los productos
    // que lleguen aquí ya están filtrados por la sucursal seleccionada
    
    return matchesSearch && matchesCategory;
  });

  // Calcular valor total
  const getTotalValue = (product: Product) => {
    return (product.total_stock || 0) * product.sale_price_usd;
  };

  // ✅ NUEVO: Componente Skeleton para cards de productos
  const ProductCardSkeleton = () => (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded" />
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Artículos</h1>
          <p className="text-white/70">Vista de tarjetas - Gestión de productos e inventario</p>
        </div>
        {/* Solo admins pueden crear productos */}
        {userProfile?.role === 'admin' && (
          <Button onClick={() => {
            setEditingProduct(null);
            setShowForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        )}
      </div>

      {/* 🔥 SÚPER FILTRO GLOBAL DE SUCURSAL - Barra Dominante */}
      <StoreFilterBar pageTitle="Artículos" />

      {/* Barra de Estadísticas Superior (KPIs) */}
      <ArticlesStatsRow />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/90 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre, SKU o código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass-input"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px] glass-input">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {PRODUCT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Tarjetas */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 text-center text-white/90">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No se encontraron productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const inventories = storeInventories[product.id] || [];

            return (
              <Card key={product.id} className="border border-green-500/30 hover:shadow-lg hover:shadow-green-500/50 transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-bold line-clamp-2">
                      {product.name}
                    </CardTitle>
                    <Badge variant={product.active ? "default" : "secondary"} className="ml-2 shrink-0">
                      {product.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Información básica */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/90">SKU:</span>
                      <span className="font-mono font-semibold">{product.sku}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/90">Categoría:</span>
                      <Badge variant="outline" className="text-emerald-300 font-semibold border-emerald-400/60 bg-emerald-500/10 brightness-125">
                        {getCategoryLabel(product.category)}
                      </Badge>
                    </div>
                  </div>

                  {/* Stock por Tienda */}
                  {inventories.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Store className="w-4 h-4" />
                        <span>Stock por Tienda:</span>
                      </div>
                      <div className="space-y-1">
                        {inventories
                          // 🔥 RESTAURACIÓN: Filtrar por sucursal seleccionada o tienda asignada
                          .filter((inv) => {
                            const isManager = userProfile?.role === 'manager';
                            // Si hay filtro de sucursal activo, solo mostrar esa sucursal
                            if (selectedStoreId && selectedStoreId !== 'all') {
                              return inv.store_id === selectedStoreId;
                            }
                            // Si es manager, solo mostrar su tienda asignada
                            if (isManager && userProfile?.assigned_store_id) {
                              return inv.store_id === userProfile.assigned_store_id;
                            }
                            // Sin filtro: mostrar todas las sucursales
                            return true;
                          })
                          .map((inv) => {
                          const transfer = transferring[product.id];
                          const isEditingOpen = editingPopover?.productId === product.id && editingPopover?.storeId === inv.store_id;
                          const isTransferOpen = transferPopover?.productId === product.id && transferPopover?.storeId === inv.store_id;
                          const isManager = userProfile?.role === 'manager';

                          return (
                            <div key={inv.store_id} className="flex items-center justify-between text-sm p-2 glass-muted-dark rounded-lg border border-emerald-500/20">
                              <span className="text-white font-medium">{inv.store_name}:</span>
                              
                              <div className="flex items-center gap-2">
                                {inv.qty === 0 ? (
                                  <Badge className="bg-red-500/20 text-red-300 border border-red-500/50 text-[9px] px-1 py-0 font-medium hover:bg-red-500/30 hover:text-red-200 transition-colors">
                                    Sin Stock
                                  </Badge>
                                ) : (
                                  <span className="font-semibold text-emerald-300">
                                    {inv.qty}
                                  </span>
                                )}
                                
                                {/* Iconos de Acción: Edición y Transferencia */}
                                <div className="flex items-center gap-2">
                                {/* Popover de Edición */}
                                <Popover open={isEditingOpen} onOpenChange={(open) => {
                                  if (!open) {
                                    setEditingPopover(null);
                                  } else {
                                    openEditPopover(product.id, inv.store_id);
                                  }
                                }}>
                                  {/* Solo admins pueden editar stock - Managers NO pueden */}
                                  {userProfile?.role === 'admin' && !isManager && (
                                    <PopoverTrigger asChild>
                                      <button
                                        className="group p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30 hover:bg-indigo-400 hover:border-indigo-400 transition-colors"
                                        title="Editar stock"
                                      >
                                        <Edit className="h-3 w-3 text-indigo-400 brightness-125 group-hover:text-white transition-colors" />
                                      </button>
                                    </PopoverTrigger>
                                  )}
                                  {/* Managers NO pueden editar */}
                                  {isManager && (
                                    <span className="text-xs text-white/90 ml-1">Solo lectura</span>
                                  )}
                                  <PopoverContent className="w-64" align="end">
                                    <div className="space-y-3">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-white">Editar Stock</Label>
                                        <p className="text-xs text-white/70">
                                          {inv.store_name}
                                        </p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor={`edit-qty-${inv.store_id}`} className="text-white/90">Nueva Cantidad</Label>
                                        <Input
                                          id={`edit-qty-${inv.store_id}`}
                                          type="number"
                                          step="1"
                                          min="0"
                                          value={editQty}
                                          className="glass-input text-white w-full"
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            // 🛡️ VALIDACIÓN CRÍTICA: Prevenir valores negativos
                                            if (val === '' || val === '-') {
                                              setEditQty(0);
                                              return;
                                            }
                                            const num = parseInt(val, 10);
                                            if (!isNaN(num) && num >= 0) {
                                              setEditQty(num);
                                            } else if (num < 0) {
                                              // Si es negativo, forzar a 0
                                              setEditQty(0);
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            // 🛡️ Prevenir que se escriba el signo "-"
                                            if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                              e.preventDefault();
                                            }
                                          }}
                                          placeholder="0"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          className="flex-1 bg-primary-dark text-white hover:bg-primary-dark/90"
                                          onClick={() => saveStock(product.id, inv.store_id)}
                                        >
                                          <Save className="w-3 h-3 mr-1" />
                                          Guardar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 glass-input text-white hover:bg-white/10"
                                          onClick={() => setEditingPopover(null)}
                                        >
                                          <X className="w-3 h-3 mr-1" />
                                          Cancelar
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>

                                {/* Popover de Transferencia - Solo si hay stock y es admin (NO managers) */}
                                {inv.qty > 0 && userProfile?.role === 'admin' && !isManager && (
                                  <Popover open={isTransferOpen} onOpenChange={(open) => {
                                    if (!open) {
                                      setTransferPopover(null);
                                      setTransferring(prev => {
                                        const updated = { ...prev };
                                        delete updated[product.id];
                                        return updated;
                                      });
                                    } else {
                                      openTransferPopover(product.id, inv.store_id);
                                    }
                                  }}>
                                    <PopoverTrigger asChild>
                                      <button
                                        className="group p-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30 hover:bg-purple-400 hover:border-purple-400 transition-colors"
                                        title="Transferir stock"
                                      >
                                        <ArrowRightLeft className="h-3 w-3 text-purple-400 brightness-125 group-hover:text-white transition-colors" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72" align="end">
                                      <div className="space-y-3">
                                        <div className="space-y-2">
                                          <Label className="text-sm font-semibold text-white">Transferir Stock</Label>
                                          {/* Origen inferido del contexto - Destacado */}
                                          <div className="p-2 glass-green-dark rounded-sm shadow-md shadow-emerald-500/30 border border-emerald-500/40">
                                            <p className="text-xs font-medium text-emerald-300">
                                              Desde: <span className="font-bold text-white">{inv.store_name}</span>
                                            </p>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor={`transfer-to-${inv.store_id}`} className="text-white/90">Tienda Destino</Label>
                                          <Select
                                            value={transfer?.to || ''}
                                            onValueChange={(value) => {
                                              setTransferring(prev => ({
                                                ...prev,
                                                [product.id]: { 
                                                  ...(prev[product.id] || { from: inv.store_id, to: '', qty: 0 }),
                                                  to: value 
                                                },
                                              }));
                                            }}
                                          >
                                            <SelectTrigger id={`transfer-to-${inv.store_id}`} className="glass-input">
                                              <SelectValue placeholder="Selecciona destino..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {/* Filtrado: Excluye la tienda de origen inferida del contexto */}
                                              {availableStores
                                                .filter(s => s.id !== inv.store_id)
                                                .map(store => (
                                                  <SelectItem key={store.id} value={store.id}>
                                                    {store.name}
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor={`transfer-qty-${inv.store_id}`} className="text-white/90">Cantidad</Label>
                                          <Input
                                            id={`transfer-qty-${inv.store_id}`}
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={transfer?.qty || ''}
                                            className="glass-input"
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              // 🛡️ VALIDACIÓN CRÍTICA: Prevenir valores negativos
                                              if (val === '' || val === '-') {
                                                setTransferring(prev => ({
                                                  ...prev,
                                                  [product.id]: { 
                                                    ...(prev[product.id] || { from: inv.store_id, to: '', qty: 0 }), 
                                                    qty: 0 
                                                  },
                                                }));
                                                return;
                                              }
                                              const num = parseInt(val, 10);
                                              if (!isNaN(num) && num >= 0) {
                                                setTransferring(prev => ({
                                                  ...prev,
                                                  [product.id]: { 
                                                    ...(prev[product.id] || { from: inv.store_id, to: '', qty: 0 }), 
                                                    qty: num 
                                                  },
                                                }));
                                              } else if (num < 0) {
                                                // Si es negativo, forzar a 0
                                                setTransferring(prev => ({
                                                  ...prev,
                                                  [product.id]: { 
                                                    ...(prev[product.id] || { from: inv.store_id, to: '', qty: 0 }), 
                                                    qty: 0 
                                                  },
                                                }));
                                              }
                                            }}
                                            onKeyDown={(e) => {
                                              // 🛡️ Prevenir que se escriba el signo "-"
                                              if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                                e.preventDefault();
                                              }
                                            }}
                                            className="w-full"
                                            placeholder="Cantidad a transferir"
                                          />
                                          <p className="text-xs text-white/90">
                                            Disponible: {inv.qty} unidades
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            className="flex-1 bg-primary-dark text-white hover:bg-primary-dark/90"
                                            onClick={() => executeTransfer(product.id)}
                                            disabled={!transfer?.to || !transfer?.qty || transfer.qty <= 0}
                                          >
                                            <ArrowRightLeft className="w-3 h-3 mr-1" />
                                            Transferir
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 glass-input text-white hover:bg-white/10"
                                            onClick={() => {
                                              setTransferPopover(null);
                                              setTransferring(prev => {
                                                const updated = { ...prev };
                                                delete updated[product.id];
                                                return updated;
                                              });
                                            }}
                                          >
                                            <X className="w-3 h-3 mr-1" />
                                            Cancelar
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {inventories.length === 0 && (
                    <div className="text-sm text-white/90 text-center p-2 glass-muted-dark rounded-lg border border-emerald-500/20">
                      Sin stock en ninguna tienda
                    </div>
                  )}

                  {/* Stock Total - Destacado */}
                  <div className="p-3 bg-accent-primary/10 rounded-sm shadow-md shadow-accent-primary/40 border border-accent-primary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-accent-primary" />
                        <span className="font-semibold">Stock Total</span>
                      </div>
                      <span className={`text-2xl font-bold ${product.total_stock === 0 ? 'text-status-danger' : 'text-accent-primary'}`}>
                        {product.total_stock || 0}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-white/90">
                      Valor: ${getTotalValue(product).toFixed(2)}
                    </div>
                  </div>

                  {/* Precio y Valor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/90">Precio:</span>
                      <span className="font-semibold">${product.sale_price_usd.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/90">Valor:</span>
                      <span className="font-semibold text-white/90">${getTotalValue(product).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Botones de Acción - Solo admins pueden editar/eliminar */}
                  {userProfile?.role === 'admin' && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setEditingProduct(product);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeletingProduct(product)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Producto */}
      {showForm && (
        <ProductForm
          product={editingProduct || undefined}
          stores={availableStores}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            fetchData();
            setShowForm(false);
            setEditingProduct(null);
          }}
        />
      )}


      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar producto?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente el producto <strong>{deletingProduct?.name}</strong> y todo su inventario asociado en todas las tiendas.
              <br />
              <br />
              <span className="text-red-600 font-semibold">Esta acción no se puede deshacer.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingProduct(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

