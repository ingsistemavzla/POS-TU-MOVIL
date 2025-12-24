import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { sanitizeInventoryData } from '@/utils/inventoryValidation';
import { InventoryFinancialHeader } from '@/components/inventory/InventoryFinancialHeader';
import { BranchStockMatrix } from '@/components/inventory/BranchStockMatrix';
import { InventoryDashboardHeader } from '@/components/inventory/InventoryDashboardHeader';

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [storeInventories, setStoreInventories] = useState<Record<string, StoreInventory[]>>({});
  const [transferring, setTransferring] = useState<Record<string, { from: string; to: string; qty: number; processing?: boolean }>>({});
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Cargar productos e inventario
  const fetchData = async () => {
    try {
      if (!userProfile?.company_id) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Cargar productos (sin JOIN a vista que puede no existir)
      // ⚠️ FILTRO CRÍTICO: Solo productos activos para evitar contar stock de productos eliminados
      // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
      const { data: productsData, error: productsError } = await (supabase.from('products') as any)
        .select('id, sku, barcode, name, category, cost_usd, sale_price_usd, tax_rate, active, created_at')
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

      // 🛡️ SEGURIDAD: RLS maneja el filtrado automáticamente
      // El backend solo retorna stores que el usuario tiene permiso de ver
      // Cargar tiendas
      const storesQuery = (supabase.from('stores') as any)
        .select('id, name')
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .eq('active', true)
        .order('name');

      const { data: storesData, error: storesError } = await storesQuery;

      if (storesError) {
        console.error('Error fetching stores:', storesError);
        console.error('Stores error details:', {
          message: storesError.message,
          code: storesError.code,
          details: storesError.details,
          hint: storesError.hint
        });
        toast({
          title: "Advertencia",
          description: "No se pudieron cargar las tiendas",
          variant: "warning",
        });
        setStores([]);
      } else {
        setStores(storesData || []);
      }

      // Cargar inventario
      // ⚠️ FILTRO CRÍTICO: JOIN con products para filtrar solo productos activos
      // 🛡️ SEGURIDAD: RLS maneja el filtrado automáticamente por store_id y company_id
      const inventoryQuery = (supabase.from('inventories') as any)
        .select('product_id, store_id, qty, products!inner(active)')
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .eq('products.active', true);  // ⚠️ Solo inventario de productos activos

      const { data: inventoryData, error: inventoryError } = await inventoryQuery;

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

      // Asegurar que todos los productos tengan inventario para todas las tiendas
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

      // Combinar datos - total_stock calculado sumando todas las tiendas
        // 🛡️ SEGURIDAD: RLS ya filtró el inventario por store_id
        // Calculamos total_stock sumando todas las tiendas visibles (ya filtradas por RLS)
        const productsWithStock = (productsData || []).map((product: any) => {
          const stockByStore = stockByProductStore.get(product.id) || {};
          
          // Sumar todas las tiendas visibles (RLS ya filtró por store_id)
          const totalStock = Object.values(stockByStore).reduce((sum, qty) => sum + (qty || 0), 0);
          
          return {
            ...product,
            total_stock: totalStock,
            stockByStore: stockByStore,
          };
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
  }, [userProfile?.company_id]);

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
            return { ...inv, qty: newQty, editing: false, tempQty: undefined };
          }
          return inv;
        });
        return updated;
      });

      // Recargar datos desde el backend para obtener total_stock actualizado
      await fetchData();

      toast({
        variant: "success",
        title: "Stock actualizado",
        description: `Stock actualizado a ${newQty} unidades`,
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

  // Filtrar y ordenar productos
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      
      // Filtro por tienda (basado en inventario)
      const matchesStore = storeFilter === 'all' || 
        (storeInventories[product.id]?.some(inv => inv.store_id === storeFilter && inv.qty > 0));
      
      // Filtro de stock bajo
      const matchesLowStock = !lowStockOnly || (product.total_stock || 0) < 5;
      
      return matchesSearch && matchesCategory && matchesStore && matchesLowStock;
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

  // Calcular valor total
  const getTotalValue = (product: Product) => {
    return (product.total_stock || 0) * product.sale_price_usd;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-md h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando almacén...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Almacén</h1>
          <p className="text-muted-foreground">Gestión unificada de productos e inventario</p>
        </div>
        {/* 🛡️ SEGURIDAD: RLS maneja los permisos de creación */}
        {/* Si el usuario no tiene permiso, el botón puede estar visible pero la acción fallará en el backend */}
        <Button onClick={() => {
          setEditingProduct(null);
          setShowForm(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Header del Dashboard de Inventario */}
      <InventoryDashboardHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
      />

      {/* Tabla de Productos */}
      <Card className="glass-panel-dense">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full glass-table">
              <thead>
                <tr>
                  <th className="text-left py-4 px-4">SKU</th>
                  <th className="text-left py-4 px-4">Nombre</th>
                  <th className="text-left py-4 px-4">Categoría</th>
                  <th className="text-right py-4 px-4">Costo</th>
                  <th className="text-right py-4 px-4">Precio</th>
                  <th className="text-right py-4 px-4">Stock Total</th>
                  <th className="text-center py-4 px-4">Estado</th>
                  <th className="text-center py-4 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
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
                        <td className="py-4 px-4 text-right text-white/75">
                          ${product.cost_usd.toFixed(2)}
                        </td>
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
                          <td colSpan={8} className="p-0">
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

                                    {/* Stock por Tienda */}
                                    <div className="md:col-span-2">
                                      <h4 className="font-semibold mb-4 flex items-center gap-2 text-white">
                                        <Store className="w-4 h-4 text-emerald-300 brightness-125" />
                                        Stock por Tienda
                                      </h4>
                                      <div className="space-y-2">
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

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron productos</p>
            </div>
          )}
        </CardContent>
      </Card>

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

