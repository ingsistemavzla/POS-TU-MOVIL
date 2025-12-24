import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/contexts/StoreContext';
import { Store } from 'lucide-react';

interface StoreFilterBarProps {
  pageTitle: string;
}

export const StoreFilterBar: React.FC<StoreFilterBarProps> = ({ pageTitle }) => {
  const { selectedStoreId, setSelectedStoreId, availableStores } = useStore();
  const selectedStore = availableStores.find(store => store.id === selectedStoreId);
  const isAllSelected = !selectedStoreId || selectedStoreId === 'all';
  const isStoreSelected = selectedStoreId && selectedStoreId !== 'all';

  return (
    <div className="w-full glass-panel text-white rounded-xl p-4 shadow-lg border border-emerald-500/30">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-emerald-400 brightness-125" />
          <span className="font-semibold text-lg">
            Información {pageTitle} para:
          </span>
          {isAllSelected && (
            <span className="font-bold text-lg text-emerald-300 brightness-125 border-l-2 border-emerald-400/60 pl-3">
              Todas las sucursales
            </span>
          )}
          {isStoreSelected && selectedStore && (
            <span className="font-bold text-lg text-emerald-300 brightness-125 border-l-2 border-emerald-400/60 pl-3">
              {selectedStore.name}
            </span>
          )}
        </div>
        <div className="flex-1 max-w-xs">
          <Select 
            value={selectedStoreId || 'all'} 
            onValueChange={(value) => setSelectedStoreId(value === 'all' ? 'all' : value)}
          >
            <SelectTrigger className={`glass-input border-white/20 text-emerald-300 border-emerald-400/50`}>
              <SelectValue placeholder="Todas las sucursales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                value="all"
                className={isAllSelected ? 'text-emerald-300 font-semibold bg-emerald-500/10' : ''}
              >
                Todas las sucursales
              </SelectItem>
              {availableStores.map(store => (
                <SelectItem 
                  key={store.id} 
                  value={store.id}
                  className={selectedStoreId === store.id ? 'text-emerald-300 font-semibold bg-emerald-500/10' : ''}
                >
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};



