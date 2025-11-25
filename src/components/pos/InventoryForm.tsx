import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/contexts/InventoryContext';
import { useAuth } from '@/contexts/AuthContext';

interface InventoryItem {
  id: string;
  product_id: string;
  store_id: string;
  qty: number;
  min_qty: number;
  product: {
    name: string;
    sku: string;
  };
  store: {
    name: string;
  };
}

interface InventoryFormProps {
  inventory: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const InventoryForm: React.FC<InventoryFormProps> = ({
  inventory,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { updateInventoryItem } = useInventory();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    qty: inventory.qty,
    // Desactivar por ahora la lógica de stock mínimo: fijar en 0 y no permitir edición
    min_qty: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar datos de entrada
    if (!inventory.product_id || !inventory.store_id) {
      toast({
        title: "Error",
        description: "Faltan datos del producto o tienda",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.qty < 0 || formData.min_qty < 0) {
      toast({
        title: "Error",
        description: "Las cantidades no pueden ser negativas",
        variant: "destructive",
      });
      return;
    }

    if (!userProfile?.company_id) {
      toast({
        title: "Error",
        description: "No se pudo identificar la empresa",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Unificar lógica: usar siempre la RPC 'update_store_inventory'
      // para que el backend maneje insert/update (evitar claves duplicadas)
      const result = await (supabase as any).rpc('update_store_inventory', {
        p_min_qty: formData.min_qty,
        p_product_id: inventory.product_id,
        p_qty: formData.qty,
        p_store_id: inventory.store_id,
      });

      if (result.error) {
        console.error('Error updating/creating inventory:', result.error);
        toast({
          title: "Error",
          description: result.error.message || (inventory.id 
            ? "No se pudo actualizar el inventario" 
            : "No se pudo crear el inventario"),
          variant: "destructive",
        });
        return;
      }

      // Actualizar el inventario en el contexto inmediatamente (solo si ya existía)
      if (inventory.id) {
        updateInventoryItem(inventory.id, formData.qty);
      }
      
      // Llamar onSuccess para que se recargue todo el inventario
      onSuccess();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: Math.max(0, value),
    }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Editar Inventario
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              <div><strong>Producto:</strong> {inventory.product.name}</div>
              <div><strong>SKU:</strong> {inventory.product.sku}</div>
              <div><strong>Tienda:</strong> {inventory.store.name}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Cantidad en Stock</Label>
              <Input
                id="qty"
                type="number"
                min="0"
                value={formData.qty}
                onChange={(e) => handleInputChange('qty', parseInt(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_qty">Stock Mínimo</Label>
              <Input
                id="min_qty"
                type="number"
                min="0"
                value={formData.min_qty}
                disabled
                readOnly
              />
              <p className="text-xs text-muted-foreground">
                El stock mínimo está desactivado temporalmente. Este valor no afecta las alertas.
              </p>
            </div>

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
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
