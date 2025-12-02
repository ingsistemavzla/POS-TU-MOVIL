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
  const shadowColors = {
    green: 'shadow-accent-primary/40',
    blue: 'shadow-blue-500/50',
    purple: 'shadow-purple-500/50',
    red: 'shadow-status-danger/50'
  };

  const textColors = {
    green: 'text-accent-primary',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    red: 'text-status-danger'
  };

  const shadowClass = shadowColors[borderColor];
  const hoverShadowClass = shadowClass.replace('/40', '/50').replace('/50', '/60');
  const textColorClass = borderColor === 'red' ? 'text-status-danger' : textColors[borderColor];

  const changeColor = change >= 0 ? 'text-accent-primary' : 'text-status-danger';
  const changeIcon = change > 0 ? <ArrowUpRight className="w-4 h-4" /> : change < 0 ? <ArrowDownRight className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />;

  return (
    <Card className={`p-6 transition-all duration-300 shadow-lg ${shadowClass} hover:${hoverShadowClass}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div>
            {isLoading ? (
              <p className="text-2xl font-bold text-gray-400">Cargando...</p>
            ) : (
              <p className={`text-3xl font-bold ${textColorClass}`}>
                {formatCurrency(value)}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
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
        <div className="p-3 rounded-md bg-gray-50">
          <div className="text-accent-primary">
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}

