import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRightLeft, Package, AlertTriangle } from 'lucide-react';
import { validateSufficientStock, fixNegativeStock, safeInventoryUpdate } from '@/utils/inventoryValidation';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    sku: string;
    currentStore: {
      id: string;
      name: string;
      qty: number;
    };
  } | null;
  onTransferComplete: () => void;
}

interface Store {
  id: string;
  name: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  product,
  onTransferComplete,
}) => {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [customQuantity, setCustomQuantity] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedStoreId('');
      setQuantity('');
      setCustomQuantity('');
      // CRÍTICO: Obtener todas las tiendas disponibles cuando se abre el modal,
      // independientemente de los filtros aplicados en la página
      fetchStores();
    }
  }, [isOpen, product?.currentStore.id]); // También refrescar si el producto cambia

  // Reset quantity when stock changes
  useEffect(() => {
    if (product && quantity) {
      const maxStock = product.currentStore.qty || 0;
      const qtyNum = parseInt(quantity);
      if (!isNaN(qtyNum) && (qtyNum < 1 || qtyNum > maxStock)) {
        setQuantity('');
      }
    }
  }, [product?.currentStore.qty]);

  const fetchStores = async () => {
    if (!userProfile?.company_id) {
      console.warn('TransferModal: No company_id available');
      return;
    }

    setLoadingStores(true);
    try {
      // CRÍTICO: Obtener TODAS las tiendas activas de la empresa,
      // independientemente de los filtros aplicados en InventoryPage
      const { data, error } = await (supabase as any)
        .from('stores')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error fetching stores in TransferModal:', error);
        throw error;
      }

      // Filter out the current store (si existe)
      const currentStoreId = product?.currentStore?.id;
      const filteredStores = (data || []).filter(
        (store: Store) => store.id !== currentStoreId
      );
      
      console.log('TransferModal: Tiendas disponibles para transferencia:', {
        totalTiendas: data?.length || 0,
        tiendaActual: currentStoreId,
        tiendasDisponibles: filteredStores.length,
        tiendas: filteredStores.map((s: Store) => s.name)
      });
      
      setStores(filteredStores);
      
      // Si no hay tiendas disponibles, mostrar advertencia
      if (filteredStores.length === 0) {
        toast({
          title: "Sin tiendas disponibles",
          description: currentStoreId 
            ? "Ya estás en la única tienda activa" 
            : "No hay tiendas activas disponibles para transferencia",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error('Error fetching stores in TransferModal:', error);
      toast({
        title: "Error al cargar tiendas",
        description: error?.message || "No se pudieron cargar las tiendas disponibles",
        variant: "destructive",
      });
      setStores([]); // Asegurar que stores esté vacío en caso de error
    } finally {
      setLoadingStores(false);
    }
  };

  const handleTransferAll = async () => {
    if (!product || !selectedStoreId || !userProfile?.company_id || !userProfile?.id) {
      toast({
        title: "Datos incompletos",
        description: "Por favor selecciona una tienda de destino",
        variant: "destructive",
      });
      return;
    }

    const maxStock = product.currentStore.qty || 0;
    
    if (maxStock === 0) {
      toast({
        title: "Sin stock disponible",
        description: "No hay unidades disponibles para transferir",
        variant: "destructive",
      });
      return;
    }

    // Automáticamente usar todo el stock disponible
    setQuantity(maxStock.toString());
    await handleTransferWithQty(maxStock);
  };

  const handleTransferWithQty = async (transferQty?: number) => {
    const qtyToTransfer = transferQty || parseInt(quantity);
    
    if (!product || !selectedStoreId || (!transferQty && !quantity) || !userProfile?.company_id || !userProfile?.id) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    const maxStock = product.currentStore.qty || 0;

    // Validación estricta: debe ser un número válido
    if (isNaN(qtyToTransfer) || qtyToTransfer <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad debe ser un número mayor a 0",
        variant: "destructive",
      });
      return;
    }

    // Validación estricta: mínimo 1 unidad
    if (qtyToTransfer < 1) {
      toast({
        title: "Cantidad mínima",
        description: "Debes transferir al menos 1 unidad",
        variant: "destructive",
      });
      return;
    }

    // Validación estricta: máximo stock disponible (PERMITIR transferir TODO el stock, incluso quedando en 0)
    if (qtyToTransfer > maxStock) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${maxStock} unidades disponibles. No puedes transferir ${qtyToTransfer} unidades.`,
        variant: "destructive",
      });
      if (!transferQty) setQuantity('');
      return;
    }

    // Validación adicional: asegurar que haya stock disponible
    if (maxStock === 0) {
      toast({
        title: "Sin stock disponible",
        description: "No hay unidades disponibles para transferir",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get destination store name
      const destinationStore = stores.find(s => s.id === selectedStoreId);
      if (!destinationStore) {
        throw new Error('Tienda de destino no encontrada');
      }

      // PASO 1: Validar IDs antes de hacer query
      // CRÍTICO: Validar que product.id y store.id sean UUIDs válidos
      if (!product.id || product.id === 'undefined' || typeof product.id !== 'string' || product.id.trim() === '') {
        console.error('TransferModal: product.id inválido', { 
          product, 
          productId: product.id,
          type: typeof product.id 
        });
        throw new Error(`ID de producto inválido. Por favor, recarga la página e intenta nuevamente.`);
      }

      if (!product.currentStore.id || product.currentStore.id === 'undefined' || typeof product.currentStore.id !== 'string' || product.currentStore.id.trim() === '') {
        console.error('TransferModal: store.id inválido', { 
          product, 
          storeId: product.currentStore.id,
          type: typeof product.currentStore.id 
        });
        throw new Error(`ID de tienda inválido. Por favor, recarga la página e intenta nuevamente.`);
      }

      // Validar formato UUID básico (36 caracteres con guiones)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(product.id)) {
        console.error('TransferModal: product.id no es un UUID válido', { productId: product.id });
        throw new Error(`ID de producto no válido: ${product.id}. Por favor, recarga la página e intenta nuevamente.`);
      }

      if (!uuidRegex.test(product.currentStore.id)) {
        console.error('TransferModal: store.id no es un UUID válido', { storeId: product.currentStore.id });
        throw new Error(`ID de tienda no válido: ${product.currentStore.id}. Por favor, recarga la página e intenta nuevamente.`);
      }

      // PASO 2: Obtener inventario de origen
      // CRÍTICO: Buscar directamente en Supabase, independientemente de filtros aplicados
      console.log('TransferModal: Buscando inventario de origen', {
        product_id: product.id,
        store_id: product.currentStore.id,
        company_id: userProfile.company_id,
        product_name: product.name,
        store_name: product.currentStore.name
      });

      const { data: fromInventoryData, error: fromError } = await supabase
        .from('inventories')
        .select('id, qty, product_id, store_id')
        .eq('product_id', product.id)
        .eq('store_id', product.currentStore.id)
        .eq('company_id', userProfile.company_id)
        .maybeSingle(); // Usar maybeSingle en lugar de single para evitar error si no existe

      if (fromError) {
        console.error('TransferModal: Error buscando inventario de origen', {
          error: fromError,
          product_id: product.id,
          store_id: product.currentStore.id,
          company_id: userProfile.company_id
        });
        throw new Error(`Error al buscar inventario: ${fromError.message}. Por favor, intenta nuevamente.`);
      }

      if (!fromInventoryData) {
        // Si no existe, intentar crear el inventario o dar mensaje claro
        console.warn('TransferModal: No se encontró inventario en la tienda de origen', {
          product_id: product.id,
          store_id: product.currentStore.id,
          store_name: product.currentStore.name,
          product_name: product.name
        });
        throw new Error(`No se encontró inventario en ${product.currentStore.name} para ${product.name}. Verifica que el producto tenga stock registrado en esa tienda.`);
      }

      const fromInventory = fromInventoryData;

      // CRÍTICO: Validar y corregir stock negativo si existe
      const stockFix = fixNegativeStock(fromInventory.qty);
      if (stockFix.wasNegative) {
        // Mostrar alerta crítica
        toast({
          title: "⚠️ ALERTA CRÍTICA: Stock Negativo Detectado",
          description: `El stock en ${product.currentStore.name} es negativo (${fromInventory.qty}). Se ha mostrado como 0. Por favor, contacta al administrador para corregir esta inconsistencia.`,
          variant: "destructive",
          duration: 10000, // Mostrar por más tiempo
        });
        throw new Error(`Stock negativo detectado: ${fromInventory.qty}. No se puede transferir hasta que se corrija este problema.`);
      }

      // PASO 2: Validar stock suficiente con validación robusta (PERMITIR transferir TODO, incluso quedando en 0)
      // Si se está transfiriendo todo el stock disponible, permitirlo sin advertencias
      if (qtyToTransfer < fromInventory.qty) {
        const stockValidation = validateSufficientStock(fromInventory.qty, qtyToTransfer, 'transfer');
        if (!stockValidation.isValid) {
          if (stockValidation.warning) {
            toast({
              title: "⚠️ Advertencia",
              description: stockValidation.warning,
              variant: "destructive",
            });
          }
          throw new Error(stockValidation.error || 'Stock insuficiente');
        }
      }

      // PASO 3: Obtener o crear inventario de destino
      let toInventoryId: string;
      const { data: toInventory, error: toFetchError } = await supabase
        .from('inventories')
        .select('id, qty')
        .eq('product_id', product.id)
        .eq('store_id', selectedStoreId)
        .eq('company_id', userProfile.company_id)
        .maybeSingle();

      if (toFetchError && toFetchError.code !== 'PGRST116') {
        throw new Error(`Error al verificar inventario destino: ${toFetchError.message}`);
      }

      if (!toInventory) {
        // Crear inventario destino si no existe
        const { data: newInventory, error: createError } = await supabase
          .from('inventories')
          .insert({
            product_id: product.id,
            store_id: selectedStoreId,
            company_id: userProfile.company_id,
            qty: 0,
            min_qty: 0
          })
          .select('id')
          .single();

        if (createError || !newInventory) {
          throw new Error(`Error al crear inventario en destino: ${createError?.message || 'Error desconocido'}`);
        }
        toInventoryId = newInventory.id;
      } else {
        toInventoryId = toInventory.id;
      }

      // PASO 4: Actualizar inventario origen (restar)
      // PERMITIR transferir TODO el stock (quedando en 0) - NO es error, es válido
      const newFromQty = Math.max(0, fromInventory.qty - qtyToTransfer);
      
      // Validación final: nunca permitir valores negativos
      if (newFromQty < 0) {
        toast({
          title: "⚠️ BLOQUEADO: Stock Negativo",
          description: `Esta transferencia resultaría en stock negativo (${newFromQty}). Máximo permitido: ${fromInventory.qty} unidades.`,
          variant: "destructive",
          duration: 8000,
        });
        throw new Error(`Operación bloqueada: resultado sería ${newFromQty} (negativo). Stock disponible: ${fromInventory.qty}`);
      }

      // Si se está transfiriendo todo el stock, usar validación que permita llegar a 0
      const { error: updateFromError } = await supabase
        .from('inventories')
        .update({
          qty: newFromQty, // Puede ser 0 si se transfiere todo el stock
          updated_at: new Date().toISOString()
        })
        .eq('id', fromInventory.id)
        .gte('qty', qtyToTransfer); // Validación: solo actualizar si hay suficiente stock (o igual, permitiendo transferir todo)

      if (updateFromError) {
        // Si la actualización falla por falta de stock, dar mensaje claro
        if (updateFromError.code === 'PGRST116' || updateFromError.message?.includes('0 rows')) {
          toast({
            title: "⚠️ Error de Validación",
            description: `La actualización fue bloqueada. Stock disponible: ${fromInventory.qty}, Solicitado: ${qtyToTransfer}`,
            variant: "destructive",
          });
          throw new Error(`Stock insuficiente. Disponible: ${fromInventory.qty}, Solicitado: ${qtyToTransfer}`);
        }
        throw new Error(`Error al actualizar inventario origen: ${updateFromError.message}`);
      }

      // PASO 5: Actualizar inventario destino (sumar)
      const currentToQty = toInventory?.qty || 0;
      const { error: updateToError } = await supabase
        .from('inventories')
        .update({
          qty: currentToQty + qtyToTransfer,
          updated_at: new Date().toISOString()
        })
        .eq('id', toInventoryId);

      if (updateToError) {
        // Intentar revertir el cambio en origen si falla destino
        await supabase
          .from('inventories')
          .update({
            qty: fromInventory.qty,
            updated_at: new Date().toISOString()
          })
          .eq('id', fromInventory.id);
        
        throw new Error(`Error al actualizar inventario destino: ${updateToError.message}`);
      }

      // PASO 6: Crear registro de transferencia (opcional, no crítico si falla)
      try {
        await supabase
          .from('inventory_transfers')
          .insert({
            product_id: product.id,
            from_store_id: product.currentStore.id,
            to_store_id: selectedStoreId,
            quantity: qtyToTransfer,
            company_id: userProfile.company_id,
            transferred_by: userProfile.id,
            status: 'completed'
          });
      } catch (transferRecordError) {
        // No es crítico si falla el registro, solo lo registramos
        console.warn('No se pudo crear registro de transferencia (no crítico):', transferRecordError);
      }

      const transferMessage = qtyToTransfer === maxStock 
        ? `Se transfirió TODO el stock (${qtyToTransfer} unidades) de ${product.name} a ${destinationStore.name}. ${product.currentStore.name} quedó sin stock.`
        : `Se transfirieron ${qtyToTransfer} unidades de ${product.name} a ${destinationStore.name}`;

      toast({
        title: "Transferencia exitosa",
        description: transferMessage,
      });

      onTransferComplete();
      onClose();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast({
        title: "Error en transferencia",
        description: error?.message || 'No se pudo completar la transferencia',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    await handleTransferWithQty();
  };

  const maxQuantity = product?.currentStore.qty || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="w-5 h-5" />
            Transferir Mercancía
          </DialogTitle>
          <DialogDescription className="text-sm">
            Transfiere inventario entre tiendas de tu empresa
          </DialogDescription>
        </DialogHeader>

        {product && (
          <div className="space-y-4 px-1">
            {/* Product Info */}
            <div className="p-3 bg-muted rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium text-sm truncate">{product.name}</span>
              </div>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="truncate">SKU: {product.sku}</div>
                <div className="truncate">Tienda actual: {product.currentStore.name}</div>
                <div className="flex items-center gap-1 pt-1">
                  <span>Stock disponible:</span>
                  <span className={`font-semibold ${maxQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {maxQuantity} unidades
                  </span>
                </div>
              </div>
            </div>

            {/* Transfer Form */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="destination-store" className="text-sm font-medium">
                  Tienda de destino
                </Label>
                <Select 
                  value={selectedStoreId} 
                  onValueChange={setSelectedStoreId}
                  disabled={loadingStores || stores.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={
                      loadingStores 
                        ? "Cargando tiendas..." 
                        : stores.length === 0
                        ? "No hay tiendas disponibles"
                        : "Selecciona una tienda"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingStores ? (
                      <SelectItem value="loading" disabled>
                        Cargando tiendas disponibles...
                      </SelectItem>
                    ) : stores.length === 0 ? (
                      <>
                        <SelectItem value="no-stores" disabled>
                          No hay tiendas disponibles para transferencia
                        </SelectItem>
                        {product?.currentStore?.id && (
                          <SelectItem value="info" disabled className="text-xs text-muted-foreground">
                            Ya estás en la única tienda activa
                          </SelectItem>
                        )}
                      </>
                    ) : (
                      stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {stores.length > 0 && !loadingStores && (
                  <p className="text-xs text-muted-foreground px-1">
                    {stores.length} {stores.length === 1 ? 'tienda disponible' : 'tiendas disponibles'} para transferencia
                  </p>
                )}
                {stores.length === 0 && !loadingStores && product?.currentStore?.id && (
                  <p className="text-xs text-orange-600 px-1">
                    ⚠️ No puedes transferir a otra tienda porque ya estás en la única tienda activa
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium">
                  Cantidad a transferir
                </Label>
                
                {/* Select con opción de escribir directamente */}
                <div className="relative">
                  <Select
                    value={quantity}
                    onValueChange={(value) => {
                      const numValue = parseInt(value);
                      const maxStock = product.currentStore.qty || 0;
                      if (!isNaN(numValue) && numValue >= 1 && numValue <= maxStock) {
                        setQuantity(value);
                        setCustomQuantity('');
                      }
                    }}
                    disabled={maxQuantity === 0 || !selectedStoreId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={
                        !selectedStoreId 
                          ? "Primero selecciona una tienda"
                          : maxQuantity === 0
                          ? "Sin stock disponible"
                          : `Selecciona o escribe cantidad (1 - ${maxQuantity})`
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {maxQuantity === 0 ? (
                        <SelectItem value="0" disabled>
                          Sin stock disponible
                        </SelectItem>
                      ) : (
                        <>
                          {/* Opción para escribir cantidad personalizada */}
                          <div 
                            className="px-2 py-1.5 border-b"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Input
                              type="number"
                              min="1"
                              max={maxQuantity}
                              placeholder={`Escribe (1-${maxQuantity})`}
                              value={customQuantity}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || value === '0') {
                                  setCustomQuantity('');
                                  setQuantity('');
                                  return;
                                }
                                const numValue = parseInt(value);
                                const maxStock = product.currentStore.qty || 0;
                                
                                if (!isNaN(numValue)) {
                                  if (numValue < 1) {
                                    setCustomQuantity('1');
                                    setQuantity('1');
                                  } else if (numValue > maxStock) {
                                    setCustomQuantity(maxStock.toString());
                                    setQuantity(maxStock.toString());
                                    toast({
                                      title: "Máximo permitido",
                                      description: `Solo hay ${maxStock} unidades disponibles`,
                                      variant: "destructive",
                                      duration: 2000,
                                    });
                                  } else {
                                    setCustomQuantity(value);
                                    setQuantity(value);
                                  }
                                } else {
                                  setCustomQuantity('');
                                  setQuantity('');
                                }
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  e.preventDefault();
                                  // No cerrar el select al presionar Enter
                                }
                              }}
                              className="h-8 text-sm"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              autoFocus
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Escribe la cantidad y selecciona de la lista
                            </p>
                          </div>
                          
                          {/* Opciones predefinidas */}
                          {Array.from({ length: Math.min(maxQuantity, 50) }, (_, i) => {
                            const value = i + 1;
                            return (
                              <SelectItem key={value} value={value.toString()}>
                                {value} {value === 1 ? 'unidad' : 'unidades'}
                              </SelectItem>
                            );
                          })}
                          
                          {/* Opción "TODO el stock" */}
                          {maxQuantity > 50 && (
                            <SelectItem value={maxQuantity.toString()}>
                              {maxQuantity} unidades (TODO el stock)
                            </SelectItem>
                          )}
                          {maxQuantity <= 50 && maxQuantity > 0 && (
                            <SelectItem value={maxQuantity.toString()}>
                              TODO el stock ({maxQuantity} unidades)
                            </SelectItem>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {maxQuantity > 0 && !quantity && (
                  <p className="text-xs text-muted-foreground px-1">
                    Stock disponible: <span className="font-medium text-green-600">{maxQuantity}</span> unidades
                  </p>
                )}

                {maxQuantity === 0 && (
                  <div className="flex items-center gap-2 text-xs text-red-600 px-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>No hay stock disponible para transferir</span>
                  </div>
                )}

                {quantity && maxQuantity > 0 && (() => {
                  const qtyNum = parseInt(quantity);
                  const maxStock = product.currentStore.qty || 0;
                  const remaining = maxStock - qtyNum;
                  
                  if (!isNaN(qtyNum) && qtyNum >= 1 && qtyNum <= maxStock) {
                    return (
                      <div className={`text-xs px-1 ${remaining === 0 ? 'text-orange-600 font-medium' : 'text-blue-600'}`}>
                        {remaining === 0 ? (
                          <>⚠️ Se transferirá TODO el stock. {product.currentStore.name} quedará sin inventario (0 unidades)</>
                        ) : (
                          <>Después de transferir quedarán <span className="font-medium">{remaining}</span> unidades en {product.currentStore.name}</>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading} 
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          
          {/* Mostrar solo "Transferir Todo" si no hay cantidad seleccionada */}
          {!quantity && (
            <Button 
              onClick={handleTransferAll} 
              disabled={
                loading || 
                !selectedStoreId || 
                maxQuantity === 0
              }
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              title={`Transferir todo el stock disponible (${maxQuantity} unidades)`}
            >
              {loading ? 'Transfiriendo...' : `Transferir Todo (${maxQuantity} unidades)`}
            </Button>
          )}
          
          {/* Mostrar solo "Transferir" si hay cantidad seleccionada */}
          {quantity && (
            <Button 
              onClick={handleTransfer} 
              disabled={
                loading || 
                !selectedStoreId || 
                maxQuantity === 0 ||
                (() => {
                  const qtyNum = parseInt(quantity);
                  return isNaN(qtyNum) || qtyNum < 1 || qtyNum > maxQuantity;
                })()
              }
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              {loading ? 'Transfiriendo...' : 'Transferir'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
