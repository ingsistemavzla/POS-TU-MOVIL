import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export function ProductCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded shrink-0" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full rounded" />
    </Card>
  );
}

export function ProductCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AlmacenTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <Card className="glass-panel-dense">
      <div className="p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {['SKU', 'Nombre', 'Cat.', 'Precio', 'Stock', 'Estado', 'Acc.'].map((h) => (
                <th key={h} className="text-left py-4 px-4">
                  <Skeleton className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-4 px-4"><Skeleton className="h-4 w-20" /></td>
                <td className="py-4 px-4"><Skeleton className="h-4 w-40" /></td>
                <td className="py-4 px-4"><Skeleton className="h-5 w-24 rounded-full" /></td>
                <td className="py-4 px-4"><Skeleton className="h-4 w-14 ml-auto" /></td>
                <td className="py-4 px-4"><Skeleton className="h-4 w-10 ml-auto" /></td>
                <td className="py-4 px-4"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                <td className="py-4 px-4"><Skeleton className="h-8 w-20 mx-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Skeleton de filas en lista/cards del POS durante búsqueda */
export function PosProductListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="p-4 glass-card">
          <div className="flex items-center gap-4 min-h-[56px]">
            <Skeleton className="h-12 w-12 rounded-sm shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 max-w-[200px]" />
              <Skeleton className="h-3 w-1/2 max-w-[120px]" />
            </div>
            <Skeleton className="h-8 w-16 shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function InlineLoadingBar({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span>{label}</span>
    </div>
  );
}

export function FilterToolbarSpinner() {
  return <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />;
}
