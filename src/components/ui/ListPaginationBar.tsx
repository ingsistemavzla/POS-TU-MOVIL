import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListPaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Etiqueta del recurso paginado (ej. productos, registros) */
  itemLabel?: string;
}

export function ListPaginationBar({
  currentPage,
  totalPages,
  totalCount,
  rangeStart,
  rangeEnd,
  onPageChange,
  className,
  itemLabel = 'productos',
}: ListPaginationBarProps) {
  if (totalCount === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-1',
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Mostrando {rangeStart}–{rangeEnd} de {totalCount} {itemLabel}
        {totalPages > 1 && (
          <span className="ml-1">· Página {currentPage} de {totalPages}</span>
        )}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
