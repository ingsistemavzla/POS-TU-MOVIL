import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  History,
  Search,
  CalendarCheck,
  ListOrdered,
  Store,
  User,
  Clock,
  ArrowDown,
  ArrowUp,
  ArrowRightLeft,
  Minus,
  Activity,
  ChevronDown,
  ChevronUp,
  Receipt,
  Package,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface MovementRow {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';
  qty: number;
  old_qty: number | null;
  new_qty: number | null;
  store_name: string;
  store_from_id: string | null;
  store_to_id: string | null;
  store_from_name: string | null;
  store_to_name: string | null;
  user_name: string;
  reason: string | null;
  created_at: string;
}

interface StoreOption {
  id: string;
  name: string;
}

interface SnapshotRow {
  id: string;
  store_id: string;
  store_name: string;
  total_products: number;
  total_stock: number;
  total_value_usd: number;
  qty_phones: number;
  qty_accessories: number;
  qty_services: number;
  captured_at: string;
}

// Categorías principales para filtrado y colores (Ventas, Aumentos, Disminuciones, Transferencias)
type MovementCategory = 'VENTAS' | 'AUMENTOS' | 'DISMINUCIONES' | 'TRANSFERENCIAS';

// Ventas=verde, Disminución=rojo, Aumento=azul, Transferencias=amarillo
const CATEGORY_COLORS: Record<MovementCategory, string> = {
  VENTAS: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
  AUMENTOS: 'bg-blue-500/20 text-blue-300 border-blue-400/50',
  DISMINUCIONES: 'bg-red-500/20 text-red-300 border-red-400/50',
  TRANSFERENCIAS: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
};

const getMovementCategory = (m: MovementRow): MovementCategory => {
  if (m.type === 'OUT') return 'VENTAS';
  if (m.type === 'ADJUST' && m.qty > 0) return 'AUMENTOS';
  if (m.type === 'ADJUST' && m.qty < 0) return 'DISMINUCIONES';
  if (m.type === 'TRANSFER' || m.type === 'IN') return 'TRANSFERENCIAS';
  return 'VENTAS'; // fallback
};

const MOVEMENTS_LIMIT = 1000;
type MovementTypeFilter = 'ALL' | 'VENTAS' | 'AUMENTOS' | 'DISMINUCIONES' | 'TRANSFERENCIAS';

export const HistorialPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [movementTypeFilter, setMovementTypeFilter] = useState<MovementTypeFilter>('ALL');
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [expandedMovementId, setExpandedMovementId] = useState<string | null>(null);

  const fetchMovements = async () => {
    if (!userProfile?.company_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          product_id,
          type,
          qty,
          old_qty,
          new_qty,
          store_from_id,
          store_to_id,
          reason,
          user_id,
          created_at,
          products!inner(name, sku),
          stores_from:stores!inventory_movements_store_from_id_fkey(id, name),
          stores_to:stores!inventory_movements_store_to_id_fkey(id, name),
          users(name)
        `)
        .order('created_at', { ascending: false })
        .limit(MOVEMENTS_LIMIT);

      if (error) throw error;

      const rows: MovementRow[] = (data || []).map((m: any) => {
        const storeToName = m.stores_to?.name ?? null;
        const storeFromName = m.stores_from?.name ?? null;
        const storeName = storeToName || storeFromName || '—';
        return {
          id: m.id,
          product_id: m.product_id,
          product_name: m.products?.name ?? 'N/A',
          product_sku: m.products?.sku ?? 'N/A',
          type: m.type,
          qty: m.qty,
          old_qty: m.old_qty ?? null,
          new_qty: m.new_qty ?? null,
          store_name: storeName,
          store_from_id: m.store_from_id ?? null,
          store_to_id: m.store_to_id ?? null,
          store_from_name: storeFromName,
          store_to_name: storeToName,
          user_name: m.users?.name ?? 'N/A',
          reason: m.reason,
          created_at: m.created_at,
        };
      });
      setMovements(rows);
    } catch (err: any) {
      console.error('Error fetching historial:', err);
      toast({
        title: 'Error',
        description: err.message ?? 'No se pudieron cargar los movimientos',
        variant: 'destructive',
      });
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    if (!userProfile?.company_id) {
      setSnapshotsLoading(false);
      return;
    }
    setSnapshotsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_snapshots')
        .select(`
          id,
          store_id,
          total_products,
          total_stock,
          total_value_usd,
          qty_phones,
          qty_accessories,
          qty_services,
          captured_at,
          stores(name)
        `)
        .order('captured_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows: SnapshotRow[] = (data || []).map((s: any) => ({
        id: s.id,
        store_id: s.store_id,
        store_name: s.stores?.name ?? '—',
        total_products: s.total_products ?? 0,
        total_stock: s.total_stock ?? 0,
        total_value_usd: Number(s.total_value_usd ?? 0),
        qty_phones: s.qty_phones ?? 0,
        qty_accessories: s.qty_accessories ?? 0,
        qty_services: s.qty_services ?? 0,
        captured_at: s.captured_at,
      }));
      setSnapshots(rows);
    } catch (err: any) {
      console.error('Error fetching snapshots:', err);
      toast({
        title: 'Error',
        description: err.message ?? 'No se pudieron cargar los cierres',
        variant: 'destructive',
      });
      setSnapshots([]);
    } finally {
      setSnapshotsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [userProfile?.company_id]);

  useEffect(() => {
    fetchSnapshots();
  }, [userProfile?.company_id]);

  useEffect(() => {
    const fetchStores = async () => {
      if (!userProfile?.company_id) return;
      const { data } = await supabase
        .from('stores')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .eq('active', true)
        .order('name');
      setStores((data as StoreOption[]) ?? []);
    };
    fetchStores();
  }, [userProfile?.company_id]);

  // Fechas únicas con movimientos (más reciente primero) para paginación por día
  const datesList = useMemo(() => {
    const set = new Set<string>();
    movements.forEach((m) => set.add(m.created_at.slice(0, 10)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [movements]);

  const currentDateKey = datesList[selectedDateIndex] ?? null;

  // Movimientos del día seleccionado, filtrados por categoría, sucursal y búsqueda
  const movementsForCurrentDay = useMemo(() => {
    if (!currentDateKey) return [];
    let list = movements.filter((m) => m.created_at.slice(0, 10) === currentDateKey);
    if (movementTypeFilter !== 'ALL') {
      list = list.filter((m) => getMovementCategory(m) === movementTypeFilter);
    }
    if (storeFilter !== 'all') {
      list = list.filter(
        (m) => m.store_from_id === storeFilter || m.store_to_id === storeFilter
      );
    }
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.product_name.toLowerCase().includes(term) ||
          m.product_sku.toLowerCase().includes(term) ||
          (m.reason ?? '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [movements, currentDateKey, movementTypeFilter, storeFilter, debouncedSearch]);

  // Totales del día por categoría (Ventas, Aumentos, Disminuciones, Transferencias)
  const dailyTotalsByCategory = useMemo(() => {
    if (!currentDateKey) return { VENTAS: 0, AUMENTOS: 0, DISMINUCIONES: 0, TRANSFERENCIAS: 0 };
    const dayMovements = movements.filter((m) => m.created_at.slice(0, 10) === currentDateKey);
    return dayMovements.reduce(
      (acc, m) => {
        const cat = getMovementCategory(m);
        acc[cat] = (acc[cat] ?? 0) + m.qty;
        return acc;
      },
      { VENTAS: 0, AUMENTOS: 0, DISMINUCIONES: 0, TRANSFERENCIAS: 0 } as Record<MovementCategory, number>
    );
  }, [movements, currentDateKey]);

  const formatFecha = (iso: string) => {
    try {
      return format(parseISO(iso), 'dd/MM HH:mm', { locale: es });
    } catch {
      return '—';
    }
  };

  const formatFechaConSegundos = (iso: string) => {
    try {
      return format(parseISO(iso), 'dd/MM/yyyy HH:mm:ss', { locale: es });
    } catch {
      return '—';
    }
  };

  const getMovementIcon = (m: MovementRow) => {
    const cat = getMovementCategory(m);
    if (cat === 'VENTAS') return <Receipt className="w-4 h-4 text-emerald-400" />;
    if (cat === 'AUMENTOS') return <ArrowDown className="w-4 h-4 text-blue-400" />;
    if (cat === 'DISMINUCIONES') return <ArrowUp className="w-4 h-4 text-red-400" />;
    return <ArrowRightLeft className="w-4 h-4 text-amber-400" />;
  };

  const getMovementBadge = (m: MovementRow) => {
    const cat = getMovementCategory(m);
    const labels: Record<MovementCategory, string> = {
      VENTAS: 'Venta',
      AUMENTOS: 'Aumento',
      DISMINUCIONES: 'Disminución',
      TRANSFERENCIAS: 'Transferencia',
    };
    return (
      <Badge variant="outline" className={CATEGORY_COLORS[cat] ?? 'bg-gray-500/20 text-gray-300'}>
        {labels[cat]}
      </Badge>
    );
  };

  const getStoreDisplay = (m: MovementRow) => {
    if (m.type === 'TRANSFER' && m.store_from_name && m.store_to_name) {
      return `Desde ${m.store_from_name} → Hacia ${m.store_to_name}`;
    }
    return m.store_name;
  };

  const formatCambio = (qty: number) => {
    if (qty > 0) return `+${qty}`;
    return String(qty);
  };

  const formatConciliacion = (old_qty: number | null, new_qty: number | null) => {
    if (old_qty == null || new_qty == null) return '—';
    return `${old_qty} → ${new_qty}`;
  };

  const formatSnapshotFecha = (iso: string) => {
    try {
      return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return '—';
    }
  };

  const formatUsd = (n: number) =>
    new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const formatDateOnly = (iso: string) => {
    try {
      return format(parseISO(iso), 'dd/MM/yyyy', { locale: es });
    } catch {
      return '—';
    }
  };

  // Agrupar snapshots por fecha (día). Por cada día y tienda, solo el más reciente (evita duplicados y filas con 0 en categorías).
  const snapshotsByDate = useMemo(() => {
    const byDate = new Map<string, SnapshotRow[]>();
    snapshots.forEach((s) => {
      const day = s.captured_at.slice(0, 10);
      if (!byDate.has(day)) byDate.set(day, []);
      byDate.get(day)!.push(s);
    });
    // Por cada día: una sola fila por tienda = la de captured_at más reciente
    byDate.forEach((rows, day) => {
      const byStore = new Map<string, SnapshotRow>();
      rows.forEach((r) => {
        const existing = byStore.get(r.store_id);
        if (!existing || r.captured_at > existing.captured_at) byStore.set(r.store_id, r);
      });
      byDate.set(day, Array.from(byStore.values()).sort((a, b) => a.store_name.localeCompare(b.store_name)));
    });
    return Array.from(byDate.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [snapshots]);

  return (
    <div className="container mx-auto p-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="w-8 h-8" />
            Historial
          </h1>
          <p className="text-muted-foreground">
            Cierres diarios de inventario por categoría y movimientos de stock
          </p>
        </div>
      </div>

      <Tabs defaultValue="movimientos" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 glass-panel-dense">
          <TabsTrigger value="movimientos" className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="cierres" className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" />
            Cierres diarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos" className="space-y-6 mt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto, SKU, razón..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 glass-input"
                />
              </div>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-[220px] glass-panel-dense border-white/20">
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Paginación por día */}
              {datesList.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Fecha:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="glass-panel-dense"
                    disabled={selectedDateIndex >= datesList.length - 1}
                    onClick={() => setSelectedDateIndex((i) => Math.min(i + 1, datesList.length - 1))}
                  >
                    ← Día anterior
                  </Button>
                  <span className="text-sm font-medium text-white min-w-[120px] text-center">
                    {currentDateKey ? formatDateOnly(currentDateKey + 'T12:00:00') : '—'}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="glass-panel-dense"
                    disabled={selectedDateIndex <= 0}
                    onClick={() => setSelectedDateIndex((i) => Math.max(i - 1, 0))}
                  >
                    Día siguiente →
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {selectedDateIndex + 1} / {datesList.length}
                  </span>
                </div>
              )}
            </div>

            {/* Totales del día (badges con colores por categoría) */}
            {currentDateKey && (
              <Card className="glass-panel-dense border-white/10">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-white/90 mb-3">Totales del día</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={CATEGORY_COLORS.VENTAS + ' font-mono px-3 py-1'}>
                      Ventas: {dailyTotalsByCategory.VENTAS}
                    </Badge>
                    <Badge variant="outline" className={CATEGORY_COLORS.AUMENTOS + ' font-mono px-3 py-1'}>
                      Aumentos: +{dailyTotalsByCategory.AUMENTOS}
                    </Badge>
                    <Badge variant="outline" className={CATEGORY_COLORS.DISMINUCIONES + ' font-mono px-3 py-1'}>
                      Disminuciones: {dailyTotalsByCategory.DISMINUCIONES}
                    </Badge>
                    <Badge variant="outline" className={CATEGORY_COLORS.TRANSFERENCIAS + ' font-mono px-3 py-1'}>
                      Transferencias: {dailyTotalsByCategory.TRANSFERENCIAS >= 0 ? '+' : ''}{dailyTotalsByCategory.TRANSFERENCIAS}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sub-pestañas por categoría (Ventas primero, luego Aumentos, Disminuciones, Transferencias) */}
            <Tabs value={movementTypeFilter} onValueChange={(v) => setMovementTypeFilter(v as MovementTypeFilter)} className="w-full">
              <TabsList className="flex flex-wrap gap-2 h-auto p-1 bg-transparent border-0">
                <TabsTrigger
                  value="ALL"
                  className="text-xs font-medium text-white/90 data-[state=active]:bg-white/20 data-[state=active]:text-white border border-white/20"
                >
                  Todos
                </TabsTrigger>
                <TabsTrigger
                  value="VENTAS"
                  className="text-xs font-medium text-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white border border-emerald-400/50"
                >
                  Ventas
                </TabsTrigger>
                <TabsTrigger
                  value="AUMENTOS"
                  className="text-xs font-medium text-blue-300 data-[state=active]:bg-blue-500 data-[state=active]:text-white border border-blue-400/50"
                >
                  Aumentos
                </TabsTrigger>
                <TabsTrigger
                  value="DISMINUCIONES"
                  className="text-xs font-medium text-red-300 data-[state=active]:bg-red-500 data-[state=active]:text-white border border-red-400/50"
                >
                  Disminuciones
                </TabsTrigger>
                <TabsTrigger
                  value="TRANSFERENCIAS"
                  className="text-xs font-medium text-amber-300 data-[state=active]:bg-amber-500 data-[state=active]:text-white border border-amber-400/50"
                >
                  Transferencias
                </TabsTrigger>
              </TabsList>
              {(['ALL', 'VENTAS', 'AUMENTOS', 'DISMINUCIONES', 'TRANSFERENCIAS'] as const).map((tabValue) => (
                <TabsContent key={tabValue} value={tabValue} className="mt-4">
                  <Card className="glass-panel-dense">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        {loading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                          </div>
                        ) : datesList.length === 0 ? (
                          <p className="text-center text-muted-foreground py-12">
                            No hay movimientos. La última fecha con movimientos aparecerá al cargar.
                          </p>
                        ) : !currentDateKey ? (
                          <p className="text-center text-muted-foreground py-12">Selecciona una fecha.</p>
                        ) : movementsForCurrentDay.length === 0 ? (
                          <p className="text-center text-muted-foreground py-12">
                            No hay movimientos para esta fecha{tabValue !== 'ALL' ? ` de categoría ${tabValue}` : ''}.
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[100px]">Hora</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-center">Tipo</TableHead>
                                <TableHead className="text-right">Cambio</TableHead>
                                <TableHead className="text-center">Detalles</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {movementsForCurrentDay.map((m) => {
                                const isExpanded = expandedMovementId === m.id;
                                return (
                                  <React.Fragment key={m.id}>
                                    <TableRow className={isExpanded ? 'bg-white/10' : ''}>
                                      <TableCell className="text-sm font-mono text-white/80">
                                        {formatFecha(m.created_at)}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {getMovementIcon(m)}
                                          <div>
                                            <div className="font-medium text-white">{m.product_name}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{m.product_sku}</div>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center">{getMovementBadge(m)}</TableCell>
                                      <TableCell
                                        className={`text-right font-semibold ${
                                          m.qty >= 0 ? 'text-emerald-300' : 'text-red-300'
                                        }`}
                                      >
                                        {m.qty >= 0 ? '+' : ''}{m.qty}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setExpandedMovementId(isExpanded ? null : m.id)}
                                          className="text-xs border-white/30 hover:bg-white/10"
                                        >
                                          {isExpanded ? (
                                            <>
                                              <ChevronUp className="h-3 w-3 mr-1" />
                                              Ocultar
                                            </>
                                          ) : (
                                            <>
                                              <ChevronDown className="h-3 w-3 mr-1" />
                                              Ver detalles
                                            </>
                                          )}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                      <TableRow>
                                        <TableCell colSpan={5} className="glass-muted-dark p-4 border-l-4 border-l-blue-400/50">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Package className="w-4 h-4 text-blue-400" />
                                            <h4 className="font-semibold text-sm text-white">Detalles de la transacción</h4>
                                          </div>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <Store className="w-3 h-3 shrink-0 text-muted-foreground" />
                                              <span className="text-white/90">{getStoreDisplay(m)}</span>
                                            </div>
                                            {m.reason && (
                                              <p className="text-white/80">{m.reason}</p>
                                            )}
                                            {m.old_qty != null && m.new_qty != null && (
                                              <p className="font-mono text-white/70">
                                                Conciliación: {m.old_qty} → {m.new_qty}
                                              </p>
                                            )}
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {formatFechaConSegundos(m.created_at)}
                                            </p>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="cierres" className="space-y-6 mt-6">
          <Card className="glass-panel-dense">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <CalendarCheck className="w-5 h-5" />
                Resumen de Cierres
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Unidades por categoría por tienda (coincide con Estadísticas). Valor USD excluye productos sin costo.
              </p>
              {snapshotsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : snapshots.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  No hay cierres registrados. Ejecuta el snapshot desde Supabase o el cron a las 00:00.
                </p>
              ) : (
                <div className="space-y-8">
                  {snapshotsByDate.map(([day, rows]) => {
                    const totalPhones = rows.reduce((a, s) => a + s.qty_phones, 0);
                    const totalAcc = rows.reduce((a, s) => a + s.qty_accessories, 0);
                    const totalServ = rows.reduce((a, s) => a + s.qty_services, 0);
                    // Total = suma de las 3 categorías (como en el dashboard), no total_stock (que puede incluir sin categoría)
                    const totalUnits = totalPhones + totalAcc + totalServ;
                    const totalValue = rows.reduce((a, s) => a + s.total_value_usd, 0);
                    return (
                      <div key={day}>
                        <h3 className="text-base font-semibold text-white/90 mb-3">
                          Fecha: {formatDateOnly(rows[0]?.captured_at ?? day)}
                        </h3>
                        <div className="overflow-x-auto rounded-md border border-white/10">
                          <table className="w-full glass-table">
                            <thead>
                              <tr>
                                <th className="text-left py-3 px-4">Tienda</th>
                                <th className="text-right py-3 px-4">Teléfonos</th>
                                <th className="text-right py-3 px-4">Accesorios</th>
                                <th className="text-right py-3 px-4">Servicios</th>
                                <th className="text-right py-3 px-4">Total</th>
                                <th className="text-right py-3 px-4">Valor USD</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((s) => {
                                const rowTotal = s.qty_phones + s.qty_accessories + s.qty_services;
                                return (
                                  <tr key={s.id}>
                                    <td className="py-3 px-4 font-medium text-white/95">{s.store_name}</td>
                                    <td className="py-3 px-4 text-right text-white/90 font-mono">{s.qty_phones}</td>
                                    <td className="py-3 px-4 text-right text-white/90 font-mono">{s.qty_accessories}</td>
                                    <td className="py-3 px-4 text-right text-white/90 font-mono">{s.qty_services}</td>
                                    <td className="py-3 px-4 text-right text-white font-mono font-semibold">{rowTotal}</td>
                                    <td className="py-3 px-4 text-right text-white font-mono">{formatUsd(s.total_value_usd)}</td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-white/10 font-semibold">
                                <td className="py-3 px-4 text-white">TOTAL</td>
                                <td className="py-3 px-4 text-right font-mono text-white">{totalPhones}</td>
                                <td className="py-3 px-4 text-right font-mono text-white">{totalAcc}</td>
                                <td className="py-3 px-4 text-right font-mono text-white">{totalServ}</td>
                                <td className="py-3 px-4 text-right font-mono text-white">{totalUnits}</td>
                                <td className="py-3 px-4 text-right font-mono text-white">{formatUsd(totalValue)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
