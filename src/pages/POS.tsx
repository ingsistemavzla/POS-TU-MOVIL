import { useState, useEffect, useRef, useCallback } from "react";
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
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import CustomerSelector from "@/components/pos/CustomerSelector";
import { SaleCompletionModal } from "@/components/pos/SaleCompletionModal";
import { IMEIModal } from "@/components/pos/IMEIModal";
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
import { formatInvoiceNumber, getDayKey } from "@/utils/invoiceGenerator";

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

type InvoiceTrackerState = {
  lastSeq: number;
  lastUpdated: string; // Fecha de última actualización para referencia
};

type ReservedInvoice = {
  invoiceNumber: string;
  sequence: number;
  previousState: InvoiceTrackerState;
};

const LOCAL_INVOICE_KEY = 'tm_pos_last_invoice_global'; // Clave global, no por tienda
const LOCAL_INVOICE_MIGRATION_FLAG = 'tm_pos_global_invoice_migrated_v1'; // Marca que ya se limpió el correlativo viejo
const OFFLINE_SALES_KEY = 'tm_pos_pending_sales';
const DEFAULT_INVOICE_SEQUENCE_START = 999; // Primera factura será 1000

const parseInvoiceSequence = (invoice?: string | null): number | null => {
  if (!invoice) return null;
  // Busca el número al final del formato FAC-DDMMMYYYY-####
  const match = invoice.match(/-(\d{4,})$/);
  return match ? parseInt(match[1], 10) : null;
};

// Ya no se usa storeId - es global
const readLocalInvoiceState = (): InvoiceTrackerState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_INVOICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InvoiceTrackerState;
    if (typeof parsed.lastSeq !== 'number') return null;
    return parsed;
  } catch (error) {
    console.warn('No se pudo leer el correlativo local de facturas:', error);
    return null;
  }
};

const writeLocalInvoiceState = (state: InvoiceTrackerState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_INVOICE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('No se pudo guardar el correlativo local de facturas:', error);
  }
};

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
  const [scanMode, setScanMode] = useState(true); // escanear automático por defecto
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
  // For cashiers, always use their assigned store (no selection allowed)
  const resolvedStoreId = userProfile?.role === 'cashier' 
    ? (userProfile as any)?.assigned_store_id ?? selectedStore?.id ?? null
    : selectedStore?.id ?? (userProfile as any)?.assigned_store_id ?? null;
  // Estado inicial: secuencia global continua (no se reinicia por día)
  const invoiceTrackerRef = useRef<InvoiceTrackerState>({
    lastSeq: DEFAULT_INVOICE_SEQUENCE_START,
    lastUpdated: new Date().toISOString(),
  });
  const lastSyncRef = useRef<string>(''); // Para evitar sincronizaciones innecesarias
  const pendingOfflineSalesRef = useRef<any[]>([]);
  const syncingOfflineSalesRef = useRef(false);

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
  const [bcvRate, setBcvRate] = useState(41.73);
  const [isEditingBcvRate, setIsEditingBcvRate] = useState(false);
  const [bcvRateInput, setBcvRateInput] = useState("41.73");
  const [productView, setProductView] = useState<'cards' | 'list'>('cards');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState<any>(null);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  
  // IMEI Modal states
  const [showIMEIModal, setShowIMEIModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  
  // Toast para notificaciones
  const { toast } = useToast();

  // Limpieza automática (una sola vez) del correlativo local antiguo al abrir el POS
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const alreadyMigrated = window.localStorage.getItem(LOCAL_INVOICE_MIGRATION_FLAG);
      if (!alreadyMigrated) {
        // Eliminar cualquier valor viejo de correlativo local y marcar como migrado
        window.localStorage.removeItem(LOCAL_INVOICE_KEY);
        window.localStorage.setItem(LOCAL_INVOICE_MIGRATION_FLAG, 'true');
        console.log('POS: limpieza única de tm_pos_last_invoice_global aplicada. Se usará solo el correlativo global desde Supabase.');
      }
    } catch (error) {
      console.warn('No se pudo aplicar la limpieza automática del correlativo local:', error);
    }
  }, []);

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
      // For cashiers, always use assigned store; for others, use selected store
      const storeId = userProfile?.role === 'cashier' 
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
      const productIds = productsList.map(p => p.id);
      const { data, error } = await (supabase as any)
        .from('inventories')
        .select('product_id, qty')
        .in('product_id', productIds)
        .eq('store_id', storeId)
        .eq('company_id', userProfile.company_id);
      
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
      const { data, error } = await (supabase as any)
        .from('inventories')
        .select('qty')
        .eq('product_id', productId)
        .eq('store_id', storeId)
        .eq('company_id', userProfile.company_id)
        .single();
      
      if (error || !data) return 0;
      
      return (data as any).qty || 0;
    } catch (error) {
      console.error('Error getting product stock:', error);
      return 0;
    }
  };

  const addToCart = async (product: Product) => {
    // Check stock before adding to cart
    const availableStock = await getProductStock(product.id);
    
    if (availableStock <= 0) {
      alert(`❌ No hay stock disponible para: ${product.name}`);
      return;
    }
    
    // Si es un teléfono, mostrar modal para solicitar IMEI
    if (product.category === 'phones') {
      const existingItem = cart.find(item => item.id === product.id);
      
      if (existingItem) {
        // Para teléfonos existentes, agregar otro IMEI
        setPendingProduct(product);
        setShowIMEIModal(true);
        return;
      }
      
      // Mostrar modal para solicitar IMEI del primer teléfono
      setPendingProduct(product);
      setShowIMEIModal(true);
      return;
    }
    
    // Lógica original para productos que no son teléfonos
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      
      if (newQuantity > availableStock) {
        alert(`❌ Stock insuficiente. Solo hay ${availableStock} unidades disponibles de: ${product.name}`);
        return;
      }
      
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: newQuantity }
          : item
      ));
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
        category: product.category
      };
      setCart([...cart, newItem]);
      setPriceInputs(prev => ({ ...prev, [product.id]: price.toFixed(2) }));
    }
  };

  // Funciones para manejar el modal IMEI
  const handleIMEIConfirm = (imei: string) => {
    if (pendingProduct) {
      const existingItem = cart.find(item => item.id === pendingProduct.id);
      
      if (existingItem) {
        // Si ya existe el producto, agregar el IMEI al array
        const updatedItem = {
          ...existingItem,
          quantity: existingItem.quantity + 1,
          imeis: existingItem.imeis ? [...existingItem.imeis, imei] : [existingItem.imei || '', imei].filter(Boolean)
        };
        
        setCart(cart.map(item => 
          item.id === pendingProduct.id ? updatedItem : item
        ));
      } else {
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
  };

  const updateQuantity = async (id: string, change: number) => {
    const item = cart.find(item => item.id === id);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.quantity > 0));
      return;
    }
    
    // Si es un teléfono y se está incrementando la cantidad, solicitar IMEI
    if (item.category === 'phones' && change > 0) {
      // Buscar el producto original para obtener la información completa
      const product = products.find(p => p.id === id);
      if (product) {
        setPendingProduct(product);
        setShowIMEIModal(true);
        return;
      }
    }
    
    // Check stock before updating quantity
    const availableStock = await getProductStock(id);
    
    if (newQuantity > availableStock) {
      alert(`❌ Stock insuficiente. Solo hay ${availableStock} unidades disponibles de: ${item.name}`);
      return;
    }
    
    setCart(cart.map(item => 
      item.id === id 
        ? { ...item, quantity: newQuantity }
        : item
    ));
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
  };

  const handleBcvRateUpdate = (newRate: string) => {
    const rate = parseFloat(newRate);
    if (!isNaN(rate) && rate > 0) {
      setBcvRate(rate);
      setBcvRateInput(newRate);
      setIsEditingBcvRate(false);
    }
  };


  // Sincroniza la secuencia GLOBAL continua (sin reset por día, sin filtro por tienda)
  const syncInvoiceSequence = useCallback(async (force = false) => {
    const syncKey = `global_${companyId}`;

    if (!force && lastSyncRef.current === syncKey) {
      return invoiceTrackerRef.current;
    }

    let baseSeq = DEFAULT_INVOICE_SEQUENCE_START;
    
    // 1. Leer desde localStorage (global, no por tienda)
    const localState = readLocalInvoiceState();
    if (localState) {
      baseSeq = Math.max(baseSeq, localState.lastSeq);
    }

    try {
      // 2. Consultar el ÚLTIMO número de factura GLOBAL de la compañía (sin filtrar por día ni tienda)
      let query = supabase
        .from('sales')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (companyId) {
        query = query.filter('company_id', 'eq', companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('No se pudo obtener la última factura global desde Supabase:', error);
      } else if (Array.isArray(data) && data.length > 0) {
        const seq = parseInvoiceSequence((data[0] as any).invoice_number);
        if (seq !== null) {
          baseSeq = Math.max(baseSeq, seq);
        }
      }
    } catch (error) {
      console.warn('Fallo al sincronizar correlativo global de facturas:', error);
    }

    const syncedState: InvoiceTrackerState = { 
      lastSeq: baseSeq,
      lastUpdated: new Date().toISOString()
    };
    invoiceTrackerRef.current = syncedState;
    lastSyncRef.current = syncKey;
    writeLocalInvoiceState(syncedState);
    return syncedState;
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    // Sincronizar secuencia global al iniciar (no depende de tienda)
    syncInvoiceSequence(true);
  }, [companyId, syncInvoiceSequence]);

  // Verifica si una factura existe GLOBALMENTE (no por tienda)
  const invoiceExists = useCallback(
    async (invoiceNumber: string) => {
      try {
        let query = supabase
          .from('sales')
          .select('id')
          .filter('invoice_number', 'eq', invoiceNumber)
          .limit(1);

        // Solo filtrar por compañía, NO por tienda (es global)
        if (companyId) {
          query = query.filter('company_id', 'eq', companyId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('Error verificando la existencia de factura:', error);
          return false;
        }

        return Array.isArray(data) && data.length > 0;
      } catch (error) {
        console.warn('Fallo al verificar la existencia de la factura:', error);
        return false;
      }
    },
    [companyId]
  );

  const commitInvoiceState = useCallback(
    (state: InvoiceTrackerState) => {
      invoiceTrackerRef.current = state;
      lastSyncRef.current = `global_${companyId}`;
      writeLocalInvoiceState(state);
    },
    [companyId]
  );

  const revertInvoiceState = useCallback(
    (state: InvoiceTrackerState) => {
      invoiceTrackerRef.current = state;
      lastSyncRef.current = `global_${companyId}`;
      writeLocalInvoiceState(state);
    },
    [companyId]
  );

  // Reserva el siguiente número de factura GLOBAL (sin reset por día)
  const reserveInvoiceNumber = useCallback(async (): Promise<ReservedInvoice> => {
    const now = new Date();

    // Sincronizar con el último número global (sin filtrar por día ni tienda)
    await syncInvoiceSequence();

    const previousState: InvoiceTrackerState = { ...invoiceTrackerRef.current };
    let candidateSeq = previousState.lastSeq + 1;
    let candidateInvoice = formatInvoiceNumber(candidateSeq, now);
    let attempts = 0;

    // Verificar que no exista (búsqueda global)
    while (await invoiceExists(candidateInvoice)) {
      attempts += 1;
      candidateSeq += 1;
      candidateInvoice = formatInvoiceNumber(candidateSeq, now);

      if (attempts > 20) {
        throw new Error('No se pudo generar un número de factura único. Intenta nuevamente.');
      }
    }

    // Actualizar estado (sin dateKey - es global y continuo)
    const nextState: InvoiceTrackerState = { 
      lastSeq: candidateSeq,
      lastUpdated: now.toISOString()
    };
    invoiceTrackerRef.current = nextState;

    return {
      invoiceNumber: candidateInvoice,
      sequence: candidateSeq,
      previousState,
    };
  }, [invoiceExists, syncInvoiceSequence]);

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
        if (pendingSale?.invoice_number && (await invoiceExists(pendingSale.invoice_number))) {
          queue.splice(i, 1);
          i--;
          queueChanged = true;
          continue;
        }

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
              ? (data[0] as any)?.id
              : (data as any)?.id;

        if (!saleId) {
          throw new Error('No se pudo obtener el identificador de la venta sincronizada.');
        }

        if (pendingSale?.invoice_number) {
          const payload: Database['public']['Tables']['sales']['Update'] = {
            invoice_number: pendingSale.invoice_number,
          };
          const { error: updateError } = await supabase
            .from('sales')
            .update(payload as any)
            .eq('id', saleId);

          if (updateError) {
            throw updateError;
          }
        }

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

    if (queueChanged && !queue.length) {
      // Sincronizar secuencia global después de sincronizar ventas offline
      syncInvoiceSequence(true);
    }
  }, [invoiceExists, syncInvoiceSequence]);

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
        .eq('company_id', userProfile.company_id)
        .eq('store_id', resolvedStoreId)
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
          title: "Stock insuficiente",
          description: `No hay suficiente stock para: ${item.name}. Disponible: ${availableStock}`,
          variant: "destructive",
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
        duration: 10000, // 10 segundos para que el usuario lo vea
      });
      return;
    }

    // Iniciar procesamiento
    setIsProcessingSale(true);

    let reservedInvoice: ReservedInvoice | null = null;
    let invoiceCommitted = false;

    try {
      // Validar que hay una tienda disponible (resolvedStoreId ya está definido arriba)
      if (!resolvedStoreId) {
        toast({
          title: "Tienda requerida",
          description: "Debe seleccionar una tienda antes de procesar la venta.",
          variant: "destructive",
        });
        setIsProcessingSale(false);
        return;
      }
      
      // For cashiers, always use assigned store; for others, use selected store
      const storeId = userProfile?.role === 'cashier' 
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

      // Calcular totales SIN IVA (ya que el IVA se calcula en el backend)
      const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalUSD = cartSubtotal; // El IVA se calcula en el backend

      // Validar pagos mixtos
      if (isMixedPayment) {
        const mixedTotal = mixedPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        if (isKreceEnabled || isCasheaEnabled) {
          // Con KRece o Cashea: los pagos mixtos deben coincidir con la inicial
          // Asegurar que solo uno esté activo (exclusión mutua)
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
          // Sin financiamiento: los pagos mixtos deben coincidir con el total de la venta (comportamiento original)
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

      try {
        reservedInvoice = await reserveInvoiceNumber();
      } catch (invoiceError) {
        console.error('No se pudo generar un número de factura correlativo:', invoiceError);
        toast({
          title: "Error generando factura",
          description: invoiceError instanceof Error
            ? invoiceError.message
            : 'No se pudo generar un número de factura correlativo. Intenta nuevamente.',
          variant: "destructive",
        });
        setIsProcessingSale(false);
        return;
      }

      if (!reservedInvoice) {
        toast({
          title: "Error reservando factura",
          description: "No se pudo reservar un número de factura. Intente nuevamente.",
          variant: "destructive",
        });
        setIsProcessingSale(false);
        return;
      }

      let activeReservation: ReservedInvoice | null = reservedInvoice;
      const invoiceNumber = activeReservation.invoiceNumber;

      // PREPARAR ITEMS DE VENTA - MANEJO ROBUSTO DE CANTIDADES
      const saleItems = cart.flatMap(item => {
        // MANEJO ROBUSTO DE CANTIDADES
        const cleanQty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const cleanPrice = Math.max(0, Number(item.price) || 0);
        const cleanName = String(item.name || 'Producto sin nombre').trim();
        const cleanSku = String(item.sku || 'SKU-000').trim();
        
        // Si es un teléfono con múltiples IMEIs, crear un item por cada IMEI
        if (item.category === 'phones' && item.imeis && item.imeis.length > 0) {
          return item.imeis.map(imei => ({
            product_id: item.id,
            qty: 1, // Cada teléfono es cantidad 1
            price_usd: cleanPrice,
            product_name: cleanName,
            product_sku: cleanSku,
            imei: String(imei).trim()
          }));
        } else {
          // Para productos normales o teléfonos con un solo IMEI
          const cleanImei = item.imei ? String(item.imei).trim() : null;
          return [{
            product_id: item.id,
            qty: cleanQty,
            price_usd: cleanPrice,
            product_name: cleanName,
            product_sku: cleanSku,
            imei: cleanImei
          }];
        }
      });

      // PREPARAR PAGOS MIXTOS - ULTRA LIMPIO
      const mixedPaymentsData = isMixedPayment ? mixedPayments.map(payment => {
        const cleanMethod = String(payment.method || 'unknown').trim();
        const cleanAmount = Math.max(0, Number(payment.amount) || 0);
        
        return {
          method: cleanMethod,
          amount: cleanAmount
        };
      }) : [];

      // PARÁMETROS ULTRA LIMPIOS - AJUSTADOS PARA COINCIDIR CON LA FUNCIÓN DE SUPABASE
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
        // Guardar tipo de financiamiento en notes para distinguir entre KRECE y Cashea sin modificar BD
        p_notes: (isKreceEnabled || isCasheaEnabled) ? (isKreceEnabled ? 'financing_type:krece' : 'financing_type:cashea') : null,
        p_tax_rate: Number(getTaxRate()) / 100, // Convertir porcentaje a decimal (ej: 16% -> 0.16)
        // Usar los mismos campos de KRECE para Cashea (reutilizando estructura existente)
        p_krece_enabled: Boolean(isKreceEnabled || isCasheaEnabled),
        p_krece_initial_amount_usd: Number(isKreceEnabled ? kreceInitialAmount : (isCasheaEnabled ? casheaInitialAmount : 0)) || 0,
        // Cuando ninguno está activo, será 0 (comportamiento original)
        p_krece_financed_amount_usd: isKreceEnabled ? Number(cartSubtotal - kreceInitialAmount) || 0 :
                                     isCasheaEnabled ? Number(cartSubtotal - casheaInitialAmount) || 0 : 0,
        // Cuando ninguno está activo, será 0 (comportamiento original)
        p_krece_initial_percentage: isKreceEnabled && cartSubtotal > 0 ? Number((kreceInitialAmount / cartSubtotal) * 100) || 0 :
                                    isCasheaEnabled && cartSubtotal > 0 ? Number((casheaInitialAmount / cartSubtotal) * 100) || 0 : 0,
        p_is_mixed_payment: Boolean(isMixedPayment),
        p_mixed_payments: mixedPaymentsData
      };

      console.log('Procesando venta con parámetros ULTRA LIMPIOS:', saleParams);

      // Llamar a la función de procesamiento
      const { data, error } = await supabase.rpc('process_sale', saleParams);

      if (error) {
        console.error('Error al procesar la venta:', error);

        if (activeReservation) {
          if (isNetworkError(error)) {
            commitInvoiceState(invoiceTrackerRef.current);
            invoiceCommitted = true;
            const updatedQueue = storeOfflineSale({
              invoice_number: activeReservation.invoiceNumber,
              sequence: activeReservation.sequence, // Usar sequence en vez de dateKey
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
              `La venta se almacenó temporalmente por falla de red. Factura reservada ${activeReservation.invoiceNumber}.`
            );
        } else {
          revertInvoiceState(activeReservation.previousState);
          toast({
            title: "Error al procesar venta",
            description: error.message || "Ocurrió un error inesperado. Por favor, intenta nuevamente.",
            variant: "destructive",
          });
        }
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
        if (activeReservation) {
          revertInvoiceState(activeReservation.previousState);
        }
        toast({
          title: "Error del servidor",
          description: "No se recibió respuesta del servidor. Por favor, intenta nuevamente.",
          variant: "destructive",
        });
        setIsProcessingSale(false);
        return;
      }

      const saleId =
        typeof data === 'string'
          ? data
          : Array.isArray(data)
          ? (data[0] as any)?.id
          : (data as any)?.id;

      if (!saleId) {
        if (activeReservation) {
          revertInvoiceState(activeReservation.previousState);
        }
        console.error('No se recibió un identificador válido para la venta:', data);
        toast({
          title: "Error de identificación",
          description: "No se pudo identificar la venta procesada. Por favor, intenta nuevamente.",
          variant: "destructive",
        });
        setIsProcessingSale(false);
        return;
      }

      if (activeReservation) {
        const applyInvoiceToSale = async (reservation: ReservedInvoice) => {
          const payload: Database['public']['Tables']['sales']['Update'] = {
            invoice_number: reservation.invoiceNumber,
          };
          const { error: updateError } = await supabase
            .from('sales')
            .update(payload as any)
            .eq('id', saleId);
          return updateError;
        };

        let updateError = await applyInvoiceToSale(activeReservation);

        if (updateError) {
          console.warn(
            'No se pudo asignar la factura reservada. Intentando nuevamente con otro correlativo.',
            updateError
          );
          revertInvoiceState(activeReservation.previousState);

          try {
            activeReservation = await reserveInvoiceNumber();
          } catch (retryError) {
            console.error('Fallo generando un nuevo correlativo tras el error:', retryError);
            toast({
              title: "Error asignando factura",
              description: "No se pudo asignar un número de factura correlativo. Intenta nuevamente.",
              variant: "destructive",
            });
            setIsProcessingSale(false);
            return;
          }

          updateError = await applyInvoiceToSale(activeReservation);

          if (updateError) {
            revertInvoiceState(activeReservation.previousState);
            console.error('No se pudo asignar un número de factura tras reintento:', updateError);
            toast({
              title: "Error crítico",
              description: "No se pudo asignar un número de factura. Contacta al administrador.",
              variant: "destructive",
            });
            setIsProcessingSale(false);
            return;
          }
        }

        commitInvoiceState(invoiceTrackerRef.current);
        invoiceCommitted = true;
        reservedInvoice = activeReservation;
      }

      let finalInvoiceNumber = activeReservation?.invoiceNumber ?? invoiceNumber;

      try {
        const saleRowResponse = await supabase
          .from('sales')
          .select('invoice_number')
          .eq('id', saleId)
          .maybeSingle();

        if (saleRowResponse.error) {
          console.warn('No se pudo verificar la factura almacenada:', saleRowResponse.error);
        } else {
          const saleRow = saleRowResponse.data as Database['public']['Tables']['sales']['Row'] | null;
          if (saleRow?.invoice_number) {
            finalInvoiceNumber = saleRow.invoice_number;
          }
        }
      } catch (fetchError) {
        console.warn('No se pudo verificar la factura almacenada:', fetchError);
      }

      // Obtener información de la tienda seleccionada dinámicamente
      let storeInfo = {};
      console.log('Verificando información de la tienda seleccionada:', {
        selectedStore: selectedStore,
        userProfile: userProfile,
        company_id: userProfile?.company_id
      });
      
      if (selectedStore) {
        // Usar la tienda seleccionada dinámicamente con información fiscal completa
        storeInfo = {
          name: selectedStore.name,
          business_name: selectedStore.business_name,
          tax_id: selectedStore.tax_id,
          fiscal_address: selectedStore.fiscal_address,
          phone_fiscal: selectedStore.phone_fiscal,
          email_fiscal: selectedStore.email_fiscal
        };
        console.log('Información fiscal de la tienda seleccionada obtenida:', storeInfo);
      } else {
        console.warn('No hay tienda seleccionada, usando información del usuario asignado');
        
        // Fallback: usar la tienda asignada al usuario
        if ((userProfile as any)?.assigned_store_id) {
          try {
            console.log('Obteniendo información de la tienda asignada con ID:', (userProfile as any).assigned_store_id);
            
            const { data: storeData, error: storeError } = await supabase
              .from('stores')
              .select('*')
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
              console.log('Información de la tienda asignada obtenida:', storeInfo);
            }
          } catch (error) {
            console.error('Error obteniendo información de la tienda asignada:', error);
          }
        }
      }

      // Preparar items para la factura (separar teléfonos con múltiples IMEIs)
      const invoiceItems = cart.flatMap(item => {
        if (item.category === 'phones' && item.imeis && item.imeis.length > 0) {
          // Para teléfonos con múltiples IMEIs, crear un item por cada IMEI
          return item.imeis.map(imei => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            imei: imei
          }));
        } else {
          // Para productos normales o teléfonos con un solo IMEI
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
        customer: selectedCustomer?.name || 'Cliente General',
        customer_id: selectedCustomer?.id_number || null,
        items: invoiceItems, // Usar los items procesados con IMEIs separados
        subtotal_usd: cartSubtotal,
        tax_amount_usd: 0, // El IVA se calcula en el backend
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
        // Cuando ninguno está activo, será 0 (comportamiento original)
        krece_initial_amount: isKreceEnabled ? kreceInitialAmount : 
                              isCasheaEnabled ? casheaInitialAmount : 0,
        krece_financed_amount: isKreceEnabled ? (cartSubtotal - kreceInitialAmount) :
                               isCasheaEnabled ? (cartSubtotal - casheaInitialAmount) : 0,
        krece_initial_percentage: isKreceEnabled && cartSubtotal > 0 ? ((kreceInitialAmount / cartSubtotal) * 100) :
                                  isCasheaEnabled && cartSubtotal > 0 ? ((casheaInitialAmount / cartSubtotal) * 100) : 0,
        financing_type: isKreceEnabled ? 'krece' : (isCasheaEnabled ? 'cashea' : null)
      };

      console.log('Datos de venta preparados:', saleData);

      // Mostrar toast de confirmación
      toast({
        title: "✅ Venta completada",
        description: `Factura ${finalInvoiceNumber} generada exitosamente.`,
        duration: 3000,
      });

      // Mostrar modal de completado (se cierra automáticamente después de 5 segundos)
      setCompletedSaleData(saleData);
      setShowSaleModal(true);
      
      // Limpiar formulario
      setCart([]);
      setSelectedCustomer(null);
      setSelectedPaymentMethod("");
      setIsKreceEnabled(false);
      setKreceInitialAmount(0);
      setIsCasheaEnabled(false);
      setCasheaInitialAmount(0);
      setIsMixedPayment(false);
      setMixedPayments([]);
      
      // El modal se cierra automáticamente después de 5 segundos
      setIsProcessingSale(false);
      
      console.log('Venta procesada exitosamente:', data);
      
    } catch (error) {
      console.error('Error al procesar la venta:', error);
      if (reservedInvoice && !invoiceCommitted) {
        revertInvoiceState(reservedInvoice.previousState);
      }
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
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
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
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
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
    <div className="space-y-4">
      {/* Header con título y badge de versión */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Punto de Venta</h1>
        <Badge
          variant="secondary"
          className="text-[10px] xs:text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-green-400 text-black"
        >
          v3-filtread
        </Badge>
      </div>

      {/* Store Selector - Solo para administradores (super usuarios) */}
      {userProfile?.role === 'admin' && (
        <Card className="p-4 glass-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Store className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Tienda de Operación:</span>
            </div>
            <div className="flex items-center space-x-2">
              <Select 
                value={selectedStore?.id || ''} 
                onValueChange={(storeId) => {
                  const store = availableStores.find(s => s.id === storeId);
                  setSelectedStore(store || null);
                }}
                disabled={storeLoading}
              >
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Seleccionar tienda" />
                </SelectTrigger>
                <SelectContent>
                  {availableStores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}
      
      {/* Display assigned store for cashiers (read-only) */}
      {userProfile?.role === 'cashier' && selectedStore && (
        <Card className="p-4 glass-card">
          <div className="flex items-center space-x-2">
            <Store className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Tienda asignada:</span>
            <span className="text-sm text-muted-foreground">{selectedStore.name}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-8rem)] animate-fade-in">
      {/* Left Column: Products Search */}
      <div className="lg:col-span-1 flex flex-col gap-4">
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
                className="pl-10 pr-4 h-12 text-lg glass-card border-primary/20 focus:border-primary focus:glow-primary"
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
        <div className="flex flex-col gap-3 overflow-y-auto pr-2 flex-grow">
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
                    <div className="w-12 h-12 rounded-md bg-gradient-glow flex items-center justify-center shrink-0">
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
                <div key={product.id} className="grid grid-cols-12 items-center gap-3 p-4 rounded-lg glass-card hover-glow cursor-pointer min-h-[56px]" onClick={() => addToCart(product).catch(console.error)}>
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

      {/* Middle Column: Cart */}
      <div className="lg:col-span-1 flex flex-col gap-4 h-[calc(100vh-8rem)]">
        <Card className="p-4 glass-card flex-grow flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-lg font-semibold">Carrito</h3>
            <Badge variant="secondary">{cart.length} items</Badge>
          </div>
          <div className="space-y-3 overflow-y-auto flex-grow pr-2 -mr-2">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center justify-center h-full">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                <p>Carrito vacío</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={item.id}>
                  <div className="py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    {/* Row 1: Product + Unit price input + Remove */}
                    <div className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-7 flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-base font-medium truncate">{item.name}</p>
                      </div>
                      <div className="col-span-4 flex items-center justify-end">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={priceInputs[item.id] ?? (Number.isFinite(item.price) ? item.price.toFixed(2) : "0.00")}
                          onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
                          onFocus={(e) => e.currentTarget.select()}
                          onBlur={() => commitUnitPrice(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                            if (e.key === 'Escape') {
                              // Revert to current committed price
                              setPriceInputs(prev => ({ ...prev, [item.id]: item.price.toFixed(2) }));
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-9 w-24 text-sm font-semibold text-right glass-card bg-background/90 border-primary/50 focus:border-primary focus:glow-primary"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-end">
                        <Button size="icon" variant="ghost" className="w-9 h-9 rounded-full hover:bg-destructive/10" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="w-5 h-5 text-destructive/80" />
                        </Button>
                      </div>
                    </div>

                    {/* Row 2: IMEI Information (for phones) */}
                    {item.category === 'phones' && (item.imeis && item.imeis.length > 0) && (
                      <div className="mt-2 px-3">
                        <div className="text-xs text-muted-foreground mb-1">IMEIs registrados:</div>
                        <div className="flex flex-wrap gap-1">
                          {item.imeis.map((imei, imeiIndex) => (
                            <Badge key={imeiIndex} variant="secondary" className="text-xs font-mono">
                              {imei}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Row 3: Quantity + Line total */}
                    <div className="grid grid-cols-12 items-center gap-3 mt-2">
                      <div className="col-span-6 flex items-center gap-2">
                        <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-muted-foreground hover:bg-muted" onClick={() => updateQuantity(item.id, -1).catch(console.error)}>
                          <Minus className="w-5 h-5" />
                        </Button>
                        <span className="text-base font-bold w-12 text-center">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-muted-foreground hover:bg-muted" onClick={() => updateQuantity(item.id, 1).catch(console.error)}>
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                      <div className="col-span-6 text-right">
                        <div className="text-xs text-muted-foreground">Total ítem</div>
                        <div className="text-lg font-extrabold tracking-tight">${(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                  {index < cart.length - 1 && <hr className="border-border/20" />}
                </div>
              ))
            )}
          </div>
          {cart.length > 1 && (
            <div className="mt-2 pt-2 border-t border-border/30 flex justify-end">
              <div className="text-sm font-semibold">
                Total: <span className="text-success">${subtotalUSD.toFixed(2)}</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Right Column: Checkout */}
      <div className="lg:col-span-1 flex flex-col gap-3 h-[calc(100vh-8rem)] sticky top-16">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 glass-card"><CustomerSelector selectedCustomer={selectedCustomer} onCustomerSelect={handleCustomerSelect} /></Card>
            <Card className="p-3 glass-card flex flex-col justify-between">
              <h3 className="text-xs font-semibold">Tasa BCV</h3>
              <div className="flex items-center justify-between mt-1">
                {isEditingBcvRate ? (
                  <div className="flex items-center gap-1">
                    <Input type="number" value={bcvRateInput} onChange={(e) => setBcvRateInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleBcvRateUpdate(bcvRateInput); if (e.key === 'Escape') setIsEditingBcvRate(false);}} className="h-8 w-24 text-sm glass-card" autoFocus />
                    <Button size="icon" variant="ghost" onClick={() => handleBcvRateUpdate(bcvRateInput)} className="w-7 h-7"><Check className="w-4 h-4 text-primary"/></Button>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-primary">Bs {bcvRate.toFixed(2)}</p>
                )}
                <Button size="icon" variant="ghost" onClick={() => setIsEditingBcvRate(!isEditingBcvRate)} className="w-7 h-7">
                  {isEditingBcvRate ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                </Button>
              </div>
            </Card>
          </div>

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
                        <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border">
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
                    <div className="text-xs space-y-2 bg-muted/30 p-3 rounded-lg border">
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
            <div className="border-t border-border/50 pt-1 mt-1">
              <div className="flex justify-between font-semibold text-sm"><span>Total USD:</span><span className="text-success">${totalUSD.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-md"><span>Total Bs:</span><span className="text-primary">Bs {totalBs.toFixed(2)}</span></div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-3">
            <Button 
              onClick={processSale} 
              disabled={
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
              className="w-full bg-primary glow-primary disabled:opacity-50 col-span-2" 
              size="lg"
            >
              {isProcessingSale ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Procesar Venta
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Cash Register Widget - TEMPORALMENTE DESHABILITADO */}
        {/* <CashRegisterWidget storeName="Tienda Principal" /> */}
      </div>

      

      {/* Sale Completion Modal */}
      <SaleCompletionModal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        saleData={completedSaleData}
        onPrintInvoice={() => {
          if (completedSaleData) {
            printInvoice(completedSaleData, getTaxRate(), getReceiptFooter());
          }
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
    </div>
  );
}