import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  business_name: string | null;
  tax_id: string | null;
  fiscal_address: string | null;
  phone_fiscal: string | null;
  email_fiscal: string | null;
  active: boolean;
}

interface StoreFormProps {
  store?: Store | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const StoreForm: React.FC<StoreFormProps> = ({
  store,
  onClose,
  onSuccess,
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    business_name: '',
    tax_id: '',
    fiscal_address: '',
    phone_fiscal: '',
    email_fiscal: '',
    active: true,
  });

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name,
        address: store.address || '',
        phone: store.phone || '',
        business_name: store.business_name || '',
        tax_id: store.tax_id || '',
        fiscal_address: store.fiscal_address || '',
        phone_fiscal: store.phone_fiscal || '',
        email_fiscal: store.email_fiscal || '',
        active: store.active,
      });
    }
  }, [store]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la tienda es requerido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const storeData = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        business_name: formData.business_name.trim() || null,
        tax_id: formData.tax_id.trim() || null,
        fiscal_address: formData.fiscal_address.trim() || null,
        phone_fiscal: formData.phone_fiscal.trim() || null,
        email_fiscal: formData.email_fiscal.trim() || null,
        active: formData.active,
      };

      if (store) {
        // Update existing store
        const { error } = await supabase
          .from('stores')
          .update(storeData)
          .eq('id', store.id);

        if (error) {
          console.error('Error updating store:', error);
          toast({
            title: "Error",
            description: "No se pudo actualizar la tienda",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Create new store
        const { error } = await supabase
          .from('stores')
          .insert([storeData]);

        if (error) {
          console.error('Error creating store:', error);
          toast({
            title: "Error",
            description: "No se pudo crear la tienda",
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

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {store ? 'Editar Tienda' : 'Nueva Tienda'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nombre de la tienda"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Dirección completa de la tienda"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Número de teléfono"
              type="tel"
            />
          </div>

          {/* Información Fiscal */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Información Fiscal</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Razón Social</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => handleInputChange('business_name', e.target.value)}
                  placeholder="Razón social de la tienda"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_id">RIF</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  placeholder="Ej: J-12345678-9"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="fiscal_address">Dirección Fiscal</Label>
              <Textarea
                id="fiscal_address"
                value={formData.fiscal_address}
                onChange={(e) => handleInputChange('fiscal_address', e.target.value)}
                placeholder="Dirección fiscal completa"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="phone_fiscal">Teléfono Fiscal</Label>
                <Input
                  id="phone_fiscal"
                  value={formData.phone_fiscal}
                  onChange={(e) => handleInputChange('phone_fiscal', e.target.value)}
                  placeholder="Teléfono fiscal"
                  type="tel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_fiscal">Email Fiscal</Label>
                <Input
                  id="email_fiscal"
                  value={formData.email_fiscal}
                  onChange={(e) => handleInputChange('email_fiscal', e.target.value)}
                  placeholder="Email fiscal"
                  type="email"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => handleInputChange('active', checked)}
            />
            <Label htmlFor="active">Tienda activa</Label>
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
              {loading ? 'Guardando...' : (store ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
