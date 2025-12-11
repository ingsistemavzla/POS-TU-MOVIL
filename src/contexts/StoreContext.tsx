import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Store {
  id: string;
  name: string;
  business_name?: string;
  tax_id?: string;
  fiscal_address?: string;
  phone_fiscal?: string;
  email_fiscal?: string;
}

interface StoreContextType {
  selectedStore: Store | null;
  selectedStoreId: string | null;
  availableStores: Store[];
  setSelectedStore: (store: Store | null) => void;
  setSelectedStoreId: (id: string | null) => void;
  loading: boolean;
  error: string | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const { userProfile, company } = useAuth();
  const [selectedStore, setSelectedStoreState] = useState<Store | null>(null);
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  // Cargar tiendas disponibles según el rol del usuario
  useEffect(() => {
    const loadStores = async () => {
      if (!userProfile || !company) {
        setLoading(false);
        setSelectedStoreState(null);
        setSelectedStoreIdState(null);
        return;
      }

      // Detectar si cambió el usuario
      const userIdChanged = previousUserIdRef.current !== userProfile.id;
      if (userIdChanged) {
        previousUserIdRef.current = userProfile.id;
      }

      try {
        setLoading(true);
        setError(null);

        let stores: Store[] = [];

        if (userProfile.role === 'cashier' || userProfile.role === 'manager') {
          // Los cajeros y gerentes solo ven su tienda asignada
          if (userProfile.assigned_store_id) {
            const { data: store, error: storeError } = await supabase
              .from('stores')
              .select('id, name, business_name, tax_id, fiscal_address, phone_fiscal, email_fiscal')
              .eq('id', userProfile.assigned_store_id)
              .eq('active', true)
              .single();

            if (storeError) throw storeError;
            stores = store ? [store] : [];
          }
        } else {
          // Solo administradores ven todas las tiendas
          const { data: allStores, error: allStoresError } = await supabase
            .from('stores')
            .select('id, name, business_name, tax_id, fiscal_address, phone_fiscal, email_fiscal')
            .eq('company_id', company.id)
            .eq('active', true)
            .order('name');

          if (allStoresError) throw allStoresError;
          stores = allStores || [];
        }

        setAvailableStores(stores);

        // Establecer tienda por defecto (solo si cambió el usuario)
        // Usar función de actualización para leer el valor actual de selectedStoreId
        if (stores.length > 0 && userIdChanged) {
          // Si es cajero o gerente, usar su tienda asignada automáticamente
          if ((userProfile.role === 'cashier' || userProfile.role === 'manager') && userProfile.assigned_store_id) {
            const assignedStore = stores.find(s => s.id === userProfile.assigned_store_id);
            if (assignedStore) {
              setSelectedStoreState(assignedStore);
              setSelectedStoreIdState(assignedStore.id);
            }
          }
          // Si es admin, usar 'all' por defecto (ver todas las sucursales)
          else if (userProfile.role === 'admin') {
            setSelectedStoreIdState('all');
            setSelectedStoreState(null); // null cuando es 'all'
          }
        } else if (stores.length === 0) {
          // No hay tiendas disponibles, resetear todo
          setSelectedStoreState(null);
          setSelectedStoreIdState(null);
        }
        
        // La sincronización entre selectedStore y selectedStoreId se maneja
        // automáticamente en las funciones setSelectedStore y setSelectedStoreId

      } catch (err) {
        console.error('Error loading stores:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar las tiendas');
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, [userProfile, company]);

  // Inicializar selectedStoreId si no está establecido pero hay tiendas disponibles
  useEffect(() => {
    if (!selectedStoreId && availableStores.length > 0 && userProfile) {
      // Si es cajero o gerente, usar su tienda asignada
      if ((userProfile.role === 'cashier' || userProfile.role === 'manager') && userProfile.assigned_store_id) {
        const assignedStore = availableStores.find(s => s.id === userProfile.assigned_store_id);
        if (assignedStore) {
          setSelectedStoreState(assignedStore);
          setSelectedStoreIdState(assignedStore.id);
        }
      }
      // Si es admin, usar 'all' por defecto
      else if (userProfile.role === 'admin') {
        setSelectedStoreIdState('all');
        setSelectedStoreState(null);
      }
    }
  }, [availableStores, selectedStoreId, userProfile]);

  // Sincronizar selectedStore con selectedStoreId
  const setSelectedStore = (store: Store | null) => {
    setSelectedStoreState(store);
    // Sincronizar el ID: si store es null, usar 'all' para admins, null para otros
    if (store === null) {
      if (userProfile?.role === 'admin') {
        setSelectedStoreIdState('all');
      } else {
        setSelectedStoreIdState(null);
      }
    } else {
      setSelectedStoreIdState(store.id);
    }
  };

  // Sincronizar selectedStoreId con selectedStore
  const setSelectedStoreId = (id: string | null) => {
    setSelectedStoreIdState(id);
    
    // Sincronizar el objeto Store
    if (id === null || id === 'all') {
      setSelectedStoreState(null);
    } else {
      // Buscar el objeto Store correspondiente
      const store = availableStores.find(s => s.id === id);
      if (store) {
        setSelectedStoreState(store);
      } else {
        // Si no se encuentra, mantener null pero guardar el ID
        setSelectedStoreState(null);
      }
    }
  };

  const contextValue: StoreContextType = {
    selectedStore,
    selectedStoreId,
    availableStores,
    setSelectedStore,
    setSelectedStoreId,
    loading,
    error
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
