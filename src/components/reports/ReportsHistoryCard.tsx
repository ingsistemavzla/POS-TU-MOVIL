import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { useScheduledReports } from '@/hooks/useScheduledReports';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/currency';

export function ReportsHistoryCard() {
  const { generatedReports, loading, actions } = useScheduledReports();
  const { toast } = useToast();

  const handleDownload = async (reportId: string) => {
    try {
      await actions.downloadGeneratedReport(reportId);
      toast({
        title: "Descarga iniciada",
        description: "El reporte se está descargando."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el reporte.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'generating':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'generating':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'generating':
        return 'Generando';
      case 'failed':
        return 'Fallido';
      default:
        return 'Desconocido';
    }
  };

  const getReportTypeIcon = (type: string) => {
    return <FileText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando historial de reportes...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Historial de Reportes</h3>
        </div>
        
        <Button variant="outline" onClick={() => actions.refresh()}>
          Actualizar
        </Button>
      </div>

      <div className="space-y-3">
        {generatedReports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay reportes generados</p>
            <p className="text-sm">Los reportes automáticos aparecerán aquí</p>
          </div>
        ) : (
          generatedReports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getReportTypeIcon(report.report_type)}
                  <div>
                    <p className="font-medium">{report.report_title}</p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(report.generated_at).toLocaleDateString('es-ES')}</span>
                      <span>{new Date(report.generated_at).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</span>
                      {report.download_count > 0 && (
                        <>
                          <span>•</span>
                          <span>{report.download_count} descargas</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(report.status) as any}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(report.status)}
                      <span>{getStatusText(report.status)}</span>
                    </div>
                  </Badge>
                  
                  {report.file_size && (
                    <Badge variant="outline">
                      {(report.file_size / 1024 / 1024).toFixed(1)} MB
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {report.status === 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(report.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                )}
                
                {report.status === 'failed' && report.error_message && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Error del reporte",
                        description: report.error_message,
                        variant: "destructive"
                      });
                    }}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Ver Error
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {generatedReports.length > 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Mostrando los últimos 20 reportes generados
        </div>
      )}
    </Card>
  );
}
