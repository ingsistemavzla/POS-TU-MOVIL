import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/utils/currency';

interface HorizontalBarData {
  name: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarData[];
  height?: number;
  maxValue?: number;
}

export function HorizontalBarChart({ data, height = 400, maxValue }: HorizontalBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-gray-500">
        <p>No hay datos para mostrar</p>
      </div>
    );
  }

  const max = maxValue || Math.max(...data.map(d => d.value));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" tick={{ fill: '#0D0D0D' }} />
          <YAxis
            dataKey="name"
            type="category"
            width={90}
            stroke="#6b7280"
            tick={{ fill: '#0D0D0D', fontSize: 12 }}
          />
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
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || '#30D96B'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

