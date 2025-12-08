import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
 
import { 
  Search, 
  ShoppingCart, 
  User, 
  CreditCard, 
  Banknote, 
  DollarSign, 
  Edit,
  Scan,
  Minus,
  Plus,
  Trash2,
  Check,
  X,
  Smartphone,
  Smartphone as Mobile,
  Zap,
  Coins,
  Store,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import CustomerSelector from "@/components/pos/CustomerSelector";
import { SaleCompletionModal } from "@/components/pos/SaleCompletionModal";
import { IMEIModal } from "@/components/pos/IMEIModal";
import { Label } from "@/components/ui/label";
import { printInvoice } from "@/utils/printInvoice";
import { getBcvRate } from "@/utils/bcvRate";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useToast } from "@/hooks/use-toast";
// import { CashRegisterWidget } from "@/components/cash-register/CashRegisterWidget";

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  sku: string;
  barcode?: string;
  category?: string; // Agregar categoría
  imei?: string; // Agregar IMEI
  imeis?: string[]; // Agregar array de IMEIs para múltiples teléfonos
}

interface Product {
  id: string;
  name: string;
  sale_price_usd?: number;
  sku: string;
  barcode?: string;
  category?: string;
}

import { PRODUCT_CATEGORIES } from '@/constants/categories';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  id_number?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: any;
  customIcon: string | null;
  customSize: string | null;
  customText?: string;
}

const OFFLINE_SALES_KEY = 'tm_pos_pending_sales';

const getDayBoundaries = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const loadOfflineSales = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_SALES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('No se pudieron cargar ventas pendientes:', error);
    return [];
  }
};

const persistOfflineSales = (sales: any[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(sales));
  } catch (error) {
    console.warn('No se pudieron guardar las ventas pendientes:', error);
  }
};

const storeOfflineSale = (salePayload: any) => {
  if (typeof window === 'undefined') return null;
  try {
    const current = loadOfflineSales();
    current.push(salePayload);
    persistOfflineSales(current);
    return current;
  } catch (error) {
    console.warn('No se pudo almacenar la venta pendiente localmente:', error);
    return null;
  }
};
const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  const message = (
    error.message ||
    error.error_description ||
    error.statusText ||
    ''
  )
    .toString()
    .toLowerCase();
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('timeout')
  );
};


export default function POS() {
  const { userProfile } = useAuth();
  const { selectedStore, availableStores, setSelectedStore, loading: storeLoading } = useStore();
  const { getTaxRate, getReceiptFooter } = useSystemSettings();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productStock, setProductStock] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [scanMode, setScanMode] = useState(false); // búsqueda por texto por defecto
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isKreceEnabled, setIsKreceEnabled] = useState(false);
  const [kreceInitialAmount, setKreceInitialAmount] = useState<number>(0);
  const [kreceInitialPaymentMethod, setKreceInitialPaymentMethod] = useState<string>("cash_usd");
  
  // Cashea financing state
  const [isCasheaEnabled, setIsCasheaEnabled] = useState(false);
  const [casheaInitialAmount, setCasheaInitialAmount] = useState<number>(0);
  const [casheaInitialPaymentMethod, setCasheaInitialPaymentMethod] = useState<string>("cash_usd");
  
  // Mixed payments state
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [mixedPayments, setMixedPayments] = useState<Array<{
    method: string;
    amount: number;
  }>>([]);
  
  const companyId = userProfile?.company_id ?? null;
  // For cashiers and managers, always use their assigned store (no selection allowed)
  // GERENTE tiene mismas restricciones de tienda que CAJERO
  const isRestrictedToStore = userProfile?.role === 'cashier' || userProfile?.role === 'manager';
  // Eliminado fallback innecesario: Roles Fijos DEBEN tener assigned_store_id
  // Si no lo tienen, el backend rechazará la venta (correcto)
  const resolvedStoreId = isRestrictedToStore
    ? (userProfile as any)?.assigned_store_id ?? null
    : selectedStore?.id ?? null;
  // Estado para ventas offline pendientes de sincronización
  const pendingOfflineSalesRef = useRef<any[]>([]);
  const syncingOfflineSalesRef = useRef(false);
  const prevStoreIdRef = useRef<string | null>(null); // Para detectar cambios de tienda (solo Admin)

  useEffect(() => {
    pendingOfflineSalesRef.current = loadOfflineSales();
    if (pendingOfflineSalesRef.current.length > 0) {
      console.warn(
        `POS: hay ${pendingOfflineSalesRef.current.length} ventas pendientes por sincronizar.`
      );
    }
  }, []);


  // Unit price is edited directly on each line via input
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const [bcvRate, setBcvRate] = useState(41.73);
  const [isEditingBcvRate, setIsEditingBcvRate] = useState(false);
  const [bcvRateInput, setBcvRateInput] = useState("41.73");
  const [productView, setProductView] = useState<'cards' | 'list'>('cards');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState<any>(null);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [showPreValidationModal, setShowPreValidationModal] = useState(false);
  const [isSaleConfirmedAndCompleted, setIsSaleConfirmedAndCompleted] = useState(false);
  // Sistema de Wizard - Pasos obligatorios (PANELES INLINE - SIN MODALES)
  // 1 = Tienda, 2 = Cliente, 3 = Productos/Carrito, 4 = Pago, 5 = Resumen Final
  const [currentStep, setCurrentStep] = useState(1);
  const [hasSelectedStoreInSession, setHasSelectedStoreInSession] = useState(false);
  
  // Estado para el formulario de cliente inline
  const [idSearchTerm, setIdSearchTerm] = useState('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    id_number: '',
    phone: '',
    email: '',
    address: ''
  });
  
  // IMEI Modal states
  const [showIMEIModal, setShowIMEIModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  
  // Toast para notificaciones
  const { toast } = useToast();

  // Efecto para validar el flujo del Wizard (SIN MODALES - PANELES INLINE)
  useEffect(() => {
    if (storeLoading) return;
    if (isSaleConfirmedAndCompleted) return;
    
    // Validaciones automáticas de paso
    if (currentStep > 1 && (!hasSelectedStoreInSession || !selectedStore)) {
      setCurrentStep(1);
    } else if (currentStep > 2 && !selectedCustomer) {
      setCurrentStep(2);
    }
  }, [currentStep, hasSelectedStoreInSession, selectedStore, selectedCustomer, storeLoading, isSaleConfirmedAndCompleted]);

  // ✅ LÓGICA LEGACY ELIMINADA: Ya no usamos localStorage para números de factura
  // El backend genera los números de forma atómica usando una SEQUENCE de PostgreSQL

  useEffect(() => {
    if (userProfile?.company_id) {
      // Lazy load products: only fetch on explicit search or scan
      fetchBcvRate();
    }
  }, [userProfile?.company_id]);

  // Recargar stock cuando cambie la tienda seleccionada
  useEffect(() => {
    if (products.length > 0 && selectedStore) {
      loadProductStock(products);
    }
  }, [selectedStore, products]);

  // Limpiar carrito y productos al cambiar de tienda (solo para Admin)
  // Esto previene mezclar inventarios de diferentes tiendas
  useEffect(() => {
    // Solo aplicar si es Admin y hay una tienda seleccionada
    if (userProfile?.role === 'admin' && selectedStore) {
      // Si cambió la tienda (no es la primera vez)
      if (prevStoreIdRef.current !== null && prevStoreIdRef.current !== selectedStore.id) {
        // Limpiar carrito para evitar mezclar inventarios
        setCart([]);
        // Limpiar productos de búsqueda anterior
        setProducts([]);
        setProductStock({});
        // Limpiar búsqueda
        setSearchTerm("");
        setHasSearched(false);
      }
      // Actualizar la referencia
      prevStoreIdRef.current = selectedStore.id;
    }
  }, [selectedStore?.id, userProfile?.role]);

  // Mantener el foco en el input cuando el modo escaneo está activo
  useEffect(() => {
    if (scanMode) {
      searchInputRef.current?.focus();
    }
  }, [scanMode]);

  // Removed keyboard shortcuts to simplify UX per request

  const searchProducts = async (term: string) => {
    if (!userProfile?.company_id) return;
    const q = term.trim();
    if (!q) return;
    setIsSearching(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,sku,barcode,category,sale_price_usd')
        .filter('active', 'eq', true)
        .filter('company_id', 'eq', userProfile.company_id)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`)
        .limit(100);

      if (error) {
        console.error('Error searching products:', error);
        return;
      }
      const productsData = (data as unknown as Product[]) || [];
      setProducts(productsData);
      
      // Load stock for all found products
      await loadProductStock(productsData);
    } catch (err) {
      console.error('Search products error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadProductStock = async (productsList: Product[]) => {
    if (!userProfile?.company_id || productsList.length === 0 || !selectedStore) return;
    
    try {
      // Usar la tienda seleccionada del contexto
      // For cashiers and managers, always use assigned store; for admin, use selected store
      const isRestrictedUser = userProfile?.role === 'cashier' || userProfile?.role === 'manager';
      const storeId = isRestrictedUser
        ? (userProfile as any)?.assigned_store_id ?? selectedStore?.id
        : selectedStore?.id;
      
      if (!storeId) {
        toast({
          title: "Error",
          description: "No se ha seleccionado una tienda",
          variant: "destructive"
        });
        return;
      }
      
      // Get inventory for all products in this store
      // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
      const productIds = productsList.map(p => p.id);
      const { data, error } = await (supabase as any)
        .from('inventories')
        .select('product_id, qty')
        .in('product_id', productIds)
        .eq('store_id', storeId) // ✅ KEEP: UI filter for selected store
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
      
      if (error) {
        console.error('Error loading product stock:', error);
        return;
      }
      
      // Create stock map
      const stockMap: Record<string, number> = {};
      (data as any[] || []).forEach(item => {
        stockMap[item.product_id] = item.qty || 0;
      });
      
      setProductStock(stockMap);
    } catch (error) {
      console.error('Error loading product stock:', error);
    }
  };

  const fetchBcvRate = async () => {
    try {
      const rate = await getBcvRate();
      
      if (rate !== null) {
        console.log('BCV rate loaded:', rate);
        setBcvRate(rate);
        setBcvRateInput(rate.toString());
      } else {
        console.error('Could not fetch BCV rate from API or database');
      }
    } catch (err) {
      console.error('Fetch BCV rate error:', err);
    }
  };
  
  const getProductStock = async (productId: string): Promise<number> => {
    if (!userProfile?.company_id) return 0;
    
    // For cashiers, always use assigned store; for others, use selected store
    const storeId = userProfile?.role === 'cashier' 
      ? (userProfile as any)?.assigned_store_id ?? selectedStore?.id
      : selectedStore?.id;
    
    if (!storeId) return 0;
    
    try {
      
      // Get inventory for this product in this store
      // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
      const { data, error } = await (supabase as any)
        .from('inventories')
        .select('qty')
        .eq('product_id', productId)
        .eq('store_id', storeId) // ✅ KEEP: UI filter for selected store
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .single();
      
      if (error || !data) return 0;
      
      return (data as any).qty || 0;
    } catch (error) {
      console.error('Error getting product stock:', error);
      return 0;
    }
  };

  const addToCart = async (product: Product) => {
    // Get available stock - PRIORITY: Use cached productStock first
    let availableStock = productStock[product.id] ?? 0;
    
    if (availableStock === 0 || productStock[product.id] === undefined) {
      availableStock = await getProductStock(product.id);
      // Update cache for future use
      if (availableStock > 0) {
        setProductStock(prev => ({ ...prev, [product.id]: availableStock }));
      }
    }
    
    if (availableStock <= 0) {
      toast({
        variant: "warning",
        title: "Sin stock disponible",
        description: `No hay stock disponible para: ${product.name}`,
      });
      return;
    }
    
    // Lógica para todos los productos (incluyendo teléfonos)
    // Los IMEIs se capturan INLINE en el carrito, no en un modal separado
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      
      // Si intenta agregar más cantidad de la disponible, mostrar error y NO actualizar
      if (newQuantity > availableStock) {
        alert(`❌ No hay suficiente stock. Solo hay ${availableStock} unidades disponibles de: ${product.name}`);
        return; // NO actualiza la cantidad
      }
      
      // Si es válido, actualizar la cantidad
      // Para teléfonos, también expandir el array de IMEIs
      // IMPORTANTE: Usar forma funcional de setCart para evitar problemas de estado stale
      setCart(prevCart => prevCart.map(item => {
        if (item.id === product.id) {
          const updatedItem = { ...item, quantity: newQuantity };
          console.log(`🛒 addToCart: Actualizando ${item.name} - cantidad anterior: ${item.quantity}, nueva: ${newQuantity}`);
          // Si es teléfono, asegurar que el array de IMEIs tenga el tamaño correcto
          if (item.category === 'phones') {
            const currentImeis = item.imeis || [];
            const newImeis = [...currentImeis];
            while (newImeis.length < newQuantity) {
              newImeis.push('');
            }
            updatedItem.imeis = newImeis;
          }
          return updatedItem;
        }
        return item;
      }));
    } else {
      const price = product.sale_price_usd ?? 0;
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: price,
        originalPrice: price,
        quantity: 1,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        // Inicializar array de IMEIs vacío para teléfonos (se llenarán inline)
        imeis: product.category === 'phones' ? [''] : undefined
      };
      console.log(`🛒 addToCart: Agregando nuevo producto ${product.name} - cantidad: 1`);
      // IMPORTANTE: Usar forma funcional de setCart para evitar problemas de estado stale
      setCart(prevCart => [...prevCart, newItem]);
      setPriceInputs(prev => ({ ...prev, [product.id]: price.toFixed(2) }));
    }
  };

  // Funciones para manejar el modal IMEI
  const handleIMEIConfirm = async (imei: string) => {
    if (pendingProduct) {
      // Get available stock - PRIORITY: Use cached productStock first
      let availableStock = productStock[pendingProduct.id] ?? 0;
      
      if (availableStock === 0 || productStock[pendingProduct.id] === undefined) {
        availableStock = await getProductStock(pendingProduct.id);
        // Update cache for future use
        if (availableStock > 0) {
          setProductStock(prev => ({ ...prev, [pendingProduct.id]: availableStock }));
        }
      }
      
      const existingItem = cart.find(item => item.id === pendingProduct.id);
      
      if (existingItem) {
        // Si ya existe el producto, verificar stock antes de agregar otro IMEI
        const newQuantity = existingItem.quantity + 1;
        
        // CRITICAL: Use Math.min to RESTRICT - quantity NEVER exceeds availableStock
        const limitedQuantity = Math.min(newQuantity, availableStock);
        
        if (limitedQuantity < newQuantity) {
          toast({
            title: "Stock máximo alcanzado",
            description: `Solo hay ${availableStock} unidades disponibles de: ${pendingProduct.name}`,
            variant: "destructive",
          });
          // Cerrar modal y limpiar estado
          setShowIMEIModal(false);
          setPendingProduct(null);
          return;
        }
        
        // Si ya existe el producto, agregar el IMEI al array con cantidad limitada
        const updatedItem = {
          ...existingItem,
          quantity: limitedQuantity,
          imeis: existingItem.imeis ? [...existingItem.imeis, imei] : [existingItem.imei || '', imei].filter(Boolean)
        };
        
        // CRITICAL: Update cart with RESTRICTED value (guaranteed: limitedQuantity <= availableStock)
        setCart(cart.map(item => 
          item.id === pendingProduct.id ? updatedItem : item
        ));
      } else {
        // Si es el primer teléfono, verificar que haya stock disponible
        if (availableStock <= 0) {
          toast({
            variant: "warning",
            title: "Sin stock disponible",
            description: `No hay stock disponible para: ${pendingProduct.name}`,
          });
          setShowIMEIModal(false);
          setPendingProduct(null);
          return;
        }
        
        // Si es el primer teléfono, crear nuevo item
        const price = pendingProduct.sale_price_usd ?? 0;
        const newItem: CartItem = {
          id: pendingProduct.id,
          name: pendingProduct.name,
          price: price,
          originalPrice: price,
          quantity: 1,
          sku: pendingProduct.sku,
          barcode: pendingProduct.barcode,
          category: pendingProduct.category,
          imei: imei,
          imeis: [imei]
        };
        setCart([...cart, newItem]);
        setPriceInputs(prev => ({ ...prev, [pendingProduct.id]: price.toFixed(2) }));
      }
    }
    
    // Cerrar modal y limpiar estado
    setShowIMEIModal(false);
    setPendingProduct(null);
  };

  const handleIMEIClose = () => {
    setShowIMEIModal(false);
    setPendingProduct(null);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const product = products.find(p => p.barcode === barcode || p.sku === barcode);
      if (product) {
        await addToCart(product);
        return;
      }

      // If not found in loaded products, try to fetch from database
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id,name,sku,barcode,category,sale_price_usd')
        .or(`barcode.eq.${barcode},sku.eq.${barcode}`)
        .filter('active', 'eq', true)
        .filter('company_id', 'eq', userProfile?.company_id as string)
        .single();
      
      if (error) {
        console.error('Error searching product by barcode:', error);
        alert(`Error buscando producto: ${error.message}`);
        return;
      }
      
      if (data) {
        await addToCart(data as unknown as Product);
      } else {
        alert(`Producto con código ${barcode} no encontrado`);
      }
    } catch (err) {
      console.error('Barcode scan error:', err);
      alert(`Error escaneando código: ${err}`);
    }
  };

  const handleUnitPriceChange = (itemId: string, value: string) => {
    // Allow any typing; normalize characters but do not commit yet
    const cleaned = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    setPriceInputs(prev => ({ ...prev, [itemId]: cleaned }));
  };

  const commitUnitPrice = (item: CartItem) => {
    const raw = priceInputs[item.id] ?? item.price.toFixed(2);
    const cleaned = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    const finalPrice = isNaN(parsed) || parsed < 0 ? item.originalPrice : Math.max(parsed, item.originalPrice);
    setCart(cart.map(ci => ci.id === item.id ? { ...ci, price: finalPrice } : ci));
    setPriceInputs(prev => ({ ...prev, [item.id]: finalPrice.toFixed(2) }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
    setPriceInputs(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setQuantityInputs(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setQuantityErrors(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const updateQuantity = async (id: string, change: number) => {
    const item = cart.find(item => item.id === id);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.quantity > 0));
      setQuantityInputs(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      setQuantityErrors(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      return;
    }
    
    // NO abrir modal de IMEI - Los inputs de IMEI son INLINE en el carrito
    // La validación de IMEIs se hace antes de procesar la venta
    
    // Get available stock - PRIORITY: Use cached productStock first (faster, more reliable)
    let availableStock = productStock[id] ?? 0;
    
    // If not in cache, fetch it
    if (availableStock === 0 || productStock[id] === undefined) {
      availableStock = await getProductStock(id);
      // Update cache for future use
      if (availableStock > 0) {
        setProductStock(prev => ({ ...prev, [id]: availableStock }));
      }
    }
    
    // Si intenta incrementar más allá del stock disponible, mostrar error y NO actualizar
    if (change > 0 && newQuantity > availableStock) {
      alert(`❌ No hay suficiente stock. Solo hay ${availableStock} unidades disponibles de: ${item.name}`);
      return; // NO actualiza la cantidad
    }
    
    // Si es válido, actualizar la cantidad
    // Para teléfonos, también ajustar el array de IMEIs
    // IMPORTANTE: Usar forma funcional de setCart para evitar problemas de estado stale
    setCart(prevCart => prevCart.map(cartItem => {
      if (cartItem.id === id) {
        const updatedItem = { ...cartItem, quantity: newQuantity };
        console.log(`🛒 updateQuantity: Actualizando ${cartItem.name} - cantidad anterior: ${cartItem.quantity}, nueva: ${newQuantity}`);
        // Si es teléfono, ajustar el array de IMEIs según la nueva cantidad
        if (cartItem.category === 'phones') {
          const currentImeis = cartItem.imeis || [];
          const newImeis = [...currentImeis];
          // Expandir si se incrementa
          while (newImeis.length < newQuantity) {
            newImeis.push('');
          }
          // Recortar si se decrementa
          if (newImeis.length > newQuantity) {
            newImeis.length = newQuantity;
          }
          updatedItem.imeis = newImeis;
        }
        return updatedItem;
      }
      return cartItem;
    }));
    
    // Clear any error for this item
    setQuantityErrors(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  // Función para actualizar IMEI de un producto en el carrito (inline)
  const updateIMEI = (productId: string, imeiIndex: number, imeiValue: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const currentImeis = item.imeis || [];
        const newImeis = [...currentImeis];
        // Asegurar que el array tenga el tamaño correcto
        while (newImeis.length <= imeiIndex) {
          newImeis.push('');
        }
        newImeis[imeiIndex] = imeiValue.trim();
        return { ...item, imeis: newImeis };
      }
      return item;
    }));
  };

  // Handle direct quantity input change with instant validation
  const handleQuantityChange = async (id: string, value: string) => {
    const item = cart.find(item => item.id === id);
    if (!item) return;

    // If empty, allow typing and clear any errors
    if (value === '') {
      setQuantityInputs(prev => ({ ...prev, [id]: value }));
      setQuantityErrors(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      return;
    }

    // Parse the input value
    const parsedValue = parseInt(value, 10);
    
    // If invalid (NaN or negative), clear error and allow typing
    if (isNaN(parsedValue) || parsedValue < 0) {
      setQuantityInputs(prev => ({ ...prev, [id]: value }));
      setQuantityErrors(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      return;
    }

    // Get available stock - PRIORITY: Use cached productStock first (faster, more reliable)
    // Fallback to async getProductStock if not in cache
    let availableStock = productStock[id] ?? 0;
    
    // If not in cache, fetch it
    if (availableStock === 0 || productStock[id] === undefined) {
      availableStock = await getProductStock(id);
      // Update cache for future use
      if (availableStock > 0) {
        setProductStock(prev => ({ ...prev, [id]: availableStock }));
      }
    }
    
    // Si intenta escribir un número mayor al stock, mostrar error y revertir al valor actual
    if (parsedValue > availableStock) {
      alert(`❌ No hay suficiente stock. Solo hay ${availableStock} unidades disponibles de: ${item.name}`);
      // Revertir al valor actual del carrito
      setQuantityInputs(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      setQuantityErrors(prev => ({
        ...prev,
        [id]: `Stock máximo: ${availableStock} unidades`
      }));
      return; // NO actualiza el input
    }

    // Si es válido, actualizar el input
    setQuantityInputs(prev => ({ ...prev, [id]: value }));
    
    // Clear error if valid
    setQuantityErrors(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  // Commit quantity change (on blur or enter)
  const commitQuantity = async (item: CartItem) => {
    const inputValue = quantityInputs[item.id];
    
    // If no input value, keep current quantity
    if (inputValue === undefined || inputValue === '') {
      setQuantityInputs(prev => {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      });
      return;
    }

    const parsedValue = parseInt(inputValue, 10);
    
    // If invalid, revert to current quantity
    if (isNaN(parsedValue) || parsedValue < 1) {
      setQuantityInputs(prev => {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      });
      setQuantityErrors(prev => {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      });
      return;
    }

    // Get available stock - PRIORITY: Use cached productStock first
    let availableStock = productStock[item.id] ?? 0;
    
    // If not in cache, fetch it
    if (availableStock === 0 || productStock[item.id] === undefined) {
      availableStock = await getProductStock(item.id);
      // Update cache for future use
      if (availableStock > 0) {
        setProductStock(prev => ({ ...prev, [item.id]: availableStock }));
      }
    }
    
    // Si intenta confirmar un valor mayor al stock, mostrar error y NO actualizar
    if (parsedValue > availableStock) {
      alert(`❌ No hay suficiente stock. Solo hay ${availableStock} unidades disponibles de: ${item.name}`);
      // Revertir al valor actual del carrito
      setQuantityInputs(prev => {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      });
      setQuantityErrors(prev => ({
        ...prev,
        [item.id]: `Stock máximo: ${availableStock} unidades`
      }));
      return; // NO actualiza la cantidad
    }

    // Si es válido, actualizar la cantidad
    setCart(cart.map(cartItem => 
      cartItem.id === item.id 
        ? { ...cartItem, quantity: parsedValue }
        : cartItem
    ));
    
    // Clear input state
    setQuantityInputs(prev => {
      const { [item.id]: _, ...rest } = prev;
      return rest;
    });
    setQuantityErrors(prev => {
      const { [item.id]: _, ...rest } = prev;
      return rest;
    });
  };

  const subtotalUSD = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = getTaxRate() / 100; // Convertir porcentaje a decimal
  const taxUSD = subtotalUSD * taxRate;
  const totalUSD = subtotalUSD + taxUSD;
  const totalBs = totalUSD * bcvRate;

  // Debug tax rate calculation
  console.log('POS Debug - Tax Rate Calculation:', {
    getTaxRate: getTaxRate(),
    taxRate: taxRate,
    subtotalUSD: subtotalUSD,
    taxUSD: taxUSD,
    totalUSD: totalUSD
  });

  // When lazy loading, the products array already reflects the search result
  const filteredProducts = products.filter(product => {
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || product.category === categoryFilter;
    return matchesCategory;
  });

  const paymentMethods: PaymentMethod[] = [
    // Primera fila: USD
    { id: "cash_usd", name: "Efectivo USD", icon: null, customIcon: null, customSize: null, customText: "Efectivo USD" },
    { id: "zelle", name: "Zelle", icon: null, customIcon: "/zelle_icono.png", customSize: null },
    { id: "binance", name: "Binance", icon: null, customIcon: "/binance_icono.png", customSize: null },
    // Segunda fila: Bs
    { id: "cash_bs", name: "Efectivo Bs", icon: null, customIcon: null, customSize: null, customText: "Efectivo BS" },
    { id: "pago_movil", name: "Pago Móvil", icon: null, customIcon: null, customSize: null, customText: "Pago Móvil" },
    { id: "pos", name: "Punto de Venta", icon: null, customIcon: null, customSize: null, customText: "Punto de Venta" },
  ];

  const handleCustomerSelect = (customer: Customer | null) => {
    // If customer is null, it means it was cleared. We default to 'Cliente General' implicitly.
    // If a customer is selected, we use their data.
    setSelectedCustomer(customer);
    // El botón "Continuar" en el modal se encargará de avanzar al siguiente paso
  };

  // Buscar cliente por cédula (para panel inline)
  const searchCustomerById = async (idNumber: string) => {
    if (!userProfile?.company_id || idNumber.trim().length < 3) return;
    
    setIsSearchingCustomer(true);
    setCustomerNotFound(false);
    
    try {
      // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, id_number, email, phone, address')
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .eq('id_number', idNumber.trim() as any)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data && !('code' in data)) {
        setSelectedCustomer(data as Customer);
        setCustomerNotFound(false);
        setShowRegistrationForm(false);
      } else {
        setCustomerNotFound(true);
        setNewCustomer(prev => ({ ...prev, id_number: idNumber.trim() }));
      }
    } catch (error) {
      console.error('Error searching customer:', error);
      toast({
        title: "Error",
        description: "Error al buscar el cliente",
        variant: "destructive"
      });
    } finally {
      setIsSearchingCustomer(false);
    }
  };
  
  // Crear nuevo cliente (para panel inline)
  const createNewCustomer = async () => {
    if (!userProfile?.company_id || !newCustomer.name.trim()) {
      console.error('❌ No se puede crear cliente:', { 
        hasUserProfile: !!userProfile, 
        company_id: userProfile?.company_id,
        hasName: !!newCustomer.name.trim() 
      });
      toast({
        title: "Error",
        description: "No se puede registrar el cliente. Verifica que estés autenticado correctamente.",
        variant: "destructive"
      });
      return;
    }
    
    const companyId = userProfile.company_id;
    console.log('✅ Creando cliente con company_id:', companyId);
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: newCustomer.name.trim(),
          id_number: newCustomer.id_number.trim() || null,
          email: newCustomer.email.trim() || null,
          phone: newCustomer.phone.trim() || null,
          address: newCustomer.address.trim() || null,
          company_id: companyId, // ✅ CRÍTICO: Incluir company_id
        } as any)
        .select('id, name, id_number, email, phone, address')
        .single();
      
      if (error) throw error;
      
      if (data && !('code' in data)) {
        setSelectedCustomer(data as Customer);
        setShowRegistrationForm(false);
        setCustomerNotFound(false);
        setNewCustomer({ name: '', id_number: '', phone: '', email: '', address: '' });
        
        toast({
          variant: "success",
          title: "Cliente registrado",
          description: `${(data as Customer).name} ha sido registrado exitosamente`,
        });
      }
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast({
        title: "Error",
        description: error?.message || "Error al registrar el cliente. Verifica que todos los campos requeridos estén completos.",
        variant: "destructive"
      });
    }
  };

  const handleBcvRateUpdate = (newRate: string) => {
    const rate = parseFloat(newRate);
    if (!isNaN(rate) && rate > 0) {
      setBcvRate(rate);
      setBcvRateInput(newRate);
      setIsEditingBcvRate(false);
    }
  };


  // ✅ LÓGICA LEGACY ELIMINADA:
  // - syncInvoiceSequence() - Buscaba MAX en frontend (race condition)
  // - invoiceExists() - Verificación no atómica
  // - reserveInvoiceNumber() - Generaba número en frontend (no atómico)
  // - commitInvoiceState() / revertInvoiceState() - Gestión de estado local
  // 
  // ✅ NUEVA ESTRATEGIA: El backend genera el número de factura atómicamente
  // usando una SEQUENCE de PostgreSQL. El frontend solo recibe y muestra el número.

  const syncPendingSales = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) return;
    if (syncingOfflineSalesRef.current) return;

    const queue = [...loadOfflineSales()];
    pendingOfflineSalesRef.current = queue;

    if (!queue.length) {
      return;
    }

    syncingOfflineSalesRef.current = true;
    let queueChanged = false;

    for (let i = 0; i < queue.length; i++) {
      const pendingSale = queue[i];
      try {
        // ✅ Ya no verificamos invoice_number porque el backend lo genera automáticamente
        const { data, error } = await supabase.rpc('process_sale', pendingSale.saleParams);
        if (error) {
          throw error;
        }
        if (!data) {
          throw new Error('No se recibió respuesta del servidor al sincronizar la venta.');
        }

        const saleId =
          typeof data === 'string'
            ? data
            : Array.isArray(data)
              ? (data[0] as any)?.id || (data[0] as any)?.sale_id
              : (data as any)?.id || (data as any)?.sale_id;

        if (!saleId) {
          throw new Error('No se pudo obtener el identificador de la venta sincronizada.');
        }

        // ✅ El invoice_number ya viene generado por el backend en la respuesta del RPC
        // No necesitamos actualizarlo manualmente

        queue.splice(i, 1);
        i--;
        queueChanged = true;
      } catch (error) {
        console.warn('Sincronización de venta pendiente falló:', error);
      }
    }

    persistOfflineSales(queue);
    pendingOfflineSalesRef.current = queue;
    syncingOfflineSalesRef.current = false;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      syncPendingSales();
    };

    window.addEventListener('online', handleOnline);

    if (navigator.onLine) {
      syncPendingSales();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncPendingSales]);

  // Helper function to normalize integer values (as suggested by Supabase)
  const normalizeInt = (value: any): number | null => {
      // If null/undefined/""/"null" → null
      if (value === null || value === undefined || value === "" || value === "null") return null;
      
      // If already a number → return it
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      
      // If string → try to parse as integer
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    };

    // Helper function to ensure numeric values are never empty strings
  const ensureNumeric = (value: any): number => {
      if (value === null || value === undefined || value === "" || value === "null") return 0;
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    };

  // Función para verificar ventas duplicadas
  const checkDuplicateSale = async (): Promise<{ isDuplicate: boolean; duplicateSale?: any }> => {
    if (!userProfile?.company_id || !resolvedStoreId) {
      return { isDuplicate: false };
    }

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalUSD = cartSubtotal;
    const customerId = selectedCustomer?.id || null;
    const paymentMethod = (isKreceEnabled || isCasheaEnabled)
      ? String(isKreceEnabled ? (kreceInitialPaymentMethod || 'cash_usd') : (casheaInitialPaymentMethod || 'cash_usd')).trim()
      : String(selectedPaymentMethod || 'cash_usd').trim();

    // Buscar ventas recientes (últimos 5 minutos) con características similares
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    try {
      let query = (supabase as any)
        .from('sales')
        .select(`
          id,
          invoice_number,
          total_usd,
          customer_id,
          payment_method,
          created_at,
          sale_items (
            product_id,
            qty,
            price_usd
          )
        `)
        // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
        .eq('store_id', resolvedStoreId) // ✅ KEEP: UI filter for selected store
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data: recentSales, error } = await query;

      if (error || !recentSales) {
        console.warn('Error verificando duplicados:', error);
        return { isDuplicate: false };
      }

      // Verificar cada venta reciente
      for (const sale of (recentSales as any[])) {
        // Comparar monto (con margen de 0.01 USD para errores de redondeo)
        if (Math.abs((sale.total_usd || 0) - totalUSD) > 0.01) {
          continue;
        }

        // Comparar método de pago
        if (sale.payment_method !== paymentMethod) {
          continue;
        }

        // Comparar items (misma cantidad de items y mismos productos con mismas cantidades)
        const saleItems = (sale.sale_items as any[]) || [];
        if (saleItems.length !== cart.length) {
          continue;
        }

        // Crear mapas de items para comparación
        const saleItemsMap = new Map<string, { qty: number; price: number }>();
        saleItems.forEach((item: any) => {
          const key = item.product_id;
          saleItemsMap.set(key, {
            qty: item.qty || 0,
            price: item.price_usd || 0
          });
        });

        const cartItemsMap = new Map<string, { qty: number; price: number }>();
        cart.forEach(item => {
          cartItemsMap.set(item.id, {
            qty: item.quantity,
            price: item.price
          });
        });

        // Comparar items
        let itemsMatch = true;
        if (saleItemsMap.size !== cartItemsMap.size) {
          itemsMatch = false;
        } else {
          for (const [productId, cartItem] of cartItemsMap.entries()) {
            const saleItem = saleItemsMap.get(productId);
            if (!saleItem || 
                saleItem.qty !== cartItem.qty || 
                Math.abs(saleItem.price - cartItem.price) > 0.01) {
              itemsMatch = false;
              break;
            }
          }
        }

        if (itemsMatch) {
          return { isDuplicate: true, duplicateSale: sale };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error verificando duplicados:', error);
      return { isDuplicate: false };
    }
  };

  // Función para preparar datos de pre-validación
  const preparePreValidationData = () => {
    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const currentPaymentMethod = (isKreceEnabled || isCasheaEnabled)
      ? (isKreceEnabled ? kreceInitialPaymentMethod : casheaInitialPaymentMethod)
      : selectedPaymentMethod;
    
    return {
      customer: selectedCustomer?.name || 'Cliente General',
      customer_id: selectedCustomer?.id_number || null,
      items: cart.map(item => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        imei: item.imei,
        imeis: item.imeis
      })),
      subtotal_usd: cartSubtotal,
      tax_usd: cartSubtotal * taxRate,
      total_usd: cartSubtotal + (cartSubtotal * taxRate),
      total_bs: (cartSubtotal + (cartSubtotal * taxRate)) * bcvRate,
      bcv_rate: bcvRate,
      payment_method: currentPaymentMethod,
      store_name: selectedStore?.name || 'No asignada',
      is_krece_enabled: isKreceEnabled || isCasheaEnabled,
      krece_initial_amount: isKreceEnabled ? kreceInitialAmount : (isCasheaEnabled ? casheaInitialAmount : 0),
      krece_financed_amount: isKreceEnabled ? (cartSubtotal - kreceInitialAmount) : (isCasheaEnabled ? (cartSubtotal - casheaInitialAmount) : 0),
      is_mixed_payment: isMixedPayment,
      mixed_payments: mixedPayments
    };
  };

  // Función para abrir modal de pre-validación
  const handleOpenPreValidation = () => {
    // Validaciones básicas antes de abrir el modal
    if (cart.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos al carrito antes de procesar la venta.",
        variant: "destructive",
      });
      return;
    }

    if (!userProfile) {
      toast({
        title: "Error de autenticación",
        description: "No hay usuario autenticado. Por favor, inicia sesión nuevamente.",
        variant: "destructive",
      });
      return;
    }

    if (!isMixedPayment) {
      const isFinancingActive = isKreceEnabled || isCasheaEnabled;
      const currentPaymentMethod = isFinancingActive
        ? (isKreceEnabled ? kreceInitialPaymentMethod : casheaInitialPaymentMethod)
        : selectedPaymentMethod;

      if (!currentPaymentMethod) {
        toast({
          title: "Método de pago requerido",
          description: "Debe seleccionar un método de pago antes de procesar la venta.",
          variant: "destructive",
        });
        return;
      }
    }

    if (isMixedPayment && mixedPayments.length === 0) {
      toast({
        title: "Pagos mixtos requeridos",
        description: "Debe agregar al menos un método de pago mixto.",
        variant: "destructive",
      });
      return;
    }

    // Avanzar al Step 5 (Resumen) en lugar de abrir modal directamente
    setCurrentStep(5);
  };

  const processSale = async () => {
    // Prevenir procesamiento múltiple simultáneo
    if (isProcessingSale) {
      return;
    }

    // Validaciones básicas
    if (cart.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos al carrito antes de procesar la venta.",
        variant: "destructive",
      });
      return;
    }

    if (!userProfile) {
      toast({
        title: "Error de autenticación",
        description: "No hay usuario autenticado. Por favor, inicia sesión nuevamente.",
        variant: "destructive",
      });
      return;
    }

    // Validar método de pago (considerando financiamiento)
    if (!isMixedPayment) {
      const isFinancingActive = isKreceEnabled || isCasheaEnabled;
      const currentPaymentMethod = isFinancingActive
        ? (isKreceEnabled ? kreceInitialPaymentMethod : casheaInitialPaymentMethod)
        : selectedPaymentMethod;

      if (!currentPaymentMethod) {
        toast({
          title: "Método de pago requerido",
          description: "Debe seleccionar un método de pago antes de procesar la venta.",
          variant: "destructive",
        });
        return;
      }
    }

    if (isMixedPayment && mixedPayments.length === 0) {
      toast({
        title: "Pagos mixtos requeridos",
        description: "Debe agregar al menos un método de pago mixto.",
        variant: "destructive",
      });
      return;
    }

    // Validar stock
    for (const item of cart) {
      const availableStock = await getProductStock(item.id);
      if (item.quantity > availableStock) {
        toast({
          variant: "warning",
          title: "Stock insuficiente",
          description: `No hay suficiente stock para: ${item.name}. Disponible: ${availableStock}`,
        });
        return;
      }
    }

    // Verificar ventas duplicadas
    const duplicateCheck = await checkDuplicateSale();
    if (duplicateCheck.isDuplicate) {
      toast({
        title: "⚠️ Posible venta duplicada",
        description: `Se detectó una venta similar realizada recientemente (Factura: ${duplicateCheck.duplicateSale?.invoice_number || 'N/A'}). Verifica los datos de facturación antes de continuar.`,
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    // Iniciar procesamiento
    setIsProcessingSale(true);

    // ✅ LÓGICA LEGACY ELIMINADA: Ya no necesitamos reservar números de factura

    try {
      // Validar que hay una tienda disponible
      if (!resolvedStoreId) {
        toast({
          title: "Tienda requerida",
          description: "Debe seleccionar una tienda antes de procesar la venta.",
          variant: "destructive",
        });
        setIsProcessingSale(false);
        return;
      }
      
      const isRestrictedUser = userProfile?.role === 'cashier' || userProfile?.role === 'manager';
      
      if (isRestrictedUser && !(userProfile as any)?.assigned_store_id) {
        toast({
          title: "Error de configuración",
          description: "No tienes una tienda asignada. Contacta al administrador.",
          variant: "destructive",
        });
        setIsProcessingSale(false);
        return;
      }
      
      const storeId = resolvedStoreId;
      
      if (!storeId) {
        toast({
          title: "Error",
          description: "No se ha seleccionado una tienda",
          variant: "destructive"
        });
        setIsProcessingSale(false);
        return;
      }

      // Calcular totales
      const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalUSD = cartSubtotal;

      // Validar pagos mixtos
      if (isMixedPayment) {
        const mixedTotal = mixedPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        if (isKreceEnabled || isCasheaEnabled) {
          const financingInitialAmount = isKreceEnabled ? kreceInitialAmount : 
                                         isCasheaEnabled ? casheaInitialAmount : 0;
          const financingType = isKreceEnabled ? 'KRece' : 
                                isCasheaEnabled ? 'Cashea' : '';
          
          if (financingInitialAmount > 0 && Math.abs(mixedTotal - financingInitialAmount) > 0.01) {
            toast({
              title: "Error en pagos mixtos",
              description: `Con ${financingType} activo, el total de pagos mixtos ($${mixedTotal.toFixed(2)}) debe coincidir con la inicial ($${financingInitialAmount.toFixed(2)})`,
              variant: "destructive",
            });
            setIsProcessingSale(false);
            return;
          }
        } else {
          if (Math.abs(mixedTotal - totalUSD) > 0.01) {
            toast({
              title: "Error en pagos mixtos",
              description: `El total de pagos mixtos ($${mixedTotal.toFixed(2)}) no coincide con el total de la venta ($${totalUSD.toFixed(2)})`,
              variant: "destructive",
            });
            setIsProcessingSale(false);
            return;
          }
        }
      }

      // ✅ LÓGICA LEGACY ELIMINADA: Ya no reservamos números de factura en el frontend
      // El backend genera el número de forma atómica usando una SEQUENCE de PostgreSQL

      // PREPARAR ITEMS DE VENTA
      const saleItems = cart.flatMap(item => {
        // Validación y corrección de precio
        let cleanPrice = Math.max(0, Number(item.price) || 0);
        
        if (cleanPrice === 0 && item.originalPrice && item.originalPrice > 0) {
          cleanPrice = item.originalPrice;
        }
        
        if (cleanPrice === 0) {
          const productFromList = products.find(p => p.id === item.id);
          if (productFromList?.sale_price_usd && productFromList.sale_price_usd > 0) {
            cleanPrice = productFromList.sale_price_usd;
          }
        }
        
        // Validación y corrección de nombre
        let cleanName = String(item.name || '').trim();
        const genericNames = ['Producto sin nombre', 'S/SKU', 'Producto', 'N/A', ''];
        const isGenericName = !cleanName || genericNames.some(generic => 
          cleanName.toLowerCase().includes(generic.toLowerCase())
        );
        
        if (isGenericName || !cleanName) {
          const productFromList = products.find(p => p.id === item.id);
          if (productFromList?.name && productFromList.name.trim()) {
            cleanName = productFromList.name.trim();
          } else {
            cleanName = `Producto ${item.sku || item.id}`;
          }
        }
        
        const cleanSku = String(item.sku || 'SKU-000').trim();
        
        const finalItem = {
          product_id: item.id,
          qty: item.quantity,
          price_usd: cleanPrice,
          product_name: cleanName,
          product_sku: cleanSku,
          imei: item.category === 'phones' && item.imeis && item.imeis.length > 0 ? null : (item.imei ? String(item.imei).trim() : null)
        };
        
        // Si es un teléfono con múltiples IMEIs, crear un item por cada IMEI
        if (item.category === 'phones' && item.imeis && item.imeis.length > 0) {
          return item.imeis.map(imei => ({
            ...finalItem,
            qty: 1,
            imei: String(imei).trim()
          }));
        } else {
          return [finalItem];
        }
      });

      // PREPARAR PAGOS MIXTOS
      const mixedPaymentsData = isMixedPayment ? mixedPayments.map(payment => {
        const cleanMethod = String(payment.method || 'unknown').trim();
        const cleanAmount = Math.max(0, Number(payment.amount) || 0);
        
        return {
          method: cleanMethod,
          amount: cleanAmount
        };
      }) : [];

      // PARÁMETROS PARA RPC
      const saleParams = {
        p_company_id: userProfile.company_id,
        p_store_id: storeId,
        p_cashier_id: userProfile.id,
        p_customer_id: selectedCustomer?.id || null,
        p_payment_method: (isKreceEnabled || isCasheaEnabled) ? String(isKreceEnabled ? (kreceInitialPaymentMethod || 'cash_usd') : (casheaInitialPaymentMethod || 'cash_usd')).trim() : String(selectedPaymentMethod || 'cash_usd').trim(),
        p_customer_name: String(selectedCustomer?.name || 'Cliente General').trim(),
        p_bcv_rate: Number(bcvRate) || 41.73,
        p_customer_id_number: selectedCustomer?.id_number ? String(selectedCustomer.id_number).trim() : null,
        p_items: saleItems,
        p_notes: (isKreceEnabled || isCasheaEnabled) ? (isKreceEnabled ? 'financing_type:krece' : 'financing_type:cashea') : null,
        p_tax_rate: Number(getTaxRate()) / 100,
        p_krece_enabled: Boolean(isKreceEnabled || isCasheaEnabled),
        p_krece_initial_amount_usd: Number(isKreceEnabled ? kreceInitialAmount : (isCasheaEnabled ? casheaInitialAmount : 0)) || 0,
        p_krece_financed_amount_usd: isKreceEnabled ? Number(cartSubtotal - kreceInitialAmount) || 0 :
                                     isCasheaEnabled ? Number(cartSubtotal - casheaInitialAmount) || 0 : 0,
        p_krece_initial_percentage: isKreceEnabled && cartSubtotal > 0 ? Number((kreceInitialAmount / cartSubtotal) * 100) || 0 :
                                    isCasheaEnabled && cartSubtotal > 0 ? Number((casheaInitialAmount / cartSubtotal) * 100) || 0 : 0,
        p_is_mixed_payment: Boolean(isMixedPayment),
        p_mixed_payments: mixedPaymentsData
      };

      // ====================================================================================
      // 🎯 PUNTO CRÍTICO: LLAMADA AL RPC process_sale
      // ====================================================================================
      const { data, error } = await supabase.rpc('process_sale', saleParams);

      if (error) {
        console.error('Error al procesar la venta:', error);

        // Manejar errores de red guardando venta offline
        if (isNetworkError(error)) {
          const updatedQueue = storeOfflineSale({
            saleParams,
            cartSnapshot: cart,
            customer: selectedCustomer,
            createdAt: new Date().toISOString(),
            store_id: storeId,
            total_usd: totalUSD,
          });
          if (updatedQueue) {
            pendingOfflineSalesRef.current = updatedQueue;
          }
          alert(
            `La venta se almacenó temporalmente por falla de red. Se procesará automáticamente cuando se restablezca la conexión.`
          );
        } else {
          toast({
            title: "Error al procesar venta",
            description: error.message || "Ocurrió un error inesperado. Por favor, intenta nuevamente.",
            variant: "destructive",
          });
        }
        setIsProcessingSale(false);
        return;
      }

      if (!data) {
        toast({
          title: "Error del servidor",
          description: "No se recibió respuesta del servidor. Por favor, intenta nuevamente.",
          variant: "destructive",
        });
        setIsProcessingSale(false);
        return;
      }

      // ✅ NUEVO: Extraer sale_id e invoice_number de la respuesta del RPC
      const saleId =
        typeof data === 'string'
          ? data
          : (data as any)?.sale_id
          ? (data as any).sale_id
          : Array.isArray(data) && (data[0] as any)?.sale_id
          ? (data[0] as any).sale_id
          : (data as any)?.id
          ? (data as any).id
          : Array.isArray(data) && (data[0] as any)?.id
          ? (data[0] as any).id
          : null;

      // ✅ NUEVO: Extraer invoice_number generado por el backend
      const invoiceNumber =
        (data as any)?.invoice_number ||
        (Array.isArray(data) && (data[0] as any)?.invoice_number) ||
        null;

      if (!saleId) {
        console.error('No se recibió un identificador válido para la venta:', data);
        toast({
          title: "Error de identificación",
          description: "No se pudo identificar la venta procesada. Por favor, intenta nuevamente.",
          variant: "destructive",
        });
        setIsProcessingSale(false);
        return;
      }

      // ====================================================================================
      // ✅ AISLAMIENTO DEL ÉXITO PERSISTIDO - PRIORIDAD ABSOLUTA
      // ====================================================================================
      // La venta fue procesada exitosamente. Declarar éxito INMEDIATAMENTE antes de
      // cualquier operación secundaria que pueda fallar.
      // ====================================================================================

      // Guardar snapshot del carrito para el modal (antes de limpiar)
      const cartSnapshot = [...cart];
      const customerSnapshot = selectedCustomer;

      // Limpiar formulario INMEDIATAMENTE (la venta ya está persistida)
      setCart([]);
      setSelectedCustomer(null);
      setSelectedPaymentMethod("");
      setIsKreceEnabled(false);
      setKreceInitialAmount(0);
      setIsCasheaEnabled(false);
      setCasheaInitialAmount(0);
      setIsMixedPayment(false);
      setMixedPayments([]);
      
      // Establecer estado de venta completada
      setIsSaleConfirmedAndCompleted(true);
      
      // ✅ NUEVO: El invoice_number ya viene en la respuesta del RPC
      // Si no viene, lo obtenemos de la base de datos como fallback
      let finalInvoiceNumber = invoiceNumber;
      
      // Fallback: Si el RPC no retornó el invoice_number, obtenerlo de la base de datos
      if (!finalInvoiceNumber) {
        try {
          const saleRowResponse = await supabase
            .from('sales')
            .select('invoice_number')
            .eq('id', saleId)
            .maybeSingle();

          if (!saleRowResponse.error && saleRowResponse.data && !('code' in saleRowResponse.data)) {
            finalInvoiceNumber = (saleRowResponse.data as { invoice_number: string | null }).invoice_number || null;
          }
        } catch (fetchError) {
          console.warn('No se pudo obtener el número de factura (no crítico):', fetchError);
        }
      }

      // Mostrar toast de éxito
      toast({
        variant: "success",
        title: "Venta completada",
        description: finalInvoiceNumber 
          ? `Venta procesada exitosamente. Factura: ${finalInvoiceNumber}`
          : `Venta procesada exitosamente.`,
        duration: 3000,
      });

      // ====================================================================================
      // OPERACIÓN SECUNDARIA: Obtención de Datos de Tienda (Información Fiscal)
      // ====================================================================================
      let storeInfo: any = {};

      // ====================================================================================
      // OPERACIÓN SECUNDARIA 3: Obtención de Datos de Tienda (Información Fiscal)
      // ====================================================================================
      try {
        if (selectedStore) {
          // Usar la tienda seleccionada con información fiscal completa
          storeInfo = {
            name: selectedStore.name,
            business_name: selectedStore.business_name,
            tax_id: selectedStore.tax_id,
            fiscal_address: selectedStore.fiscal_address,
            phone_fiscal: selectedStore.phone_fiscal,
            email_fiscal: selectedStore.email_fiscal
          };
        } else if ((userProfile as any)?.assigned_store_id) {
          // Fallback: usar la tienda asignada al usuario
          const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('id, name, business_name, tax_id, fiscal_address, phone_fiscal, email_fiscal')
            .eq('id', (userProfile as any).assigned_store_id)
            .single();
          
          if (!storeError && storeData) {
            storeInfo = {
              name: (storeData as any).name,
              business_name: (storeData as any).business_name,
              tax_id: (storeData as any).tax_id,
              fiscal_address: (storeData as any).fiscal_address,
              phone_fiscal: (storeData as any).phone_fiscal,
              email_fiscal: (storeData as any).email_fiscal
            };
          }
        }
      } catch (storeError) {
        console.warn('Error obteniendo información de la tienda (no crítico):', storeError);
        // Usar objeto vacío como fallback - no interrumpe el flujo
        storeInfo = {};
      }

      // ====================================================================================
      // FLUJO FINAL DE PRESENTACIÓN
      // ====================================================================================
      // Preparar datos para el modal usando información obtenida con resiliencia
      // ====================================================================================

      // Preparar items para la factura (usar snapshot del carrito)
      const invoiceItems = cartSnapshot.flatMap(item => {
        if (item.category === 'phones' && item.imeis && item.imeis.length > 0) {
          return item.imeis.map(imei => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            imei: imei
          }));
        } else {
          return [{
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            imei: item.imei
          }];
        }
      });

      // Preparar datos para el modal
      const saleData = {
        sale_id: saleId,
        invoice_number: finalInvoiceNumber,
        customer: customerSnapshot?.name || 'Cliente General',
        customer_id: customerSnapshot?.id_number || null,
        items: invoiceItems,
        subtotal_usd: cartSubtotal,
        tax_amount_usd: 0,
        total_usd: totalUSD,
        total_bs: totalUSD * bcvRate,
        bcv_rate: bcvRate,
        payment_method: (isKreceEnabled || isCasheaEnabled) 
          ? (isKreceEnabled ? kreceInitialPaymentMethod : casheaInitialPaymentMethod)
          : selectedPaymentMethod,
        sale_date: new Date().toISOString(),
        store_info: storeInfo,
        cashier_name: userProfile.name || 'Sistema',
        krece_enabled: isKreceEnabled || isCasheaEnabled,
        krece_initial_amount: isKreceEnabled ? kreceInitialAmount : 
                              isCasheaEnabled ? casheaInitialAmount : 0,
        krece_financed_amount: isKreceEnabled ? (cartSubtotal - kreceInitialAmount) :
                               isCasheaEnabled ? (cartSubtotal - casheaInitialAmount) : 0,
        krece_initial_percentage: isKreceEnabled && cartSubtotal > 0 ? ((kreceInitialAmount / cartSubtotal) * 100) :
                                  isCasheaEnabled && cartSubtotal > 0 ? ((casheaInitialAmount / cartSubtotal) * 100) : 0,
        financing_type: isKreceEnabled ? 'krece' : (isCasheaEnabled ? 'cashea' : null)
      };

      // Mostrar modal de completado
      setCompletedSaleData(saleData);
      setShowSaleModal(true);
      
      // Finalizar procesamiento
      setIsProcessingSale(false);
      
      console.log('Venta procesada exitosamente:', data);
      
    } catch (error) {
      // Este catch solo debe capturar errores del RPC principal o errores inesperados
      console.error('Error crítico al procesar la venta:', error);
      
      toast({
        title: "Error al procesar venta",
        description: (error as Error).message || "Ocurrió un error inesperado. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      setIsProcessingSale(false);
    }
  };

  const generateThermalReceipt = (saleData: any) => {
    const receiptContent = `
FACTURA DE VENTA
================
Factura: ${saleData.invoice_number}
Fecha: ${new Date().toLocaleString('es-VE')}
Cliente: ${saleData.customer}
${saleData.customer_id ? `CI/RIF: ${saleData.customer_id}` : ''}

PRODUCTOS:
${saleData.items.map((item: any) => 
  `${item.name}
  ${item.quantity} x Bs ${(item.price * saleData.bcv_rate).toFixed(2)} = Bs ${(item.price * item.quantity * saleData.bcv_rate).toFixed(2)}`
).join('\n')}

================
Subtotal: Bs ${saleData.total_bs ? (saleData.subtotal_usd * saleData.bcv_rate).toFixed(2) : (saleData.subtotal_usd * bcvRate).toFixed(2)}
                IVA ({getTaxRate()}%): Bs ${saleData.total_bs ? (saleData.tax_amount_usd * saleData.bcv_rate).toFixed(2) : (saleData.tax_amount_usd * bcvRate).toFixed(2)}
TOTAL: Bs ${saleData.total_bs ? saleData.total_bs.toFixed(2) : (saleData.total_usd * bcvRate).toFixed(2)}

Tasa BCV: Bs ${saleData.bcv_rate || bcvRate}
Método: ${paymentMethods.find(m => m.id === selectedPaymentMethod)?.name}
${saleData.krece_enabled ? `
================
${saleData.financing_type === 'cashea' ? 'Cashea' : 'Krece'} Financiamiento:
Inicial: $${saleData.krece_initial_amount.toFixed(2)} (${saleData.krece_initial_percentage.toFixed(1)}%)
A financiar: $${saleData.krece_financed_amount.toFixed(2)}
================` : ''}

¡Gracias por su compra!
================
    `.trim();

    // Create printable window for 44mm thermal receipt
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Factura</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.2;
                margin: 0;
                padding: 5px;
                width: 44mm;
                max-width: 44mm;
              }
              @media print {
                body { margin: 0; padding: 2px; }
                @page { size: 44mm auto; margin: 0; }
              }
            </style>
          </head>
          <body>
            <pre>${receiptContent}</pre>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 1000);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Validar que cajeros tengan tienda asignada
  if (userProfile?.role === 'cashier' && !userProfile?.assigned_store_id) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="p-6 max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-sm bg-yellow-500/20 flex items-center justify-center shadow-md shadow-yellow-500/50 border-none">
              <Store className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Tienda no asignada</h2>
              <p className="text-muted-foreground mb-4">
                Tu cuenta no tiene una tienda asignada. Contacta al administrador para que te asigne una tienda y puedas comenzar a realizar ventas.
              </p>
              <p className="text-sm text-muted-foreground">
                Una vez asignada una tienda, podrás ver los productos, consultar el inventario y realizar ventas desde esa sucursal.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Validar que haya tienda disponible (para cajeros debe estar asignada, para otros debe estar seleccionada)
  if (!resolvedStoreId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="p-6 max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-sm bg-orange-500/20 flex items-center justify-center shadow-md shadow-orange-500/50 border-none">
              <Store className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Tienda no disponible</h2>
              <p className="text-muted-foreground mb-4">
                {userProfile?.role === 'cashier' 
                  ? 'Tu tienda asignada no está disponible. Contacta al administrador.'
                  : 'Debes seleccionar una tienda para continuar.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* ===== HEADER PRINCIPAL (Igual al Modal) ===== */}
      <div className="flex-shrink-0 border-b p-4">
        <div className="flex items-center justify-between">
          {/* Título */}
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold">Punto de Venta</h1>
          </div>
          
          {/* Tasa BCV */}
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Tasa BCV:</span>
            <span className="font-bold text-primary">Bs {bcvRate.toFixed(2)}</span>
          </div>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {[
            { num: 1, label: 'Tienda', icon: Store },
            { num: 2, label: 'Cliente', icon: User },
            { num: 3, label: 'Productos', icon: ShoppingCart },
            { num: 4, label: 'Pago', icon: CreditCard },
            { num: 5, label: 'Resumen', icon: Check },
          ].map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            const canNavigate = step.num < currentStep;
            
            return (
              <React.Fragment key={step.num}>
                <button
                  onClick={() => canNavigate && setCurrentStep(step.num)}
                  disabled={!canNavigate}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : isCompleted 
                        ? 'bg-accent-hover/20 text-accent-primary hover:bg-accent-hover/30 cursor-pointer' 
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < 4 && (
                  <div className={`w-6 h-0.5 ${currentStep > step.num ? 'bg-accent-primary' : 'bg-muted'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        {/* Info Bar: Tienda + Cliente (visible después de seleccionar) */}
        {currentStep > 1 && selectedStore && (
          <div className="flex items-center gap-4 mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
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
      </div>
      
      {/* ===== CONTENIDO PRINCIPAL (Scrollable) ===== */}
      <div className="flex-1 overflow-y-auto p-4">

      {/* ========== STEP 1: Selección de Tienda (PANEL INLINE) ========== */}
      {currentStep === 1 && (
        <Card className="p-6 glass-card border border-green-500/30 animate-fade-in">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Tienda de Operación</h2>
            <p className="text-muted-foreground mb-6">
              {isRestrictedToStore 
                ? `Operando desde: ${selectedStore?.name || 'Tu tienda asignada'}`
                : 'Elige la sucursal desde donde realizarás la venta'
              }
            </p>
            
            {storeLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : availableStores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>No hay tiendas disponibles</p>
              </div>
            ) : isRestrictedToStore ? (
              // Para managers y cajeros: mostrar solo su tienda asignada (sin selector)
              <div className="py-8">
                <Card className="p-6 bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-center gap-3">
                    <Store className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-lg font-bold">{selectedStore?.name}</p>
                      <p className="text-sm text-muted-foreground">Tienda asignada</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              // Para admins: mostrar selector de tiendas
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableStores.map((store) => (
                  <Button
                    key={store.id}
                    variant={selectedStore?.id === store.id ? "default" : "outline"}
                    className={`h-auto p-4 justify-start ${
                      selectedStore?.id === store.id 
                        ? 'bg-primary glow-primary' 
                        : 'hover:bg-primary/10 hover:border-primary'
                    }`}
                    onClick={() => {
                      setSelectedStore(store);
                      setHasSelectedStoreInSession(true);
                    }}
                  >
                    <Store className="w-5 h-5 mr-3" />
                    <span className="font-semibold">{store.name}</span>
                  </Button>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => {
                  // Si es manager/cashier, asegurar que la tienda esté seleccionada
                  if (isRestrictedToStore && selectedStore) {
                    setHasSelectedStoreInSession(true);
                  }
                  setCurrentStep(2);
                }}
                disabled={!selectedStore || (!isRestrictedToStore && !hasSelectedStoreInSession)}
                className="bg-primary glow-primary px-8"
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ========== STEP 2: Identificación de Cliente (PANEL INLINE) ========== */}
      {currentStep === 2 && (
        <Card className="p-6 glass-card border border-green-500/30 animate-fade-in">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Identifica al Cliente</h2>
              <p className="text-muted-foreground">
                Busca por Cédula o RIF para validar el cliente
              </p>
            </div>
            
            {/* Si ya hay cliente seleccionado, mostrar info */}
            {selectedCustomer ? (
              <Card className="p-4 bg-accent-hover/10 border border-accent-primary/30 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-accent-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedCustomer.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.id_number}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setIdSearchTerm('');
                      setCustomerNotFound(false);
                      setShowRegistrationForm(false);
                    }}
                  >
                    Cambiar Cliente
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Buscador de cliente */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Ingresa la Cédula o RIF..."
                        value={idSearchTerm}
                        onChange={(e) => setIdSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && idSearchTerm.trim().length >= 3) {
                            searchCustomerById(idSearchTerm);
                          }
                        }}
                        className="pl-10 h-12 text-lg"
                      />
                    </div>
                    <Button
                      onClick={() => searchCustomerById(idSearchTerm)}
                      disabled={idSearchTerm.trim().length < 3 || isSearchingCustomer}
                      className="h-12 px-6"
                    >
                      {isSearchingCustomer ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {idSearchTerm.trim().length > 0 && idSearchTerm.trim().length < 3 && (
                    <p className="text-xs text-muted-foreground">Ingresa al menos 3 caracteres para buscar</p>
                  )}
                </div>
                
                {/* Cliente no encontrado - Mostrar registro */}
                {customerNotFound && !showRegistrationForm && (
                  <Card className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <p className="font-medium">Cliente no registrado</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      La cédula <span className="font-mono font-bold">{idSearchTerm}</span> no está en el sistema.
                    </p>
                    <Button
                      onClick={() => setShowRegistrationForm(true)}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      Registrar Nuevo Cliente
                    </Button>
                  </Card>
                )}
                
                {/* Formulario de registro inline */}
                {showRegistrationForm && (
                  <Card className="mt-4 p-4 bg-zinc-900/80 border border-green-500/30 animate-in slide-in-from-top">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-green-500" />
                      Registrar Nuevo Cliente
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Cédula / RIF</Label>
                        <Input
                          value={newCustomer.id_number}
                          disabled
                          className="font-mono bg-muted/50"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Nombre Completo *</Label>
                        <Input
                          placeholder="Ej: Juan Pérez"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Teléfono (opcional)</Label>
                          <Input
                            placeholder="04XX-XXXXXXX"
                            value={newCustomer.phone}
                            onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Email (opcional)</Label>
                          <Input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={newCustomer.email}
                            onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Dirección (opcional)</Label>
                        <Input
                          placeholder="Dirección del cliente"
                          value={newCustomer.address}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowRegistrationForm(false);
                            setNewCustomer({ name: '', id_number: '', phone: '', email: '', address: '' });
                          }}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={createNewCustomer}
                          disabled={!newCustomer.name.trim()}
                          className="flex-1"
                        >
                          Registrar y Continuar
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
            
            {/* Botones de navegación */}
            <div className="mt-6 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!selectedCustomer}
                className="bg-primary glow-primary"
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ========== STEP 3: Productos/Carrito (2 COLUMNAS COMO EL MODAL) ========== */}
      {currentStep === 3 && (
        <div className="flex flex-col h-full animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* Columna Izquierda: Búsqueda de Productos */}
            <div className="flex flex-col gap-3 overflow-hidden">
            {/* Search Bar */}
            <Card className="p-4 glass-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={scanMode ? "Escanear código de barras..." : "Buscar productos..."}
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  if (!scanMode) {
                    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
                    searchDebounceRef.current = window.setTimeout(() => {
                      if (val.trim().length > 0) {
                        setHasSearched(true);
                        searchProducts(val);
                      } else {
                        setProducts([]);
                        setHasSearched(false);
                      }
                    }, 300);
                  }
                }}
                ref={searchInputRef}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    if (scanMode) {
                      await handleBarcodeScanned(searchTerm.trim());
                      setSearchTerm("");
                      setTimeout(() => searchInputRef.current?.focus(), 0);
                    } else {
                      await searchProducts(searchTerm);
                      setHasSearched(true);
                    }
                  }
                }}
                className="pl-10 pr-4 h-12 text-lg glass-card border border-green-500/30 shadow-md shadow-green-500/40 focus:shadow-lg focus:shadow-green-500/50 focus:glow-primary"
              />
            </div>
            <Button 
              size="sm" 
              variant={scanMode ? "default" : "outline"}
              className={scanMode ? "px-3 bg-primary glow-primary" : "px-3 hover-glow"}
              title={scanMode ? "Modo escáner activo" : "Activar modo escáner"}
              onClick={() => setScanMode((v) => !v)}
            >
              <Scan className="w-4 h-4" />
            </Button>
          </div>
            {!scanMode && <div className="mt-3 text-sm text-muted-foreground">Escriba para buscar…</div>}
          </Card>

          {/* Products toolbar */}
          <div className="flex items-center justify-between shrink-0">
            <div className="text-sm text-muted-foreground">
            {isSearching ? 'Buscando...' : `${filteredProducts.length} productos`}
          </div>
          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PRODUCT_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant={productView==='cards'? 'default':'outline'} size="sm" onClick={() => setProductView('cards')}>Cards</Button>
            <Button variant={productView==='list'? 'default':'outline'} size="sm" onClick={() => setProductView('list')}>Lista</Button>
            </div>
          </div>

          {/* Products View (Scrollable) */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ maxHeight: 'calc(60vh - 8rem)' }}>
            {!hasSearched ? (
            <div className="col-span-full text-center py-8">
              <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Escriba para buscar o escanee un código</p>
            </div>
          ) : isSearching ? (
            <div className="col-span-full text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Buscando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </div>
          ) : (
            productView === 'cards' ? (
              filteredProducts.map((product) => (
                <Card key={product.id} className="p-4 glass-card hover-glow cursor-pointer" onClick={() => addToCart(product).catch(console.error)}>
                  <div className="flex items-center gap-4 min-h-[56px]">
                    <div className="w-12 h-12 rounded-sm bg-gradient-glow flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-medium text-sm truncate">{product.name}</h3>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="truncate">{product.sku}</span>
                        {product.barcode && <span className="truncate">CB: {product.barcode}</span>}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold whitespace-nowrap ml-auto">
                      <div>${ (product.sale_price_usd ?? 0).toFixed(2) }</div>
                      <div className={`text-xs font-medium ${productStock[product.id] > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Stock: {productStock[product.id] || 0}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="grid grid-cols-12 items-center gap-3 p-4 rounded-sm glass-card border border-green-500/30 shadow-md shadow-green-500/40 hover:shadow-lg hover:shadow-green-500/50 cursor-pointer min-h-[56px]" onClick={() => addToCart(product).catch(console.error)}>
                  <div className="col-span-5 truncate text-sm pr-2">{product.name}</div>
                  <div className="col-span-2 font-mono text-xs text-muted-foreground truncate pr-2">{product.sku}</div>
                  <div className="col-span-2 text-xs text-muted-foreground truncate pr-2">{product.barcode ?? '-'}</div>
                  <div className="col-span-1 text-xs text-muted-foreground truncate">{product.category ?? '-'}</div>
                  <div className="col-span-2 text-right">
                    <div className="text-sm font-semibold whitespace-nowrap">${(product.sale_price_usd ?? 0).toFixed(2)}</div>
                    <div className={`text-xs font-medium ${productStock[product.id] > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Stock: {productStock[product.id] || 0}
                    </div>
                  </div>
                </div>
              ))
            )
            )}
          </div>

          </div>

          {/* Columna Derecha: Carrito */}
          <div className="flex flex-col gap-3 overflow-hidden">
            <Card className="glass-card flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-green-500/30">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Carrito
                </h3>
                <Badge variant="secondary">{cart.length} {cart.length === 1 ? 'producto' : 'productos'}</Badge>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center h-full">
                    <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-lg">Carrito vacío</p>
                    <p className="text-sm">Busca productos a la izquierda para agregarlos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <Card key={item.id} className="p-3 border border-green-500/20">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-destructive hover:bg-destructive/10"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed">
                          {/* Precio */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              value={priceInputs[item.id] ?? item.price.toFixed(2)}
                              onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
                              onBlur={() => commitUnitPrice(item)}
                              className="w-20 h-8 text-sm text-right"
                              step="0.01"
                            />
                          </div>
                          
                          {/* Cantidad */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-7 h-7"
                              onClick={() => updateQuantity(item.id, -1).catch(console.error)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-7 h-7"
                              onClick={() => updateQuantity(item.id, 1).catch(console.error)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* Subtotal */}
                          <div className="text-right">
                            <p className="font-bold text-green-600">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                        
                        {/* IMEI Inputs Inline para teléfonos */}
                        {item.category === 'phones' && item.quantity > 0 && (
                          <div className="mt-3 pt-3 border-t border-dashed border-muted-foreground/30 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Smartphone className="w-3 h-3" />
                              <span>Registrar IMEI por unidad ({item.imeis?.filter(i => i?.trim() && i.trim().length >= 15).length || 0}/{item.quantity})</span>
                              {(item.imeis?.filter(i => i?.trim() && i.trim().length >= 15).length || 0) === item.quantity && (
                                <Check className="w-3 h-3 text-green-500" />
                              )}
                            </div>
                            <div className="space-y-1">
                              {Array.from({ length: item.quantity }, (_, index) => {
                                const imeiValue = item.imeis?.[index] || '';
                                const isValidLength = imeiValue.trim().length >= 15 && imeiValue.trim().length <= 17;
                                const hasValue = imeiValue.trim().length > 0;
                                const isInvalidLength = hasValue && !isValidLength;
                                
                                return (
                                  <div key={index} className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-12 flex-shrink-0">
                                      Equipo {index + 1}:
                                    </span>
                                    <Input
                                      type="text"
                                      placeholder="Escanear o ingresar IMEI (15-17 dígitos)"
                                      value={imeiValue}
                                      onChange={(e) => updateIMEI(item.id, index, e.target.value)}
                                      className={`h-8 text-xs font-mono flex-1
                                        bg-background dark:bg-zinc-900
                                        ${isValidLength 
                                          ? 'border-green-500 dark:border-green-600 text-green-700 dark:text-green-400' 
                                          : isInvalidLength 
                                            ? 'border-red-500 dark:border-red-600 text-red-700 dark:text-red-400' 
                                            : 'border-amber-400 dark:border-amber-600'
                                        }`}
                                    />
                                    {isValidLength && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                    {isInvalidLength && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                            {/* Mensaje de validación */}
                            {(() => {
                              const validImeis = item.imeis?.filter(i => i?.trim() && i.trim().length >= 15 && i.trim().length <= 17).length || 0;
                              const missingImeis = item.quantity - validImeis;
                              if (missingImeis > 0) {
                                return (
                                  <div className="flex items-center gap-1 text-xs text-amber-500">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Faltan {missingImeis} IMEI(s) por registrar</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Subtotal del carrito */}
              {cart.length > 0 && (
                <div className="p-3 border-t border-green-500/30 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Subtotal:</span>
                    <span className="text-xl font-bold text-green-600">${subtotalUSD.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </Card>
          </div>
          </div>
          
          {/* Footer con navegación */}
          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Paso 3 de 5</p>
            </div>
            <Button 
              onClick={() => setCurrentStep(4)} 
              disabled={cart.length === 0}
              className="bg-primary glow-primary"
            >
              Continuar a Pago
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ========== STEP 4: Pago y Financiamiento (PANEL SEPARADO) ========== */}
      {currentStep === 4 && (
        <div className="flex flex-col h-full animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
            {/* Columna Izquierda: Financiamiento y Métodos de Pago */}
            <div className="space-y-4">

              {/* KRece Financing Section */}
              <Card className="p-3 glass-card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                  <img 
                    src="/krece_icono.png" 
                    alt="Krece"
                    className="w-4 h-4 object-contain"
                  />
                  Krece Financiamiento
                </h3>
                <Button
                  variant={isKreceEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!isKreceEnabled) {
                      // Si se activa KRECE, desactivar Cashea
                      setIsCasheaEnabled(false);
                      setCasheaInitialAmount(0);
                      setIsKreceEnabled(true);
                      setKreceInitialAmount(subtotalUSD * 0.3); // 30% inicial por defecto
                    } else {
                      setIsKreceEnabled(false);
                      setKreceInitialAmount(0);
                    }
                  }}
                  className={`text-xs ${isKreceEnabled ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  disabled={isCasheaEnabled} // Deshabilitar si Cashea está activo
                >
                  {isKreceEnabled ? "Activado" : "Activar"}
                </Button>
            </div>
            
            {isKreceEnabled && (
              <div className="space-y-2">
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Selecciona el porcentaje de inicial:
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[40, 35, 30, 25].map((percentage) => {
                      const amount = (subtotalUSD * percentage) / 100;
                      const isSelected = Math.abs((kreceInitialAmount / subtotalUSD) * 100 - percentage) < 0.1;
                      
                      return (
                        <Button
                          key={percentage}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setKreceInitialAmount(amount);
                          }}
                          className={`text-xs h-8 ${
                            isSelected 
                              ? "bg-blue-600 hover:bg-blue-700" 
                              : "hover:bg-blue-50 hover:border-blue-300"
                          }`}
                          disabled={subtotalUSD === 0}
                        >
                          <div className="text-center">
                            <div className="font-semibold">{percentage}%</div>
                            <div className="text-[10px] opacity-80">
                              ${subtotalUSD === 0 ? "0.00" : amount.toFixed(2)}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                  {subtotalUSD === 0 && (
                    <div className="text-xs text-muted-foreground text-center">
                      Agrega productos al carrito para calcular financiamiento
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    O ingresa un monto personalizado:
                  </div>
                </div>
                                  <div className="space-y-1">
                    <label className="text-xs font-medium">Monto Inicial (USD)</label>
                    <Input
                      type="number"
                      value={kreceInitialAmount.toFixed(2)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const newAmount = Math.min(value, subtotalUSD);
                        setKreceInitialAmount(newAmount);
                      }}
                      className="h-8 text-sm"
                      placeholder="0.00"
                      min="0"
                      max={subtotalUSD}
                      step="0.01"
                    />
                    <div className="text-xs text-muted-foreground">
                      Máximo: ${subtotalUSD.toFixed(2)} (100% del total)
                    </div>
                    {kreceInitialAmount > 0 && subtotalUSD > 0 && (
                      <div className="text-xs text-blue-600 font-medium">
                        Porcentaje actual: {((kreceInitialAmount / subtotalUSD) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  

                
                <div className="text-xs space-y-2">
                  <div className="text-xs text-muted-foreground mb-2">
                    Resumen del Financiamiento
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total del carrito:</span>
                      <span className="font-semibold">
                        ${subtotalUSD.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inicial a pagar:</span>
                      <span className="font-semibold text-green-600">
                        ${kreceInitialAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">A financiar:</span>
                      <span className="font-semibold text-blue-600">
                        ${(subtotalUSD - kreceInitialAmount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Porcentaje inicial:</span>
                      <span className="font-semibold">
                        {subtotalUSD > 0 ? ((kreceInitialAmount / subtotalUSD) * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </Card>

              {/* Cashea Financing Section */}
              <Card className="p-3 glass-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <img 
                  src="/cashea_icono.png" 
                  alt="Cashea"
                  className="w-4 h-4 object-contain"
                  onError={(e) => {
                    // Si no existe el ícono, usar emoji como fallback visual
                    e.currentTarget.style.display = 'none';
                    const fallback = document.createElement('span');
                    fallback.className = 'text-base';
                    fallback.textContent = '💰';
                    fallback.style.marginRight = '0.5rem';
                    e.currentTarget.parentNode?.insertBefore(fallback, e.currentTarget.nextSibling);
                  }}
                />
                Cashea Financiamiento
              </h3>
              <Button
                variant={isCasheaEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (!isCasheaEnabled) {
                    // Si se activa Cashea, desactivar KRECE
                    setIsKreceEnabled(false);
                    setKreceInitialAmount(0);
                    setIsCasheaEnabled(true);
                    setCasheaInitialAmount(subtotalUSD * 0.5); // 50% inicial por defecto
                  } else {
                    setIsCasheaEnabled(false);
                    setCasheaInitialAmount(0);
                  }
                }}
                className={`text-xs ${isCasheaEnabled ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                disabled={isKreceEnabled} // Deshabilitar si KRECE está activo
              >
                {isCasheaEnabled ? "Activado" : "Activar"}
              </Button>
            </div>
            
            {isCasheaEnabled && (
              <div className="space-y-2">
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Selecciona el porcentaje de inicial:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[60, 50, 40].map((percentage) => {
                      const amount = (subtotalUSD * percentage) / 100;
                      const isSelected = Math.abs((casheaInitialAmount / subtotalUSD) * 100 - percentage) < 0.1;
                      
                      return (
                        <Button
                          key={percentage}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCasheaInitialAmount(amount);
                          }}
                          className={`text-xs h-8 ${
                            isSelected 
                              ? "bg-purple-600 hover:bg-purple-700" 
                              : "hover:bg-purple-50 hover:border-purple-300"
                          }`}
                          disabled={subtotalUSD === 0}
                        >
                          <div className="text-center">
                            <div className="font-semibold">{percentage}%</div>
                            <div className="text-[10px] opacity-80">
                              ${subtotalUSD === 0 ? "0.00" : amount.toFixed(2)}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                  {subtotalUSD === 0 && (
                    <div className="text-xs text-muted-foreground text-center">
                      Agrega productos al carrito para calcular financiamiento
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    O ingresa un monto personalizado:
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Monto Inicial (USD)</label>
                  <Input
                    type="number"
                    value={casheaInitialAmount.toFixed(2)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const newAmount = Math.min(value, subtotalUSD);
                      setCasheaInitialAmount(newAmount);
                    }}
                    className="h-8 text-sm"
                    placeholder="0.00"
                    min="0"
                    max={subtotalUSD}
                    step="0.01"
                  />
                  <div className="text-xs text-muted-foreground">
                    Máximo: ${subtotalUSD.toFixed(2)} (100% del total)
                  </div>
                  {casheaInitialAmount > 0 && subtotalUSD > 0 && (
                    <div className="text-xs text-purple-600 font-medium">
                      Porcentaje actual: {((casheaInitialAmount / subtotalUSD) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
                
                <div className="text-xs space-y-2">
                  <div className="text-xs text-muted-foreground mb-2">
                    Resumen del Financiamiento
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total del carrito:</span>
                      <span className="font-semibold">
                        ${subtotalUSD.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inicial a pagar:</span>
                      <span className="font-semibold text-green-600">
                        ${casheaInitialAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">A financiar:</span>
                      <span className="font-semibold text-purple-600">
                        ${(subtotalUSD - casheaInitialAmount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Porcentaje inicial:</span>
                      <span className="font-semibold">
                        {subtotalUSD > 0 ? ((casheaInitialAmount / subtotalUSD) * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </Card>

              <Card className="p-3 glass-card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Método de Pago</h3>
                  <Button
                variant={isMixedPayment ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsMixedPayment(!isMixedPayment);
                  if (!isMixedPayment) {
                    setSelectedPaymentMethod("");
                    setMixedPayments([]);
                  } else {
                    setSelectedPaymentMethod("");
                  }
                }}
                className={`text-xs ${isMixedPayment ? "bg-orange-600 hover:bg-orange-700" : ""}`}
              >
                  {isMixedPayment ? "Pagos Mixtos" : "Pago Único"}
                  </Button>
                </div>
                
                {!isMixedPayment ? (
                  // Pago único
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {paymentMethods.slice(0, 3).map((method) => {
                    const Icon = method.icon;
                    const isFinancingActive = isKreceEnabled || isCasheaEnabled;
                    const currentPaymentMethod = isFinancingActive 
                      ? (isKreceEnabled ? kreceInitialPaymentMethod : casheaInitialPaymentMethod)
                      : selectedPaymentMethod;
                    const isSelected = currentPaymentMethod === method.id;
                    return (
                      <Button 
                        key={method.id} 
                        variant={isSelected ? "default" : "outline"} 
                        className={`justify-center h-10 ${isSelected ? "bg-primary glow-primary" : "hover-glow"}`} 
                        onClick={() => {
                          if (isFinancingActive) {
                            // Si hay financiamiento activo, actualizar el método de pago de la inicial
                            if (isKreceEnabled) {
                              setKreceInitialPaymentMethod(method.id);
                            } else {
                              setCasheaInitialPaymentMethod(method.id);
                            }
                          } else {
                            setSelectedPaymentMethod(method.id);
                          }
                        }}
                      >
                        {method.customIcon ? (
                          <img 
                            src={method.customIcon} 
                            alt={method.name}
                            className={method.customSize || "w-12 h-12 object-contain"}
                          />
                        ) : method.customText ? (
                          <span className="text-xs font-medium">{method.customText}</span>
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </Button>
                    );
                      })}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {paymentMethods.slice(3, 6).map((method) => {
                    const Icon = method.icon;
                    const isFinancingActive = isKreceEnabled || isCasheaEnabled;
                    const currentPaymentMethod = isFinancingActive 
                      ? (isKreceEnabled ? kreceInitialPaymentMethod : casheaInitialPaymentMethod)
                      : selectedPaymentMethod;
                    const isSelected = currentPaymentMethod === method.id;
                    return (
                      <Button 
                        key={method.id} 
                        variant={isSelected ? "default" : "outline"} 
                        className={`justify-center h-10 ${isSelected ? "bg-primary glow-primary" : "hover-glow"}`} 
                        onClick={() => {
                          if (isFinancingActive) {
                            // Si hay financiamiento activo, actualizar el método de pago de la inicial
                            if (isKreceEnabled) {
                              setKreceInitialPaymentMethod(method.id);
                            } else {
                              setCasheaInitialPaymentMethod(method.id);
                            }
                          } else {
                            setSelectedPaymentMethod(method.id);
                          }
                        }}
                      >
                        {method.customIcon ? (
                          <img 
                            src={method.customIcon} 
                            alt={method.name}
                            className={method.customSize || "w-12 h-12 object-contain"}
                          />
                        ) : method.customText ? (
                          <span className="text-xs font-medium">{method.customText}</span>
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </Button>
                    );
                      })}
                    </div>
                  </div>
                ) : (
                  // Pagos mixtos
                  <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Agrega múltiples métodos de pago para dividir el total
                </div>
                
                {/* Métodos disponibles */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.slice(0, 3).map((method) => {
                      const Icon = method.icon;
                      const isSelected = mixedPayments.some(p => p.method === method.id);
                      return (
                        <Button 
                          key={method.id} 
                          variant={isSelected ? "default" : "outline"} 
                          size="sm"
                          className={`justify-center h-8 text-xs ${isSelected ? "bg-primary glow-primary" : "hover-glow"}`} 
                          onClick={() => {
                            if (isSelected) {
                              setMixedPayments(prev => prev.filter(p => p.method !== method.id));
                            } else {
                              setMixedPayments(prev => [...prev, { method: method.id, amount: 0 }]);
                            }
                          }}
                        >
                          {method.customIcon ? (
                            <img 
                              src={method.customIcon} 
                              alt={method.name}
                              className="w-5 h-5 object-contain"
                            />
                          ) : method.customText ? (
                            <span className="text-xs font-medium">{method.customText}</span>
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.slice(3, 6).map((method) => {
                      const Icon = method.icon;
                      const isSelected = mixedPayments.some(p => p.method === method.id);
                      return (
                        <Button 
                          key={method.id} 
                          variant={isSelected ? "default" : "outline"} 
                          size="sm"
                          className={`justify-center h-8 text-xs ${isSelected ? "bg-primary glow-primary" : "hover-glow"}`} 
                          onClick={() => {
                            if (isSelected) {
                              setMixedPayments(prev => prev.filter(p => p.method !== method.id));
                            } else {
                              setMixedPayments(prev => [...prev, { method: method.id, amount: 0 }]);
                            }
                          }}
                        >
                          {method.customIcon ? (
                            <img 
                              src={method.customIcon} 
                              alt={method.name}
                              className="w-5 h-5 object-contain"
                            />
                          ) : method.customText ? (
                            <span className="text-xs font-medium">{method.customText}</span>
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Montos por método */}
                {mixedPayments.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">Montos por método:</div>
                    {mixedPayments.map((payment, index) => {
                      const method = paymentMethods.find(m => m.id === payment.method);
                      const totalPaid = mixedPayments.reduce((sum, p) => sum + p.amount, 0);
                      const remaining = totalUSD - totalPaid;
                      
                      return (
                        <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-sm shadow-sm shadow-green-500/30">
                          <div className="flex-1">
                            <div className="text-xs font-medium text-muted-foreground mb-1">{method?.name}</div>
                            <Input
                              type="number"
                              value={payment.amount === 0 ? "" : payment.amount.toString()}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                const financingAmount = (isKreceEnabled || isCasheaEnabled) 
                                  ? (isKreceEnabled ? kreceInitialAmount : casheaInitialAmount)
                                  : totalUSD;
                                const maxAllowed = (isKreceEnabled || isCasheaEnabled) 
                                  ? Math.min(value, financingAmount) 
                                  : Math.min(value, totalUSD);
                                setMixedPayments(prev => prev.map((p, i) => 
                                  i === index ? { ...p, amount: maxAllowed } : p
                                ));
                              }}
                              className="h-8 text-sm"
                              placeholder="0.00"
                              min="0"
                              max={(isKreceEnabled || isCasheaEnabled) 
                                ? (isKreceEnabled ? kreceInitialAmount : casheaInitialAmount)
                                : totalUSD}
                              step="0.01"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setMixedPayments(prev => prev.filter((_, i) => i !== index))}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                    
                    {/* Resumen */}
                    <div className="text-xs space-y-2 bg-muted/30 p-3 rounded-sm shadow-sm shadow-green-500/30">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total pagado:</span>
                        <span className="font-semibold text-primary">${mixedPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
                      </div>
                      {(isKreceEnabled || isCasheaEnabled) ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Meta (Inicial {isKreceEnabled ? 'KRece' : 'Cashea'}):</span>
                            <span className={`font-semibold ${isKreceEnabled ? 'text-blue-600' : 'text-purple-600'}`}>
                              ${(isKreceEnabled ? kreceInitialAmount : casheaInitialAmount).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Diferencia:</span>
                            <span className={`font-semibold ${Math.abs(mixedPayments.reduce((sum, p) => sum + p.amount, 0) - (isKreceEnabled ? kreceInitialAmount : casheaInitialAmount)) <= 0.01 ? 'text-success' : 'text-destructive'}`}>
                              ${(mixedPayments.reduce((sum, p) => sum + p.amount, 0) - (isKreceEnabled ? kreceInitialAmount : casheaInitialAmount)).toFixed(2)}
                            </span>
                          </div>
                          {Math.abs(mixedPayments.reduce((sum, p) => sum + p.amount, 0) - (isKreceEnabled ? kreceInitialAmount : casheaInitialAmount)) > 0.01 && (
                            <div className="text-destructive text-xs font-medium">
                              ⚠️ El total debe ser igual a la inicial de {isKreceEnabled ? 'KRece' : 'Cashea'}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Restante:</span>
                            <span className={`font-semibold ${(totalUSD - mixedPayments.reduce((sum, p) => sum + p.amount, 0)) >= 0 ? 'text-success' : 'text-destructive'}`}>
                              ${(totalUSD - mixedPayments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}
                            </span>
                          </div>
                          {(totalUSD - mixedPayments.reduce((sum, p) => sum + p.amount, 0)) < 0 && (
                            <div className="text-destructive text-xs font-medium">
                              ⚠️ El monto excede el total
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
                )}
              </Card>

              <Card className="p-3 glass-card">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>Subtotal:</span><span>${subtotalUSD.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>IVA ({getTaxRate()}%):</span><span>${taxUSD.toFixed(2)}</span></div>
                </div>
                <div className="pt-1 mt-1">
                  <div className="flex justify-between font-semibold text-sm"><span>Total USD:</span><span className="text-success">${totalUSD.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-md"><span>Total Bs:</span><span className="text-primary">Bs {totalBs.toFixed(2)}</span></div>
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-3">
                <Button 
                  onClick={() => setCurrentStep(5)} 
              disabled={
                isSaleConfirmedAndCompleted ||
                isProcessingSale ||
                cart.length === 0 || 
                (
                  !isMixedPayment && 
                  (() => {
                    const isFinancingActive = isKreceEnabled || isCasheaEnabled;
                    const currentPaymentMethod = isFinancingActive
                      ? (isKreceEnabled ? kreceInitialPaymentMethod : casheaInitialPaymentMethod)
                      : selectedPaymentMethod;
                    return !currentPaymentMethod;
                  })()
                ) ||
                (isMixedPayment && mixedPayments.length === 0) ||
                (isMixedPayment && mixedPayments.some(p => p.amount <= 0)) ||
                (
                  isMixedPayment && 
                  (() => {
                    const mixedTotal = mixedPayments.reduce((sum, p) => sum + p.amount, 0);
                    const isFinancingActive = isKreceEnabled || isCasheaEnabled;
                    const financingInitialAmount = isFinancingActive
                      ? (isKreceEnabled ? kreceInitialAmount : casheaInitialAmount)
                      : 0;

                    if (isFinancingActive) {
                      return financingInitialAmount > 0 && Math.abs(mixedTotal - financingInitialAmount) > 0.01;
                    }

                    return Math.abs(mixedTotal - totalUSD) > 0.01;
                  })()
                )
              } 
              className="w-full bg-primary glow-primary disabled:opacity-50" 
              size="lg"
            >
              Continuar a Resumen
              <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              {/* Footer con navegación */}
              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
                <p className="text-sm text-muted-foreground">Paso 4 de 5</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== STEP 5: Resumen Final (PANEL INLINE) ========== */}
      {currentStep === 5 && (
        <Card className="p-6 glass-card border border-green-500/30 animate-fade-in">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-accent-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Resumen de la Venta</h2>
              <p className="text-muted-foreground">
                Verifica todos los datos antes de procesar
              </p>
            </div>
            
            {/* Resumen en Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="p-4 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Tienda</span>
                </div>
                <p className="font-bold">{selectedStore?.name}</p>
              </Card>
              
              <Card className="p-4 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Cliente</span>
                </div>
                <p className="font-bold">{selectedCustomer?.name}</p>
                <p className="text-xs text-muted-foreground">{selectedCustomer?.id_number}</p>
              </Card>
              
              <Card className="p-4 border border-accent-primary/30 bg-accent-hover/10">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-accent-primary" />
                  <span className="text-sm text-muted-foreground">Tasa BCV</span>
                </div>
                <p className="font-bold text-xl text-green-600">Bs {bcvRate.toFixed(2)}</p>
              </Card>
            </div>
            
            {/* Productos */}
            <Card className="p-4 border border-green-500/30 mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Productos ({cart.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{item.quantity} x ${item.price.toFixed(2)}</p>
                      <p className="text-xs text-green-600">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            
            {/* Totales */}
            <Card className="p-4 border border-green-500/40 bg-green-50/50 dark:bg-green-950/30 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${subtotalUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVA ({getTaxRate()}%):</span>
                    <span className="font-semibold">${taxUSD.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-l pl-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">Total USD:</span>
                    <span className="text-2xl font-bold text-green-600">${totalUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total Bs:</span>
                    <span className="text-2xl font-bold text-primary">Bs {totalBs.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Método de Pago */}
            <Card className="p-4 border border-green-500/30 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                <span className="font-semibold">Método de Pago</span>
              </div>
              <p className="text-lg font-bold">
                {isMixedPayment 
                  ? `Pagos Mixtos (${mixedPayments.length} métodos)`
                  : (isKreceEnabled || isCasheaEnabled)
                    ? `${isKreceEnabled ? 'Krece' : 'Cashea'} Financiamiento`
                    : paymentMethods.find(m => m.id === selectedPaymentMethod)?.name || 'No seleccionado'
                }
              </p>
              {(isKreceEnabled || isCasheaEnabled) && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <span>Inicial: ${(isKreceEnabled ? kreceInitialAmount : casheaInitialAmount).toFixed(2)}</span>
                  <span className="mx-2">|</span>
                  <span>A financiar: ${(subtotalUSD - (isKreceEnabled ? kreceInitialAmount : casheaInitialAmount)).toFixed(2)}</span>
                </div>
              )}
            </Card>
            
            {/* Botones de navegación */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(3)}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Volver a Productos
              </Button>
              <Button
                onClick={() => setShowPreValidationModal(true)}
                disabled={cart.length === 0 || isProcessingSale || isSaleConfirmedAndCompleted}
                className="glow-primary px-8"
              >
                {isSaleConfirmedAndCompleted ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    ✅ Venta Completada
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Procesar Venta
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      </div>{/* Cierre del div CONTENIDO PRINCIPAL (Scrollable) */}

      {/* Pre-Validation Modal */}
      <Dialog open={showPreValidationModal} onOpenChange={setShowPreValidationModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto glass-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Revisar Venta Antes de Procesar</DialogTitle>
            <DialogDescription>
              Verifica todos los datos antes de confirmar la venta
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Fila 1: Cliente, Tienda y Tasa BCV (horizontal) */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 border border-green-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Cliente</span>
                </div>
                <p className="font-semibold text-sm truncate">{selectedCustomer?.name || 'Cliente General'}</p>
                {selectedCustomer?.id_number && (
                  <p className="text-xs text-muted-foreground">Cédula: {selectedCustomer.id_number}</p>
                )}
              </Card>

              <Card className="p-3 border border-green-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Tienda</span>
                </div>
                <p className="font-semibold text-sm truncate">{selectedStore?.name || 'No asignada'}</p>
              </Card>

              <Card className="p-3 border border-accent-primary/30 bg-accent-hover/5">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-accent-primary" />
                  <span className="text-xs text-muted-foreground">Tasa BCV</span>
                </div>
                <p className="font-bold text-lg text-green-600">Bs {bcvRate.toFixed(2)}</p>
              </Card>
            </div>

            {/* Fila 2: Productos y Totales (2 columnas) */}
            <div className="grid grid-cols-5 gap-3">
              {/* Productos - 3 columnas */}
              <Card className="col-span-3 p-4 border border-green-500/30">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <ShoppingCart className="w-4 h-4" />
                  Productos ({cart.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-muted/30 rounded-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                        {item.imeis && item.imeis.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            IMEIs: {item.imeis.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="text-sm font-semibold">{item.quantity} x ${item.price.toFixed(2)}</p>
                        <p className="text-xs text-green-600 font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Totales y Pago - 2 columnas */}
              <div className="col-span-2 space-y-3">
                {/* Totales */}
                <Card className="p-4 border border-green-500/40 bg-green-50/50 dark:bg-green-950/30">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-semibold">${subtotalUSD.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>IVA ({getTaxRate()}%):</span>
                      <span className="font-semibold">${taxUSD.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-green-500/30 pt-2 mt-2 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>Total USD:</span>
                        <span className="text-green-700 dark:text-green-400 text-lg">${totalUSD.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total Bs:</span>
                        <span className="text-primary text-lg">Bs {totalBs.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Método de Pago */}
                <Card className="p-3 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Método de Pago</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {isMixedPayment 
                      ? `Pagos Mixtos (${mixedPayments.length})`
                      : (isKreceEnabled || isCasheaEnabled)
                        ? `${isKreceEnabled ? 'Krece' : 'Cashea'}`
                        : paymentMethods.find(m => m.id === selectedPaymentMethod)?.name || 'No seleccionado'
                    }
                  </p>
                  {(isKreceEnabled || isCasheaEnabled) && (
                    <div className="mt-1 text-xs text-muted-foreground grid grid-cols-2 gap-1">
                      <span>Inicial: ${(isKreceEnabled ? kreceInitialAmount : casheaInitialAmount).toFixed(2)}</span>
                      <span>Financiar: ${((isKreceEnabled ? (subtotalUSD - kreceInitialAmount) : (subtotalUSD - casheaInitialAmount))).toFixed(2)}</span>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreValidationModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setShowPreValidationModal(false);
                setCurrentStep(4); // Avanzar al paso 4 (Revisión/Procesamiento)
                await processSale();
              }}
              className="bg-primary glow-primary"
              disabled={isProcessingSale}
            >
              {isProcessingSale ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar y Procesar Venta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Completion Modal */}
      <SaleCompletionModal
        isOpen={showSaleModal}
        onClose={() => {
          setShowSaleModal(false);
          // Limpiar completedSaleData para evitar bucle de reapertura
          setCompletedSaleData(null);
        }}
        saleData={completedSaleData}
        onPrintInvoice={() => {
          console.log('📄 POS - onPrintInvoice llamado, completedSaleData:', completedSaleData?.invoice_number);
          if (completedSaleData) {
            printInvoice(completedSaleData, getTaxRate(), getReceiptFooter());
          } else {
            console.warn('⚠️ POS - completedSaleData es null, no se puede imprimir');
          }
        }}
        onNewSale={() => {
          // Resetear todo el estado para una nueva venta
          setIsSaleConfirmedAndCompleted(false);
          setShowSaleModal(false);
          setCart([]);
          // Limpiar método de pago y financiamiento
          setSelectedPaymentMethod("");
          setIsKreceEnabled(false);
          setKreceInitialAmount(0);
          setIsCasheaEnabled(false);
          setCasheaInitialAmount(0);
          setIsMixedPayment(false);
          setMixedPayments([]);
          setCompletedSaleData(null);
          // Mantener tienda y cliente, ir directo al paso 3 (Productos)
          setCurrentStep(3);
        }}
        onExitPOS={() => {
          // Limpiar TODO el estado antes de salir (romper el ciclo)
          setIsSaleConfirmedAndCompleted(false);
          setShowSaleModal(false);
          setCart([]);
          setSelectedCustomer(null);
          setSelectedPaymentMethod("");
          setIsKreceEnabled(false);
          setKreceInitialAmount(0);
          setIsCasheaEnabled(false);
          setCasheaInitialAmount(0);
          setIsMixedPayment(false);
          setMixedPayments([]);
          setCompletedSaleData(null);
          setCurrentStep(1);
          setHasSelectedStoreInSession(false);
          // La redirección a /dashboard se hace en el componente SaleCompletionModal
        }}
      />

      {/* IMEI Modal */}
      <IMEIModal
        isOpen={showIMEIModal}
        onClose={handleIMEIClose}
        onConfirm={handleIMEIConfirm}
        productName={pendingProduct?.name || ''}
        existingQuantity={pendingProduct ? cart.find(item => item.id === pendingProduct.id)?.quantity || 0 : 0}
      />
    </div>
  );
}