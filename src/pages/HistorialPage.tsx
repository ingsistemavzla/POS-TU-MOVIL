import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Search, CalendarCheck } from 'lucide-react';
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
  captured_at: string;
}

const TYPE_BADGE_CLASS: Record<string, string> = {
  IN: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
  OUT: 'bg-red-500/20 text-red-300 border-red-400/50',
  ADJUST: 'bg-blue-500/20 text-blue-300 border-blue-400/50',
  TRANSFER: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
};

const LIMIT = 200;

export const HistorialPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

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
        .limit(LIMIT);

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
          captured_at,
          stores(name)
        `)
        .order('captured_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows: SnapshotRow[] = (data || []).map((s: any) => ({
        id: s.id,
        store_id: s.store_id,
        store_name: s.stores?.name ?? '—',
        total_products: s.total_products ?? 0,
        total_stock: s.total_stock ?? 0,
        total_value_usd: Number(s.total_value_usd ?? 0),
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

  const filteredMovements = useMemo(() => {
    if (!debouncedSearch.trim()) return movements;
    const term = debouncedSearch.toLowerCase();
    return movements.filter(
      (m) =>
        m.product_name.toLowerCase().includes(term) ||
        m.product_sku.toLowerCase().includes(term)
    );
  }, [movements, debouncedSearch]);

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

  return (
    <div className="container mx-auto p-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="w-8 h-8" />
            Historial de Movimientos
          </h1>
          <p className="text-muted-foreground">
            Trazabilidad y conciliación de stock (Stock Anterior + Cambio = Stock Nuevo)
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o SKU de producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 glass-input max-w-md"
        />
      </div>

      {/* Resumen de Cierres (snapshots diarios) */}
      <Card className="glass-panel-dense">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <CalendarCheck className="w-5 h-5" />
            Resumen de Cierres
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Cierre diario de inventario por tienda (productos, stock y valor en USD). El valor excluye productos sin costo cargado.
          </p>
          <div className="overflow-x-auto">
            {snapshotsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : snapshots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay cierres registrados. Configura pg_cron o una Edge Function para ejecutar el snapshot a las 00:00.
              </p>
            ) : (
              <table className="w-full glass-table">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-left py-3 px-4">Tienda</th>
                    <th className="text-right py-3 px-4">Productos</th>
                    <th className="text-right py-3 px-4">Stock total</th>
                    <th className="text-right py-3 px-4">Valor total USD</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 px-4 text-sm text-white/80 font-mono">{formatSnapshotFecha(s.captured_at)}</td>
                      <td className="py-3 px-4 text-white/90">{s.store_name}</td>
                      <td className="py-3 px-4 text-right text-white/90 font-mono">{s.total_products}</td>
                      <td className="py-3 px-4 text-right text-white/90 font-mono">{s.total_stock}</td>
                      <td className="py-3 px-4 text-right text-white font-mono">{formatUsd(s.total_value_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel-dense">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredMovements.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No hay movimientos para mostrar.
              </p>
            ) : (
              <table className="w-full glass-table">
                <thead>
                  <tr>
                    <th className="text-left py-4 px-4">Fecha</th>
                    <th className="text-left py-4 px-4">Producto</th>
                    <th className="text-left py-4 px-4">Tienda</th>
                    <th className="text-center py-4 px-4">Tipo</th>
                    <th className="text-right py-4 px-4">Cambio</th>
                    <th className="text-center py-4 px-4">Conciliación</th>
                    <th className="text-left py-4 px-4">Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((m) => (
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
    </div>
  );
};
