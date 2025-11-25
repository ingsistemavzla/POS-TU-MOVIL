-- Crear sistema de reportes programados
-- Migration: 20250102000002_create_scheduled_reports_system.sql

-- Tabla para reportes programados
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  schedule_time VARCHAR(5) NOT NULL, -- HH:MM format
  schedule_days JSONB NOT NULL DEFAULT '["daily"]', -- Array de días
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated TIMESTAMPTZ,
  report_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para reportes generados
CREATE TABLE public.generated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  report_title VARCHAR(255) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  pdf_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'generating',
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  file_size INTEGER,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para notificaciones de reportes
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  recipient_email VARCHAR(255),
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX idx_scheduled_reports_company_id ON public.scheduled_reports(company_id);
CREATE INDEX idx_scheduled_reports_schedule_time ON public.scheduled_reports(schedule_time) WHERE is_active = true;
CREATE INDEX idx_scheduled_reports_active ON public.scheduled_reports(is_active, schedule_time);

CREATE INDEX idx_generated_reports_company_id ON public.generated_reports(company_id);
CREATE INDEX idx_generated_reports_generated_at ON public.generated_reports(generated_at DESC);
CREATE INDEX idx_generated_reports_status ON public.generated_reports(status);
CREATE INDEX idx_generated_reports_type ON public.generated_reports(report_type);

CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_email);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en scheduled_reports
CREATE TRIGGER update_scheduled_reports_updated_at
    BEFORE UPDATE ON public.scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Row Level Security
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para scheduled_reports
CREATE POLICY "Users can view scheduled reports for their company" ON public.scheduled_reports
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can insert scheduled reports for their company" ON public.scheduled_reports
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update scheduled reports for their company" ON public.scheduled_reports
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can delete scheduled reports for their company" ON public.scheduled_reports
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Políticas RLS para generated_reports
CREATE POLICY "Users can view generated reports for their company" ON public.generated_reports
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "System can insert generated reports" ON public.generated_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update generated reports" ON public.generated_reports
  FOR UPDATE USING (true);

-- Políticas RLS para notifications
CREATE POLICY "Users can view notifications for their company" ON public.notifications
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Función para limpiar reportes antiguos (mantener solo los últimos 90 días)
CREATE OR REPLACE FUNCTION public.cleanup_old_reports()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.generated_reports 
  WHERE generated_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- También limpiar notificaciones antiguas (mantener 30 días)
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de reportes
CREATE OR REPLACE FUNCTION public.get_reports_stats(p_company_id UUID)
RETURNS JSONB AS $$
DECLARE
  total_scheduled INTEGER;
  active_scheduled INTEGER;
  total_generated INTEGER;
  generated_today INTEGER;
  failed_reports INTEGER;
BEGIN
  -- Contar reportes programados
  SELECT COUNT(*) INTO total_scheduled
  FROM public.scheduled_reports
  WHERE company_id = p_company_id;
  
  SELECT COUNT(*) INTO active_scheduled
  FROM public.scheduled_reports
  WHERE company_id = p_company_id AND is_active = true;
  
  -- Contar reportes generados
  SELECT COUNT(*) INTO total_generated
  FROM public.generated_reports
  WHERE company_id = p_company_id;
  
  SELECT COUNT(*) INTO generated_today
  FROM public.generated_reports
  WHERE company_id = p_company_id 
    AND DATE(generated_at) = CURRENT_DATE;
  
  SELECT COUNT(*) INTO failed_reports
  FROM public.generated_reports
  WHERE company_id = p_company_id 
    AND status = 'failed'
    AND generated_at >= CURRENT_DATE - INTERVAL '7 days';
  
  RETURN jsonb_build_object(
    'total_scheduled', total_scheduled,
    'active_scheduled', active_scheduled,
    'total_generated', total_generated,
    'generated_today', generated_today,
    'failed_reports', failed_reports
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios descriptivos
COMMENT ON TABLE public.scheduled_reports IS 'Configuración de reportes programados automáticos';
COMMENT ON TABLE public.generated_reports IS 'Historial de reportes generados';
COMMENT ON TABLE public.notifications IS 'Notificaciones del sistema de reportes';

COMMENT ON COLUMN public.scheduled_reports.schedule_time IS 'Hora de generación en formato HH:MM';
COMMENT ON COLUMN public.scheduled_reports.schedule_days IS 'Días de la semana para generar o ["daily"] para diario';
COMMENT ON COLUMN public.scheduled_reports.report_config IS 'Configuración específica del reporte (período, destinatarios, etc.)';

COMMENT ON COLUMN public.generated_reports.status IS 'Estado: generating, completed, failed';
COMMENT ON COLUMN public.generated_reports.metadata IS 'Metadatos del reporte generado';
COMMENT ON COLUMN public.generated_reports.download_count IS 'Número de veces que se ha descargado';

COMMENT ON FUNCTION public.cleanup_old_reports() IS 'Limpia reportes y notificaciones antiguas';
COMMENT ON FUNCTION public.get_reports_stats(UUID) IS 'Obtiene estadísticas de reportes para una empresa';
