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

  return (
    <div className="w-full bg-green-600 text-white rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5" />
          <span className="font-semibold text-lg">
            Información {pageTitle} para:
          </span>
        </div>
        <div className="flex-1 max-w-xs">
          <Select 
            value={selectedStoreId || 'all'} 
            onValueChange={(value) => setSelectedStoreId(value === 'all' ? 'all' : value)}
          >
            <SelectTrigger className="bg-white text-gray-900 border-white hover:bg-gray-50 focus:ring-2 focus:ring-white">
              <SelectValue placeholder="Todas las sucursales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {availableStores.map(store => (
                <SelectItem key={store.id} value={store.id}>
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



