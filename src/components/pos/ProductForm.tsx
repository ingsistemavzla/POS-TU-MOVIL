import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { validateStockQuantity, validateInventoryUpdate, fixNegativeStock } from '@/utils/inventoryValidation';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  cost_usd: number;
  sale_price_usd: number;
  active: boolean;
}

interface Store {
  id: string;
  name: string;
}

interface StoreInventory {
  store_id: string;
  qty: number;
  min_qty: number;
}

import { PRODUCT_CATEGORIES } from '@/constants/categories';

interface ProductFormProps {
  product?: Product | null;
  stores: Store[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  product,
  stores,
  onClose,
  onSuccess,
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: '',
    cost_usd: 0,
    sale_price_usd: 0,
    active: true,
  });
  const [storeInventories, setStoreInventories] = useState<StoreInventory[]>([]);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        barcode: product.barcode || '',
        name: product.name,
        category: product.category || '',
        cost_usd: product.cost_usd,
        sale_price_usd: product.sale_price_usd,
        active: product.active,
      });
      
      // Load existing inventories for editing
      fetchProductInventories(product.id);
      
      // CRÍTICO: Validar stock negativo después de cargar inventario
      setTimeout(() => {
        const negativeStock = storeInventories.find(inv => inv.qty < 0);
        if (negativeStock) {
          const store = stores.find(s => s.id === negativeStock.store_id);
          toast({
            title: "⚠️ ALERTA: Stock Negativo Detectado",
            description: `El stock en ${store?.name || 'tienda desconocida'} es negativo (${negativeStock.qty}). Se mostrará como 0 hasta corregir.`,
            variant: "destructive",
            duration: 10000,
          });
        }
      }, 500);
    } else {
      // Initialize store inventories for new product
      setStoreInventories(stores.map(store => ({
        store_id: store.id,
        qty: 0,
        min_qty: 5,
      })));
    }
  }, [product, stores]);

  const fetchProductInventories = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select('store_id, qty, min_qty')
        .eq('product_id', productId);

      if (error) {
        console.error('Error fetching inventories:', error);
        return;
      }

      const inventoryMap = new Map(data.map(inv => [inv.store_id, inv]));
      
      // CRÍTICO: Corregir y detectar stock negativo al cargar
      const inventoriesWithFix = stores.map(store => {
        const inv = inventoryMap.get(store.id);
        const rawQty = inv?.qty || 0;
        
        // Corregir si es negativo
        if (rawQty < 0) {
          const fix = fixNegativeStock(rawQty);
          if (fix.wasNegative) {
            toast({
              title: "⚠️ Stock Negativo Corregido",
              description: `El stock en ${store.name} era negativo (${rawQty}). Se ha mostrado como 0.`,
              variant: "destructive",
              duration: 8000,
            });
          }
          return {
            store_id: store.id,
            qty: fix.correctedQty,
            min_qty: inv?.min_qty || 5,
            _wasNegative: true,
            _originalQty: rawQty
          };
        }
        
        return {
          store_id: store.id,
          qty: rawQty,
          min_qty: inv?.min_qty || 5,
        };
      });
      
      setStoreInventories(inventoriesWithFix);
    } catch (error) {
      console.error('Error in fetchProductInventories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.sku.trim()) {
      toast({
        title: "Error",
        description: "El nombre y SKU del producto son requeridos",
        variant: "destructive",
      });
      return;
    }

    if (formData.cost_usd <= 0 || formData.sale_price_usd <= 0) {
      toast({
        title: "Error",
        description: "El costo y precio de venta deben ser mayores a 0",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (product) {
        // Update existing product
        const { error: productError } = await supabase
          .from('products')
          .update({
            sku: formData.sku.trim(),
            barcode: formData.barcode.trim() || null,
            name: formData.name.trim(),
            category: formData.category.trim() || null,
            cost_usd: formData.cost_usd,
            sale_price_usd: formData.sale_price_usd,
            active: formData.active,
          })
          .eq('id', product.id);

        if (productError) {
          console.error('Error updating product:', productError);
          toast({
            title: "Error",
            description: "No se pudo actualizar el producto",
            variant: "destructive",
          });
          return;
        }

        // Update inventories
        for (const inventory of storeInventories) {
          const { error } = await (supabase as any).rpc('update_store_inventory', {
            p_product_id: product.id,
            p_store_id: inventory.store_id,
            p_qty: inventory.qty,
            p_min_qty: inventory.min_qty,
          });

          if (error) {
            console.error('Error updating inventory:', error);
          }
        }
      } else {
        // Create new product with inventories
        const { data: result, error } = await (supabase as any).rpc('create_product_with_inventory', {
          p_sku: formData.sku.trim(),
          p_barcode: formData.barcode.trim() || null,
          p_name: formData.name.trim(),
          p_category: formData.category.trim() || null,
          p_cost_usd: formData.cost_usd,
          p_sale_price_usd: formData.sale_price_usd,
          p_store_inventories: storeInventories,
        });

        if (error) {
          console.error('Error creating product:', error);
          // Mensaje de error más descriptivo
          let errorMessage = "No se pudo crear el producto";
          if (error.message?.includes('permission') || error.message?.includes('INSUFFICIENT_PERMISSIONS')) {
            errorMessage = "Solo los administradores pueden crear productos";
          } else if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
            errorMessage = `El SKU "${formData.sku}" ya existe. Por favor usa otro SKU.`;
          } else if (error.message) {
            errorMessage = error.message;
          }
          toast({
            title: "Error al crear producto",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        if (result && typeof result === 'object' && 'error' in result && result.error) {
          console.error('Error from RPC result:', result);
          let errorMessage = "No se pudo crear el producto";
          if (result.message) {
            errorMessage = result.message;
          } else if (result.code === 'INSUFFICIENT_PERMISSIONS') {
            errorMessage = "Solo los administradores pueden crear productos";
          }
          toast({
            title: "Error al crear producto",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        // Verificar que el resultado sea válido
        if (!result || (typeof result === 'object' && 'error' in result)) {
          toast({
            title: "Error",
            description: "La función de creación no retornó un resultado válido. Verifica que la función SQL existe en Supabase.",
            variant: "destructive",
          });
          return;
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleInventoryChange = (storeId: string, field: 'qty' | 'min_qty', value: number) => {
    // CRÍTICO: Validar que qty nunca sea negativo usando utilidades de validación
    const validation = validateStockQuantity(value, field === 'qty' ? 'Cantidad' : 'Stock Mínimo');
    
    if (!validation.isValid) {
      // Mostrar alerta si intentan ingresar valor negativo
      toast({
        title: "⚠️ Valor Inválido",
        description: validation.error || `No se puede ingresar un valor negativo para ${field === 'qty' ? 'cantidad' : 'stock mínimo'}.`,
        variant: "destructive",
      });
      
      // Usar el valor sugerido (0) o el valor actual si no hay sugerencia
      const safeValue = validation.suggestedQty ?? 0;
      setStoreInventories(prev => prev.map(inv => 
        inv.store_id === storeId 
          ? { ...inv, [field]: safeValue }
          : inv
      ));
      return;
    }
    
    // Si es válido, actualizar normalmente
    setStoreInventories(prev => prev.map(inv => 
      inv.store_id === storeId 
        ? { ...inv, [field]: value }
        : inv
    ));
  };

  const calculateMargin = () => {
    if (formData.cost_usd <= 0) return 0;
    return ((formData.sale_price_usd - formData.cost_usd) / formData.cost_usd * 100);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="Código del producto"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                placeholder="Código de barras"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nombre del producto"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_usd">Costo (USD) *</Label>
              <Input
                id="cost_usd"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_usd}
                onChange={(e) => handleInputChange('cost_usd', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale_price_usd">Precio Venta (USD) *</Label>
              <Input
                id="sale_price_usd"
                type="number"
                step="0.01"
                min="0"
                value={formData.sale_price_usd}
                onChange={(e) => handleInputChange('sale_price_usd', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {formData.cost_usd > 0 && (
            <div className="text-sm text-muted-foreground">
              Margen de ganancia: <span className="font-medium">{calculateMargin().toFixed(1)}%</span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => handleInputChange('active', checked)}
            />
            <Label htmlFor="active">Producto activo</Label>
          </div>

          {stores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inventario por Tienda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {storeInventories.map((inventory) => {
                  const store = stores.find(s => s.id === inventory.store_id);
                  if (!store) return null;

                  return (
                    <div key={store.id} className="grid grid-cols-3 gap-4 items-center">
                      <div className="font-medium">{store.name}</div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          min="0"
                          value={Math.max(0, inventory.qty)} // Asegurar que nunca muestre negativo
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            handleInventoryChange(store.id, 'qty', Math.max(0, val)); // Validar antes de actualizar
                          }}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Stock Mínimo</Label>
                        <Input
                          type="number"
                          min="0"
                          value={inventory.min_qty}
                          onChange={(e) => handleInventoryChange(
                            store.id, 
                            'min_qty', 
                            parseInt(e.target.value) || 0
                          )}
                          className="h-8"
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (product ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
