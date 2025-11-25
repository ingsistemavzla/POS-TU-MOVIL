import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem } from '@/types/inventory';

interface InventoryStats {
  totalValue: number;
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  criticalStock: number;
  averageStock: number;
  totalStores: number;
}

interface InventoryContextType {
  inventory: InventoryItem[];
  stats: InventoryStats;
  loading: boolean;
  error: string | null;
  fetchInventory: () => Promise<void>;
  updateInventoryItem: (id: string, newQty: number) => void;
  refreshStats: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

interface InventoryProviderProps {
  children: ReactNode;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  const { userProfile } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalValue: 0,
    totalProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    criticalStock: 0,
    averageStock: 0,
    totalStores: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateStats = (inventoryData: InventoryItem[]) => {
    const totalProducts = inventoryData.length;
    let totalValue = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let criticalStock = 0;
    let totalStock = 0;

    inventoryData.forEach(item => {
      // Validar que el item tenga la estructura esperada
      if (!item || typeof item.qty !== 'number' || typeof item.min_qty !== 'number') {
        console.warn('Item de inventario inválido para estadísticas:', item);
        return;
      }

      const qty = Math.max(0, item.qty || 0);
      const minQty = Math.max(0, item.min_qty || 0);
      const price = Math.max(0, item.product?.sale_price_usd || 0);

      // Valor total del inventario
      totalValue += qty * price;
      totalStock += qty;

      // Productos sin stock (incluir todos los productos con qty = 0)
      if (qty === 0) {
        outOfStock++;
      }

      // Por ahora no usamos stock mínimo para calcular lowStock/criticalStock.
      // Mantenemos los contadores en 0 hasta que se reactive esta funcionalidad.
    });

    const averageStock = totalProducts > 0 ? Math.round(totalStock / totalProducts) : 0;

    return {
      totalValue: Math.round(totalValue * 100) / 100, // Redondear a 2 decimales
      totalProducts,
      outOfStock,
      lowStock,
      criticalStock,
      averageStock,
      totalStores: 0 // Se actualizará cuando se obtengan las tiendas
    };
  };

  const fetchInventory = async () => {
    try {
      if (!userProfile?.company_id) {
        setInventory([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Obtener inventario con validación de datos
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventories')
        .select(`
          id,
          qty,
          min_qty,
          product_id,
          store_id,
          company_id,
          created_at,
          updated_at,
          product:products(id, name, sku, category, sale_price_usd),
          store:stores(id, name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('qty', { ascending: true })
        .limit(50);

      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
        throw new Error(`Error al obtener datos del inventario: ${inventoryError.message}`);
      }

      // Normalizar y filtrar datos del inventario
      // - Asegurar que min_qty siempre sea número (fallback a 0 si viene null)
      // - Mantener solo registros con producto y tienda válidos
      const validInventoryItems = (inventoryData || [])
        .map(item => ({
          ...item,
          min_qty: typeof item.min_qty === 'number' ? item.min_qty : 0,
        }))
        .filter(item => {
          return item && 
                 item.product && 
                 item.store && 
                 typeof item.qty === 'number';
        });

      // CRÍTICO: Sanitizar datos de inventario (corregir valores negativos)
      // Importar función de validación
      const { sanitizeInventoryData } = await import('@/utils/inventoryValidation');
      const sanitizedItems = sanitizeInventoryData(validInventoryItems);
      
      // Detectar y alertar sobre stock negativo (solo una vez)
      const negativeItems = sanitizedItems.filter((item: any) => item._wasNegative);
      if (negativeItems.length > 0 && userProfile?.role === 'admin') {
        console.warn(`⚠️ ALERTA: Se detectaron ${negativeItems.length} registro(s) con stock negativo en el inventario`);
        // El componente NegativeStockAlert mostrará la alerta globalmente
      }

      // Obtener número de tiendas
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('company_id', userProfile.company_id)
        .eq('active', true);

      if (storesError) {
        console.error('Error fetching stores:', storesError);
        // No lanzar error aquí, solo logear
      }

      setInventory(sanitizedItems);

      // Calcular estadísticas usando items sanitizados
      const calculatedStats = calculateStats(sanitizedItems);
      setStats({
        ...calculatedStats,
        totalStores: storesData?.length || 0
      });

    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setInventory([]); // Limpiar inventario en caso de error
    } finally {
      setLoading(false);
    }
  };

  const updateInventoryItem = (id: string, newQty: number) => {
    // CRÍTICO: Validar que newQty no sea negativo
    const safeQty = Math.max(0, newQty || 0);
    
    if (newQty < 0) {
      console.warn(`⚠️ Intento de actualizar inventario a valor negativo: ${newQty}. Se ha corregido a 0.`);
    }
    
    setInventory(prevInventory => {
      const updatedInventory = prevInventory.map(item => 
        item.id === id ? { ...item, qty: safeQty } : item
      );
      
      // Recalcular estadísticas automáticamente
      const newStats = calculateStats(updatedInventory);
      setStats(prevStats => ({
        ...newStats,
        totalStores: prevStats.totalStores
      }));
      
      return updatedInventory;
    });
  };

  const refreshStats = () => {
    const newStats = calculateStats(inventory);
    setStats(prevStats => ({
      ...newStats,
      totalStores: prevStats.totalStores
    }));
  };

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchInventory();
    }
  }, [userProfile?.company_id]);

  const value: InventoryContextType = {
    inventory,
    stats,
    loading,
    error,
    fetchInventory,
    updateInventoryItem,
    refreshStats
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
