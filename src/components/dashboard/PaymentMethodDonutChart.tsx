import { Card } from "@/components/ui/card";
import { Loader2, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { DonutChart } from "./DonutChart";
import { usePaymentMethodsData } from "@/hooks/usePaymentMethodsData";

interface PaymentMethodDonutChartProps {
  period: 'today' | 'yesterday' | 'thisMonth';
}

const getMethodColor = (method: string, index: number) => {
  const colors = [
    '#10b981', // green-500 - principal
    '#6b7280', // gray-500
    '#4b5563', // gray-600
    '#374151', // gray-700
    '#1f2937', // gray-800
  ];
  
  if (index === 0) return colors[0];
  return colors[Math.min(index, colors.length - 1)];
};

const getMethodLabel = (method: string) => {
  switch (method.toLowerCase()) {
    case 'cash_usd':
      return 'Efectivo USD';
    case 'cash_bs':
      return 'Efectivo BS';
    case 'card_usd':
      return 'Tarjeta USD';
    case 'card_bs':
      return 'Tarjeta BS';
    case 'transfer_usd':
      return 'Transferencia USD';
    case 'transfer_bs':
      return 'Transferencia BS';
    case 'zelle':
      return 'Zelle';
    case 'binance':
      return 'Binance';
    case 'krece_initial':
      return 'Krece Inicial';
    default:
      return method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ');
  }
};

// Lista completa de métodos de pago posibles
const ALL_PAYMENT_METHODS = [
  'cash_usd',
  'cash_bs',
  'card_usd',
  'card_bs',
  'transfer_usd',
  'transfer_bs',
  'zelle',
  'binance',
  'krece_initial'
];

export function PaymentMethodDonutChart({ period }: PaymentMethodDonutChartProps) {
  const { data: paymentMethodsDataResponse } = usePaymentMethodsData(period);
  const paymentMethodsData = paymentMethodsDataResponse?.data || paymentMethodsDataResponse;

  if (paymentMethodsData?.loading) {
    return (
      <Card className="p-6 bg-[#1a1a1a] border border-[#333]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Ingresos por Método de Pago</h3>
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </Card>
    );
  }

  // Obtener datos del hook y transformarlos para el gráfico
  // Siempre mostrar TODOS los métodos de pago, incluso si tienen 0%
  const existingMethods = paymentMethodsData?.methods || [];
  const existingMethodMap = new Map(
    existingMethods.map((method: any) => [method.method.toLowerCase(), method])
  );

  // Crear datos para todos los métodos posibles, incluyendo los que tienen 0
  const chartData = ALL_PAYMENT_METHODS.map((methodKey, index) => {
    const existingMethod = existingMethodMap.get(methodKey.toLowerCase());
    return {
      name: getMethodLabel(methodKey),
      value: existingMethod?.totalUSD || 0,
      color: getMethodColor(methodKey, index),
      methodKey: methodKey
    };
  });

  const totalUSD = paymentMethodsData?.totalUSD || 0;

  // Calcular porcentajes para la leyenda
  const chartDataWithPercentages = chartData.map(item => ({
    ...item,
    percentage: totalUSD > 0 ? ((item.value / totalUSD) * 100).toFixed(0) : '0'
  }));

  return (
    <Card className="p-6 bg-[#1a1a1a] border border-[#333] flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">Ingresos por Método de Pago</h3>
        <div className="text-sm text-muted-foreground">
          Total: {formatCurrency(totalUSD)}
        </div>
      </div>
      
      <div className="flex flex-col flex-grow">
        {/* Siempre mostrar el gráfico, incluso si no hay datos */}
        <div className="flex-shrink-0">
          <DonutChart data={chartData} total={totalUSD} height={280} />
        </div>
        
        {/* Leyenda Vertical - Ocupa todo el espacio restante */}
        <div className="flex-grow flex flex-col justify-center border-t border-[#333] pt-4 mt-4">
          <ul className="space-y-0 flex-grow flex flex-col justify-center">
            {chartDataWithPercentages.map((item) => (
              <li
                key={item.methodKey}
                className="flex items-center justify-between px-0 py-3 border-b border-[#333] last:border-b-0 hover:bg-[#252525] transition-colors rounded"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-white truncate">{item.name}</span>
                </div>
                <span className={`text-sm font-semibold ml-4 flex-shrink-0 ${
                  item.percentage === '0' ? 'text-muted-foreground' : 'text-white'
                }`}>
                  {item.percentage}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

