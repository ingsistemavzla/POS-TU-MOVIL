import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Settings,
  Plus,
  Trash2,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useScheduledReports } from '@/hooks/useScheduledReports';
import { useToast } from '@/hooks/use-toast';

export function ScheduledReportsCard() {
  const { scheduledReports, stats, loading, actions } = useScheduledReports();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    reportType: 'sales' as 'sales' | 'profitability' | 'inventory',
    scheduleTime: '18:00',
    scheduleDays: ['daily'],
    emailRecipients: ['']
  });
  const [saving, setSaving] = useState(false);

  const handleCreateScheduledReport = async () => {
    try {
      setSaving(true);
      
      const emails = formData.emailRecipients.filter(email => email.trim() !== '');
      if (emails.length === 0) {
        toast({
          title: "Error",
          description: "Debe agregar al menos un destinatario de email.",
          variant: "destructive"
        });
        return;
      }

      await actions.createScheduledReport(
        formData.reportType,
        formData.scheduleTime,
        formData.scheduleDays,
        emails
      );

      toast({
        title: "Reporte programado",
        description: "El reporte automático ha sido configurado exitosamente."
      });

      setShowDialog(false);
      setFormData({
        reportType: 'sales',
        scheduleTime: '18:00',
        scheduleDays: ['daily'],
        emailRecipients: ['']
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo configurar el reporte automático.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReport = async (reportId: string, currentStatus: boolean) => {
    try {
      await actions.toggleScheduledReport(reportId, !currentStatus);
      toast({
        title: currentStatus ? "Reporte desactivado" : "Reporte activado",
        description: `El reporte automático ha sido ${currentStatus ? 'desactivado' : 'activado'}.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del reporte.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await actions.deleteScheduledReport(reportId);
      toast({
        title: "Reporte eliminado",
        description: "El reporte automático ha sido eliminado."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el reporte.",
        variant: "destructive"
      });
    }
  };

  const addEmailRecipient = () => {
    setFormData(prev => ({
      ...prev,
      emailRecipients: [...prev.emailRecipients, '']
    }));
  };

  const updateEmailRecipient = (index: number, email: string) => {
    setFormData(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.map((e, i) => i === index ? email : e)
    }));
  };

  const removeEmailRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter((_, i) => i !== index)
    }));
  };

  const reportTypeNames = {
    sales: 'Ventas',
    profitability: 'Rentabilidad',
    inventory: 'Inventario'
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando reportes programados...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Reportes Automáticos</h3>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Reporte
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configurar Reporte Automático</DialogTitle>
              <DialogDescription>
                Configure un reporte para que se genere automáticamente en el horario especificado.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportType">Tipo de Reporte</Label>
                  <Select 
                    value={formData.reportType} 
                    onValueChange={(value: any) => setFormData(prev => ({...prev, reportType: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Reporte de Ventas</SelectItem>
                      <SelectItem value="profitability">Reporte de Rentabilidad</SelectItem>
                      <SelectItem value="inventory">Reporte de Inventario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scheduleTime">Hora de Generación</Label>
                  <Input
                    id="scheduleTime"
                    type="time"
                    value={formData.scheduleTime}
                    onChange={(e) => setFormData(prev => ({...prev, scheduleTime: e.target.value}))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Destinatarios de Email</Label>
                {formData.emailRecipients.map((email, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      type="email"
                      placeholder="email@empresa.com"
                      value={email}
                      onChange={(e) => updateEmailRecipient(index, e.target.value)}
                    />
                    {formData.emailRecipients.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeEmailRecipient(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addEmailRecipient}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Destinatario
                </Button>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateScheduledReport} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Crear Reporte'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.activeScheduled}</p>
            <p className="text-sm text-muted-foreground">Activos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.generatedToday}</p>
            <p className="text-sm text-muted-foreground">Hoy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.totalGenerated}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.failedReports}</p>
            <p className="text-sm text-muted-foreground">Fallidos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.totalScheduled}</p>
            <p className="text-sm text-muted-foreground">Configurados</p>
          </div>
        </div>
      )}

      {/* Scheduled Reports List */}
      <div className="space-y-3">
        {scheduledReports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay reportes automáticos configurados</p>
            <p className="text-sm">Haga clic en "Nuevo Reporte" para configurar uno</p>
          </div>
        ) : (
          scheduledReports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{reportTypeNames[report.report_type]}</p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{report.schedule_time}</span>
                      <span>•</span>
                      <span>{report.schedule_days.includes('daily') ? 'Diario' : report.schedule_days.join(', ')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant={report.is_active ? "default" : "secondary"}>
                    {report.is_active ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activo
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactivo
                      </>
                    )}
                  </Badge>
                  
                  {report.report_config.email_recipients?.length > 0 && (
                    <Badge variant="outline">
                      <Mail className="h-3 w-3 mr-1" />
                      {report.report_config.email_recipients.length} destinatarios
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={report.is_active}
                  onCheckedChange={() => handleToggleReport(report.id, report.is_active)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDeleteReport(report.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Setup */}
      {scheduledReports.length === 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <p className="font-medium text-blue-900">Configuración Rápida</p>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            Configure el reporte diario de ventas a las 6:00 PM automáticamente.
          </p>
          <Button
            onClick={() => {
              setFormData({
                reportType: 'sales',
                scheduleTime: '18:00',
                scheduleDays: ['daily'],
                emailRecipients: ['']
              });
              setShowDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Configurar Reporte Diario
          </Button>
        </div>
      )}
    </Card>
  );
}
