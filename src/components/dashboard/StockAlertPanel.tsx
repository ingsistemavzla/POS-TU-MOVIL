import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { StockAlertMode } from '@/hooks/useDashboardStockAlerts';
import { STOCK_ALERT_PANEL_VISIBLE_ROWS, STOCK_ALERT_VARIANT_CONFIG } from '@/constants/stockAlerts';
import { StockAlertListContent } from '@/components/dashboard/StockAlertListContent';

interface StockAlertPanelProps {
  mode: StockAlertMode;
  layout?: 'full' | 'column';
}

export function StockAlertPanel({ mode, layout = 'full' }: StockAlertPanelProps) {
  const config = STOCK_ALERT_VARIANT_CONFIG[mode];
  const isColumn = layout === 'column';

  return (
    <Card className={`glass-panel flex h-full flex-col border border-t-4 shadow-lg ${config.cardClass}`}>
      <CardHeader className={`pb-3 ${isColumn ? 'space-y-3' : ''}`}>
        <CardTitle
          className={`flex flex-wrap items-center gap-2 font-semibold ${config.titleClass} ${
            isColumn ? 'text-base' : 'text-lg'
          }`}
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {config.title}
          <Badge variant="outline" className={config.badgeOutlineClass}>
            {config.rangeLabel}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <StockAlertListContent mode={mode} visibleRows={STOCK_ALERT_PANEL_VISIBLE_ROWS} />
      </CardContent>
    </Card>
  );
}
