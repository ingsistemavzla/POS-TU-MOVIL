import { Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/utils/currency";
import { useStoreSpecificData } from "@/hooks/useStoreSpecificData";

type PeriodType = 'today' | 'yesterday' | 'thisMonth';

interface StoreSummaryCardProps {
  store: any;
  storeData: any;
  selectedPeriod: PeriodType;
}

export function StoreSummaryCard({ store, storeData, selectedPeriod }: StoreSummaryCardProps) {
  const storeSpecificData = useStoreSpecificData(store.id, selectedPeriod);

  return (
    <Card className="p-5">
      <div className="flex items-center space-x-2 mb-4">
        <Store className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-lg">{store.name}</h4>
      </div>
      
      <div className="space-y-2">
        {/* Total Facturado - Datos específicos de la tienda */}
        <div className="flex justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Facturado:</span>
          <span className="font-medium">{formatCurrency(storeData.sales)}</span>
        </div>
        
        {/* Ingreso Neto - Datos específicos de la tienda */}
        <div className="flex justify-between">
          <span className="text-sm font-medium text-muted-foreground">Ingreso Neto:</span>
          <span className="font-medium">
            {storeSpecificData.loading ? 'Cargando...' : formatCurrency(storeSpecificData.paymentData?.totalUSD || 0)}
          </span>
        </div>
        
        {/* Financiamiento Krece - Datos específicos de la tienda */}
        <div className="flex justify-between">
          <span className="text-sm font-medium text-muted-foreground">Financiamiento Krece:</span>
          <span className="font-medium">
            {storeSpecificData.loading ? 'Cargando...' : formatCurrency(storeSpecificData.kreceData?.totalFinancedAmountUSD || 0)}
          </span>
        </div>
      </div>
    </Card>
  );
}
