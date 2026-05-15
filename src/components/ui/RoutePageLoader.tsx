import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Cargador liviano para Suspense: no tapa el layout ni bloquea con overlay fijo */
export function RoutePageLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex w-full min-h-[40vh] items-center justify-center py-12',
        className
      )}
      aria-busy="true"
      aria-label="Cargando página"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
