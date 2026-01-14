import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PRODUCT_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import { getBcvRate } from '@/utils/bcvRate';
import { Loader2, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PriceListModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (params: PriceListParams) => void;
}

export interface PriceListParams {
  category: string;
  onlyVisible: boolean;
  onlyWithStock: boolean;
  krecePercentage: number;
  chasePercentage: number;
  bcvRate: number;
}

export const PriceListModal: React.FC<PriceListModalProps> = ({
  open,
  onClose,
  onGenerate,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingBcv, setLoadingBcv] = useState(false);
  
  // Estados del formulario
  const [category, setCategory] = useState<string>('all');
  const [onlyVisible, setOnlyVisible] = useState(false);
  const [onlyWithStock, setOnlyWithStock] = useState(false);
  const [krecePercentage, setKrecePercentage] = useState<string>('0');
  const [chasePercentage, setChasePercentage] = useState<string>('0');
  const [bcvRate, setBcvRate] = useState<string>('0');

  // Cargar tasa BCV al abrir el modal
  useEffect(() => {
    if (open) {
      loadBcvRate();
    }
  }, [open]);

  const loadBcvRate = async () => {
    setLoadingBcv(true);
    try {
      const rate = await getBcvRate();
      if (rate !== null) {
        setBcvRate(rate.toFixed(4));
      } else {
        toast({
          title: "Advertencia",
          description: "No se pudo obtener la tasa BCV automáticamente. Por favor, ingrésala manualmente.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error loading BCV rate:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la tasa BCV. Por favor, ingrésala manualmente.",
        variant: "destructive",
      });
    } finally {
      setLoadingBcv(false);
    }
  };

  const handleGenerate = () => {
    // Validaciones
    if (category === 'all') {
      toast({
        title: "Error de validación",
        description: "Debes seleccionar una categoría",
        variant: "destructive",
      });
      return;
    }

    const krece = parseFloat(krecePercentage);
    const chase = parseFloat(chasePercentage);
    const bcv = parseFloat(bcvRate);

    if (isNaN(krece) || krece < 0 || krece > 100) {
      toast({
        title: "Error de validación",
        description: "El porcentaje de inicial Krece debe estar entre 0 y 100",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(chase) || chase < 0 || chase > 100) {
      toast({
        title: "Error de validación",
        description: "El porcentaje de inicial Cashea debe estar entre 0 y 100",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(bcv) || bcv <= 0) {
      toast({
        title: "Error de validación",
        description: "La tasa BCV debe ser un número mayor a 0",
        variant: "destructive",
      });
      return;
    }

    onGenerate({
      category,
      onlyVisible,
      onlyWithStock,
      krecePercentage: krece,
      chasePercentage: chase,
      bcvRate: bcv,
    });
  };

  const handleClose = () => {
    // Resetear formulario al cerrar
    setCategory('all');
    setOnlyVisible(false);
    setOnlyWithStock(false);
    setKrecePercentage('0');
    setChasePercentage('0');
    setBcvRate('0');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-emerald-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-white font-bold">
            <FileText className="w-5 h-5 text-emerald-400" />
            Generar Lista de Precios
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Configura los parámetros para generar la lista de precios en PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selección de Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-white font-medium text-sm">
              Categoría *
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger 
                id="category" 
                className="glass-input bg-white/10 border-white/30 text-white hover:bg-white/15 focus:ring-2 focus:ring-emerald-500/50"
              >
                <SelectValue 
                  placeholder="Selecciona una categoría" 
                  className="text-white"
                />
              </SelectTrigger>
              <SelectContent className="glass-panel border-emerald-500/30 bg-[rgba(9,9,9,0.95)]">
                {PRODUCT_CATEGORIES.map(cat => (
                  <SelectItem 
                    key={cat.value} 
                    value={cat.value}
                    className="text-white hover:bg-emerald-500/20 focus:bg-emerald-500/30 cursor-pointer"
                  >
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-white/70">
              Selecciona la categoría de productos a incluir en la lista. Este campo es obligatorio.
            </p>
          </div>

          {/* Filtros */}
          <div className="space-y-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-emerald-500/20">
            <Label className="text-white font-medium text-sm">Filtros</Label>
            
            {/* Solo productos visibles */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="onlyVisible" className="text-white font-medium">
                  Solo productos visibles en web
                </Label>
                <p className="text-xs text-white/70">
                  Incluir solo productos que están visibles en la página web
                </p>
              </div>
              <Switch
                id="onlyVisible"
                isSelected={onlyVisible}
                onChange={setOnlyVisible}
              />
            </div>

            {/* Solo productos con stock */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="onlyWithStock" className="text-white font-medium">
                  Solo productos con stock
                </Label>
                <p className="text-xs text-white/70">
                  Excluir productos con stock 0
                </p>
              </div>
              <Switch
                id="onlyWithStock"
                isSelected={onlyWithStock}
                onChange={setOnlyWithStock}
              />
            </div>
          </div>

          {/* Porcentajes de Inicial */}
          <div className="space-y-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-emerald-500/20">
            <Label className="text-white font-medium text-sm">Porcentajes de Inicial</Label>
            
            {/* Porcentaje Krece */}
            <div className="space-y-2">
              <Label htmlFor="krecePercentage" className="text-white font-medium">
                Inicial Krece (%)
              </Label>
              <Input
                id="krecePercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={krecePercentage}
                onChange={(e) => setKrecePercentage(e.target.value)}
                className="glass-input bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-500/50"
                placeholder="0.00"
              />
              <p className="text-xs text-white/70">
                Porcentaje para calcular la inicial Krece basada en el precio de venta. Ejemplo: 30% significa que la inicial será el 30% del precio de venta.
              </p>
            </div>

            {/* Porcentaje Cashea */}
            <div className="space-y-2">
              <Label htmlFor="chasePercentage" className="text-white font-medium">
                Inicial Cashea (%)
              </Label>
              <Input
                id="chasePercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={chasePercentage}
                onChange={(e) => setChasePercentage(e.target.value)}
                className="glass-input bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-500/50"
                placeholder="0.00"
              />
              <p className="text-xs text-white/70">
                Porcentaje para calcular la inicial Cashea basada en el precio de venta. Ejemplo: 30% significa que la inicial será el 30% del precio de venta.
              </p>
            </div>
          </div>

          {/* Tasa BCV */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bcvRate" className="text-white font-medium text-sm">
                Tasa BCV *
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadBcvRate}
                disabled={loadingBcv}
                className="h-8 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/70"
              >
                {loadingBcv ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Actualizar
              </Button>
            </div>
            <Input
              id="bcvRate"
              type="number"
              step="0.0001"
              min="0"
              value={bcvRate}
              onChange={(e) => setBcvRate(e.target.value)}
              className="glass-input bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-500/50"
              placeholder="0.0000"
            />
            <p className="text-xs text-white/70">
              Tasa BCV para calcular el precio en bolívares. Se carga automáticamente pero puedes editarla manualmente.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="border-white/30 text-white hover:bg-white/10 hover:border-white/50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || loadingBcv}
            className="bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-500/50 shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

