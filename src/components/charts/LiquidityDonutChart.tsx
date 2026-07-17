import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface LiquidityDonutChartProps {
  netIncomePercentage: number;
  receivablesPercentage: number;
  className?: string;
  /** Mientras llegan/actualizan cifras del dashboard */
  awaitingData?: boolean;
}

export const LiquidityDonutChart: React.FC<LiquidityDonutChartProps> = ({
  netIncomePercentage,
  receivablesPercentage,
  className = '',
  awaitingData = false,
}) => {
  const total = netIncomePercentage + receivablesPercentage;
  const normalizedNetIncome = total > 0 ? Math.min((netIncomePercentage / total) * 100, 100) : 0;
  const normalizedReceivables = total > 0 ? Math.min((receivablesPercentage / total) * 100, 100) : 0;
  const hasMovement = total > 0;

  const getHealthColor = () => {
    if (!hasMovement) return 'rgba(255,255,255,0.35)';
    if (normalizedNetIncome >= 70) return '#22c55e';
    if (normalizedNetIncome >= 50) return '#eab308';
    return '#f97316';
  };

  const healthColor = getHealthColor();

  // Siempre hay algo que dibujar: con datos reales o anillo vacío (día sin ventas)
  const chartData = hasMovement
    ? [
        {
          name: 'Caja (Líquido)',
          value: Math.max(normalizedNetIncome, 0.01),
          color: healthColor,
        },
        {
          name: 'Crédito Pendiente',
          value: Math.max(normalizedReceivables, 0.01),
          color: '#f97316',
        },
      ].filter((item) => item.value > 0)
    : [
        {
          name: 'Sin movimiento',
          value: 100,
          color: 'rgba(255,255,255,0.12)',
        },
      ];

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
            isAnimationActive={!awaitingData}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {hasMovement && (
            <Tooltip
              formatter={(value: number) => `${value.toFixed(1)}%`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center px-2">
          {awaitingData ? (
            <>
              <div className="text-[11px] leading-tight font-medium text-emerald-300/90 animate-pulse">
                Esperando datos...
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Liquidez</div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold" style={{ color: healthColor }}>
                {normalizedNetIncome.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {hasMovement ? 'Liquidez' : 'Sin ventas'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
