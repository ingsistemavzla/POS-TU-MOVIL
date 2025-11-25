import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ScheduledReport, GeneratedReport, ScheduledReportsManager } from '@/utils/scheduledReports';

export interface ReportsStats {
  totalScheduled: number;
  activeScheduled: number;
  totalGenerated: number;
  generatedToday: number;
  failedReports: number;
}

export function useScheduledReports() {
  const { userProfile } = useAuth();
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [stats, setStats] = useState<ReportsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScheduledReports = async () => {
    if (!userProfile?.company_id) return;

    try {
      const reports = await ScheduledReportsManager.getScheduledReports(userProfile.company_id);
      setScheduledReports(reports);
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar reportes programados');
    }
  };

  const fetchGeneratedReports = async () => {
    if (!userProfile?.company_id) return;

    try {
      const reports = await ScheduledReportsManager.getGeneratedReports(userProfile.company_id, 20);
      setGeneratedReports(reports);
    } catch (error) {
      console.error('Error fetching generated reports:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar reportes generados');
    }
  };

  const fetchStats = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase.rpc('get_reports_stats', {
        p_company_id: userProfile.company_id
      });

      if (error) throw error;

      setStats({
        totalScheduled: data.total_scheduled,
        activeScheduled: data.active_scheduled,
        totalGenerated: data.total_generated,
        generatedToday: data.generated_today,
        failedReports: data.failed_reports
      });
    } catch (error) {
      console.error('Error fetching reports stats:', error);
    }
  };

  const createScheduledReport = async (
    reportType: 'sales' | 'profitability' | 'inventory',
    scheduleTime: string,
    scheduleDays: string[],
    emailRecipients: string[]
  ) => {
    if (!userProfile?.company_id) throw new Error('No company ID available');

    try {
      const newReport = await ScheduledReportsManager.createScheduledReport({
        company_id: userProfile.company_id,
        report_type: reportType,
        schedule_time: scheduleTime,
        schedule_days: scheduleDays,
        is_active: true,
        report_config: {
          period: 'today',
          email_recipients: emailRecipients
        }
      });

      setScheduledReports(prev => [...prev, newReport]);
      await fetchStats();
      
      return newReport;
    } catch (error) {
      console.error('Error creating scheduled report:', error);
      throw error;
    }
  };

  const toggleScheduledReport = async (reportId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: isActive })
        .eq('id', reportId);

      if (error) throw error;

      setScheduledReports(prev =>
        prev.map(report =>
          report.id === reportId ? { ...report, is_active: isActive } : report
        )
      );

      await fetchStats();
    } catch (error) {
      console.error('Error toggling scheduled report:', error);
      throw error;
    }
  };

  const deleteScheduledReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setScheduledReports(prev => prev.filter(report => report.id !== reportId));
      await fetchStats();
    } catch (error) {
      console.error('Error deleting scheduled report:', error);
      throw error;
    }
  };

  const downloadGeneratedReport = async (reportId: string) => {
    try {
      await ScheduledReportsManager.downloadGeneratedReport(reportId);
      
      // Incrementar contador de descargas
      await supabase
        .from('generated_reports')
        .update({ download_count: supabase.raw('download_count + 1') })
        .eq('id', reportId);

      await fetchGeneratedReports();
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  };

  const setupDailyReports = async (emailRecipients: string[]) => {
    if (!userProfile?.company_id) throw new Error('No company ID available');

    try {
      // Crear reporte de ventas diario a las 6 PM
      await createScheduledReport('sales', '18:00', ['daily'], emailRecipients);
      
      return true;
    } catch (error) {
      console.error('Error setting up daily reports:', error);
      throw error;
    }
  };

  const fetchAllData = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        fetchScheduledReports(),
        fetchGeneratedReports(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching reports data:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar datos de reportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [userProfile?.company_id]);

  return {
    scheduledReports,
    generatedReports,
    stats,
    loading,
    error,
    actions: {
      createScheduledReport,
      toggleScheduledReport,
      deleteScheduledReport,
      downloadGeneratedReport,
      setupDailyReports,
      refresh: fetchAllData
    }
  };
}
