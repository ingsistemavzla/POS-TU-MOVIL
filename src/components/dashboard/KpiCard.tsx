import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: number;
  period: string;
  change: number;
  previousPeriod: string;
  icon: ReactNode;
  borderColor?: 'green' | 'blue' | 'purple' | 'red';
  isLoading?: boolean;
}

export function KpiCard({
  title,
  value,
  period,
  change,
  previousPeriod,
  icon,
  borderColor = 'green',
  isLoading = false
}: KpiCardProps) {
  const borderColors = {
    green: 'border-green-500',
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    red: 'border-red-500'
  };

  const textColors = {
    green: 'text-green-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    red: 'text-red-500'
  };

  const borderClass = borderColors[borderColor];
  const textColorClass = borderColor === 'red' ? 'text-red-500' : textColors[borderColor];

  const changeColor = change >= 0 ? 'text-green-500' : 'text-red-500';
  const changeIcon = change > 0 ? <ArrowUpRight className="w-4 h-4" /> : change < 0 ? <ArrowDownRight className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />;

  return (
    <Card className={`p-6 bg-[#1a1a1a] border-2 ${borderClass} border-opacity-50 hover:border-opacity-100 transition-all duration-300 shadow-lg shadow-${borderColor}-500/20`}>
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div>
            {isLoading ? (
              <p className="text-2xl font-bold text-muted-foreground">Cargando...</p>
            ) : (
              <p className={`text-3xl font-bold ${textColorClass}`}>
                {formatCurrency(value)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {period}
            </p>
          </div>
          <div className="flex items-center space-x-1">
            <span className={changeColor}>
              {changeIcon}
            </span>
            <span className={`text-xs font-medium ${changeColor}`}>
              {change.toFixed(1)}% vs {previousPeriod}
            </span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-[#2a2a2a]">
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}

