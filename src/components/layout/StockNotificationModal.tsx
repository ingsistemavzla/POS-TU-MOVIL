import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3 } from 'lucide-react';
import { StockAlertMode } from '@/hooks/useDashboardStockAlerts';
import { STOCK_ALERT_MODAL_VISIBLE_ROWS } from '@/constants/stockAlerts';
import { StockAlertListContent } from '@/components/dashboard/StockAlertListContent';
import { useStockNotifications } from '@/contexts/StockNotificationContext';

interface StockNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODE_OPTIONS: Array<{ value: StockAlertMode; label: string }> = [
  { value: 'warning', label: 'Stock bajo global (3–4 uds)' },
  { value: 'critical', label: 'Stock crítico global (1–2 uds)' },
  { value: 'out_of_stock', label: 'Sin stock global (0 uds)' },
];

/** max-w-2xl (672px) + 20% ≈ 806px */
const MODAL_MAX_WIDTH = 'max-w-[50.5rem]';

export function StockNotificationModal({ open, onOpenChange }: StockNotificationModalProps) {
  const [mode, setMode] = useState<StockAlertMode>('warning');
  const notifications = useStockNotifications();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${MODAL_MAX_WIDTH} gap-0 overflow-hidden p-0 border-yellow-500/20`}
      >
        <div className="flex flex-col overflow-hidden px-5 pb-5 pt-6 sm:px-6">
          <DialogHeader className="shrink-0 space-y-1 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base text-white sm:text-lg">
              <BarChart3 className="h-5 w-5 text-yellow-400" />
              Alertas de inventario
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70 sm:text-sm">
              {notifications?.hasNewLowStock
                ? 'Nuevo artículo en stock bajo detectado.'
                : notifications && notifications.unreviewedCount > 0
                  ? `Tienes ${notifications.unreviewedCount} artículo(s) pendientes de revisar.`
                  : 'Revisa el inventario por categoría y tipo de alerta.'}
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 space-y-3 pb-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/90 sm:text-sm">
                Tipo de alerta
              </label>
              <Select value={mode} onValueChange={(value) => setMode(value as StockAlertMode)}>
                <SelectTrigger className="h-9 w-full border-white/15 bg-black/20 text-sm text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="min-h-0 overflow-hidden">
            <StockAlertListContent
              key={mode}
              mode={mode}
              visibleRows={STOCK_ALERT_MODAL_VISIBLE_ROWS}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
