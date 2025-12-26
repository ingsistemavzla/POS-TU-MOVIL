import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, MapPin, Phone } from 'lucide-react';
import { StoreForm } from '@/components/pos/StoreForm';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
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
  created_at: string;
}

export const StoresPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);

  const fetchStores = async () => {
    try {
      if (!userProfile?.company_id) {
        console.log('No company_id found for user');
        setStores([]);
        setLoading(false);
        return;
      }

      // OPTIMIZADO: Select Minimal para lista de tiendas
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, business_name, tax_id, fiscal_address, phone_fiscal, email_fiscal, active, created_at')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stores:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las tiendas",
          variant: "destructive",
        });
        return;
      }

      setStores(data || []);
    } catch (error) {
      console.error('Error in fetchStores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchStores();
    }
  }, [userProfile?.company_id]);

  const handleCreateStore = () => {
    setEditingStore(null);
    setShowForm(true);
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingStore(null);
  };

  const handleFormSuccess = () => {
    fetchStores();
    handleFormClose();
    toast({
      title: "Éxito",
      description: editingStore ? "Tienda actualizada correctamente" : "Tienda creada correctamente",
    });
  };

  const handleDeleteStore = async () => {
    if (!deletingStore) return;

    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', deletingStore.id);

      if (error) {
        console.error('Error deleting store:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar la tienda",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: "Tienda eliminada correctamente",
      });

      fetchStores();
    } catch (error) {
      console.error('Error in handleDeleteStore:', error);
    } finally {
      setDeletingStore(null);
    }
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (store.address && store.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando tiendas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Tiendas</h1>
          <p className="text-muted-foreground">
            Administra las tiendas de tu empresa
          </p>
        </div>
        {userProfile?.role === 'admin' && (
          <Button onClick={handleCreateStore} className="hidden">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Tienda
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tiendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredStores.map((store) => (
          <Card key={store.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{store.name}</CardTitle>
                <Badge variant={store.active ? "default" : "secondary"}>
                  {store.active ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {store.address && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  {store.address}
                </div>
              )}
              {store.phone && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="mr-2 h-4 w-4" />
                  {store.phone}
                </div>
              )}
              {store.business_name && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Razón Social:</span> {store.business_name}
                </div>
              )}
              {store.tax_id && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">RIF:</span> {store.tax_id}
                </div>
              )}
              
              {userProfile?.role === 'admin' && (
                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditStore(store)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingStore(store)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStores.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchTerm ? 'No se encontraron tiendas que coincidan con la búsqueda' : 'No hay tiendas registradas'}
          </div>
          {!searchTerm && userProfile?.role === 'admin' && (
            <Button className="mt-4" onClick={handleCreateStore}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Primera Tienda
            </Button>
          )}
        </div>
      )}

      {showForm && (
        <StoreForm
          store={editingStore}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      <DeleteConfirmDialog
        open={!!deletingStore}
        onOpenChange={() => setDeletingStore(null)}
        onConfirm={handleDeleteStore}
        title="Eliminar Tienda"
        description={`¿Estás seguro de que deseas eliminar la tienda "${deletingStore?.name}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
};
