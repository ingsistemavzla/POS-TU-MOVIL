import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '@/utils/currency';

interface DonutChartData {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  total: number;
  height?: number;
}

const RADIAN = Math.PI / 180;

export function DonutChart({ data, total, height = 300 }: DonutChartProps) {
  // Asegurar que siempre hay datos para mostrar (incluso si están vacíos)
  const chartData = (data && data.length > 0) 
    ? data 
    : [{ name: 'Sin datos', value: 1, color: '#333' }];

  // Calcular el total real o mostrar 0
  const displayTotal = total || 0;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percent, value }) => {
              // Mostrar porcentaje siempre, incluso si el valor es 0
              if (data && data.length > 0) {
                // Si el total es 0, mostrar 0% para todos
                if (total === 0) {
                  return '0%';
                }
                return `${(percent * 100).toFixed(0)}%`;
              }
              return '';
            }}
            outerRadius={80}
            innerRadius={50}
            fill="#30D96B"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: '#fff',
              borderColor: '#e5e7eb',
              borderRadius: '8px',
              color: '#000'
            }}
            itemStyle={{ color: '#000' }}
          />
          {data && data.length > 0 && (
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => value}
            />
          )}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#30D96B"
            fontSize="24"
            fontWeight="bold"
          >
            {formatCurrency(displayTotal)}
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

