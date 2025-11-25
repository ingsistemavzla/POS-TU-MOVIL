import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRightLeft, Package, Calendar, User, Store } from 'lucide-react';

interface TransferHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TransferRecord {
  id: string;
  product_name: string;
  product_sku: string;
  from_store_name: string;
  to_store_name: string;
  quantity: number;
  transferred_by_name: string;
  status: string;
  created_at: string;
}

export const TransferHistory: React.FC<TransferHistoryProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTransferHistory();
    }
  }, [isOpen]);

  const fetchTransferHistory = async () => {
    if (!userProfile?.company_id) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('inventory_transfers')
        .select(`
          id,
          quantity,
          status,
          created_at,
          products!inner(name, sku),
          from_store:stores!inventory_transfers_from_store_id_fkey(name),
          to_store:stores!inventory_transfers_to_store_id_fkey(name),
          transferred_by:users!inventory_transfers_transferred_by_fkey(name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedTransfers = (data || []).map((transfer: any) => ({
        id: transfer.id,
        product_name: transfer.products?.name || 'Producto N/A',
        product_sku: transfer.products?.sku || 'N/A',
        from_store_name: transfer.from_store?.name || 'Tienda N/A',
        to_store_name: transfer.to_store?.name || 'Tienda N/A',
        quantity: transfer.quantity,
        transferred_by_name: transfer.transferred_by?.name || 'Usuario N/A',
        status: transfer.status,
        created_at: transfer.created_at,
      }));

      setTransfers(formattedTransfers);
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de transferencias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Historial de Transferencias
          </DialogTitle>
          <DialogDescription>
            Registro de todas las transferencias de inventario entre tiendas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Cargando historial...</p>
              </div>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay transferencias registradas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transfers.map((transfer) => (
                <Card key={transfer.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{transfer.product_name}</span>
                        <span className="text-sm text-muted-foreground">
                          (SKU: {transfer.product_sku})
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          <span>{transfer.from_store_name}</span>
                        </div>
                        <ArrowRightLeft className="w-3 h-3" />
                        <div className="flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          <span>{transfer.to_store_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground">
                            {transfer.quantity} unidades
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>por {transfer.transferred_by_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(transfer.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {getStatusBadge(transfer.status)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
