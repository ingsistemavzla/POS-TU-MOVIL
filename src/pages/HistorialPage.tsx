import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Search, CalendarCheck, ListOrdered } from 'lucide-react';
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
  user_name: string;
  reason: string | null;
  created_at: string;
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

const TYPE_BADGE_CLASS: Record<string, string> = {
  IN: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
  OUT: 'bg-red-500/20 text-red-300 border-red-400/50',
  ADJUST: 'bg-blue-500/20 text-blue-300 border-blue-400/50',
  TRANSFER: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
};

const MOVEMENTS_LIMIT = 1000;
type MovementTypeFilter = 'ALL' | 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';

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

  // Fechas únicas con movimientos (más reciente primero) para paginación por día
  const datesList = useMemo(() => {
    const set = new Set<string>();
    movements.forEach((m) => set.add(m.created_at.slice(0, 10)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [movements]);

  const currentDateKey = datesList[selectedDateIndex] ?? null;

  // Movimientos del día seleccionado, filtrados por tipo y búsqueda
  const movementsForCurrentDay = useMemo(() => {
    if (!currentDateKey) return [];
    let list = movements.filter((m) => m.created_at.slice(0, 10) === currentDateKey);
    if (movementTypeFilter !== 'ALL') {
      list = list.filter((m) => m.type === movementTypeFilter);
    }
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.product_name.toLowerCase().includes(term) ||
          m.product_sku.toLowerCase().includes(term)
      );
    }
    return list;
  }, [movements, currentDateKey, movementTypeFilter, debouncedSearch]);

  // Totales del día por tipo (siempre sobre todos los movimientos del día, sin filtro de tipo)
  const dailyTotalsByType = useMemo(() => {
    if (!currentDateKey) return { IN: 0, OUT: 0, ADJUST: 0, TRANSFER: 0 };
    const dayMovements = movements.filter((m) => m.created_at.slice(0, 10) === currentDateKey);
    return dayMovements.reduce(
      (acc, m) => {
        acc[m.type] = (acc[m.type] ?? 0) + m.qty;
        return acc;
      },
      { IN: 0, OUT: 0, ADJUST: 0, TRANSFER: 0 } as Record<string, number>
    );
  }, [movements, currentDateKey]);

  const formatFecha = (iso: string) => {
    try {
      return format(parseISO(iso), 'dd/MM HH:mm', { locale: es });
    } catch {
      return '—';
    }
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
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 glass-input"
                />
              </div>
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

            {/* Totales del día (badges con color por tipo) */}
            {currentDateKey && (
              <Card className="glass-panel-dense border-white/10">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-white/90 mb-3">Totales del día</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={TYPE_BADGE_CLASS.IN + ' font-mono px-3 py-1'}>
                      Entradas (IN): +{dailyTotalsByType.IN}
                    </Badge>
                    <Badge variant="outline" className={TYPE_BADGE_CLASS.OUT + ' font-mono px-3 py-1'}>
                      Salidas (OUT): {dailyTotalsByType.OUT}
                    </Badge>
                    <Badge variant="outline" className={TYPE_BADGE_CLASS.ADJUST + ' font-mono px-3 py-1'}>
                      Ajustes (ADJUST): {dailyTotalsByType.ADJUST >= 0 ? '+' : ''}{dailyTotalsByType.ADJUST}
                    </Badge>
                    <Badge variant="outline" className={TYPE_BADGE_CLASS.TRANSFER + ' font-mono px-3 py-1'}>
                      Transferencias (TRANSFER): {dailyTotalsByType.TRANSFER >= 0 ? '+' : ''}{dailyTotalsByType.TRANSFER}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sub-pestañas por tipo (colores como en la tabla: verde IN, rojo OUT, azul ADJUST, ámbar TRANSFER) */}
            <Tabs value={movementTypeFilter} onValueChange={(v) => setMovementTypeFilter(v as MovementTypeFilter)} className="w-full">
              <TabsList className="flex flex-wrap gap-2 h-auto p-1 bg-transparent border-0">
                <TabsTrigger
                  value="ALL"
                  className="text-xs font-medium text-white/90 data-[state=active]:bg-white/20 data-[state=active]:text-white border border-white/20"
                >
                  Todos
                </TabsTrigger>
                <TabsTrigger
                  value="IN"
                  className="text-xs font-medium text-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white border border-emerald-400/50"
                >
                  Entradas (IN)
                </TabsTrigger>
                <TabsTrigger
                  value="OUT"
                  className="text-xs font-medium text-red-300 data-[state=active]:bg-red-500 data-[state=active]:text-white border border-red-400/50"
                >
                  Salidas (OUT)
                </TabsTrigger>
                <TabsTrigger
                  value="ADJUST"
                  className="text-xs font-medium text-blue-300 data-[state=active]:bg-blue-500 data-[state=active]:text-white border border-blue-400/50"
                >
                  Ajustes (ADJUST)
                </TabsTrigger>
                <TabsTrigger
                  value="TRANSFER"
                  className="text-xs font-medium text-amber-300 data-[state=active]:bg-amber-500 data-[state=active]:text-white border border-amber-400/50"
                >
                  Transferencias (TRANSFER)
                </TabsTrigger>
              </TabsList>
              {(['ALL', 'IN', 'OUT', 'ADJUST', 'TRANSFER'] as const).map((tabValue) => (
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
                            No hay movimientos para esta fecha{tabValue !== 'ALL' ? ` de tipo ${tabValue}` : ''}.
                          </p>
                        ) : (
                          <table className="w-full glass-table">
                            <thead>
                              <tr>
                                <th className="text-left py-4 px-4">Hora</th>
                                <th className="text-left py-4 px-4">Producto</th>
                                <th className="text-left py-4 px-4">Tienda</th>
                                <th className="text-center py-4 px-4">Tipo</th>
                                <th className="text-right py-4 px-4">Cambio</th>
                                <th className="text-center py-4 px-4">Conciliación</th>
                                <th className="text-left py-4 px-4">Usuario</th>
                              </tr>
                            </thead>
                            <tbody>
                              {movementsForCurrentDay.map((m) => (
                                <tr key={m.id}>
                                  <td className="py-4 px-4 text-sm text-white/80 font-mono">
                                    {formatFecha(m.created_at)}
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="font-medium text-white">{m.product_name}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{m.product_sku}</div>
                                  </td>
                                  <td className="py-4 px-4 text-white/90">{m.store_name}</td>
                                  <td className="py-4 px-4 text-center">
                                    <Badge
                                      variant="outline"
                                      className={TYPE_BADGE_CLASS[m.type] ?? 'bg-gray-500/20 text-gray-300'}
                                    >
                                      {m.type}
                                    </Badge>
                                  </td>
                                  <td
                                    className={`py-4 px-4 text-right font-semibold ${
                                      m.qty >= 0 ? 'text-emerald-300' : 'text-red-300'
                                    }`}
                                  >
                                    {formatCambio(m.qty)}
                                  </td>
                                  <td className="py-4 px-4 text-center text-white/90 font-mono text-sm">
                                    {formatConciliacion(m.old_qty, m.new_qty)}
                                  </td>
                                  <td className="py-4 px-4 text-white/90">{m.user_name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
