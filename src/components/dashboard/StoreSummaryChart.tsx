import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Store } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface StoreSummary {
  id: string;
  name: string;
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
  netIncome?: number; // Ingreso Neto real (pagos reales)
  netIncomeByPeriod?: { today: number; yesterday: number; thisMonth: number };
}

interface StoreSummaryChartProps {
  stores: StoreSummary[];
  storeMetrics: Array<{
    storeId: string;
    storeName: string;
    sales: { today: number; yesterday: number; thisMonth: number };
    orders: { today: number; yesterday: number; thisMonth: number };
    averageOrder: { today: number; yesterday: number; thisMonth: number };
  }>;
  selectedPeriod: 'today' | 'yesterday' | 'thisMonth';
}

// Paleta Eco-Tech: Verde principal con variaciones sutiles
const COLORS = ['hsl(var(--primary))', '#34d399', '#10b981', '#059669', '#047857'];

export function StoreSummaryChart({
  stores,
  storeMetrics,
  selectedPeriod
}: StoreSummaryChartProps) {
  const getStoreData = (storeId: string) => {
    const metrics = storeMetrics.find(m => m.storeId === storeId);
    if (!metrics) return { sales: 0, orders: 0, averageOrder: 0 };

    switch (selectedPeriod) {
      case 'today':
        return {
          sales: metrics.sales.today,
          orders: metrics.orders.today,
          averageOrder: metrics.averageOrder.today
        };
      case 'yesterday':
        return {
          sales: metrics.sales.yesterday,
          orders: metrics.orders.yesterday,
          averageOrder: metrics.averageOrder.yesterday
        };
      case 'thisMonth':
        return {
          sales: metrics.sales.thisMonth,
          orders: metrics.orders.thisMonth,
          averageOrder: metrics.averageOrder.thisMonth
        };
      default:
        return { sales: 0, orders: 0, averageOrder: 0 };
    }
  };

  // Preparar datos para el gráfico - siempre mostrar todas las tiendas, incluso con valores en 0
  const chartData = stores.map((store) => {
    const storeData = getStoreData(store.id);
    // CORRECCIÓN: Usar ingreso neto real (pagos) si está disponible, si no usar fallback
    const netIncome = store.netIncomeByPeriod 
      ? (selectedPeriod === 'today' ? store.netIncomeByPeriod.today :
         selectedPeriod === 'yesterday' ? store.netIncomeByPeriod.yesterday :
         store.netIncomeByPeriod.thisMonth)
      : (store.netIncome || (storeData.averageOrder || 0) * (storeData.orders || 0)); // Fallback si no hay datos de pagos
    return {
      name: store.name,
      sales: storeData.sales || 0,
      orders: storeData.orders || 0,
      netIncome: netIncome
    };
  });

  // Calcular el máximo para escalado, pero asegurar que siempre sea al menos 1
  const maxSales = Math.max(...chartData.map(d => d.sales), 1);

  // Si no hay tiendas, mostrar estructura vacía pero visible
  if (stores.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Resumen por Tienda
          </h3>
          <Button variant="outline" size="sm">
            Ver Todo
          </Button>
        </div>
        <div className="w-full" style={{ height: '280px' }}>
          <div className="flex items-center justify-center h-full text-white/90">
            <p>No hay tiendas disponibles</p>
          </div>
        </div>
        <div className="space-y-0 border-t border-white/10 pt-4 mt-4">
          <div className="grid grid-cols-4 gap-4 p-3 bg-white/5 rounded-t-lg text-xs font-medium text-white/90 uppercase">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Tienda
            </div>
            <div className="text-right">Total Facturado</div>
            <div className="text-right">Ingreso Neto</div>
            <div className="text-right">Órdenes</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-lg font-semibold text-legacy-text flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Resumen por Tienda
        </h3>
        <Button variant="outline" size="sm">
          Ver Todo
        </Button>
      </div>
      
      <div className="flex flex-col flex-grow space-y-6">
        {/* Gráfico de Barras Horizontales - Recharts - Ocupa 100% del ancho */}
        <div className="w-full flex-shrink-0" style={{ height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))" 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                domain={[0, 'dataMax']}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={140}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                labelStyle={{ color: 'hsl(var(--primary))' }}
              />
              <Bar dataKey="sales" radius={[0, 4, 4, 0]} barSize={30}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla de Detalles */}
        <div className="flex-shrink-0 space-y-0 border-t border-white/10 pt-4">
          <div className="grid grid-cols-4 gap-4 p-3 bg-white/5 rounded-t-lg border-b border-white/10 text-xs font-medium text-white/90 uppercase">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Tienda
            </div>
            <div className="text-right">Total Facturado</div>
            <div className="text-right">Ingreso Neto</div>
            <div className="text-right">Órdenes</div>
          </div>
          
          {stores.map((store, index) => {
            const storeData = getStoreData(store.id);
            const isLast = index === stores.length - 1;
            const percentage = maxSales > 0 ? (storeData.sales / maxSales) * 100 : 0;
            
            return (
              <div
                key={store.id}
                className={`grid grid-cols-4 gap-4 p-3 hover:bg-white/10 transition-colors ${
                  isLast ? 'rounded-b-lg' : 'border-b border-white/10'
                }`}
              >
                <div className="font-medium text-white flex items-center gap-2">
                  <div
                    className="w-2 h-8 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{store.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-green-500 font-semibold">{formatCurrency(storeData.sales)}</p>
                  <div className="mt-1 w-full bg-[#333] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-green-500 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right text-green-500 font-semibold">
                  {formatCurrency(
                    store.netIncomeByPeriod 
                      ? (selectedPeriod === 'today' ? store.netIncomeByPeriod.today :
                         selectedPeriod === 'yesterday' ? store.netIncomeByPeriod.yesterday :
                         store.netIncomeByPeriod.thisMonth)
                      : (store.netIncome || storeData.averageOrder * storeData.orders)
                  )}
                </div>
                <div className="text-right text-white/90">
                  {storeData.orders}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

