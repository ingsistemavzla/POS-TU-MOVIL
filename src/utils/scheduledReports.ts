import { supabase } from '@/integrations/supabase/client';
import { SalesReportData, ReportMetadata, PeriodType } from '@/types/reports';
import { downloadSalesReportPDF, downloadProfitabilityReportPDF, downloadInventoryReportPDF } from './pdfGenerator';

export interface ScheduledReport {
  id: string;
  company_id: string;
  report_type: 'sales' | 'profitability' | 'inventory' | 'comprehensive';
  schedule_time: string; // HH:MM format
  schedule_days: string[]; // ['monday', 'tuesday', etc.] or ['daily']
  is_active: boolean;
  last_generated: Date | null;
  created_at: Date;
  report_config: {
    period: PeriodType;
    stores?: string[];
    email_recipients: string[];
  };
}

export interface GeneratedReport {
  id: string;
  company_id: string;
  report_type: string;
  report_title: string;
  generated_at: Date;
  period_start: Date;
  period_end: Date;
  pdf_url?: string;
  status: 'generating' | 'completed' | 'failed';
  error_message?: string;
  metadata: ReportMetadata;
}

export class ScheduledReportsManager {
  
  /**
   * Crea una nueva tarea programada de reportes
   */
  static async createScheduledReport(schedule: Omit<ScheduledReport, 'id' | 'created_at' | 'last_generated'>): Promise<ScheduledReport> {
    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        ...schedule,
        created_at: new Date().toISOString(),
        last_generated: null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Obtiene todas las tareas programadas de una empresa
   */
  static async getScheduledReports(company_id: string): Promise<ScheduledReport[]> {
    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Verifica si es hora de generar reportes automáticos
   */
  static async checkAndGenerateScheduledReports(): Promise<void> {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });

    // Obtener todas las tareas programadas activas
    const { data: scheduledReports, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('is_active', true)
      .eq('schedule_time', currentTime);

    if (error) {
      console.error('Error fetching scheduled reports:', error);
      return;
    }

    for (const schedule of scheduledReports || []) {
      // Verificar si corresponde generar hoy
      const shouldGenerate = schedule.schedule_days.includes('daily') || 
                           schedule.schedule_days.includes(currentDay);

      if (shouldGenerate) {
        // Verificar si ya se generó hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastGenerated = schedule.last_generated ? new Date(schedule.last_generated) : null;
        const alreadyGeneratedToday = lastGenerated && lastGenerated >= today;

        if (!alreadyGeneratedToday) {
          await this.generateScheduledReport(schedule);
        }
      }
    }
  }

  /**
   * Genera un reporte programado específico
   */
  static async generateScheduledReport(schedule: ScheduledReport): Promise<void> {
    try {
      console.log(`Generating scheduled report: ${schedule.report_type} for company ${schedule.company_id}`);

      // Crear registro de reporte generado
      const reportRecord: Omit<GeneratedReport, 'id'> = {
        company_id: schedule.company_id,
        report_type: schedule.report_type,
        report_title: `Reporte ${this.getReportTypeName(schedule.report_type)} - ${new Date().toLocaleDateString()}`,
        generated_at: new Date(),
        period_start: this.getPeriodStart(schedule.report_config.period),
        period_end: this.getPeriodEnd(schedule.report_config.period),
        status: 'generating',
        metadata: {
          reportId: `AUTO-${Date.now().toString().slice(-8)}`,
          reportType: schedule.report_type as any,
          title: `Reporte Automático - ${this.getReportTypeName(schedule.report_type)}`,
          period: schedule.report_config.period,
          dateRange: {
            startDate: this.getPeriodStart(schedule.report_config.period),
            endDate: this.getPeriodEnd(schedule.report_config.period)
          },
          generatedAt: new Date(),
          generatedBy: 'Sistema Automático',
          companyName: 'Mi Empresa' // TODO: Get from company data
        }
      };

      const { data: reportData, error: insertError } = await supabase
        .from('generated_reports')
        .insert(reportRecord)
        .select()
        .single();

      if (insertError) throw insertError;

      // Aquí normalmente generarías y subirías el PDF a un storage
      // Por ahora, simplemente marcamos como completado
      await supabase
        .from('generated_reports')
        .update({ 
          status: 'completed',
          pdf_url: `reports/${reportData.id}.pdf` // URL ficticia
        })
        .eq('id', reportData.id);

      // Actualizar la fecha de última generación
      await supabase
        .from('scheduled_reports')
        .update({ last_generated: new Date().toISOString() })
        .eq('id', schedule.id);

      // TODO: Enviar notificaciones por email a los recipients
      await this.sendReportNotifications(schedule, reportData);

    } catch (error) {
      console.error('Error generating scheduled report:', error);
      
      // Marcar como fallido si hay un error
      await supabase
        .from('generated_reports')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Error desconocido'
        })
        .eq('company_id', schedule.company_id)
        .eq('status', 'generating');
    }
  }

  /**
   * Envía notificaciones de reportes generados
   */
  static async sendReportNotifications(schedule: ScheduledReport, report: GeneratedReport): Promise<void> {
    // TODO: Implementar envío de emails
    console.log(`Sending notifications for report ${report.id} to:`, schedule.report_config.email_recipients);
    
    // Por ahora, crear notificaciones en la base de datos
    for (const email of schedule.report_config.email_recipients) {
      await supabase
        .from('notifications')
        .insert({
          company_id: schedule.company_id,
          type: 'report_generated',
          title: 'Reporte Automático Generado',
          message: `Se ha generado el reporte ${report.report_title}`,
          data: {
            report_id: report.id,
            report_type: report.report_type,
            generated_at: report.generated_at
          },
          recipient_email: email,
          created_at: new Date().toISOString()
        });
    }
  }

  /**
   * Obtiene el historial de reportes generados
   */
  static async getGeneratedReports(company_id: string, limit: number = 50): Promise<GeneratedReport[]> {
    const { data, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('company_id', company_id)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Descarga un reporte generado previamente
   */
  static async downloadGeneratedReport(reportId: string): Promise<void> {
    const { data: report, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) throw error;

    if (report.pdf_url) {
      // TODO: Descargar desde storage
      console.log(`Downloading report from: ${report.pdf_url}`);
    } else {
      throw new Error('PDF no disponible para este reporte');
    }
  }

  // Métodos auxiliares
  private static getReportTypeName(type: string): string {
    const names = {
      'sales': 'Ventas',
      'profitability': 'Rentabilidad',
      'inventory': 'Inventario',
      'comprehensive': 'Integral'
    };
    return names[type as keyof typeof names] || type;
  }

  private static getPeriodStart(period: PeriodType): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        return today;
      case 'yesterday':
        return new Date(today.getTime() - 24 * 60 * 60 * 1000);
      case 'thisMonth':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return today;
    }
  }

  private static getPeriodEnd(period: PeriodType): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        return new Date(today.getTime() + 24 * 60 * 60 * 1000);
      case 'yesterday':
        return today;
      case 'thisMonth':
        return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      default:
        return new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}

/**
 * Función principal para configurar el reporte diario automático a las 6 PM
 */
export async function setupDailyReports(company_id: string, email_recipients: string[]): Promise<void> {
  try {
    // Crear reporte de ventas diario
    await ScheduledReportsManager.createScheduledReport({
      company_id,
      report_type: 'sales',
      schedule_time: '18:00', // 6 PM
      schedule_days: ['daily'],
      is_active: true,
      report_config: {
        period: 'today',
        email_recipients
      }
    });

    console.log('Daily reports configured successfully for company:', company_id);
  } catch (error) {
    console.error('Error setting up daily reports:', error);
    throw error;
  }
}

/**
 * Hook para verificar reportes programados (se ejecutaría cada minuto)
 */
export function startScheduledReportsChecker(): void {
  // Verificar cada minuto si hay reportes para generar
  setInterval(async () => {
    await ScheduledReportsManager.checkAndGenerateScheduledReports();
  }, 60000); // 60 segundos

  console.log('Scheduled reports checker started');
}
