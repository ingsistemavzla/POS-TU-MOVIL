import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, X, FileText, FileSpreadsheet, FileType, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (exportConfig: any) => void;
}

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [exportConfig, setExportConfig] = useState({
    format: 'pdf' as 'pdf' | 'excel' | 'csv',
    dateRange: {
      from: null as Date | null,
      to: null as Date | null
    },
    includeCharts: true,
    includeTables: true,
    includeSummary: true,
    emailDelivery: false,
    emailAddress: '',
    fileName: '',
    reports: {
      sales: true,
      products: true,
      stores: true,
      cashiers: true
    }
  });

  const handleExport = () => {
    onExport(exportConfig);
    onClose();
  };

  const handleReset = () => {
    setExportConfig({
      format: 'pdf',
      dateRange: { from: null, to: null },
      includeCharts: true,
      includeTables: true,
      includeSummary: true,
      emailDelivery: false,
      emailAddress: '',
      fileName: '',
      reports: {
        sales: true,
        products: true,
        stores: true,
        cashiers: true
      }
    });
  };

  const toggleReport = (reportKey: keyof typeof exportConfig.reports) => {
    setExportConfig(prev => ({
      ...prev,
      reports: {
        ...prev.reports,
        [reportKey]: !prev.reports[reportKey]
      }
    }));
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileType className="w-5 h-5 text-red-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'csv':
        return <FileText className="w-5 h-5 text-blue-500" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'Documento PDF con gráficos y tablas';
      case 'excel':
        return 'Archivo Excel con datos detallados';
      case 'csv':
        return 'Archivo CSV para análisis externo';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-primary" />
              <span>Exportar Reportes</span>
            </div>
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Formato de Exportación</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['pdf', 'excel', 'csv'] as const).map((format) => (
                <div
                  key={format}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    exportConfig.format === format
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setExportConfig(prev => ({ ...prev, format }))}
                >
                  <div className="flex items-center space-x-3">
                    {getFormatIcon(format)}
                    <div>
                      <p className="font-semibold capitalize">{format}</p>
                      <p className="text-sm text-muted-foreground">
                        {getFormatDescription(format)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Date Range */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Rango de Fechas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {exportConfig.dateRange.from ? (
                        format(exportConfig.dateRange.from, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={exportConfig.dateRange.from}
                      onSelect={(date) => setExportConfig(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, from: date } 
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {exportConfig.dateRange.to ? (
                        format(exportConfig.dateRange.to, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={exportConfig.dateRange.to}
                      onSelect={(date) => setExportConfig(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, to: date } 
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </Card>

          {/* Report Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reportes a Incluir</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="report-sales"
                  checked={exportConfig.reports.sales}
                  onCheckedChange={() => toggleReport('sales')}
                />
                <Label htmlFor="report-sales" className="text-sm font-normal">
                  Reporte de Ventas
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="report-products"
                  checked={exportConfig.reports.products}
                  onCheckedChange={() => toggleReport('products')}
                />
                <Label htmlFor="report-products" className="text-sm font-normal">
                  Reporte de Productos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="report-stores"
                  checked={exportConfig.reports.stores}
                  onCheckedChange={() => toggleReport('stores')}
                />
                <Label htmlFor="report-stores" className="text-sm font-normal">
                  Reporte de Tiendas
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="report-cashiers"
                  checked={exportConfig.reports.cashiers}
                  onCheckedChange={() => toggleReport('cashiers')}
                />
                <Label htmlFor="report-cashiers" className="text-sm font-normal">
                  Reporte de Cajeros
                </Label>
              </div>
            </div>
          </Card>

          {/* Content Options */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Opciones de Contenido</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-summary"
                  checked={exportConfig.includeSummary}
                  onCheckedChange={(checked) => setExportConfig(prev => ({ 
                    ...prev, 
                    includeSummary: checked as boolean 
                  }))}
                />
                <Label htmlFor="include-summary" className="text-sm font-normal">
                  Incluir Resumen Ejecutivo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-charts"
                  checked={exportConfig.includeCharts}
                  onCheckedChange={(checked) => setExportConfig(prev => ({ 
                    ...prev, 
                    includeCharts: checked as boolean 
                  }))}
                />
                <Label htmlFor="include-charts" className="text-sm font-normal">
                  Incluir Gráficos y Visualizaciones
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-tables"
                  checked={exportConfig.includeTables}
                  onCheckedChange={(checked) => setExportConfig(prev => ({ 
                    ...prev, 
                    includeTables: checked as boolean 
                  }))}
                />
                <Label htmlFor="include-tables" className="text-sm font-normal">
                  Incluir Tablas de Datos Detalladas
                </Label>
              </div>
            </div>
          </Card>

          {/* File Name */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Configuración del Archivo</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Archivo</Label>
                <Input
                  placeholder="Reporte_Ventas_2024"
                  value={exportConfig.fileName}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, fileName: e.target.value }))}
                />
              </div>
              
              {/* Email Delivery */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-delivery"
                    checked={exportConfig.emailDelivery}
                    onCheckedChange={(checked) => setExportConfig(prev => ({ 
                      ...prev, 
                      emailDelivery: checked as boolean 
                    }))}
                  />
                  <Label htmlFor="email-delivery" className="text-sm font-normal">
                    Enviar por Email
                  </Label>
                </div>
                
                {exportConfig.emailDelivery && (
                  <div className="space-y-2">
                    <Label>Dirección de Email</Label>
                    <Input
                      type="email"
                      placeholder="usuario@empresa.com"
                      value={exportConfig.emailAddress}
                      onChange={(e) => setExportConfig(prev => ({ 
                        ...prev, 
                        emailAddress: e.target.value 
                      }))}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Export Preview */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Vista Previa de Exportación</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Formato:</span>
                <span className="font-medium capitalize">{exportConfig.format}</span>
              </div>
              <div className="flex justify-between">
                <span>Reportes incluidos:</span>
                <span className="font-medium">
                  {Object.values(exportConfig.reports).filter(Boolean).length} de 4
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span className="font-medium">
                  {exportConfig.dateRange.from && exportConfig.dateRange.to
                    ? `${format(exportConfig.dateRange.from, "dd/MM/yyyy")} - ${format(exportConfig.dateRange.to, "dd/MM/yyyy")}`
                    : 'No especificado'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Entrega:</span>
                <span className="font-medium">
                  {exportConfig.emailDelivery ? 'Email' : 'Descarga directa'}
                </span>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleReset}>
              Restablecer
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleExport} className="bg-gradient-primary glow-primary">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
