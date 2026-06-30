import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStockNotifications } from '@/contexts/StockNotificationContext';
import { StockNotificationModal } from '@/components/layout/StockNotificationModal';

export function StockNotificationBell() {
  const notifications = useStockNotifications();

  if (!notifications) return null;

  const {
    totalWarningCount,
    unreviewedCount,
    hasAlerts,
    hasNewLowStock,
    loading,
    openModal,
    modalOpen,
    closeModal,
  } = notifications;

  const badgeCount =
    unreviewedCount > 0 ? unreviewedCount : totalWarningCount;
  const displayCount = badgeCount > 99 ? '99+' : String(badgeCount);
  const showBadge = hasAlerts && !loading;

  const badgeVariant = hasNewLowStock
    ? 'new'
    : unreviewedCount > 0
      ? 'unreviewed'
      : 'reviewed';

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={openModal}
        className="relative h-10 w-10 shrink-0 rounded-full hover:bg-white/15"
        aria-label={
          hasAlerts
            ? `${badgeCount} artículos con stock bajo${
                hasNewLowStock
                  ? ', nuevo artículo detectado'
                  : unreviewedCount > 0
                    ? ', pendientes de revisar'
                    : ''
              }`
            : 'Alertas de stock'
        }
      >
        <BarChart3 className="h-7 w-7 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.55)]" />
        {showBadge && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-0.5 text-[8px] font-bold leading-none text-black shadow-sm',
              badgeVariant === 'new' &&
                'bg-red-500 ring-1 ring-red-300 animate-pulse',
              badgeVariant === 'unreviewed' &&
                'bg-yellow-400 ring-1 ring-yellow-200/90',
              badgeVariant === 'reviewed' &&
                'bg-yellow-400/85 ring-1 ring-yellow-200/70'
            )}
          >
            {displayCount}
          </span>
        )}
      </Button>

      <StockNotificationModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      />
    </>
  );
}
