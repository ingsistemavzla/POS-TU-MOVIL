import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Package, DollarSign, Filter, BarChart3, Store, Smartphone, Headphones, Wrench, FileDown } from 'lucide-react';
import { ProductForm } from '../components/pos/ProductForm';
import { CategoryStats } from '../components/products/CategoryStats';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  cost_usd: number;
  sale_price_usd: number;
  tax_rate: number;
  active: boolean;
  created_at: string;
  total_stock?: number; // Stock total sumado de todas las tiendas
  stockByStore?: Record<string, number>; // Stock por sucursal (store_id -> qty)
}

import { PRODUCT_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import { sanitizeInventoryData, getNegativeStockAlert } from '@/utils/inventoryValidation';
import { generateInventoryProductsDataSnapshotPDF } from '@/lib/reports/inventoryReport';

interface Store {
  id: string;
  name: string;
}

export const ProductsPage: React.FC = () => {
  const { userProfile, company } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeStats, setStoreStats] = useState<Record<string, {
    storeName: string;
    phones: number;
    accessories: number;
    technical_service: number;
  }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [showStats, setShowStats] = useState(false);
  // Bulk import state
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  // Table UX state
  const [sortKey, setSortKey] = useState<keyof Product>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [generatingProductsDataReport, setGeneratingProductsDataReport] = useState(false);

  // Entradas visibles de estadísticas por sucursal (respetan filtros y rol)
  const visibleStoreStatsEntries = Object.entries(storeStats).filter(([storeId]) => {
    // Para cajeros, mostrar solo su sucursal asignada
    if (userProfile?.role === 'cashier' && userProfile?.assigned_store_id) {
      return storeId === userProfile.assigned_store_id;
    }
    // Para admin/manager, mostrar todas o solo la seleccionada si hay filtro
    if (storeFilter && storeFilter !== 'all') {
      return storeId === storeFilter;
    }
    return true;
  });

  // --- Export helpers ---
  const csvEscape = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const handleExportCSV = () => {
    const headers = ['sku','barcode','name','category','total_stock','cost_usd','sale_price_usd','tax_rate','active'];
    const lines = [headers.join(',')];
    filteredProducts.forEach(p => {
      // Si hay filtro por sucursal, exportar stock de esa sucursal específica
      // Si no hay filtro, exportar stock total
      let stockToExport = p.total_stock ?? 0;
      if (storeFilter && storeFilter !== 'all' && p.stockByStore && p.stockByStore[storeFilter] !== undefined) {
        stockToExport = p.stockByStore[storeFilter] || 0;
      }
      
      const row = [
        csvEscape(p.sku),
        csvEscape(p.barcode ?? ''),
        csvEscape(p.name),
        csvEscape(p.category ?? ''),
        csvEscape(stockToExport),
        csvEscape(p.cost_usd),
        csvEscape(p.sale_price_usd),
        csvEscape(p.tax_rate),
        csvEscape(p.active ? 1 : 0),
      ];
      lines.push(row.join(','));
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth()+1).padStart(2,'0');
    const dd = String(date.getDate()).padStart(2,'0');
    const companySlug = (company?.name || 'empresa').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    a.href = url;
    a.download = `productos_${companySlug}_${yyyy}${mm}${dd}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchProducts = async () => {
    try {
      if (!userProfile?.company_id) {
        console.log('No company_id found for user');
        setProducts([]);
        setLoading(false);
        return;
      }

      // Primero obtener los productos
      const { data: productsData, error: productsError } = await (supabase.from('products') as any)
        .select('id, sku, barcode, name, category, cost_usd, sale_price_usd, tax_rate, active, created_at')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        toast({
          title: "Error",
          description: "No se pudieron cargar los productos",
          variant: "destructive",
        });
        return;
      }

      // Obtener el stock por producto y sucursal
      // Para cajeros, filtrar solo la sucursal asignada
      let inventoryQuery = (supabase.from('inventories') as any)
        .select('product_id, store_id, qty')
        .eq('company_id', userProfile.company_id);
      
      // Si el usuario es cajero y tiene sucursal asignada, filtrar solo esa sucursal
      if (userProfile.role === 'cashier' && userProfile.assigned_store_id) {
        inventoryQuery = inventoryQuery.eq('store_id', userProfile.assigned_store_id);
      }
      
      const { data: inventoryData, error: inventoryError } = await inventoryQuery;

      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
        toast({
          title: "Advertencia",
          description: "No se pudo cargar el inventario. El stock puede no estar actualizado.",
          variant: "destructive",
        });
      }

      // Agrupar stock por producto (total) y por producto-sucursal
      const stockByProduct = new Map<string, number>();
      const stockByProductStore = new Map<string, Record<string, number>>();
      
      console.log('📊 DEBUG ProductsPage - fetchProducts:', {
        totalProducts: productsData?.length || 0,
        totalInventoryItems: inventoryData?.length || 0,
        inventoryError: inventoryError?.message || null
      });
      
      if (inventoryData && inventoryData.length > 0) {
        // CRÍTICO: Sanitizar datos de inventario (corregir valores negativos)
        const sanitizedInventory = sanitizeInventoryData(inventoryData);
        
        console.log('📊 DEBUG ProductsPage - después de sanitizeInventoryData:', {
          totalItems: sanitizedInventory.length,
          sampleItems: sanitizedInventory.slice(0, 3)
        });
        
        // CRÍTICO: Detectar y alertar sobre stock negativo
        const negativeItems = sanitizedInventory.filter((item: any) => item._wasNegative);
        if (negativeItems.length > 0 && userProfile?.role === 'admin') {
          setTimeout(() => {
            toast({
              title: "⚠️ ALERTA CRÍTICA: Stock Negativo Detectado",
              description: `Se encontraron ${negativeItems.length} registro(s) con stock negativo. Se muestran como 0 pero requieren corrección en la base de datos.`,
              variant: "destructive",
              duration: 12000,
            });
          }, 1000);
        }
        
        // CRÍTICO: Agrupar por producto-store_id para evitar duplicados en suma
        // Usar un separador único que no esté en UUIDs: usar '::' en lugar de '-'
        const lastQtyByKey = new Map<string, number>(); // Último qty visto por clave
        
        sanitizedInventory.forEach((item: any) => {
          if (!item.product_id || !item.store_id) {
            console.warn('⚠️ Item de inventario inválido (sin product_id o store_id):', item);
            return; // Saltar items inválidos
          }
          
          // MEJORA: Validar que qty >= 0 para prevenir valores negativos en el cálculo
          const qty = Math.max(0, item.qty || 0); // Asegurar que qty >= 0
          
          // Clave única: product_id::store_id (usar :: en lugar de - porque UUIDs tienen guiones)
          const key = `${item.product_id}::${item.store_id}`;
          
          // Solo tomar el último valor visto para evitar duplicados
          // Si hay múltiples registros del mismo producto-store, usar el último
          const existingQty = lastQtyByKey.get(key) || 0;
          lastQtyByKey.set(key, Math.max(existingQty, qty)); // Usar el máximo en caso de duplicados
        });
        
        console.log('📊 DEBUG ProductsPage - después de agrupar por clave:', {
          uniqueKeys: lastQtyByKey.size,
          sampleKeys: Array.from(lastQtyByKey.entries()).slice(0, 3)
        });
        
        // Ahora procesar los valores únicos
        lastQtyByKey.forEach((qty, key) => {
          // Separar usando '::' en lugar de '-'
          const [productId, storeId] = key.split('::');
          
          if (!productId || !storeId) {
            console.warn('⚠️ Error al separar clave de inventario:', { key, productId, storeId });
            return;
          }
          
          // Stock total por producto
          const currentStock = stockByProduct.get(productId) || 0;
          stockByProduct.set(productId, currentStock + qty);
          
          // Stock por producto-sucursal
          if (!stockByProductStore.has(productId)) {
            stockByProductStore.set(productId, {});
          }
          const storeRecord = stockByProductStore.get(productId)!;
          storeRecord[storeId] = qty; // Usar qty validado
        });
        
        console.log('📊 DEBUG ProductsPage - stock calculado:', {
          totalProductsWithStock: stockByProduct.size,
          sampleStockData: Array.from(stockByProduct.entries()).slice(0, 5)
        });
      } else {
        console.warn('⚠️ No se encontró inventario o está vacío');
      }

      // Combinar productos con stock
      const productsWithStock = (productsData || []).map((product: any) => ({
        ...product,
        total_stock: stockByProduct.get(product.id) || 0,
        stockByStore: stockByProductStore.get(product.id) || {}
      }));

      setProducts(productsWithStock as Product[]);
    } catch (error) {
      console.error('Error in fetchProducts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      if (!userProfile?.company_id) return;

      const { data, error } = await (supabase.from('stores') as any)
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error fetching stores:', error);
        return;
      }

      setStores((data || []) as Store[]);
    } catch (error) {
      console.error('Error in fetchStores:', error);
    }
  };

  const handleGenerateProductsDataReport = async (storeId?: string) => {
    try {
      setGeneratingProductsDataReport(true);

      if (!userProfile?.company_id) {
        toast({
          title: "Error",
          description: "No se pudo identificar la empresa para generar el reporte.",
          variant: "destructive",
        });
        return;
      }

      // Obtener inventario detallado con JOIN a productos y tiendas, similar a InventoryPage
      const { data: inventoryData, error: inventoryError } = await (supabase.from('inventories') as any)
        .select(`
          id,
          product_id,
          store_id,
          qty,
          min_qty,
          products!inner(
            id,
            name,
            sku,
            category,
            sale_price_usd
          ),
          stores!inner(
            id,
            name
          )
        `)
        .eq('company_id', userProfile.company_id);

      if (inventoryError) {
        console.error("Error fetching inventory for products data report:", inventoryError);
        toast({
          title: "Error",
          description: "No se pudo cargar el inventario para el reporte de datos de productos.",
          variant: "destructive",
        });
        return;
      }

      const inventoryItems = (inventoryData || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        store_id: item.store_id,
        qty: item.qty,
        min_qty: item.min_qty,
        product: {
          id: item.products?.id,
          name: item.products?.name,
          sku: item.products?.sku,
          category: item.products?.category,
          sale_price_usd: item.products?.sale_price_usd,
        },
        store: {
          name: item.stores?.name,
        },
      }));

      // Asegurarse de tener la lista de tiendas
      let storesList = stores;
      if (!storesList || storesList.length === 0) {
        const { data: storesData, error: storesError } = await (supabase.from('stores') as any)
          .select('id, name')
          .eq('company_id', userProfile.company_id)
          .eq('active', true)
          .order('name');
        if (storesError) {
          console.error('Error fetching stores for products data report:', storesError);
          toast({
            title: "Error",
            description: "No se pudieron cargar las tiendas para el reporte.",
            variant: "destructive",
          });
          return;
        }
        storesList = (storesData || []) as Store[];
      }

      const filteredInventoryItems = storeId
        ? inventoryItems.filter((item: any) => item.store_id === storeId)
        : inventoryItems;

      const filteredStoresList = storeId
        ? storesList.filter(s => s.id === storeId)
        : storesList;

      const pdf = await generateInventoryProductsDataSnapshotPDF(
        filteredInventoryItems as any,
        filteredStoresList.map(s => ({ id: s.id, name: s.name })),
        new Date().toISOString()
      );

      const filename = `Reporte_Datos_Productos_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`;
      pdf.save(filename);

      toast({
        title: "Reporte generado",
        description: storeId
          ? "El reporte de datos de productos para la sucursal seleccionada se ha descargado exitosamente."
          : "El reporte de datos de productos se ha descargado exitosamente.",
      });
    } catch (error) {
      console.error("Error generating products data report from ProductsPage:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el reporte de datos de productos desde Productos.",
        variant: "destructive",
      });
    } finally {
      setGeneratingProductsDataReport(false);
    }
  };

  // Obtener estadísticas de inventario por sucursal y categoría
  const fetchStoreStats = async () => {
    try {
      if (!userProfile?.company_id || stores.length === 0) return;

      // Obtener inventario con JOIN a productos para obtener la categoría
      // Para cajeros, filtrar solo la sucursal asignada
      let statsQuery = (supabase.from('inventories') as any)
        .select(`
          store_id,
          qty,
          product_id,
          products!inner(
            id,
            category
          )
        `)
        .eq('company_id', userProfile.company_id);
      
      // Si el usuario es cajero y tiene sucursal asignada, filtrar solo esa sucursal
      if (userProfile.role === 'cashier' && userProfile.assigned_store_id) {
        statsQuery = statsQuery.eq('store_id', userProfile.assigned_store_id);
      }
      
      const { data: inventoryData, error: inventoryError } = await statsQuery;

      if (inventoryError) {
        console.error('Error fetching store stats:', inventoryError);
        return;
      }

      // Crear un mapa de store_id -> store_name
      const storeMap = new Map<string, string>();
      stores.forEach(store => {
        storeMap.set(store.id, store.name);
      });

      // Inicializar estadísticas por sucursal
      const stats: Record<string, {
        storeName: string;
        phones: number;
        accessories: number;
        technical_service: number;
      }> = {};

      // Inicializar todas las sucursales
      stores.forEach(store => {
        stats[store.id] = {
          storeName: store.name,
          phones: 0,
          accessories: 0,
          technical_service: 0,
        };
      });

      // Procesar datos de inventario
      if (inventoryData) {
        inventoryData.forEach((item: any) => {
          const storeId = item.store_id;
          const category = item.products?.category;
          const qty = item.qty || 0;

          // Inicializar la sucursal si no existe (por si hay datos de sucursales no activas)
          if (!stats[storeId]) {
            const storeName = storeMap.get(storeId) || 'Sucursal Desconocida';
            stats[storeId] = {
              storeName: storeName,
              phones: 0,
              accessories: 0,
              technical_service: 0,
            };
          }

          // Sumar la cantidad según la categoría
          if (category === 'phones') {
            stats[storeId].phones += qty;
          } else if (category === 'accessories') {
            stats[storeId].accessories += qty;
          } else if (category === 'technical_service') {
            stats[storeId].technical_service += qty;
          }
        });
      }

      setStoreStats(stats);
    } catch (error) {
      console.error('Error in fetchStoreStats:', error);
    }
  };

  // Para cajeros, establecer automáticamente el filtro de sucursal a su sucursal asignada
  useEffect(() => {
    if (userProfile?.role === 'cashier' && userProfile?.assigned_store_id) {
      setStoreFilter(userProfile.assigned_store_id as string);
    }
  }, [userProfile?.role, userProfile?.assigned_store_id]);

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchProducts();
      fetchStores();
    }
  }, [userProfile?.company_id]);

  // Cargar estadísticas cuando las tiendas estén disponibles
  useEffect(() => {
    if (stores.length > 0 && userProfile?.company_id) {
      fetchStoreStats();
    }
  }, [stores.length, userProfile?.company_id]);

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleFormSuccess = () => {
    fetchProducts();
    fetchStoreStats(); // Actualizar estadísticas después de crear/editar producto
    handleFormClose();
    toast({
      title: "Éxito",
      description: editingProduct ? "Producto actualizado correctamente" : "Producto creado correctamente",
    });
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;

    try {
      const { error } = await (supabase.from('products') as any)
        .delete()
        .eq('id', deletingProduct.id);

      if (error) {
        console.error('Error deleting product:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el producto",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: "Producto eliminado correctamente",
      });

      fetchProducts();
      fetchStoreStats(); // Actualizar estadísticas después de eliminar producto
    } catch (error) {
      console.error('Error in handleDeleteProduct:', error);
    } finally {
      setDeletingProduct(null);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || product.category === categoryFilter;
    
    // Filtro por sucursal: si se selecciona una sucursal, mostrar solo productos que tienen stock en esa sucursal
    // El stock mostrado será el específico de esa sucursal
    const matchesStore = !storeFilter || storeFilter === 'all' || 
      (product.stockByStore && product.stockByStore[storeFilter] !== undefined && (product.stockByStore[storeFilter] || 0) > 0);
    
    return matchesSearch && matchesCategory && matchesStore;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    
    // Si se ordena por stock y hay un filtro de sucursal, usar el stock de esa sucursal
    if (sortKey === 'total_stock' && storeFilter && storeFilter !== 'all') {
      const stockA = (a.stockByStore && a.stockByStore[storeFilter] !== undefined) 
        ? (a.stockByStore[storeFilter] || 0) 
        : (a.total_stock ?? 0);
      const stockB = (b.stockByStore && b.stockByStore[storeFilter] !== undefined) 
        ? (b.stockByStore[storeFilter] || 0) 
        : (b.total_stock ?? 0);
      return (stockA - stockB) * dir;
    }
    
    const va = (a[sortKey] as any) ?? '';
    const vb = (b[sortKey] as any) ?? '';
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });

  const total = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pagedProducts = sortedProducts.slice(startIdx, startIdx + pageSize);



  const changeSort = (key: keyof Product) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  useEffect(() => { setPage(1); }, [searchTerm, categoryFilter, storeFilter]);

  // --- Bulk Import Helpers ---
  const normalize = (s: string) => s.trim().toLowerCase();
  const headerAlias: Record<string, string> = {
    sku: 'sku',
    código: 'sku',
    codigo: 'sku',
    barcode: 'barcode',
    barras: 'barcode',
    nombre: 'name',
    name: 'name',
    categoria: 'category',
    categoría: 'category',
    category: 'category',
    costo: 'cost_usd',
    costo_usd: 'cost_usd',
    cost: 'cost_usd',
    precio: 'sale_price_usd',
    precio_usd: 'sale_price_usd',
    price: 'sale_price_usd',
    impuesto: 'tax_rate',
    iva: 'tax_rate',
    tax: 'tax_rate',
    activo: 'active',
    active: 'active',
  };

  const parseTableText = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const delimiter = (lines[0].split('\t').length > lines[0].split(',').length) ? '\t' : ',';
    const rawHeaders = lines[0].split(new RegExp(`${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`)).map(h => h.replace(/^\"|\"$/g, ''));
    const headers = rawHeaders.map(h => headerAlias[normalize(h)] || normalize(h));
    const rows = lines.slice(1).map(line => {
      const cols = line.split(new RegExp(`${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`)).map(c => c.replace(/^\"|\"$/g, ''));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (cols[i] ?? '').trim(); });
      return obj;
    });
    return { headers, rows };
  };

  const handlePasteParse = () => {
    const { headers, rows } = parseTableText(pasteText);
    setParsedHeaders(headers);
    setParsedRows(rows);
    if (rows.length === 0) {
      toast({ title: 'Sin datos', description: 'No se detectaron filas.', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    const { headers, rows } = parseTableText(text);
    setParsedHeaders(headers);
    setParsedRows(rows);
    if (rows.length === 0) {
      toast({ title: 'Sin datos', description: 'El CSV no contiene filas.', variant: 'destructive' });
    }
  };

  const toNumber = (v?: string) => {
    if (!v) return undefined;
    const n = Number(String(v).replace(',', '.'));
    return isFinite(n) ? n : undefined;
  };

  const toBoolean = (v?: string) => {
    if (!v) return undefined;
    const s = v.trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'si' || s === 'sí' || s === 'activo';
  };

  const handleImportInsert = async () => {
    if (!userProfile?.company_id) return;
    if (parsedRows.length === 0) {
      toast({ title: 'Nada para importar', description: 'Primero pega o sube datos.', variant: 'destructive' });
      return;
    }
    setImporting(true);
    try {
      // Map rows to product inserts
      const inserts = parsedRows
        .map(r => {
          const sku = r['sku'] || '';
          const name = r['name'] || '';
          const sale = toNumber(r['sale_price_usd']);
          const cost = toNumber(r['cost_usd']);
          const tax = toNumber(r['tax_rate']);
          if (!sku || !name || sale == null || cost == null) return null;
          return {
            company_id: userProfile.company_id,
            sku,
            barcode: r['barcode'] || null,
            name,
            category: r['category'] || null,
            cost_usd: cost,
            sale_price_usd: sale,
            tax_rate: tax ?? 0,
            active: toBoolean(r['active']) ?? true,
          };
        })
        .filter(Boolean) as any[];

      if (inserts.length === 0) {
        toast({ title: 'Sin filas válidas', description: 'Verifica columnas requeridas: sku, name, cost_usd, sale_price_usd.', variant: 'destructive' });
        return;
      }

      // Insert in batches to avoid payload limits
      const batchSize = 300;
      for (let i = 0; i < inserts.length; i += batchSize) {
        const batch = inserts.slice(i, i + batchSize);
        const { error } = await supabase.from('products').insert(batch);
        if (error) {
          throw error;
        }
      }

      toast({ title: 'Importación completa', description: `Se importaron ${inserts.length} productos.` });
      setPasteText('');
      setParsedHeaders([]);
      setParsedRows([]);
      setShowBulkImport(false);
      fetchProducts();
      fetchStoreStats(); // Actualizar estadísticas después de importar
    } catch (e: any) {
      toast({ title: 'Error al importar', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  // Validar que cajeros tengan tienda asignada
  if (userProfile?.role === 'cashier' && !userProfile?.assigned_store_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Store className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Tienda no asignada</h2>
              <p className="text-muted-foreground mb-4">
                Tu cuenta no tiene una tienda asignada. Contacta al administrador para que te asigne una tienda y puedas comenzar a trabajar.
              </p>
              <p className="text-sm text-muted-foreground">
                Una vez asignada una tienda, podrás ver los productos y realizar ventas.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 xs:space-y-4 sm:space-y-6 p-3 xs:p-4 sm:p-6 relative">
      {/* Badge de versión */}
      <div className="absolute top-3 right-3 xs:top-4 xs:right-4 z-10">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
          v-valid
        </Badge>
      </div>
      {/* Header Mobile First */}
      <div className="flex flex-col space-y-3 xs:space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1 xs:space-y-2">
          <h1 className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Gestión de Productos</h1>
          <p className="text-xs xs:text-sm text-muted-foreground">
            Administra el catálogo de productos de tu empresa
          </p>
        </div>
        {userProfile?.role === 'admin' && (
          <div className="flex flex-col xs:flex-row gap-2 xs:gap-2 sm:gap-2">
            {/* Botones principales - Stack en móvil */}
            <div className="flex flex-col xs:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowStats(v => !v)}
                className="w-full xs:w-auto h-10 xs:h-9 text-sm xs:text-sm touch-manipulation"
              >
              <BarChart3 className="mr-2 h-4 w-4" />
                <span className="hidden xs:inline">{showStats ? 'Ocultar' : 'Mostrar'} Estadísticas</span>
                <span className="xs:hidden">Estadísticas</span>
            </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowBulkImport(v => !v)}
                className="w-full xs:w-auto h-10 xs:h-9 text-sm xs:text-sm touch-manipulation"
              >
                <span className="hidden xs:inline">Importar Masivo</span>
                <span className="xs:hidden">Importar</span>
            </Button>
            </div>
            
            {/* Botones secundarios */}
            <div className="flex flex-col xs:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                className="w-full xs:w-auto h-10 xs:h-9 text-sm xs:text-sm touch-manipulation"
              >
                <span className="hidden xs:inline">Descargar Lista</span>
                <span className="xs:hidden">Exportar</span>
            </Button>
              <Button 
                onClick={handleCreateProduct}
                className="w-full xs:w-auto h-10 xs:h-9 text-sm xs:text-sm touch-manipulation"
              >
              <Plus className="mr-2 h-4 w-4" />
                <span className="hidden xs:inline">Nuevo Producto</span>
                <span className="xs:hidden">Nuevo</span>
            </Button>
            </div>
            {/* Botón de reporte de datos de productos (todas las sucursales) */}
            <div className="flex flex-col xs:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => handleGenerateProductsDataReport()}
                disabled={generatingProductsDataReport}
                className="w-full xs:w-auto h-10 xs:h-9 text-sm xs:text-sm touch-manipulation"
              >
                <FileDown className="mr-2 h-4 w-4" />
                <span className="hidden xs:inline">
                  {generatingProductsDataReport ? 'Generando datos...' : 'Reporte Datos Productos'}
                </span>
                <span className="xs:hidden">
                  {generatingProductsDataReport ? 'Generando...' : 'Datos Productos'}
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {showStats && (
        <CategoryStats products={products} />
      )}

      {showBulkImport && (
        <Card>
          <CardHeader>
            <CardTitle>Importación Masiva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Formato recomendado de columnas: sku, barcode, name, category, cost_usd, sale_price_usd, tax_rate, active
              (también se aceptan alias: código, nombre, categoría, costo, precio, iva, impuesto, activo). Puedes pegar desde Excel (tabulado) o subir un CSV.
            </div>

            <div className="flex flex-col space-y-4 xs:space-y-4 sm:flex-row sm:gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Pegar tabla (CSV/TSV)</label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full h-32 xs:h-40 glass-card p-3 rounded-md border text-sm"
                  placeholder={'sku\tname\tcost_usd\tsale_price_usd\nSKU001\tProducto 1\t2.5\t3.0'}
                />
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={handlePasteParse}
                    className="w-full xs:w-auto h-10 xs:h-9 text-sm touch-manipulation"
                  >
                    Previsualizar
                  </Button>
                </div>
              </div>

              <div className="w-full xs:w-full sm:w-72 space-y-2">
                <label className="text-sm font-medium">Subir CSV</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                  className="block w-full text-sm h-10 xs:h-11 px-3 border rounded-md bg-background"
                />
              </div>
            </div>

            {parsedRows.length > 0 && (
              <div className="overflow-auto border rounded-md">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      {parsedHeaders.map((h, i) => (
                        <th key={i} className="text-left px-3 py-2 capitalize">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {parsedHeaders.map((h, i) => (
                          <td key={i} className="px-3 py-1">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 50 && (
                  <div className="p-2 text-xs text-muted-foreground">Mostrando primeras 50 filas de {parsedRows.length}</div>
                )}
              </div>
            )}

            <div className="flex flex-col xs:flex-row gap-2 xs:justify-end">
              <Button 
                variant="outline" 
                onClick={() => { setParsedHeaders([]); setParsedRows([]); setPasteText(''); }}
                className="w-full xs:w-auto h-10 xs:h-9 text-sm touch-manipulation"
              >
                Limpiar
              </Button>
              <Button 
                disabled={importing || parsedRows.length === 0} 
                onClick={handleImportInsert}
                className="w-full xs:w-auto h-10 xs:h-9 text-sm touch-manipulation"
              >
                {importing ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layout de dos columnas: Cards (35%) y Tabla (65%) */}
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-start">
        {/* Columna izquierda: Cards de estadísticas por sucursal (35%) */}
        {Object.keys(storeStats).length > 0 && (
          <div className="w-full lg:w-[35%] space-y-3 flex flex-col">
            <div className="flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold">Resumen por Sucursal</h2>
              <Badge variant="outline" className="text-xs">
                {userProfile?.role === 'cashier' ? '1' : Object.keys(storeStats).length} sucursal{userProfile?.role === 'cashier' ? '' : (Object.keys(storeStats).length !== 1 ? 'es' : '')}
              </Badge>
            </div>
            <div className="space-y-2.5 w-full">
              {visibleStoreStatsEntries.map(([storeId, stats]) => (
                <Card key={storeId} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Store className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-sm">{stats.storeName}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 py-2">
                    {/* Teléfonos */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-xs text-muted-foreground">Teléfonos</span>
                      </div>
                      <span className="text-base font-bold text-purple-600">
                        {stats.phones.toLocaleString()}
                      </span>
                    </div>
                    
                    {/* Accesorios */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Headphones className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs text-muted-foreground">Accesorios</span>
                      </div>
                      <span className="text-base font-bold text-green-600">
                        {stats.accessories.toLocaleString()}
                      </span>
                    </div>
                    
                    {/* Servicios Técnicos */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-orange-600" />
                        <span className="text-xs text-muted-foreground">Servicios</span>
                      </div>
                      <span className="text-base font-bold text-orange-600">
                        {stats.technical_service.toLocaleString()}
                      </span>
                    </div>
                    
                    {/* Total */}
                    <div className="pt-1.5 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Total</span>
                        <span className="text-lg font-bold text-blue-600">
                          {(stats.phones + stats.accessories + stats.technical_service).toLocaleString()}
                        </span>
                      </div>
                      {userProfile?.role === 'admin' && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={generatingProductsDataReport}
                            onClick={() => handleGenerateProductsDataReport(storeId)}
                            className="h-7 text-[11px] px-2 py-1"
                          >
                            <FileDown className="mr-1 h-3 w-3" />
                            {generatingProductsDataReport ? 'Generando...' : 'Reporte sucursal'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Totales globales por categoría en todas las sucursales visibles */}
            {visibleStoreStatsEntries.length > 0 && (
              <div className="mt-2 space-y-1">
                <Badge className="w-full justify-between px-3 py-2 bg-purple-600 text-white border-transparent">
                  <span className="text-xs font-semibold uppercase tracking-wide">Total Teléfonos</span>
                  <span className="text-sm font-bold">
                    {visibleStoreStatsEntries.reduce((sum, [, s]) => sum + s.phones, 0).toLocaleString()}
                  </span>
                </Badge>
                <Badge className="w-full justify-between px-3 py-2 bg-green-600 text-white border-transparent">
                  <span className="text-xs font-semibold uppercase tracking-wide">Total Accesorios</span>
                  <span className="text-sm font-bold">
                    {visibleStoreStatsEntries.reduce((sum, [, s]) => sum + s.accessories, 0).toLocaleString()}
                  </span>
                </Badge>
                <Badge className="w-full justify-between px-3 py-2 bg-orange-600 text-white border-transparent">
                  <span className="text-xs font-semibold uppercase tracking-wide">Total Servicios Técnicos</span>
                  <span className="text-sm font-bold">
                    {visibleStoreStatsEntries.reduce((sum, [, s]) => sum + s.technical_service, 0).toLocaleString()}
                  </span>
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Columna derecha: Tabla con filtros (65%) */}
        <div className="flex-1 lg:w-[65%] space-y-3 min-w-0">
          {/* Barra de búsqueda y filtros */}
          <div className="flex flex-col space-y-2 xs:space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:gap-3">
            {/* Búsqueda - Full width en móvil */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full text-sm xs:text-base h-10 xs:h-11"
              />
            </div>
            
            {/* Select de categoría */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full xs:w-auto sm:w-48 text-sm xs:text-base h-10 xs:h-11">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {PRODUCT_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Select de sucursal - Solo para admin y manager */}
            {userProfile?.role !== 'cashier' && (
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-full xs:w-auto sm:w-48 text-sm xs:text-base h-10 xs:h-11">
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Table view */}
          <div className="glass-card border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-left cursor-pointer" onClick={() => changeSort('sku')}>SKU {sortKey==='sku' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                    <th className="px-4 py-3 text-left cursor-pointer" onClick={() => changeSort('name')}>Nombre {sortKey==='name' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-right cursor-pointer" onClick={() => changeSort('cost_usd')}>Costo {sortKey==='cost_usd' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                    <th className="px-4 py-3 text-right cursor-pointer" onClick={() => changeSort('sale_price_usd')}>Precio {sortKey==='sale_price_usd' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                    <th className="px-4 py-3 text-right cursor-pointer" onClick={() => changeSort('total_stock')}>Stock {sortKey==='total_stock' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    {userProfile?.role === 'admin' && (
                      <th className="px-4 py-3 text-right">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
              {pagedProducts.map((p) => {
                // Si hay filtro por sucursal, mostrar stock de esa sucursal específica
                // Si no hay filtro (storeFilter === 'all'), mostrar stock total de todas las sucursales
                let stock = p.total_stock ?? 0;
                if (storeFilter && storeFilter !== 'all' && p.stockByStore && p.stockByStore[storeFilter] !== undefined) {
                  stock = p.stockByStore[storeFilter] || 0;
                }
                return (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      {p.category ? (
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(p.category)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin categoría</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">${p.cost_usd.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">${p.sale_price_usd.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">
                      {Math.max(0, stock).toLocaleString()}
                      {stock < 0 && (
                        <span className="ml-2 text-xs text-red-600">⚠️ Stock negativo detectado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={p.active ? 'default' : 'secondary'}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    {userProfile?.role === 'admin' && (
                      <td className="px-2 xs:px-4 py-3 text-right">
                        <div className="flex justify-end gap-1 xs:gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditProduct(p)}
                            className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation"
                            title="Editar producto"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setDeletingProduct(p)}
                            className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Eliminar producto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {pagedProducts.length === 0 && (
                <tr>
                  <td colSpan={userProfile?.role === 'admin' ? 8 : 7} className="px-4 py-10 text-center text-muted-foreground">No hay productos para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination - Mobile First */}
        <div className="flex flex-col space-y-3 xs:space-y-0 xs:flex-row xs:items-center xs:justify-between p-3 border-t bg-background/60">
          <div className="text-xs xs:text-sm text-muted-foreground text-center xs:text-left">
            Mostrando {total === 0 ? 0 : startIdx + 1}-{Math.min(startIdx + pageSize, total)} de {total}
          </div>
          <div className="flex flex-col xs:flex-row items-center gap-2 xs:gap-2">
            {/* Selector de tamaño de página */}
            <select
              className="h-8 xs:h-8 rounded-md border bg-transparent px-2 text-xs xs:text-sm w-full xs:w-auto"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {[10,12,20,30,50].map(s => <option key={s} value={s}>{s}/pág</option>)}
            </select>
            
            {/* Botones de navegación */}
            <div className="flex items-center gap-1 xs:gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p-1))} 
                disabled={currentPage === 1}
                className="h-8 xs:h-8 px-2 xs:px-3 text-xs xs:text-sm touch-manipulation"
              >
                <span className="hidden xs:inline">Anterior</span>
                <span className="xs:hidden">‹</span>
              </Button>
              <div className="text-xs xs:text-sm px-2 xs:px-3 min-w-[60px] text-center">
                {currentPage}/{totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p+1))} 
                disabled={currentPage === totalPages}
                className="h-8 xs:h-8 px-2 xs:px-3 text-xs xs:text-sm touch-manipulation"
              >
                <span className="hidden xs:inline">Siguiente</span>
                <span className="xs:hidden">›</span>
              </Button>
            </div>
          </div>
        </div>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 xs:py-12">
              <div className="text-sm xs:text-base text-muted-foreground px-4">
                {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No hay productos registrados'}
              </div>
              {!searchTerm && userProfile?.role === 'admin' && (
                <Button 
                  className="mt-4 h-10 xs:h-11 text-sm xs:text-base touch-manipulation" 
                  onClick={handleCreateProduct}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">Crear Primer Producto</span>
                  <span className="xs:hidden">Crear Producto</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ProductForm
          product={editingProduct}
          stores={stores}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      <DeleteConfirmDialog
        open={!!deletingProduct}
        onOpenChange={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
        title="Eliminar Producto"
        description={`¿Estás seguro de que deseas eliminar el producto "${deletingProduct?.name}"? Esta acción eliminará también todos los inventarios asociados y no se puede deshacer.`}
      />
    </div>
  );
};
