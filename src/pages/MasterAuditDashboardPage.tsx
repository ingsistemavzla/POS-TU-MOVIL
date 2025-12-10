import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Package,
  Store,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Eye,
  Clock,
  User,
  Receipt,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Database,
  BarChart3,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InventoryMovement {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST';
  qty: number;
  store_from_id: string | null;
  store_from_name?: string;
  store_to_id: string | null;
  store_to_name?: string;
  reason: string | null;
  user_id: string;
  user_name?: string;
  company_id: string;
  created_at: string;
}

interface InventoryTransfer {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  from_store_id: string;
  from_store_name?: string;
  to_store_id: string;
  to_store_name?: string;
  quantity: number;
  transferred_by: string;
  transferred_by_name?: string;
  company_id: string;
  status: string;
  created_at: string;
}

interface Sale {
  id: string;
  invoice_number: string;
  store_id: string;
  store_name?: string;
  customer_name: string;
  total_usd: number;
  cashier_id: string;
  cashier_name?: string;
  created_at: string;
  sale_items?: Array<{
    product_name: string;
    qty: number;
  }>;
}

interface Store {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

export const MasterAuditDashboardPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('movements');
  
  // Data
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Filters
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // Cambiado de 'today' a 'all' para ver todos los datos
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [movementsPage, setMovementsPage] = useState(1);
  const [transfersPage, setTransfersPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const pageSize = 50;

  // Fetch stores and products for filters
  useEffect(() => {
    const fetchFilters = async () => {
      const [storesRes, productsRes] = await Promise.all([
        supabase.from('stores').select('id, name').eq('active', true).order('name'),
        supabase.from('products').select('id, name, sku').order('name').limit(1000)
      ]);
      
      if (storesRes.data) setStores(storesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
    };
    
    fetchFilters();
  }, []);

  // Fetch inventory movements
  const fetchMovements = async () => {
    try {
      let query = supabase
        .from('inventory_movements')
        .select(`
          *,
          products!inner(name, sku),
          stores_from:stores!inventory_movements_store_from_id_fkey(id, name),
          stores_to:stores!inventory_movements_store_to_id_fkey(id, name),
          users!inner(name)
        `)
        .order('created_at', { ascending: false })
        .limit(pageSize)
        .range((movementsPage - 1) * pageSize, movementsPage * pageSize - 1);

      // Apply filters
      if (storeFilter !== 'all') {
        query = query.or(`store_from_id.eq.${storeFilter},store_to_id.eq.${storeFilter}`);
      }
      
      if (productFilter !== 'all') {
        query = query.eq('product_id', productFilter);
      }
      
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }
      
      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching movements:', error);
        throw error;
      }

      console.log('✅ Movements fetched:', data?.length || 0);

      const formattedMovements: InventoryMovement[] = (data || []).map((m: any) => ({
        id: m.id,
        product_id: m.product_id,
        product_name: m.products?.name || 'Producto N/A',
        product_sku: m.products?.sku || 'N/A',
        type: m.type,
        qty: m.qty,
        store_from_id: m.store_from_id,
        store_from_name: m.stores_from?.name || 'N/A',
        store_to_id: m.store_to_id,
        store_to_name: m.stores_to?.name || 'N/A',
        reason: m.reason,
        user_id: m.user_id,
        user_name: m.users?.name || 'Usuario N/A',
        company_id: m.company_id,
        created_at: m.created_at,
      }));

      setMovements(formattedMovements);
    } catch (error: any) {
      console.error('❌ Error fetching movements:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los movimientos de inventario",
        variant: "destructive",
      });
    }
  };

  // Fetch inventory transfers
  const fetchTransfers = async () => {
    try {
      console.log('🔄 [fetchTransfers] Iniciando carga de transferencias...');
      
      // Intentar query simple primero (sin JOINs complejos)
      let query = supabase
        .from('inventory_transfers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(pageSize)
        .range((transfersPage - 1) * pageSize, transfersPage * pageSize - 1);

      if (storeFilter !== 'all') {
        query = query.or(`from_store_id.eq.${storeFilter},to_store_id.eq.${storeFilter}`);
      }
      
      if (productFilter !== 'all') {
        query = query.eq('product_id', productFilter);
      }

      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching transfers:', error);
        throw error;
      }

      console.log('✅ Transfers fetched:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🔍 DEBUG - First transfer raw data:', JSON.stringify(data[0], null, 2));
      }

      // Extraer IDs únicos para queries separadas si los JOINs fallan
      const productIds = [...new Set((data || []).map((t: any) => t.product_id).filter(Boolean))];
      const storeIds = [...new Set((data || []).flatMap((t: any) => [t.from_store_id, t.to_store_id]).filter(Boolean))];
      const userIds = [...new Set((data || []).map((t: any) => t.transferred_by).filter(Boolean))];

      console.log('🔍 [fetchTransfers] IDs extraídos:', {
        productIds: productIds.length,
        storeIds: storeIds.length,
        userIds: userIds.length,
        sampleProductId: productIds[0],
        sampleStoreId: storeIds[0],
        sampleUserId: userIds[0],
      });

      // Hacer queries separadas para obtener nombres si los JOINs no funcionaron
      let productsData = { data: [], error: null };
      let storesData = { data: [], error: null };
      let usersData = { data: [], error: null };

      try {
        if (productIds.length > 0) {
          console.log('🔄 [fetchTransfers] Consultando products...', productIds);
          productsData = await supabase.from('products').select('id, name, sku').in('id', productIds);
          if (productsData.error) {
            console.error('❌ [fetchTransfers] Error fetching products:', productsData.error);
          } else {
            console.log('✅ [fetchTransfers] Products obtenidos:', productsData.data?.length || 0);
          }
        }
      } catch (err) {
        console.error('❌ [fetchTransfers] Excepción al consultar products:', err);
      }

      try {
        if (storeIds.length > 0) {
          console.log('🔄 [fetchTransfers] Consultando stores...', storeIds);
          storesData = await supabase.from('stores').select('id, name').in('id', storeIds);
          if (storesData.error) {
            console.error('❌ [fetchTransfers] Error fetching stores:', storesData.error);
          } else {
            console.log('✅ [fetchTransfers] Stores obtenidos:', storesData.data?.length || 0);
          }
        }
      } catch (err) {
        console.error('❌ [fetchTransfers] Excepción al consultar stores:', err);
      }

      try {
        if (userIds.length > 0) {
          console.log('🔄 [fetchTransfers] Consultando users...', userIds);
          usersData = await supabase.from('users').select('id, name, email').in('id', userIds);
          if (usersData.error) {
            console.error('❌ [fetchTransfers] Error fetching users:', usersData.error);
          } else {
            console.log('✅ [fetchTransfers] Users obtenidos:', usersData.data?.length || 0);
          }
        }
      } catch (err) {
        console.error('❌ [fetchTransfers] Excepción al consultar users:', err);
      }

      console.log('✅ [fetchTransfers] Queries separadas completadas:', {
        products: productsData.data?.length || 0,
        stores: storesData.data?.length || 0,
        users: usersData.data?.length || 0,
      });

      // Crear mapas para búsqueda rápida
      const productsMap = new Map((productsData.data || []).map((p: any) => [p.id, p]));
      const storesMap = new Map((storesData.data || []).map((s: any) => [s.id, s]));
      const usersMap = new Map((usersData.data || []).map((u: any) => [u.id, u]));

      console.log('🗺️ [fetchTransfers] Mapas creados:', {
        productsMapSize: productsMap.size,
        storesMapSize: storesMap.size,
        usersMapSize: usersMap.size,
      });

      const formattedTransfers: InventoryTransfer[] = (data || []).map((t: any, index: number) => {
        // Obtener datos de los mapas (las queries separadas)
        const product = productsMap.get(t.product_id);
        const fromStore = storesMap.get(t.from_store_id);
        const toStore = storesMap.get(t.to_store_id);
        const user = usersMap.get(t.transferred_by);

        // Debug para el primer elemento
        if (index === 0) {
          console.log('🔍 [fetchTransfers] Mapeando primer transfer:', {
            transferId: t.id,
            productId: t.product_id,
            productFromMap: productsMap.get(t.product_id),
            productExists: !!product,
            productName: product?.name,
            fromStoreId: t.from_store_id,
            fromStoreFromMap: storesMap.get(t.from_store_id),
            fromStoreExists: !!fromStore,
            fromStoreName: fromStore?.name,
            toStoreId: t.to_store_id,
            toStoreFromMap: storesMap.get(t.to_store_id),
            toStoreExists: !!toStore,
            toStoreName: toStore?.name,
            userId: t.transferred_by,
            userFromMap: usersMap.get(t.transferred_by),
            userExists: !!user,
            userName: user?.name || user?.email,
            // Debug de los mapas
            productsMapKeys: Array.from(productsMap.keys()),
            storesMapKeys: Array.from(storesMap.keys()),
            usersMapKeys: Array.from(usersMap.keys()),
          });
        }

        const formatted = {
          id: t.id,
          product_id: t.product_id,
          product_name: product?.name || 'Producto N/A',
          product_sku: product?.sku || 'N/A',
          from_store_id: t.from_store_id,
          from_store_name: fromStore?.name || 'Tienda Origen N/A',
          to_store_id: t.to_store_id,
          to_store_name: toStore?.name || 'Tienda Destino N/A',
          quantity: t.quantity,
          transferred_by: t.transferred_by,
          transferred_by_name: user?.name || user?.email || 'Usuario N/A',
          company_id: t.company_id,
          status: t.status,
          created_at: t.created_at,
        };

        // Debug del resultado formateado para el primer elemento
        if (index === 0) {
          console.log('📋 [fetchTransfers] Transfer formateado:', formatted);
        }

        return formatted;
      });

      console.log('✅ [fetchTransfers] Transferencias formateadas:', formattedTransfers.length);
      if (formattedTransfers.length > 0) {
        console.log('📋 [fetchTransfers] Primera transferencia formateada:', formattedTransfers[0]);
      }

      setTransfers(formattedTransfers);
    } catch (error: any) {
      console.error('❌ Error fetching transfers:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las transferencias",
        variant: "destructive",
      });
    }
  };

  // Fetch recent sales
  const fetchRecentSales = async () => {
    try {
      console.log('🔄 [fetchRecentSales] Iniciando carga de ventas...');
      
      // Query simple sin JOINs complejos
      let query = supabase
        .from('sales')
        .select(`
          id,
          invoice_number,
          store_id,
          customer_name,
          total_usd,
          cashier_id,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(pageSize)
        .range((salesPage - 1) * pageSize, salesPage * pageSize - 1);

      if (storeFilter !== 'all') {
        query = query.eq('store_id', storeFilter);
      }

      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching sales:', error);
        throw error;
      }

      console.log('✅ Sales fetched:', data?.length || 0);

      // Extraer IDs únicos para queries separadas
      const storeIds = [...new Set((data || []).map((s: any) => s.store_id).filter(Boolean))];
      const cashierIds = [...new Set((data || []).map((s: any) => s.cashier_id).filter(Boolean))];
      const saleIds = [...new Set((data || []).map((s: any) => s.id).filter(Boolean))];

      console.log('🔍 [fetchRecentSales] IDs extraídos:', {
        storeIds: storeIds.length,
        cashierIds: cashierIds.length,
        saleIds: saleIds.length,
      });

      // Hacer queries separadas
      let storesData = { data: [], error: null };
      let usersData = { data: [], error: null };
      let saleItemsData = { data: [], error: null };

      try {
        if (storeIds.length > 0) {
          console.log('🔄 [fetchRecentSales] Consultando stores...', storeIds);
          storesData = await supabase.from('stores').select('id, name').in('id', storeIds);
          if (storesData.error) {
            console.error('❌ [fetchRecentSales] Error fetching stores:', storesData.error);
          } else {
            console.log('✅ [fetchRecentSales] Stores obtenidos:', storesData.data?.length || 0);
          }
        }
      } catch (err) {
        console.error('❌ [fetchRecentSales] Excepción al consultar stores:', err);
      }

      try {
        if (cashierIds.length > 0) {
          console.log('🔄 [fetchRecentSales] Consultando users (cashiers)...', cashierIds);
          usersData = await supabase.from('users').select('id, name, email').in('id', cashierIds);
          if (usersData.error) {
            console.error('❌ [fetchRecentSales] Error fetching users:', usersData.error);
          } else {
            console.log('✅ [fetchRecentSales] Users obtenidos:', usersData.data?.length || 0);
          }
        }
      } catch (err) {
        console.error('❌ [fetchRecentSales] Excepción al consultar users:', err);
      }

      try {
        if (saleIds.length > 0) {
          console.log('🔄 [fetchRecentSales] Consultando sale_items...', saleIds);
          saleItemsData = await supabase.from('sale_items').select('sale_id, product_name, qty').in('sale_id', saleIds);
          if (saleItemsData.error) {
            console.error('❌ [fetchRecentSales] Error fetching sale_items:', saleItemsData.error);
          } else {
            console.log('✅ [fetchRecentSales] Sale items obtenidos:', saleItemsData.data?.length || 0);
          }
        }
      } catch (err) {
        console.error('❌ [fetchRecentSales] Excepción al consultar sale_items:', err);
      }

      // Crear mapas para búsqueda rápida
      const storesMap = new Map((storesData.data || []).map((s: any) => [s.id, s]));
      const usersMap = new Map((usersData.data || []).map((u: any) => [u.id, u]));
      const saleItemsMap = new Map<string, any[]>();
      
      // Agrupar sale_items por sale_id
      (saleItemsData.data || []).forEach((item: any) => {
        if (!saleItemsMap.has(item.sale_id)) {
          saleItemsMap.set(item.sale_id, []);
        }
        saleItemsMap.get(item.sale_id)!.push(item);
      });

      console.log('🗺️ [fetchRecentSales] Mapas creados:', {
        storesMapSize: storesMap.size,
        usersMapSize: usersMap.size,
        saleItemsMapSize: saleItemsMap.size,
      });

      const formattedSales: Sale[] = (data || []).map((s: any) => {
        const store = storesMap.get(s.store_id);
        const cashier = usersMap.get(s.cashier_id);
        const items = saleItemsMap.get(s.id) || [];

        return {
          id: s.id,
          invoice_number: s.invoice_number,
          store_id: s.store_id,
          store_name: store?.name || 'Tienda N/A',
          customer_name: s.customer_name || 'Cliente General',
          total_usd: s.total_usd,
          cashier_id: s.cashier_id,
          cashier_name: cashier?.name || cashier?.email || 'Cajero N/A',
          created_at: s.created_at,
          sale_items: items.map((item: any) => ({
            product_name: item.product_name || 'Producto N/A',
            qty: item.qty || 0,
          })),
        };
      });

      console.log('✅ [fetchRecentSales] Ventas formateadas:', formattedSales.length);

      setRecentSales(formattedSales);
    } catch (error: any) {
      console.error('❌ Error fetching sales:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las ventas",
        variant: "destructive",
      });
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    console.log('🔄 [fetchAllData] Iniciando carga de todos los datos...');
    setLoading(true);
    try {
      await Promise.all([
        fetchMovements(),
        fetchTransfers(),
        fetchRecentSales(),
      ]);
      console.log('✅ [fetchAllData] Todos los datos cargados exitosamente');
    } catch (error) {
      console.error('❌ [fetchAllData] Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription
  useEffect(() => {
    console.log('🔄 [useEffect] MasterAuditDashboard - Verificando userProfile...', {
      hasUserProfile: !!userProfile,
      role: userProfile?.role,
      isMasterAdmin: userProfile?.role === 'master_admin',
    });
    
    if (!userProfile || userProfile.role !== 'master_admin') {
      console.log('⚠️ [useEffect] No se ejecuta fetchAllData - userProfile o role incorrecto');
      return;
    }
    
    console.log('✅ [useEffect] Ejecutando fetchAllData...');

    // Subscribe to inventory_movements changes
    const movementsChannel = supabase
      .channel('inventory_movements_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_movements',
        },
        (payload) => {
          console.log('Inventory movement change:', payload);
          // Refresh movements when there's a change
          fetchMovements();
        }
      )
      .subscribe();

    // Subscribe to inventory_transfers changes
    const transfersChannel = supabase
      .channel('inventory_transfers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_transfers',
        },
        (payload) => {
          console.log('Inventory transfer change:', payload);
          fetchTransfers();
        }
      )
      .subscribe();

    // Subscribe to sales changes
    const salesChannel = supabase
      .channel('sales_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
        },
        (payload) => {
          console.log('New sale:', payload);
          fetchRecentSales();
        }
      )
      .subscribe();

    // Initial fetch
    fetchAllData();

    // Cleanup
    return () => {
      supabase.removeChannel(movementsChannel);
      supabase.removeChannel(transfersChannel);
      supabase.removeChannel(salesChannel);
    };
  }, [userProfile, movementsPage, transfersPage, salesPage, storeFilter, productFilter, typeFilter, dateFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast({
      title: "Actualizado",
      description: "Datos actualizados correctamente",
      variant: "success",
    });
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowDown className="w-4 h-4 text-green-500" />;
      case 'OUT':
        return <ArrowUp className="w-4 h-4 text-red-500" />;
      case 'TRANSFER':
        return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
      case 'ADJUST':
        return <Minus className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'IN':
        return <Badge className="bg-green-500">Entrada</Badge>;
      case 'OUT':
        return <Badge className="bg-red-500">Salida</Badge>;
      case 'TRANSFER':
        return <Badge className="bg-blue-500">Transferencia</Badge>;
      case 'ADJUST':
        return <Badge className="bg-yellow-500">Ajuste</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const filteredMovements = useMemo(() => {
    if (!searchTerm) return movements;
    
    const term = searchTerm.toLowerCase();
    return movements.filter(m => 
      m.product_name?.toLowerCase().includes(term) ||
      m.product_sku?.toLowerCase().includes(term) ||
      m.reason?.toLowerCase().includes(term) ||
      m.user_name?.toLowerCase().includes(term)
    );
  }, [movements, searchTerm]);

  if (userProfile?.role !== 'master_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-red-500">🔒 Acceso Restringido</h2>
          <p className="text-muted-foreground">
            Esta sección es exclusiva para MASTER_ADMIN.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8" />
            Panel de Auditoría - Inventario en Tiempo Real
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualización completa de movimientos, transferencias y ventas del inventario
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar producto, SKU, razón..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los productos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                {products.slice(0, 100).map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="IN">Entrada</SelectItem>
                <SelectItem value="OUT">Salida</SelectItem>
                <SelectItem value="TRANSFER">Transferencia</SelectItem>
                <SelectItem value="ADJUST">Ajuste</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
                <SelectItem value="all">Todo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="movements">
            <Activity className="w-4 h-4 mr-2" />
            Movimientos ({movements.length})
          </TabsTrigger>
          <TabsTrigger value="transfers">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transferencias ({transfers.length})
          </TabsTrigger>
          <TabsTrigger value="sales">
            <Receipt className="w-4 h-4 mr-2" />
            Ventas ({recentSales.length})
          </TabsTrigger>
        </TabsList>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Movimientos de Inventario en Tiempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Cargando movimientos...</p>
                </div>
              ) : filteredMovements.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay movimientos para mostrar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {getMovementIcon(movement.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{movement.product_name}</span>
                            <span className="text-sm text-muted-foreground">({movement.product_sku})</span>
                            {getMovementBadge(movement.type)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Store className="w-3 h-3" />
                                {movement.store_from_name || movement.store_to_name || 'N/A'}
                              </span>
                              {movement.type === 'TRANSFER' && (
                                <span className="flex items-center gap-1">
                                  <ArrowRightLeft className="w-3 h-3" />
                                  {movement.store_to_name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {movement.user_name || 'Sistema'}
                              </span>
                            </div>
                            {movement.reason && (
                              <p className="text-xs">{movement.reason}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${movement.qty > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {movement.qty > 0 ? '+' : ''}{movement.qty}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                Transferencias entre Sucursales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Cargando transferencias...</p>
                </div>
              ) : transfers.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay transferencias para mostrar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transfers.map((transfer, idx) => {
                    // Debug: Log del primer transfer para ver qué datos tiene
                    if (idx === 0) {
                      console.log('🔍 [RENDER] Primer transfer en renderizado:', {
                        id: transfer.id,
                        product_id: transfer.product_id,
                        product_name: transfer.product_name,
                        product_sku: transfer.product_sku,
                        from_store_id: transfer.from_store_id,
                        from_store_name: transfer.from_store_name,
                        to_store_id: transfer.to_store_id,
                        to_store_name: transfer.to_store_name,
                        quantity: transfer.quantity,
                        transferred_by: transfer.transferred_by,
                        transferred_by_name: transfer.transferred_by_name,
                      });
                    }
                    
                    return (
                      <div
                        key={transfer.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{transfer.product_name || 'Producto N/A'}</span>
                              <span className="text-sm text-muted-foreground">({transfer.product_sku || 'N/A'})</span>
                              <Badge className="bg-blue-500">{transfer.quantity} unidades</Badge>
                            <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                              {transfer.status === 'completed' ? 'Completada' : transfer.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Store className="w-3 h-3 text-red-500" />
                                <span className="font-medium">Desde:</span> {transfer.from_store_name || 'Tienda Origen N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <ArrowRightLeft className="w-3 h-3 text-blue-500" />
                              </span>
                              <span className="flex items-center gap-1">
                                <Store className="w-3 h-3 text-green-500" />
                                <span className="font-medium">Hacia:</span> {transfer.to_store_name || 'Tienda Destino N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span className="font-medium">Transferido por:</span> {transfer.transferred_by_name || 'Usuario N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(transfer.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-green-500" />
                Ventas Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Cargando ventas...</p>
                </div>
              ) : recentSales.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay ventas para mostrar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Receipt className="w-5 h-5 text-green-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">Factura: {sale.invoice_number}</span>
                            <Badge className="bg-green-500">${sale.total_usd.toFixed(2)}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Store className="w-3 h-3" />
                                {sale.store_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Cliente: {sale.customer_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Cajero: {sale.cashier_name || 'N/A'}
                              </span>
                            </div>
                            {sale.sale_items && sale.sale_items.length > 0 ? (
                              <div className="text-xs space-y-1 mt-2">
                                <div className="font-medium text-foreground">Productos vendidos:</div>
                                <div className="pl-2 space-y-0.5">
                                  {sale.sale_items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span>• {item.product_name || 'Producto N/A'}</span>
                                      <Badge variant="outline" className="text-xs">
                                        Cantidad: {item.qty || 0}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic mt-2">
                                No hay detalles de productos disponibles
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterAuditDashboardPage;

