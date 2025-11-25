import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  X, 
  Search, 
  Filter,
  Calendar,
  FileText,
  FileSpreadsheet,
  FileType,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface RecentReport {
  id: string;
  name: string;
  type: 'sales' | 'products' | 'stores' | 'cashiers' | 'daily' | 'inventory';
  date: string;
  size: string;
  format: 'PDF' | 'Excel' | 'CSV';
  status: 'completed' | 'processing' | 'failed';
  downloadUrl?: string;
}

interface ReportsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: RecentReport[];
  onDownload: (reportId: string) => void;
}

export function ReportsHistoryModal({ isOpen, onClose, reports, onDownload }: ReportsHistoryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.type === filterType;
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    const matchesFormat = filterFormat === 'all' || report.format === filterFormat;
    
    return matchesSearch && matchesType && matchesStatus && matchesFormat;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sales':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'products':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'stores':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case 'cashiers':
        return <FileText className="w-4 h-4 text-orange-500" />;
      case 'daily':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'inventory':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF':
        return <FileType className="w-4 h-4 text-red-500" />;
      case 'Excel':
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'CSV':
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'processing':
        return 'Procesando';
      case 'failed':
        return 'Fallido';
      default:
        return 'Desconocido';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'sales':
        return 'Ventas';
      case 'products':
        return 'Productos';
      case 'stores':
        return 'Tiendas';
      case 'cashiers':
        return 'Cajeros';
      case 'daily':
        return 'Diario';
      case 'inventory':
        return 'Inventario';
      default:
        return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>Historial de Reportes</span>
            </div>
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar reportes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de reporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="sales">Ventas</SelectItem>
                  <SelectItem value="products">Productos</SelectItem>
                  <SelectItem value="stores">Tiendas</SelectItem>
                  <SelectItem value="cashiers">Cajeros</SelectItem>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="inventory">Inventario</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterFormat} onValueChange={setFilterFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los formatos</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="Excel">Excel</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Reports List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Reportes ({filteredReports.length})
              </h3>
              <div className="text-sm text-muted-foreground">
                Mostrando {filteredReports.length} de {reports.length} reportes
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron reportes</h3>
                <p className="text-muted-foreground">
                  No hay reportes que coincidan con los filtros seleccionados.
                </p>
              </Card>
            ) : (
              filteredReports.map((report) => (
                <Card key={report.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(report.type)}
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(report.date).toLocaleDateString('es-VE')}</span>
                            </span>
                            <span>{report.size}</span>
                            <span className="flex items-center space-x-1">
                              {getFormatIcon(report.format)}
                              <span>{report.format}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(report.status)}
                        <Badge 
                          variant={
                            report.status === 'completed' ? 'default' : 
                            report.status === 'processing' ? 'secondary' : 'destructive'
                          }
                        >
                          {getStatusText(report.status)}
                        </Badge>
                      </div>

                      {report.status === 'completed' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onDownload(report.id)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Summary Stats */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Resumen</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {reports.filter(r => r.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {reports.filter(r => r.status === 'processing').length}
                </p>
                <p className="text-sm text-muted-foreground">Procesando</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {reports.filter(r => r.status === 'failed').length}
                </p>
                <p className="text-sm text-muted-foreground">Fallidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {reports.filter(r => r.format === 'PDF').length}
                </p>
                <p className="text-sm text-muted-foreground">PDFs</p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
