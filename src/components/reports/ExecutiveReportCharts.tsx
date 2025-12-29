import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { useExecutiveReports, ExecutiveSummaryData } from '@/hooks/useExecutiveReports';
import { formatCurrency } from '@/utils/currency';

// Color corporativo #007878
const CORPORATE_COLOR = '#007878';

interface ExecutiveReportChartsProps {
  data: ExecutiveSummaryData | null;
  loading?: boolean;
}

export function ExecutiveReportCharts({ data, loading }: ExecutiveReportChartsProps) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
          <p className="text-sm text-muted-foreground">Cargando gráficos...</p>
        </div>
      </div>
    );
  }

  // Preparar datos para gráfico de barras (Ventas por Tienda)
  const storeBarData = data.stores.map(store => ({
    name: store.store_name.length > 15 ? store.store_name.substring(0, 15) + '...' : store.store_name,
    fullName: store.store_name,
    'Total Facturado': store.total_invoiced,
    'Ingreso Real': store.net_income_real
  }));

  // Preparar datos para gráfico de líneas (Métodos de Pago)
  const paymentLineData = data.payment_methods.map(pm => ({
    name: pm.method,
    'Total USD': pm.total_usd,
    'Porcentaje': pm.percentage
  }));

  // Preparar datos para gráfico circular (Distribución de Métodos de Pago)
  const paymentPieData = data.payment_methods.map(pm => ({
    name: pm.method,
    value: pm.total_usd,
    percentage: pm.percentage
  }));

  const chartConfig = {
    total: {
      label: 'Total',
      color: CORPORATE_COLOR
    },
    real: {
      label: 'Ingreso Real',
      color: '#00a8a8'
    }
  };

  return (
    <div className="space-y-6">
      {/* Gráfico de Barras: Ventas por Tienda */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: CORPORATE_COLOR }}>
          Ventas por Tienda
        </h3>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={storeBarData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar 
              dataKey="Total Facturado" 
              fill={CORPORATE_COLOR}
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="Ingreso Real" 
              fill="#00a8a8"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </Card>

      {/* Gráfico de Líneas: Métodos de Pago */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: CORPORATE_COLOR }}>
          Tendencia de Métodos de Pago
        </h3>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <LineChart data={paymentLineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Total USD" 
              stroke={CORPORATE_COLOR}
              strokeWidth={2}
              dot={{ fill: CORPORATE_COLOR, r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </Card>

      {/* Gráfico Circular: Distribución de Métodos de Pago */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: CORPORATE_COLOR }}>
          Distribución de Métodos de Pago
        </h3>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <PieChart>
            <Pie
              data={paymentPieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
              outerRadius={100}
              fill={CORPORATE_COLOR}
              dataKey="value"
            >
              {paymentPieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index % 2 === 0 ? CORPORATE_COLOR : '#00a8a8'}
                />
              ))}
            </Pie>
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value: number) => formatCurrency(value)}
            />
          </PieChart>
        </ChartContainer>
      </Card>
    </div>
  );
}



