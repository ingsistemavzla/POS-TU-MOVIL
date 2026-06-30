import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, Loader2, Package, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  DashboardStockAlertItem,
  StockAlertMode,
  useDashboardStockAlerts,
} from '@/hooks/useDashboardStockAlerts';
import { PRODUCT_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import {
  STOCK_ALERT_SCROLLABLE_LIST_CLASS,
  STOCK_ALERT_VARIANT_CONFIG,
  stockAlertScrollHeight,
} from '@/constants/stockAlerts';

const DEFAULT_CATEGORY = 'phones';

interface StockAlertListContentProps {
  mode: StockAlertMode;
  visibleRows: number;
  showMeta?: boolean;
}

function ScrollableStockList({
  items,
  mode,
  visibleRows,
}: {
  items: DashboardStockAlertItem[];
  mode: StockAlertMode;
  visibleRows: number;
}) {
  const config = STOCK_ALERT_VARIANT_CONFIG[mode];
  const scrollHeight = stockAlertScrollHeight(visibleRows);
  const showScrollHint = items.length > visibleRows;

  return (
    <div className="relative">
      <div
        className={STOCK_ALERT_SCROLLABLE_LIST_CLASS}
        style={{ height: scrollHeight }}
      >
        <div className={`space-y-2 ${showScrollHint ? 'pb-14' : 'pb-1'}`}>
          {items.map((item) => (
            <div
              key={item.key}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${config.rowClass}`}
              style={{ minHeight: 68 }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.name}</p>
                <p className="truncate text-xs text-white/80">
                  SKU: {item.sku} • {item.storeName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className={`text-sm font-semibold ${config.qtyClass}`}>
                  {item.currentStock} uds
                </p>
                <span
                  className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-medium ${config.statusClass}`}
                >
                  {config.statusLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showScrollHint && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center justify-end bg-gradient-to-t ${config.scrollHintClass} to-transparent pt-12 pb-2`}
        >
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm">
            <ChevronDown className="h-4 w-4 animate-bounce" />
            Desliza para ver los {items.length} artículos
          </div>
        </div>
      )}
    </div>
  );
}

export function StockAlertListContent({
  mode,
  visibleRows,
  showMeta = true,
}: StockAlertListContentProps) {
  const config = STOCK_ALERT_VARIANT_CONFIG[mode];
  const emptyHeight = stockAlertScrollHeight(visibleRows);

  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { items, loading, error } = useDashboardStockAlerts(category, mode);

  const filteredItems = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return items;

    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.storeName.toLowerCase().includes(query)
    );
  }, [items, debouncedSearch]);

  return (
    <div className="space-y-3">
      <div className="grid w-full grid-cols-2 gap-2">
        <div className="relative min-w-0 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className={`w-full bg-black/20 pl-9 text-sm text-white placeholder:text-white/40 ${config.inputClass}`}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger
            className={`min-w-0 w-full bg-black/20 text-sm text-white ${config.selectClass}`}
          >
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showMeta && !loading && filteredItems.length > 0 && (
        <p className="text-xs text-white/60">
          Mostrando {filteredItems.length} en {getCategoryLabel(category)}
          {filteredItems.length > visibleRows &&
            ` · desliza para ver los ${filteredItems.length} artículos`}
        </p>
      )}

      {loading ? (
        <div
          className="flex items-center justify-center text-white/70"
          style={{ height: emptyHeight }}
        >
          <Loader2 className={`mr-2 h-5 w-5 animate-spin ${config.spinnerClass}`} />
          Cargando...
        </div>
      ) : error ? (
        <div
          className="flex items-center justify-center text-red-400"
          style={{ height: emptyHeight }}
        >
          {error}
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-white/70"
          style={{ height: emptyHeight }}
        >
          <Package className={`mb-2 h-8 w-8 ${config.emptyIconClass}`} />
          <p className="text-center text-sm">
            {searchTerm
              ? 'No hay artículos que coincidan con la búsqueda'
              : `${config.emptyLabel} en ${getCategoryLabel(category)}`}
          </p>
        </div>
      ) : (
        <ScrollableStockList
          items={filteredItems}
          mode={mode}
          visibleRows={visibleRows}
        />
      )}
    </div>
  );
}
