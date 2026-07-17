import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Package } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenueUSD: number;
  storeName: string;
}

interface TopProductsPanelProps {
  products: TopProduct[];
  /** Mientras llegan/actualizan datos del dashboard */
  awaitingData?: boolean;
}

const SCROLL_HEIGHT = 'h-[480px]';

export function TopProductsPanel({ products, awaitingData = false }: TopProductsPanelProps) {
  const uniqueProducts = products
    .filter((product, index, self) => index === self.findIndex((p) => p.id === product.id))
    .slice(0, 10);

  const showScrollHint = uniqueProducts.length > 5;

  return (
    <Card className="glass-panel border border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold text-white">
          <Package className="h-5 w-5" />
          Top Productos Vendidos
          {uniqueProducts.length > 0 && (
            <span className="text-sm font-normal text-white/60">
              ({uniqueProducts.length} productos
              {showScrollHint ? ' · desliza para ver todos' : ''})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uniqueProducts.length > 0 ? (
          <div className="relative">
            <ScrollArea className={`${SCROLL_HEIGHT} pr-3`}>
              <div className="space-y-3 pb-2">
                {uniqueProducts.map((product, index) => (
                  <div
                    key={`top-product-${product.id}-${index}`}
                    className="flex items-center justify-between rounded-lg p-4 glass-panel transition-colors hover:bg-white/10"
                  >
                    <div className="flex min-w-0 items-center space-x-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-medium text-brand-primary">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{product.name}</p>
                        <p className="truncate text-xs text-white/90">{product.storeName}</p>
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(product.revenueUSD)}
                      </p>
                      <p className="text-xs text-white/90">{product.quantity} unidades</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {showScrollHint && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/80 to-transparent pt-10 pb-1">
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                  <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
                  Desliza para ver los {uniqueProducts.length} productos
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`flex items-center justify-center text-white/90 ${SCROLL_HEIGHT}`}>
            <p className={awaitingData ? 'animate-pulse text-emerald-300/90' : ''}>
              {awaitingData ? 'Esperando datos...' : 'No hay productos vendidos'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
