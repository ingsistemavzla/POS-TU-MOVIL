import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { formatCurrency } from "@/utils/currency";

interface StoreSummary {
  id: string;
  name: string;
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
}

interface StoreSummaryTableProps {
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

export function StoreSummaryTable({
  stores,
  storeMetrics,
  selectedPeriod
}: StoreSummaryTableProps) {
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

  return (
    <Card className="p-6 bg-[#1a1a1a] border border-[#333]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Resumen por Tienda
        </h3>
        <Button variant="outline" size="sm" className="border-[#333] hover:bg-[#2a2a2a]">
          Ver Todo
        </Button>
      </div>
      
      {stores.length > 0 ? (
        <div className="space-y-0">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-[#252525] rounded-t-lg border-b border-[#333] text-sm font-medium text-muted-foreground">
            <div>Tienda</div>
            <div className="text-right">Total Facturado</div>
            <div className="text-right">Ingreso Neto</div>
            <div className="text-right">Órdenes</div>
          </div>
          
          {/* Rows */}
          {stores.map((store, index) => {
            const storeData = getStoreData(store.id);
            const isLast = index === stores.length - 1;
            
            return (
              <div
                key={store.id}
                className={`grid grid-cols-4 gap-4 p-4 hover:bg-[#2a2a2a] transition-colors ${
                  isLast ? 'rounded-b-lg' : 'border-b border-[#333]'
                }`}
              >
                <div className="font-medium text-white">{store.name}</div>
                <div className="text-right text-green-500 font-semibold">
                  {formatCurrency(storeData.sales)}
                </div>
                <div className="text-right text-green-500 font-semibold">
                  {formatCurrency(storeData.averageOrder * storeData.orders)}
                </div>
                <div className="text-right text-muted-foreground">
                  {storeData.orders}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay datos de tiendas</p>
        </div>
      )}
    </Card>
  );
}

