import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUCT_CATEGORIES } from "@/constants/categories";
import { useToast } from "@/hooks/use-toast";

interface Store {
  id: string;
  name: string;
}

interface GenerateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (filters: {
    storeId: string;
    dateFrom: string;
    dateTo: string;
    categoryId?: string;
  }) => void;
  stores: Store[];
  loading?: boolean;
  lockStore?: boolean;
  lockedStoreId?: string;
  showCategoryFilter?: boolean;
  title?: string;
  description?: string;
}

const PRESET_RANGES = [
  { label: "Hoy", days: 0 },
  { label: "3 días", days: 3 },
  { label: "5 días", days: 5 },
  { label: "1 semana", days: 7 },
  { label: "15 días", days: 15 },
  { label: "1 mes", days: 30 },
] as const;

export function GenerateReportModal({
  open,
  onOpenChange,
  onGenerate,
  stores,
  loading = false,
  lockStore = false,
  lockedStoreId,
  showCategoryFilter = false,
  title = "Generar Reporte",
  description = "Selecciona los filtros para generar el reporte.",
}: GenerateReportModalProps) {
  const { toast } = useToast();
  const [storeId, setStoreId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(new Date());
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("all");

  useEffect(() => {
    if (lockedStoreId) {
      setStoreId(lockedStoreId);
    }
  }, [lockedStoreId]);

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setDateFrom(new Date());
      setDateTo(new Date());
      setSelectedPreset("");
      if (!lockedStoreId) {
        setStoreId("all");
      }
      // Reset category ID when modal closes
      setCategoryId("all");
    } else {
      // When modal opens, ensure category is reset to "all"
      setCategoryId("all");
    }
  }, [open, lockedStoreId]);

  const handlePresetChange = (presetLabel: string) => {
    setSelectedPreset(presetLabel);
    const preset = PRESET_RANGES.find((p) => p.label === presetLabel);
    if (preset) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (preset.days === 0) {
        // Hoy
        setDateFrom(today);
        setDateTo(today);
      } else {
        // Rango desde hace X días hasta hoy
        const fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - preset.days);
        setDateFrom(fromDate);
        setDateTo(today);
      }
    }
  };

  const handleGenerate = () => {
    // Validar que el rango de fechas sea obligatorio
    if (!dateFrom || !dateTo) {
      toast({
        title: "Rango de fechas requerido",
        description: "Por favor, selecciona un rango de fechas antes de generar el reporte. Puedes usar los rangos predeterminados o seleccionar fechas manualmente.",
        variant: "destructive",
      });
      return;
    }

    // Validar que la fecha "desde" no sea mayor que la fecha "hasta"
    if (dateFrom > dateTo) {
      toast({
        title: "Rango de fechas inválido",
        description: "La fecha 'desde' no puede ser mayor que la fecha 'hasta'. Por favor, corrige las fechas seleccionadas.",
        variant: "destructive",
      });
      return;
    }

    const dateFromStr = format(dateFrom, "yyyy-MM-dd");
    const dateToStr = format(dateTo, "yyyy-MM-dd");

    // categoryId solo se pasa si showCategoryFilter es true Y categoryId !== "all"
    // Si categoryId es "all" o undefined, no se filtra por categoría (todas las categorías)
    onGenerate({
      storeId,
      dateFrom: dateFromStr,
      dateTo: dateToStr,
      categoryId: showCategoryFilter && categoryId && categoryId !== "all" ? categoryId : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sucursal */}
          <div className="space-y-2">
            <Label>Sucursal</Label>
            <Select
              value={storeId}
              onValueChange={setStoreId}
              disabled={lockStore}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rangos Predeterminados */}
          <div className="space-y-2">
            <Label>Rangos Predeterminados</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_RANGES.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant={selectedPreset === preset.label ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetChange(preset.label)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Fechas Manuales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-green-500" />
                    {dateFrom ? (
                      format(dateFrom, "PPP", { locale: es })
                    ) : (
                      <span>Selecciona una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fecha hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-green-500" />
                    {dateTo ? (
                      format(dateTo, "PPP", { locale: es })
                    ) : (
                      <span>Selecciona una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filtro por Categoría (opcional) */}
          {showCategoryFilter && (
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || !dateFrom || !dateTo}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Generando..." : "Generar Reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

