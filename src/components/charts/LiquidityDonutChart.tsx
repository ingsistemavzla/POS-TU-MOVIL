import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface LiquidityDonutChartProps {
  netIncomePercentage: number;
  receivablesPercentage: number;
  className?: string;
}

export const LiquidityDonutChart: React.FC<LiquidityDonutChartProps> = ({
  netIncomePercentage,
  receivablesPercentage,
  className = '',
}) => {
  // Normalizar porcentajes para que sumen 100% (maneja casos donde pueden exceder 100% o no sumar exactamente)
  const total = netIncomePercentage + receivablesPercentage;
  const normalizedNetIncome = total > 0 ? Math.min((netIncomePercentage / total) * 100, 100) : 0;
  const normalizedReceivables = total > 0 ? Math.min((receivablesPercentage / total) * 100, 100) : 0;

  // Determinar color según salud de liquidez
  const getHealthColor = () => {
    if (normalizedNetIncome >= 70) return '#22c55e'; // green-500
    if (normalizedNetIncome >= 50) return '#eab308'; // yellow-500
    return '#f97316'; // orange-500
  };

  const healthColor = getHealthColor();

  const data = [
    {
      name: 'Caja (Líquido)',
      value: normalizedNetIncome,
      color: healthColor,
    },
    {
      name: 'Crédito Pendiente',
      value: normalizedReceivables,
      color: '#f97316', // orange-500
    },
  ];

  // Filtrar valores cero para evitar mostrar segmentos vacíos
  const chartData = data.filter(item => item.value > 0);

  // Si no hay datos, mostrar gráfico vacío
  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `${value.toFixed(1)}%`}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Porcentaje central */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div 
            className="text-3xl font-bold"
            style={{ color: healthColor }}
          >
            {normalizedNetIncome.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Liquidez
          </div>
        </div>
      </div>
    </div>
  );
};

