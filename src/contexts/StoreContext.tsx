import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  availableStores: Store[];
  setSelectedStore: (store: Store | null) => void;
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
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar tiendas disponibles según el rol del usuario
  useEffect(() => {
    const loadStores = async () => {
      if (!userProfile || !company) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let stores: Store[] = [];

        if (userProfile.role === 'cashier') {
          // Los cajeros solo ven su tienda asignada
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
          // Administradores y gerentes ven todas las tiendas
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

        // Establecer tienda por defecto
        if (stores.length > 0) {
          // Si es admin y no hay tienda seleccionada, usar la primera
          if (userProfile.role === 'admin' && !selectedStore) {
            setSelectedStoreState(stores[0]);
          }
          // Si es cajero, usar su tienda asignada
          else if (userProfile.role === 'cashier' && stores.length > 0) {
            setSelectedStoreState(stores[0]);
          }
          // Si hay una tienda seleccionada previamente que aún existe, mantenerla
          else if (selectedStore && stores.some(s => s.id === selectedStore.id)) {
            // La tienda ya está seleccionada, no hacer nada
          }
        }

      } catch (err) {
        console.error('Error loading stores:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar las tiendas');
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, [userProfile, company]);

  const setSelectedStore = (store: Store | null) => {
    setSelectedStoreState(store);
  };

  const contextValue: StoreContextType = {
    selectedStore,
    availableStores,
    setSelectedStore,
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
