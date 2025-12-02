import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  User,
  ShoppingCart,
  CreditCard,
  Search,
  Scan,
  Plus,
  Minus,
  Trash2,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Package,
  X,
  AlertTriangle,
  Smartphone,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CustomerSelector from "./CustomerSelector";

// Interfaces
interface Store {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  id_number?: string;
}

interface Product {
  id: string;
  name: string;
  sale_price_usd?: number;
  sku: string;
  barcode?: string;
  category?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  sku: string;
  barcode?: string;
  category?: string;
  imei?: string;
  imeis?: string[];
  maxStock: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: any;
}

interface POSWizardModalProps {
  isOpen: boolean;
  availableStores: Store[];
  storeLoading: boolean;
  bcvRate: number;
  onComplete: (data: WizardCompleteData) => void;
  onCancel?: () => void;
}

interface WizardCompleteData {
  store: Store;
  customer: Customer;
  cart: CartItem[];
  paymentMethod: string;
  isKreceEnabled: boolean;
  kreceInitialAmount: number;
  isCasheaEnabled: boolean;
  casheaInitialAmount: number;
  isMixedPayment: boolean;
  mixedPayments: { method: string; amount: number }[];
}

// Payment methods definition
const paymentMethods: PaymentMethod[] = [
  { id: 'efectivo_usd', name: 'Efectivo USD', icon: Package },
  { id: 'efectivo_bs', name: 'Efectivo Bs', icon: Package },
  { id: 'zelle', name: 'Zelle', icon: CreditCard },
  { id: 'pago_movil', name: 'Pago Móvil', icon: CreditCard },
  { id: 'punto_venta', name: 'Punto de Venta', icon: CreditCard },
  { id: 'transferencia', name: 'Transferencia', icon: CreditCard },
];

// Step indicator component
const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const steps = [
    { num: 1, label: 'Tienda', icon: Store },
    { num: 2, label: 'Cliente', icon: User },
    { num: 3, label: 'Productos', icon: ShoppingCart },
    { num: 4, label: 'Pago', icon: CreditCard },
  ];

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4 bg-muted/30 rounded-lg mb-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.num;
        const isCompleted = currentStep > step.num;
        
        return (
          <React.Fragment key={step.num}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              isActive 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : isCompleted 
                  ? 'bg-green-500/20 text-green-600' 
                  : 'bg-muted text-muted-foreground'
            }`}>
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className={`w-4 h-4 ${isCompleted ? 'text-green-500' : 'text-muted-foreground'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const POSWizardModal: React.FC<POSWizardModalProps> = ({
  isOpen,
  availableStores,
  storeLoading,
  bcvRate,
  onComplete,
  onCancel,
}) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Confirmación de abandono
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Store
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  
  // Step 2: Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Step 2: Customer - nuevo flujo
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [customerSearchStatus, setCustomerSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not-found'>('idle');
  const [showRegistrationStep, setShowRegistrationStep] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Step 3: Products/Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productStock, setProductStock] = useState<Record<string, number>>({});
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<number | null>(null);
  
  // Step 4: Payment
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [isKreceEnabled, setIsKreceEnabled] = useState(false);
  const [kreceInitialAmount, setKreceInitialAmount] = useState(0);
  const [isCasheaEnabled, setIsCasheaEnabled] = useState(false);
  const [casheaInitialAmount, setCasheaInitialAmount] = useState(0);
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [mixedPayments, setMixedPayments] = useState<{ method: string; amount: number }[]>([]);

  // Calculated values
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = 0.16; // 16% IVA
  const taxAmount = cartSubtotal * taxRate;
  const totalUSD = cartSubtotal + taxAmount;
  const totalBs = totalUSD * bcvRate;

  // Search products function
  const searchProducts = useCallback(async (term: string) => {
    console.log('🔍 searchProducts called:', {
      term,
      selectedStoreId: selectedStore?.id,
      selectedStoreName: selectedStore?.name,
      companyId: userProfile?.company_id
    });
    
    if (!term.trim()) {
      console.log('⚠️ Search term is empty, returning');
      return;
    }
    
    if (!selectedStore?.id) {
      console.error('❌ No store selected! selectedStore:', selectedStore);
      return;
    }
    
    if (!userProfile?.company_id) {
      console.error('❌ No company ID! userProfile:', userProfile);
      return;
    }
    
    setIsSearching(true);
    try {
      // 1. Search products
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sale_price_usd, sku, barcode, category')
        .eq('company_id', userProfile.company_id)
        .or(`name.ilike.%${term}%,sku.ilike.%${term}%,barcode.ilike.%${term}%`)
        .limit(20);

      if (error) {
        console.error('❌ Error searching products:', error);
        throw error;
      }
      
      console.log('✅ Products found:', data?.length || 0, data);
      setProducts(data || []);
      
      // 2. Get stock for each product from the selected store
      if (data && data.length > 0) {
        const productIds = data.map(p => p.id);
        
        console.log('🏪 Fetching stock for store:', {
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          productCount: productIds.length
        });
        
        const { data: stockData, error: stockError } = await supabase
          .from('inventories')
          .select('product_id, qty')
          .eq('store_id', selectedStore.id)
          .eq('company_id', userProfile.company_id)
          .in('product_id', productIds);
        
        if (stockError) {
          console.error('❌ Error fetching stock:', stockError);
        } else {
          console.log('📦 Stock data received:', {
            storeId: selectedStore.id,
            storeName: selectedStore.name,
            companyId: userProfile.company_id,
            productIds: productIds,
            stockDataRaw: stockData,
            stockCount: stockData?.length || 0
          });
        }
        
        // 3. Create stock map
        const stockMap: Record<string, number> = {};
        if (stockData && stockData.length > 0) {
          stockData.forEach(inv => {
            stockMap[inv.product_id] = inv.qty || 0;
          });
        } else {
          console.warn('⚠️ No stock records found for these products in this store');
          // Initialize all products with 0 stock
          productIds.forEach(id => {
            stockMap[id] = 0;
          });
        }
        
        console.log('📦 Stock Map Final:', stockMap);
        setProductStock(stockMap);
      }
    } catch (err) {
      console.error('❌ Error in searchProducts:', err);
    } finally {
      setIsSearching(false);
    }
  }, [selectedStore?.id, selectedStore?.name, userProfile?.company_id]);

  // Add to cart
  const addToCart = useCallback((product: Product) => {
    const stock = productStock[product.id] || 0;
    if (stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + 1, stock);
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: newQty }
            : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.sale_price_usd || 0,
        originalPrice: product.sale_price_usd || 0,
        quantity: 1,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        maxStock: stock,
      }];
    });
    
    // Clear search
    setSearchTerm('');
    setProducts([]);
  }, [productStock]);

  // Update quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, Math.min(item.quantity + delta, item.maxStock));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  // Update price
  const updatePrice = (productId: string, newPrice: number) => {
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, price: newPrice } : item
    ));
  };

  // Update IMEI for serialized products (phones)
  const updateIMEI = (productId: string, imeiIndex: number, imeiValue: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        // Initialize imeis array if doesn't exist
        const currentImeis = item.imeis || [];
        // Create a new array with the updated IMEI at the specific index
        const newImeis = [...currentImeis];
        // Ensure array has enough slots
        while (newImeis.length <= imeiIndex) {
          newImeis.push('');
        }
        newImeis[imeiIndex] = imeiValue.trim();
        return { ...item, imeis: newImeis };
      }
      return item;
    }));
  };

  // Buscar cliente por cédula
  const searchCustomerById = async () => {
    if (!customerIdInput.trim() || !userProfile?.company_id) return;
    
    setCustomerSearchStatus('searching');
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id,name,email,phone,address,id_number')
        .eq('company_id', userProfile.company_id)
        .eq('id_number', customerIdInput.trim())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error searching customer:', error);
        setCustomerSearchStatus('idle');
        return;
      }

      if (data) {
        // Cliente encontrado
        setSelectedCustomer(data as Customer);
        setCustomerSearchStatus('found');
        setShowRegistrationStep(false);
      } else {
        // Cliente NO encontrado - mostrar paso de registro
        setCustomerSearchStatus('not-found');
        setShowRegistrationStep(true);
        setNewCustomerData({ name: '', email: '', phone: '', address: '' });
      }
    } catch (err) {
      console.error('Customer search error:', err);
      setCustomerSearchStatus('idle');
    }
  };

  // Crear nuevo cliente
  const createNewCustomer = async () => {
    if (!newCustomerData.name.trim() || !userProfile?.company_id) return;
    
    setIsCreatingCustomer(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ 
          ...newCustomerData, 
          id_number: customerIdInput.trim(),
          company_id: userProfile.company_id 
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Cliente creado - seleccionar y avanzar
        setSelectedCustomer(data as Customer);
        setCustomerSearchStatus('found');
        setShowRegistrationStep(false);
        // Avanzar automáticamente al paso 3
        setCurrentStep(3);
      }
    } catch (err) {
      console.error('Error creating customer:', err);
      alert('Error al crear el cliente.');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Handle step navigation
  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedStore;
      case 2: {
        // Si ya está seleccionado el cliente, puede continuar
        if (selectedCustomer) return true;
        // Si está en modo registro, no puede continuar (debe registrar primero)
        if (showRegistrationStep) return false;
        // Si tiene cédula ingresada (min 3 chars), puede buscar
        return customerIdInput.trim().length >= 3;
      }
      case 3: {
        if (cart.length === 0) return false;
        
        // Validar que para cada producto 'phones', los IMEIs estén completos Y sean válidos
        const imeisValid = cart.every(item => {
          if (item.category === 'phones') {
            // Verificar que tenga exactamente la cantidad de IMEIs requeridos
            const imeis = item.imeis || [];
            // Filtrar IMEIs válidos: no vacíos Y con longitud entre 15-17 dígitos
            const validImeis = imeis.filter(imei => {
              const trimmed = imei?.trim() || '';
              return trimmed.length >= 15 && trimmed.length <= 17;
            });
            return validImeis.length === item.quantity;
          }
          return true; // Productos no serializados siempre pasan
        });
        
        return imeisValid;
      }
      case 4: return !!selectedPaymentMethod || (isMixedPayment && mixedPayments.length > 0);
      default: return false;
    }
  };

  const handleNext = async () => {
    console.log('➡️ handleNext called:', {
      currentStep,
      canProceed: canProceed(),
      selectedStore: selectedStore,
      selectedCustomer: selectedCustomer?.name,
      showRegistrationStep
    });
    
    // Caso especial: Step 2 - buscar cliente primero
    if (currentStep === 2 && !selectedCustomer && !showRegistrationStep) {
      await searchCustomerById();
      return; // No avanzar aún, esperar resultado de búsqueda
    }
    
    if (currentStep < 4 && canProceed()) {
      const nextStep = currentStep + 1;
      console.log(`✅ Advancing to step ${nextStep}`);
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === 4 && canProceed()) {
      // 🔍 DEBUG: Verificar cantidades del carrito antes de enviar
      console.log('🛒 POSWizardModal - Cart a enviar (onComplete):');
      cart.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`, {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          maxStock: item.maxStock,
          price: item.price
        });
      });
      
      // Complete wizard
      onComplete({
        store: selectedStore!,
        customer: selectedCustomer!,
        cart,
        paymentMethod: selectedPaymentMethod,
        isKreceEnabled,
        kreceInitialAmount,
        isCasheaEnabled,
        casheaInitialAmount,
        isMixedPayment,
        mixedPayments,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Manejar clic en X para abandonar la venta
  const handleExitClick = () => {
    setShowExitConfirmation(true);
  };

  // Confirmar abandono y redirigir al dashboard
  const handleConfirmExit = () => {
    setShowExitConfirmation(false);
    navigate('/dashboard');
  };

  // Auto-focus search on step 3
  useEffect(() => {
    if (currentStep === 3 && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [currentStep]);

  if (!isOpen) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-4xl max-h-[95vh] h-[85vh] overflow-hidden flex flex-col glass-card [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Fixed Header with BCV Rate and Exit Button */}
        <div className="relative border-b pb-3">
          {/* Exit Button - Posición fija esquina superior derecha */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-1 -right-1 w-8 h-8 rounded-full hover:bg-destructive/10 hover:text-destructive z-10"
            onClick={handleExitClick}
          >
            <X className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center justify-between pr-10">
            <DialogHeader className="flex-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <ShoppingCart className="w-7 h-7 text-primary" />
                Punto de Venta
              </DialogTitle>
              <DialogDescription>
                {currentStep === 1 && "Selecciona la tienda de operación"}
                {currentStep === 2 && "Identifica al cliente"}
                {currentStep === 3 && "Agrega productos al carrito"}
                {currentStep === 4 && "Configura el método de pago"}
              </DialogDescription>
            </DialogHeader>
            
            {/* BCV Rate Badge */}
            <Card className="p-2 px-3 bg-green-500/10 border-green-500/30">
              <div className="text-xs text-muted-foreground">Tasa BCV</div>
              <div className="text-lg font-bold text-green-600">Bs {bcvRate.toFixed(2)}</div>
            </Card>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={4} />

        {/* Fixed Customer/Store Header (visible after step 1) */}
        {currentStep > 1 && selectedStore && (
          <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border border-primary/20 mb-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{selectedStore.name}</span>
            </div>
            {selectedCustomer && (
              <>
                <div className="w-px h-6 bg-border" />
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{selectedCustomer.name}</span>
                  <Badge variant="outline" className="text-xs">{selectedCustomer.id_number}</Badge>
                </div>
              </>
            )}
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {/* STEP 1: Store Selection */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <Store className="w-16 h-16 mx-auto mb-4 text-primary/50" />
                <h3 className="text-xl font-semibold">Selecciona tu Tienda</h3>
                <p className="text-muted-foreground">Esta será la sucursal desde donde se realizará la venta</p>
              </div>
              
              {storeLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableStores.map((store) => (
                    <Card
                      key={store.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedStore?.id === store.id
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => {
                        console.log('🏪 Store selected:', store);
                        setSelectedStore(store);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedStore?.id === store.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <Store className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{store.name}</p>
                        </div>
                        {selectedStore?.id === store.id && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Customer Selection */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Si ya hay cliente seleccionado */}
              {selectedCustomer ? (
                <>
                  <div className="text-center mb-6">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-xl font-semibold text-green-700">Cliente Identificado</h3>
                  </div>
                  
                  <Card className="p-6 bg-green-500/10 border-green-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                          <User className="w-7 h-7 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-green-700">{selectedCustomer.name}</p>
                          <p className="text-sm text-green-600">Cédula: {selectedCustomer.id_number}</p>
                          {selectedCustomer.phone && (
                            <p className="text-xs text-muted-foreground">Tel: {selectedCustomer.phone}</p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerIdInput('');
                          setCustomerSearchStatus('idle');
                          setShowRegistrationStep(false);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        Cambiar
                      </Button>
                    </div>
                  </Card>
                </>
              ) : showRegistrationStep ? (
                /* Paso intermedio: Registro de cliente - Tema oscuro con detalles verdes */
                <>
                  <div className="text-center mb-4">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <h3 className="text-xl font-semibold">Cliente No Registrado</h3>
                    <p className="text-muted-foreground text-sm">
                      La cédula <span className="font-mono font-bold text-green-500">{customerIdInput}</span> no está en el sistema
                    </p>
                  </div>
                  
                  <Card className="p-6 border-green-500/30 bg-zinc-900/50 dark:bg-zinc-900/80">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-green-500/30">
                        <User className="w-5 h-5 text-green-500" />
                        <span className="font-semibold text-green-500">Registrar Nuevo Cliente</span>
                      </div>
                      
                      {/* Cédula (solo lectura) */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Cédula / RIF</label>
                        <Input 
                          value={customerIdInput} 
                          disabled 
                          className="font-mono bg-zinc-800/50 h-10 border-zinc-700 text-green-400" 
                        />
                      </div>

                      {/* Nombre (requerido) */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-green-400">Nombre Completo *</label>
                        <Input 
                          placeholder="Ej: Juan Pérez" 
                          value={newCustomerData.name} 
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })} 
                          className="h-11 bg-zinc-800/30 border-zinc-700 focus:border-green-500"
                          autoFocus
                        />
                      </div>

                      {/* Teléfono y Email en una fila */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Teléfono (opcional)</label>
                          <Input 
                            placeholder="04XX-XXXXXXX" 
                            value={newCustomerData.phone} 
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })} 
                            className="h-10 bg-zinc-800/30 border-zinc-700 focus:border-green-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Email (opcional)</label>
                          <Input 
                            type="email" 
                            placeholder="correo@ejemplo.com" 
                            value={newCustomerData.email} 
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })} 
                            className="h-10 bg-zinc-800/30 border-zinc-700 focus:border-green-500"
                          />
                        </div>
                      </div>

                      {/* Dirección */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Dirección (opcional)</label>
                        <Input 
                          placeholder="Dirección del cliente" 
                          value={newCustomerData.address} 
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })} 
                          className="h-10 bg-zinc-800/30 border-zinc-700 focus:border-green-500"
                        />
                      </div>

                      {/* Botones */}
                      <div className="flex gap-3 pt-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setShowRegistrationStep(false);
                            setCustomerSearchStatus('idle');
                            setCustomerIdInput('');
                          }}
                          className="flex-1 border-zinc-600 hover:bg-zinc-800"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={createNewCustomer} 
                          disabled={!newCustomerData.name.trim() || isCreatingCustomer} 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        >
                          {isCreatingCustomer ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Registrando...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Registrar y Continuar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </>
              ) : (
                /* Input de cédula */
                <>
                  <div className="text-center mb-6">
                    <User className="w-16 h-16 mx-auto mb-4 text-primary/50" />
                    <h3 className="text-xl font-semibold">Identifica al Cliente</h3>
                    <p className="text-muted-foreground">Ingresa la Cédula o RIF del cliente</p>
                  </div>
                  
                  <Card className="p-6">
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Ingresa la Cédula o RIF..."
                          value={customerIdInput}
                          onChange={(e) => {
                            setCustomerIdInput(e.target.value);
                            setCustomerSearchStatus('idle');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customerIdInput.trim().length >= 3) {
                              searchCustomerById();
                            }
                          }}
                          disabled={customerSearchStatus === 'searching'}
                          className="pl-12 h-14 text-xl font-mono"
                          autoFocus
                        />
                        {customerSearchStatus === 'searching' && (
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      
                      {customerIdInput.trim().length > 0 && customerIdInput.trim().length < 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Ingresa al menos 3 caracteres
                        </p>
                      )}
                      
                      {customerIdInput.trim().length >= 3 && customerSearchStatus === 'idle' && (
                        <p className="text-xs text-muted-foreground text-center">
                          Presiona <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> o haz clic en "Continuar" para buscar
                        </p>
                      )}
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Products & Cart - LAYOUT 2 COLUMNAS */}
          {currentStep === 3 && (
            <div className="animate-in fade-in duration-300 h-[60vh]">
              <div className="grid grid-cols-[1fr_1.2fr] gap-4 h-full">
                
                {/* COLUMNA A: Buscador + Resultados */}
                <div className="flex flex-col h-full border-r pr-4">
                  {/* Search Bar - Fijo arriba */}
                  <div className="pb-3 border-b mb-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          ref={searchInputRef}
                          type="text"
                          placeholder={scanMode ? "Escanear código..." : "Buscar producto..."}
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!scanMode && e.target.value.length >= 2) {
                              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                              searchDebounceRef.current = window.setTimeout(() => {
                                searchProducts(e.target.value);
                              }, 300);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchTerm.trim()) {
                              searchProducts(searchTerm);
                            }
                          }}
                          className="pl-10 h-11"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                        )}
                      </div>
                      <Button
                        variant={scanMode ? "default" : "outline"}
                        size="icon"
                        className="h-11 w-11"
                        onClick={() => setScanMode(!scanMode)}
                      >
                        <Scan className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Search Results - Scroll independiente */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {products.length > 0 ? (
                      products.map((product) => {
                        const stock = productStock[product.id] || 0;
                        const inCart = cart.find(item => item.id === product.id);
                        
                        return (
                          <Card
                            key={product.id}
                            className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                              stock <= 0 ? 'opacity-50' : 'hover:border-primary/50'
                            }`}
                            onClick={() => stock > 0 && addToCart(product)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{product.name}</p>
                                <p className="text-xs text-muted-foreground">{product.sku}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-semibold">${(product.sale_price_usd || 0).toFixed(2)}</p>
                                <p className={`text-xs ${stock > 0 ? 'text-green-600' : 'text-destructive'}`}>
                                  Stock: {stock}
                                </p>
                              </div>
                              {inCart && (
                                <Badge className="bg-primary flex-shrink-0">{inCart.quantity}</Badge>
                              )}
                            </div>
                          </Card>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Busca productos por nombre o SKU</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMNA B: Carrito */}
                <div className="flex flex-col h-full">
                  {/* Header del Carrito */}
                  <div className="flex items-center justify-between pb-3 border-b mb-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Carrito ({cart.length} {cart.length === 1 ? 'producto' : 'productos'})
                    </h4>
                    {cart.length > 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-500">
                        ${cartSubtotal.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Cart Items - Scroll independiente */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {cart.length > 0 ? (
                      cart.map((item) => (
                        <Card key={item.id} className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </div>
                            
                            {/* Price */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">$</span>
                              <Input
                                type="number"
                                value={item.price.toFixed(2)}
                                onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                                className="w-16 h-7 text-xs text-right"
                                step="0.01"
                              />
                            </div>
                            
                            {/* Quantity */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="icon"
                                variant="outline"
                                className="w-6 h-6"
                                onClick={() => updateQuantity(item.id, -1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="w-6 h-6"
                                onClick={() => updateQuantity(item.id, 1)}
                                disabled={item.quantity >= item.maxStock}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            {/* Subtotal */}
                            <div className="w-16 text-right flex-shrink-0">
                              <p className="text-xs font-semibold text-green-600">${(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                            
                            {/* Remove */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6 text-destructive hover:bg-destructive/10 flex-shrink-0"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* Stock Warning */}
                          {item.quantity >= item.maxStock && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                              <AlertCircle className="w-3 h-3" />
                              <span>Máximo: {item.maxStock}</span>
                            </div>
                          )}
                          
                          {/* IMEI Inputs for Phones */}
                          {item.category === 'phones' && item.quantity > 0 && (
                            <div className="mt-2 pt-2 border-t border-dashed border-muted-foreground/30 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Smartphone className="w-3 h-3" />
                                <span>IMEIs ({item.imeis?.filter(i => i?.trim() && i.trim().length >= 15).length || 0}/{item.quantity})</span>
                                {(item.imeis?.filter(i => i?.trim() && i.trim().length >= 15).length || 0) === item.quantity && (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                              <div className="space-y-1">
                                {Array.from({ length: item.quantity }, (_, index) => {
                                  const imeiValue = item.imeis?.[index] || '';
                                  const isValidLength = imeiValue.trim().length >= 15 && imeiValue.trim().length <= 17;
                                  const hasValue = imeiValue.trim().length > 0;
                                  const isInvalidLength = hasValue && !isValidLength;
                                  
                                  return (
                                    <div key={index} className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground w-8 flex-shrink-0">#{index + 1}</span>
                                      <Input
                                        type="text"
                                        placeholder="IMEI"
                                        value={imeiValue}
                                        onChange={(e) => updateIMEI(item.id, index, e.target.value)}
                                        className={`h-7 text-xs font-mono flex-1
                                          bg-background dark:bg-zinc-900
                                          ${isValidLength 
                                            ? 'border-green-500 text-green-700 dark:text-green-400' 
                                            : isInvalidLength 
                                              ? 'border-red-500 text-red-700 dark:text-red-400' 
                                              : 'border-amber-400'
                                          }`}
                                      />
                                      {isValidLength && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                                      {isInvalidLength && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Carrito vacío</p>
                        <p className="text-xs text-muted-foreground">Selecciona productos de la izquierda</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Payment & Review */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Payment Methods */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Método de Pago
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <Button
                        key={method.id}
                        variant={selectedPaymentMethod === method.id ? "default" : "outline"}
                        className="h-auto py-3 flex-col gap-1"
                        onClick={() => setSelectedPaymentMethod(method.id)}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{method.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </Card>

              {/* Financing Options */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Financiamiento</h4>
                <div className="flex gap-2">
                  <Button
                    variant={isKreceEnabled ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      setIsKreceEnabled(!isKreceEnabled);
                      if (!isKreceEnabled) {
                        setIsCasheaEnabled(false);
                        setKreceInitialAmount(cartSubtotal * 0.3);
                      }
                    }}
                  >
                    <img src="/krece_icono.png" alt="Krece" className="w-5 h-5 mr-2" onError={(e) => e.currentTarget.style.display = 'none'} />
                    Krece
                  </Button>
                  <Button
                    variant={isCasheaEnabled ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      setIsCasheaEnabled(!isCasheaEnabled);
                      if (!isCasheaEnabled) {
                        setIsKreceEnabled(false);
                        setCasheaInitialAmount(cartSubtotal * 0.5);
                      }
                    }}
                  >
                    <img src="/cashea_icono.png" alt="Cashea" className="w-5 h-5 mr-2" onError={(e) => e.currentTarget.style.display = 'none'} />
                    Cashea
                  </Button>
                </div>
                
                {(isKreceEnabled || isCasheaEnabled) && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Inicial ({isKreceEnabled ? '30%' : '50%'}):</span>
                        <span className="font-semibold text-green-600">
                          ${(isKreceEnabled ? kreceInitialAmount : casheaInitialAmount).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>A financiar:</span>
                        <span className="font-semibold text-blue-600">
                          ${(cartSubtotal - (isKreceEnabled ? kreceInitialAmount : casheaInitialAmount)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Order Summary */}
              <Card className="p-4 bg-primary/5 border-primary/20">
                <h4 className="font-semibold mb-3">Resumen de la Orden</h4>
                
                {/* Items Summary */}
                <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="truncate flex-1">{item.name} x{item.quantity}</span>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVA (16%):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total USD:</span>
                    <span className="text-green-600">${totalUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Bs:</span>
                    <span className="text-primary">Bs {totalBs.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Fixed Footer with Navigation */}
        <div className="flex items-center justify-between pt-4 border-t mt-auto">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Paso {currentStep} de 4
          </div>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2 bg-primary"
          >
            {currentStep === 4 ? (
              <>
                <Check className="w-4 h-4" />
                Completar
              </>
            ) : (
              <>
                Continuar
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Diálogo de confirmación para abandonar la venta */}
    <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
      <AlertDialogContent className="glass-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            ¿Abandonar la venta?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Si sales ahora, perderás todo el progreso de esta venta. 
            Los productos en el carrito y los datos ingresados no se guardarán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowExitConfirmation(false)}>
            Continuar con la venta
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmExit}
            className="bg-destructive hover:bg-destructive/90"
          >
            Sí, abandonar venta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default POSWizardModal;

