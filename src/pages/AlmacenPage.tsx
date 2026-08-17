import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
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
  Plus, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Save, 
  X,
  Package,
  Store,
  ArrowRightLeft,
  DollarSign,
  Trash2
} from 'lucide-react';
import { ProductForm } from '../components/pos/ProductForm';
import { useToast } from '@/hooks/use-toast';
import { PRODUCT_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import { isGlobalNonNormalStock } from '@/constants/stockAlerts';
import { BranchStockMatrix } from '@/components/inventory/BranchStockMatrix';
import { InventoryDashboardHeader } from '@/components/inventory/InventoryDashboardHeader';
import { StoreFilterBar } from '@/components/inventory/StoreFilterBar';
import { downloadInventoryListPDF } from '@/utils/inventoryListPdfGenerator';
import { AlmacenTableSkeleton } from '@/components/inventory/InventoryLoadingSkeletons';
import { useClientPagination } from '@/hooks/useClientPagination';
import { ListPaginationBar } from '@/components/ui/ListPaginationBar';
import {
  readInventoryPageCache,
  writeInventoryPageCache,
  clearInventoryPageCache,
} from '@/utils/inventoryPageCache';
import {
  fetchAllActiveProducts,
  fetchInventoriesForProductIds,
  buildCatalogWithStock,
  invalidateInventoryCatalogMemory,
} from '@/utils/inventoryCatalogFetch';

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

interface Store {
  id: string;
  name: string;
}

interface StoreInventory {
  store_id: string;
  store_name: string;
  qty: number;
  editing?: boolean;
  tempQty?: number;
}

export const AlmacenPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // ✅ OPTIMIZACIÓN: Debounce en búsqueda (espera 300ms después de que usuario deje de escribir)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [storeInventories, setStoreInventories] = useState<Record<string, StoreInventory[]>>({});
  const [transferring, setTransferring] = useState<Record<string, { from: string; to: string; qty: number; processing?: boolean }>>({});
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const [showInventoryListDialog, setShowInventoryListDialog] = useState(false);
  const [inventoryListCategory, setInventoryListCategory] = useState<string>('all');
  const [generatingInventoryList, setGeneratingInventoryList] = useState(false);

  // 🛡️ Privacidad: solo admin y master_admin pueden ver costo/utilidad
  const canSeeCosts = userProfile?.role === 'admin' || userProfile?.role === 'master_admin';

  // Cargar productos e inventario (productos paginados + inventario solo de esos IDs)
  const fetchData = async () => {
    try {
      if (!userProfile?.company_id) {
        setProducts([]);
        setLoading(false);
        setIsRefetching(false);
        return;
      }

      const companyId = userProfile.company_id;
      const sessionCached = readInventoryPageCache(companyId, categoryFilter, {
        allowStale: true,
      });
      const hasLocalData = products.length > 0;

      if (sessionCached && !hasLocalData) {
        setProducts(sessionCached.products as Product[]);
        setStoreInventories(sessionCached.storeInventories as Record<string, StoreInventory[]>);
        setLoading(false);
      }

      if (!hasLocalData && !sessionCached) {
        setLoading(true);
      } else {
        setIsRefetching(true);
      }

      const storesQuery = (supabase.from('stores') as any)
        .select('id, name')
        .eq('active', true)
        .order('name');

      const [productsData, storesResult] = await Promise.all([
        fetchAllActiveProducts({
          category: categoryFilter !== 'all' ? categoryFilter : null,
        }),
        storesQuery,
      ]);

      if (!productsData) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data: storesData, error: storesError } = storesResult;

      if (storesError) {
        console.error('Error fetching stores:', storesError);
        toast({
          title: 'Advertencia',
          description: 'No se pudieron cargar las tiendas',
          variant: 'warning',
        });
        setStores([]);
      } else {
        setStores(storesData || []);
      }

      const productIds = productsData.map((p) => p.id);
      let inventoryData: Array<{ product_id: string; store_id: string; qty: number }> = [];
      try {
        inventoryData = await fetchInventoriesForProductIds(productIds);
      } catch (inventoryError: any) {
        console.error('Error fetching inventory:', inventoryError);
        toast({
          title: 'Advertencia',
          description: 'No se pudo cargar el inventario completo',
          variant: 'warning',
        });
      }

      const { products: productsWithStock, storeInventories: inventoriesByProduct } =
        buildCatalogWithStock(productsData, inventoryData, (storesData || []) as Store[]);

      setProducts(productsWithStock as Product[]);
      setStoreInventories(inventoriesByProduct as Record<string, StoreInventory[]>);
      writeInventoryPageCache(companyId, productsWithStock, inventoriesByProduct, categoryFilter);
    } catch (error) {
      console.error('Error in fetchData:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  };

  // Pintar cache antes del paint; refrescar en background (no borrar cache al montar)
  useLayoutEffect(() => {
    const companyId = userProfile?.company_id;
    if (!companyId) return;
    const cached = readInventoryPageCache(companyId, categoryFilter, { allowStale: true });
    if (!cached) return;
    setProducts(cached.products as Product[]);
    setStoreInventories(cached.storeInventories as Record<string, StoreInventory[]>);
    setLoading(false);
  }, [userProfile?.company_id, categoryFilter]);

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.company_id, categoryFilter]);
  // Toggle expandir producto
  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Iniciar edición de stock
  const startEditStock = (productId: string, storeId: string) => {
    setStoreInventories(prev => {
      const updated = { ...prev };
      if (!updated[productId]) return prev;
      
      updated[productId] = updated[productId].map(inv => {
        if (inv.store_id === storeId) {
          return { ...inv, editing: true, tempQty: inv.qty };
        }
        return inv;
      });
      return updated;
    });
  };

  // Guardar edición de stock
  const saveStock = async (productId: string, storeId: string) => {
    const inventory = storeInventories[productId]?.find(inv => inv.store_id === storeId);
    if (!inventory || inventory.tempQty === undefined) return;

    const newQty = Math.max(0, Math.floor(inventory.tempQty));
    const oldQty = inventory.qty;

    try {
      const { error } = await (supabase as any).rpc('update_store_inventory', {
        p_product_id: productId,
        p_store_id: storeId,
        p_qty: newQty,
      });

      if (error) {
        throw error;
      }

      // Actualizar estado local de inmediato
      setStoreInventories(prev => {
        const updated = { ...prev };
        updated[productId] = updated[productId].map(inv => {
          if (inv.store_id === storeId) {
            return { ...inv, qty: newQty, editing: false, tempQty: undefined };
          }
          return inv;
        });
        return updated;
      });
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          const nextByStore = { ...(p.stockByStore || {}) };
          nextByStore[storeId] = newQty;
          const total = Object.values(nextByStore).reduce((s, q) => s + (q || 0), 0);
          return { ...p, stockByStore: nextByStore, total_stock: total };
        })
      );

      clearInventoryPageCache();
      invalidateInventoryCatalogMemory();
      void fetchData();

      toast({
        variant: "success",
        title: "Stock actualizado",
        description: `Stock actualizado a ${newQty} unidades`,
      });
    } catch (error: any) {
      console.error('Error updating stock:', error);
      setStoreInventories(prev => {
        const updated = { ...prev };
        updated[productId] = updated[productId].map(inv => {
          if (inv.store_id === storeId) {
            return { ...inv, qty: oldQty, editing: false, tempQty: undefined };
          }
          return inv;
        });
        return updated;
      });
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el stock",
        variant: "destructive",
      });
    }
  };

  // Cancelar edición
  const cancelEditStock = (productId: string, storeId: string) => {
    setStoreInventories(prev => {
      const updated = { ...prev };
      if (!updated[productId]) return prev;
      
      updated[productId] = updated[productId].map(inv => {
        if (inv.store_id === storeId) {
          return { ...inv, editing: false, tempQty: undefined };
        }
        return inv;
      });
      return updated;
    });
  };

  // Iniciar transferencia
  const startTransfer = (productId: string, fromStoreId: string) => {
    setTransferring(prev => ({
      ...prev,
      [productId]: { from: fromStoreId, to: '', qty: 0 },
    }));
  };

  // Eliminar producto
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
        variant: "success",
        title: "Producto desactivado",
        description: data?.note 
          ? `El producto "${deletingProduct.name}" ha sido desactivado. ${data.note}`
          : `El producto "${deletingProduct.name}" ha sido desactivado exitosamente. Ya no aparecerá en el POS, pero se mantiene en el historial.`,
      });

      // Cerrar modal y recargar datos
      setDeletingProduct(null);
      clearInventoryPageCache();
      invalidateInventoryCatalogMemory();
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

  // Ejecutar transferencia
  const executeTransfer = async (productId: string) => {
    const transfer = transferring[productId];
    if (!transfer || !transfer.to || transfer.qty <= 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos de la transferencia",
        variant: "destructive",
      });
      return;
    }

    // Obtener nombres de tiendas para la confirmación
    const fromStore = stores.find(s => s.id === transfer.from);
    const toStore = stores.find(s => s.id === transfer.to);
    const product = products.find(p => p.id === productId);

    // Confirmación antes de transferir
    const confirmed = window.confirm(
      `¿Confirmar transferencia?\n\n` +
      `Producto: ${product?.name || 'N/A'}\n` +
      `Desde: ${fromStore?.name || 'N/A'}\n` +
      `Hacia: ${toStore?.name || 'N/A'}\n` +
      `Cantidad: ${transfer.qty} unidades\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return; // Usuario canceló
    }

    // Prevenir múltiples clics - deshabilitar botón durante la transferencia
    if (transferring[productId]?.processing) {
      return; // Ya se está procesando
    }

    // Marcar como procesando
    setTransferring(prev => ({
      ...prev,
      [productId]: { ...prev[productId], processing: true },
    }));

    try {
      const { data, error } = await (supabase as any).rpc('transfer_inventory', {
        p_product_id: productId,
        p_from_store_id: transfer.from,
        p_to_store_id: transfer.to,
        p_quantity: transfer.qty,
        p_company_id: userProfile?.company_id,
        p_transferred_by: userProfile?.id,
      });

      if (error) {
        throw error;
      }

      // Verificar respuesta del backend
      if (data && data.error) {
        throw new Error(data.message || 'Error en la transferencia');
      }

      toast({
        title: "Transferencia exitosa",
        description: `Se transfirieron ${transfer.qty} unidades de ${fromStore?.name || ''} a ${toStore?.name || ''}`,
        variant: "success",
      });

      // Limpiar transferencia
      setTransferring(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });

      // Recargar datos
      clearInventoryPageCache();
      invalidateInventoryCatalogMemory();
      await fetchData();
    } catch (error: any) {
      console.error('Error transferring:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo realizar la transferencia",
        variant: "destructive",
      });
    } finally {
      // Asegurar que se limpie el estado de procesamiento
      setTransferring(prev => {
        const updated = { ...prev };
        if (updated[productId]) {
          delete updated[productId].processing;
        }
        return updated;
      });
    }
  };

  // ✅ OPTIMIZACIÓN: Memoización de filtros (solo recalcula cuando cambian las dependencias)
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // ✅ Usar debouncedSearchTerm en lugar de searchTerm
        const matchesSearch = product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          product.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          (product.barcode && product.barcode.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
        
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

        const matchesLowStock =
          !lowStockOnly || isGlobalNonNormalStock(product.total_stock || 0);

        return matchesSearch && matchesCategory && matchesLowStock;
      })
      .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.sale_price_usd - b.sale_price_usd;
          break;
        case 'stock':
          comparison = (a.total_stock || 0) - (b.total_stock || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [products, debouncedSearchTerm, categoryFilter, lowStockOnly, sortBy, sortOrder]);

  const isFilterPending = searchTerm !== debouncedSearchTerm;

  const paginationResetKey = `${debouncedSearchTerm}|${categoryFilter}|${lowStockOnly}|${sortBy}|${sortOrder}`;
  const {
    paginatedItems,
    currentPage,
    totalPages,
    totalCount: filteredCount,
    rangeStart,
    rangeEnd,
    setPage,
  } = useClientPagination(filteredProducts, 20, paginationResetKey);

  // Calcular valor total
  const getTotalValue = (product: Product) => {
    return (product.total_stock || 0) * product.sale_price_usd;
  };

  return (
    <div className="container mx-auto p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Almacén</h1>
          <p className="text-muted-foreground">Gestión unificada de productos e inventario</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowInventoryListDialog(true)}
            className="bg-primary-dark text-white hover:bg-primary-dark/90 w-full sm:w-auto"
          >
            <Package className="w-4 h-4 mr-2" />
            Lista de Inventario
          </Button>

          {/* 🛡️ SEGURIDAD: RLS maneja los permisos de creación */}
          {/* Si el usuario no tiene permiso, el botón puede estar visible pero la acción fallará en el backend */}
          <Button onClick={() => {
            setEditingProduct(null);
            setShowForm(true);
          }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <StoreFilterBar pageTitle="Almacén" />

      {/* Header del Dashboard de Inventario */}
      <InventoryDashboardHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
      />

      {/* Tabla de Productos */}
      {loading && products.length === 0 ? (
        <AlmacenTableSkeleton rows={12} />
      ) : (
      <>
      <ListPaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={filteredCount}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
      />
      <Card className={`glass-panel-dense transition-opacity duration-150 ${isFilterPending || isRefetching ? 'opacity-70' : ''}`}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full glass-table">
              <thead>
                <tr>
                  <th className="text-left py-4 px-4">SKU</th>
                  <th className="text-left py-4 px-4">Nombre</th>
                  <th className="text-left py-4 px-4">Categoría</th>
                  {canSeeCosts && (
                    <th className="text-right py-4 px-4">Costo</th>
                  )}
                  <th className="text-right py-4 px-4">Precio</th>
                  <th className="text-right py-4 px-4">Stock Total</th>
                  <th className="text-center py-4 px-4">Estado</th>
                  <th className="text-center py-4 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((product) => {
                  const isExpanded = expandedProducts.has(product.id);
                  const inventories = storeInventories[product.id] || [];
                  const transfer = transferring[product.id];

                  return (
                    <React.Fragment key={product.id}>
                      <tr>
                        <td className="py-4 px-4 font-mono text-sm text-white/90">{product.sku}</td>
                        <td className="py-4 px-4 font-medium text-white">{product.name}</td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className="text-emerald-300 font-semibold border-emerald-400/60 bg-emerald-500/10 brightness-125">
                            {getCategoryLabel(product.category)}
                          </Badge>
                        </td>
                        {canSeeCosts && (
                          <td className="py-4 px-4 text-right text-white/75">
                            ${product.cost_usd.toFixed(2)}
                          </td>
                        )}
                        <td className="py-4 px-4 text-right font-bold text-white">
                          ${product.sale_price_usd.toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={product.total_stock === 0 ? 'text-red-400 font-bold' : 'font-semibold text-white'}>
                            {product.total_stock || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge variant={product.active ? "default" : "secondary"}>
                            {product.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(product.id)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4 mr-1" />
                                  Ocultar
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 mr-1" />
                                  Inventario
                                </>
                              )}
                            </Button>
                            {/* 🛡️ SEGURIDAD: RLS maneja los permisos de edición/eliminación */}
                            {/* 🛡️ Conditional Rendering: Solo admins pueden editar/eliminar productos */}
                            {(userProfile?.role === 'master_admin' || userProfile?.role === 'admin') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setShowForm(true);
                                  }}
                                  title="Editar producto"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingProduct(product)}
                                  title="Eliminar producto"
                                  className="text-status-danger hover:text-status-danger/80 hover:bg-status-danger/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Acordeón Expandible */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={canSeeCosts ? 8 : 7} className="p-0">
                            <div className="glass-muted-dark p-6 border-t border-white/10">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Información del Producto */}
                                    <div className="space-y-4">
                                      <h3 className="text-xl font-bold text-white">{product.name}</h3>
                                      <div className="space-y-2">
                                        <p className="text-sm text-white/70">
                                          <span className="font-semibold text-white/90">Categoría:</span> {getCategoryLabel(product.category)}
                                        </p>
                                        <p className="text-sm text-white/70">
                                          <span className="font-semibold text-white/90">SKU:</span> {product.sku}
                                        </p>
                                        {product.barcode && (
                                          <p className="text-sm text-white/70">
                                            <span className="font-semibold text-white/90">Código de Barras:</span> {product.barcode}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Estadísticas */}
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm text-white/70">Stock Total</p>
                                          <p className="text-2xl font-bold text-white">{product.total_stock || 0}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-white/70">Tiendas</p>
                                          <p className="text-2xl font-bold text-white">{inventories.length}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-white/70">Precio USD</p>
                                          <p className="text-2xl font-bold text-white">${product.sale_price_usd.toFixed(2)}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-white/70">Valor Total USD</p>
                                          <p className="text-2xl font-bold text-emerald-300">
                                            ${getTotalValue(product).toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Stock por Tienda - Grid 2x2 */}
                                    <div className="md:col-span-2">
                                      <h4 className="font-semibold mb-4 flex items-center gap-2 text-white">
                                        <Store className="w-4 h-4 text-emerald-300 brightness-125" />
                                        Stock por Tienda
                                      </h4>
                                      <div className="grid grid-cols-2 gap-2">
                                        {inventories
                                          // 🛡️ SEGURIDAD: RLS ya filtró el inventario por store_id
                                          // No necesitamos filtrar manualmente en el frontend
                                          .map((inv) => {
                                            const isEditing = inv.editing;
                                            const isTransferring = transfer?.from === inv.store_id;
                                            // 🛡️ SEGURIDAD: RLS maneja los permisos de edición
                                            // Si el usuario intenta editar sin permiso, el backend rechazará la acción
                                            const isReadOnly = false; // RLS determinará si puede editar

                                          return (
                                            <div
                                              key={inv.store_id}
                                              className="flex items-center justify-between p-3 glass-muted-dark rounded-lg border border-emerald-500/20 shadow-lg"
                                            >
                                              <div className="flex-1">
                                                <p className="font-medium text-white">{inv.store_name}</p>
                                              </div>
                                              
                                              {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    value={inv.tempQty || 0}
                                                    onChange={(e) => {
                                                      setStoreInventories(prev => {
                                                        const updated = { ...prev };
                                                        updated[product.id] = updated[product.id].map(i => {
                                                          if (i.store_id === inv.store_id) {
                                                            return { ...i, tempQty: parseInt(e.target.value) || 0 };
                                                          }
                                                          return i;
                                                        });
                                                        return updated;
                                                      });
                                                    }}
                                                    className="w-24"
                                                  />
                                                  <Button
                                                    size="sm"
                                                    onClick={() => saveStock(product.id, inv.store_id)}
                                                  >
                                                    <Save className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => cancelEditStock(product.id, inv.store_id)}
                                                  >
                                                    <X className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              ) : isTransferring ? (
                                                <div className="flex items-center gap-2">
                                                  <Select
                                                    value={transfer.to}
                                                    onValueChange={(value) => {
                                                      setTransferring(prev => ({
                                                        ...prev,
                                                        [product.id]: { ...transfer, to: value },
                                                      }));
                                                    }}
                                                  >
                                                    <SelectTrigger className="w-40">
                                                      <SelectValue placeholder="A tienda..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      {stores
                                                        .filter(s => s.id !== transfer.from)
                                                        .map(store => (
                                                          <SelectItem key={store.id} value={store.id}>
                                                            {store.name}
                                                          </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                  </Select>
                                                  <Input
                                                    type="number"
                                                    min="1"
                                                    max={inv.qty}
                                                    value={transfer.qty}
                                                    onChange={(e) => {
                                                      setTransferring(prev => ({
                                                        ...prev,
                                                        [product.id]: { ...transfer, qty: parseInt(e.target.value) || 0 },
                                                      }));
                                                    }}
                                                    className="w-24"
                                                    placeholder="Cantidad"
                                                  />
                                                  <Button
                                                    size="sm"
                                                    onClick={() => executeTransfer(product.id)}
                                                    disabled={transferring[product.id]?.processing}
                                                  >
                                                    <ArrowRightLeft className="w-4 h-4" />
                                                    {transferring[product.id]?.processing && '...'}
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                      setTransferring(prev => {
                                                        const updated = { ...prev };
                                                        delete updated[product.id];
                                                        return updated;
                                                      });
                                                    }}
                                                  >
                                                    <X className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-2">
                                                  {inv.qty === 0 ? (
                                                    <Badge className="bg-red-500/20 text-red-300 border border-red-500/50 text-xs px-2 py-0 font-bold">
                                                      SIN STOCK
                                                    </Badge>
                                                  ) : (
                                                    <span className="font-semibold text-white">{inv.qty}</span>
                                                  )}
                                                  {/* 🛡️ SEGURIDAD: RLS maneja los permisos de edición/transferencia */}
                                                  {/* Si el usuario no tiene permiso, las acciones fallarán en el backend */}
                                                  {!isReadOnly && (
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => startEditStock(product.id, inv.store_id)}
                                                    >
                                                      <Edit className="w-4 h-4" />
                                                    </Button>
                                                  )}
                                                  {/* TRANSFERENCIA: RLS determinará si el usuario puede transferir */}
                                                  {inv.qty > 0 && !isReadOnly && (
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => startTransfer(product.id, inv.store_id)}
                                                      title="Transferir stock a otra sucursal"
                                                    >
                                                      <ArrowRightLeft className="w-4 h-4" />
                                                    </Button>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {paginatedItems.length === 0 && filteredCount === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron productos</p>
            </div>
          )}
        </CardContent>
      </Card>
      <ListPaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={filteredCount}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
        className="border-t border-white/10"
      />
      </>
      )}

      {/* Dialog: Lista de Inventario */}
      <Dialog open={showInventoryListDialog} onOpenChange={setShowInventoryListDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lista de Inventario</DialogTitle>
            <DialogDescription>
              PDF básico para conteo: Nombre, Stock Total y Precio del sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={inventoryListCategory} onValueChange={setInventoryListCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInventoryListDialog(false)}
              disabled={generatingInventoryList}
            >
              Cancelar
            </Button>
            <Button
              className="bg-primary-dark text-white hover:bg-primary-dark/90"
              disabled={generatingInventoryList || products.length === 0}
              onClick={async () => {
                setGeneratingInventoryList(true);
                try {
                  const items = products
                    .filter((p) => inventoryListCategory === 'all' || p.category === inventoryListCategory)
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((p) => ({
                      name: p.name,
                      category: p.category ?? null,
                      total_stock: p.total_stock || 0,
                      sale_price_usd: p.sale_price_usd,
                    }));

                  await downloadInventoryListPDF({
                    items,
                    category: inventoryListCategory,
                  });

                  setShowInventoryListDialog(false);
                  toast({
                    title: "PDF generado",
                    description: "Se descargó la lista de inventario.",
                    variant: "success",
                  });
                } catch (e: any) {
                  toast({
                    title: "Error",
                    description: e?.message || "No se pudo generar el PDF.",
                    variant: "destructive",
                  });
                } finally {
                  setGeneratingInventoryList(false);
                }
              }}
            >
              {generatingInventoryList ? "Generando..." : "Generar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Producto */}
      {showForm && (
        <ProductForm
          product={editingProduct || undefined}
          stores={stores}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            clearInventoryPageCache();
            invalidateInventoryCatalogMemory();
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

