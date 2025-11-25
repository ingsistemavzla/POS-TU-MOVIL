import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, X, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: any) => void;
}

export function AdvancedFiltersModal({ isOpen, onClose, onApplyFilters }: AdvancedFiltersModalProps) {
  const [filters, setFilters] = useState({
    dateRange: {
      from: null as Date | null,
      to: null as Date | null
    },
    stores: [] as string[],
    cashiers: [] as string[],
    minAmount: '',
    maxAmount: '',
    paymentMethods: [] as string[],
    categories: [] as string[],
    performance: {
      min: '',
      max: ''
    }
  });

  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCashiers, setSelectedCashiers] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const mockStores = [
    { id: '1', name: 'Tienda Principal' },
    { id: '2', name: 'Sucursal Centro' },
    { id: '3', name: 'Sucursal Norte' }
  ];

  const mockCashiers = [
    { id: '1', name: 'María González' },
    { id: '2', name: 'Carlos Rodríguez' },
    { id: '3', name: 'Ana Martínez' }
  ];

  const paymentMethods = [
    { id: 'cash', name: 'Efectivo' },
    { id: 'card', name: 'Tarjeta' },
    { id: 'transfer', name: 'Transferencia' },
    { id: 'crypto', name: 'Criptomonedas' }
  ];

  const categories = [
    { id: 'electronics', name: 'Electrónicos' },
    { id: 'clothing', name: 'Ropa' },
    { id: 'food', name: 'Alimentos' },
    { id: 'services', name: 'Servicios' }
  ];

  const handleApplyFilters = () => {
    const appliedFilters = {
      ...filters,
      stores: selectedStores,
      cashiers: selectedCashiers,
      paymentMethods: selectedPaymentMethods,
      categories: selectedCategories
    };
    onApplyFilters(appliedFilters);
    onClose();
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: { from: null, to: null },
      stores: [],
      cashiers: [],
      minAmount: '',
      maxAmount: '',
      paymentMethods: [],
      categories: [],
      performance: { min: '', max: '' }
    });
    setSelectedStores([]);
    setSelectedCashiers([]);
    setSelectedPaymentMethods([]);
    setSelectedCategories([]);
  };

  const toggleStore = (storeId: string) => {
    setSelectedStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const toggleCashier = (cashierId: string) => {
    setSelectedCashiers(prev => 
      prev.includes(cashierId) 
        ? prev.filter(id => id !== cashierId)
        : [...prev, cashierId]
    );
  };

  const togglePaymentMethod = (methodId: string) => {
    setSelectedPaymentMethods(prev => 
      prev.includes(methodId) 
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-primary" />
              <span>Filtros Avanzados</span>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={handleResetFilters}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Rango de Fechas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (
                        format(filters.dateRange.from, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from}
                      onSelect={(date) => setFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, from: date } 
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.to ? (
                        format(filters.dateRange.to, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to}
                      onSelect={(date) => setFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, to: date } 
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </Card>

          {/* Amount Range */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Rango de Montos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto Mínimo (USD)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={filters.minAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Monto Máximo (USD)</Label>
                <Input
                  type="number"
                  placeholder="1000.00"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                />
              </div>
            </div>
          </Card>

          {/* Stores */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Tiendas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mockStores.map((store) => (
                <div key={store.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`store-${store.id}`}
                    checked={selectedStores.includes(store.id)}
                    onCheckedChange={() => toggleStore(store.id)}
                  />
                  <Label htmlFor={`store-${store.id}`} className="text-sm font-normal">
                    {store.name}
                  </Label>
                </div>
              ))}
            </div>
          </Card>

          {/* Cashiers */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Cajeros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mockCashiers.map((cashier) => (
                <div key={cashier.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cashier-${cashier.id}`}
                    checked={selectedCashiers.includes(cashier.id)}
                    onCheckedChange={() => toggleCashier(cashier.id)}
                  />
                  <Label htmlFor={`cashier-${cashier.id}`} className="text-sm font-normal">
                    {cashier.name}
                  </Label>
                </div>
              ))}
            </div>
          </Card>

          {/* Payment Methods */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Métodos de Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`payment-${method.id}`}
                    checked={selectedPaymentMethods.includes(method.id)}
                    onCheckedChange={() => togglePaymentMethod(method.id)}
                  />
                  <Label htmlFor={`payment-${method.id}`} className="text-sm font-normal">
                    {method.name}
                  </Label>
                </div>
              ))}
            </div>
          </Card>

          {/* Categories */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Categorías de Productos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <Label htmlFor={`category-${category.id}`} className="text-sm font-normal">
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </Card>

          {/* Performance Range */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Rango de Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Performance Mínima (%)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  max="100"
                  value={filters.performance.min}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    performance: { ...prev.performance, min: e.target.value } 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Performance Máxima (%)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  min="0"
                  max="100"
                  value={filters.performance.max}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    performance: { ...prev.performance, max: e.target.value } 
                  }))}
                />
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleApplyFilters} className="bg-gradient-primary glow-primary">
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
