-- Migración para sistema de cierre de caja profesional
-- Crear tablas para turnos, cierres de caja y auditoría

-- 1. Tabla de turnos de trabajo
CREATE TABLE IF NOT EXISTS public.work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Información del turno
  shift_start timestamptz NOT NULL DEFAULT now(),
  shift_end timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  
  -- Montos de inicio
  opening_cash_bs decimal(12,2) NOT NULL DEFAULT 0,
  opening_cash_usd decimal(12,2) NOT NULL DEFAULT 0,
  opening_notes text,
  
  -- Montos de cierre
  closing_cash_bs decimal(12,2),
  closing_cash_usd decimal(12,2),
  closing_notes text,
  
  -- Diferencias encontradas
  cash_difference_bs decimal(12,2) DEFAULT 0,
  cash_difference_usd decimal(12,2) DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabla de cierres de caja detallados
CREATE TABLE IF NOT EXISTS public.cash_register_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_shift_id uuid NOT NULL REFERENCES public.work_shifts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Información del cierre
  closure_date timestamptz NOT NULL DEFAULT now(),
  
  -- Ventas del turno
  total_sales_bs decimal(12,2) NOT NULL DEFAULT 0,
  total_sales_usd decimal(12,2) NOT NULL DEFAULT 0,
  total_transactions integer NOT NULL DEFAULT 0,
  
  -- Desglose por método de pago
  cash_sales_bs decimal(12,2) NOT NULL DEFAULT 0,
  cash_sales_usd decimal(12,2) NOT NULL DEFAULT 0,
  card_sales_bs decimal(12,2) NOT NULL DEFAULT 0,
  card_sales_usd decimal(12,2) NOT NULL DEFAULT 0,
  transfer_sales_bs decimal(12,2) NOT NULL DEFAULT 0,
  transfer_sales_usd decimal(12,2) NOT NULL DEFAULT 0,
  other_sales_bs decimal(12,2) NOT NULL DEFAULT 0,
  other_sales_usd decimal(12,2) NOT NULL DEFAULT 0,
  
  -- Efectivo esperado vs contado
  expected_cash_bs decimal(12,2) NOT NULL DEFAULT 0,
  expected_cash_usd decimal(12,2) NOT NULL DEFAULT 0,
  counted_cash_bs decimal(12,2) NOT NULL DEFAULT 0,
  counted_cash_usd decimal(12,2) NOT NULL DEFAULT 0,
  
  -- Diferencias y ajustes
  cash_difference_bs decimal(12,2) NOT NULL DEFAULT 0,
  cash_difference_usd decimal(12,2) NOT NULL DEFAULT 0,
  
  -- Billetes y monedas contadas
  cash_breakdown_bs jsonb DEFAULT '{}',
  cash_breakdown_usd jsonb DEFAULT '{}',
  
  -- Observaciones y notas
  notes text,
  discrepancy_reason text,
  
  -- Auditoría
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  approved boolean DEFAULT false,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Tabla de auditoría de movimientos de efectivo
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_shift_id uuid REFERENCES public.work_shifts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Tipo de movimiento
  movement_type text NOT NULL CHECK (movement_type IN ('opening', 'sale', 'return', 'adjustment', 'withdrawal', 'deposit')),
  
  -- Montos
  amount_bs decimal(12,2) NOT NULL DEFAULT 0,
  amount_usd decimal(12,2) NOT NULL DEFAULT 0,
  
  -- Referencia
  reference_type text, -- 'sale', 'manual', 'system'
  reference_id uuid, -- ID de la venta u otra referencia
  
  -- Descripción y notas
  description text NOT NULL,
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS work_shifts_company_id_idx ON public.work_shifts(company_id);
CREATE INDEX IF NOT EXISTS work_shifts_store_id_idx ON public.work_shifts(store_id);
CREATE INDEX IF NOT EXISTS work_shifts_user_id_idx ON public.work_shifts(user_id);
CREATE INDEX IF NOT EXISTS work_shifts_status_idx ON public.work_shifts(status);
CREATE INDEX IF NOT EXISTS work_shifts_shift_start_idx ON public.work_shifts(shift_start);

CREATE INDEX IF NOT EXISTS cash_register_closures_work_shift_id_idx ON public.cash_register_closures(work_shift_id);
CREATE INDEX IF NOT EXISTS cash_register_closures_company_id_idx ON public.cash_register_closures(company_id);
CREATE INDEX IF NOT EXISTS cash_register_closures_store_id_idx ON public.cash_register_closures(store_id);
CREATE INDEX IF NOT EXISTS cash_register_closures_closure_date_idx ON public.cash_register_closures(closure_date);

CREATE INDEX IF NOT EXISTS cash_movements_work_shift_id_idx ON public.cash_movements(work_shift_id);
CREATE INDEX IF NOT EXISTS cash_movements_company_id_idx ON public.cash_movements(company_id);
CREATE INDEX IF NOT EXISTS cash_movements_store_id_idx ON public.cash_movements(store_id);
CREATE INDEX IF NOT EXISTS cash_movements_movement_type_idx ON public.cash_movements(movement_type);

-- Trigger para actualizar updated_at en work_shifts
CREATE OR REPLACE FUNCTION update_work_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_shifts_updated_at_trigger
  BEFORE UPDATE ON public.work_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_work_shifts_updated_at();

-- RLS (Row Level Security) para todas las tablas
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para work_shifts
CREATE POLICY "Users can view work_shifts from their company" ON public.work_shifts
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert work_shifts for their company" ON public.work_shifts
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update their own work_shifts" ON public.work_shifts
  FOR UPDATE USING (company_id = public.get_user_company_id() AND user_id = public.get_user_id());

-- Políticas de seguridad para cash_register_closures
CREATE POLICY "Users can view closures from their company" ON public.cash_register_closures
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert closures for their company" ON public.cash_register_closures
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update their own closures" ON public.cash_register_closures
  FOR UPDATE USING (company_id = public.get_user_company_id() AND user_id = public.get_user_id());

-- Políticas de seguridad para cash_movements
CREATE POLICY "Users can view movements from their company" ON public.cash_movements
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert movements for their company" ON public.cash_movements
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

-- Función para obtener el turno activo de un usuario
CREATE OR REPLACE FUNCTION public.get_active_work_shift(p_user_id uuid, p_store_id uuid)
RETURNS TABLE (
  shift_id uuid,
  shift_start timestamptz,
  opening_cash_bs decimal,
  opening_cash_usd decimal,
  opening_notes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.id,
    ws.shift_start,
    ws.opening_cash_bs,
    ws.opening_cash_usd,
    ws.opening_notes
  FROM public.work_shifts ws
  WHERE ws.user_id = p_user_id 
    AND ws.store_id = p_store_id
    AND ws.status = 'open'
    AND ws.company_id = public.get_user_company_id()
  ORDER BY ws.shift_start DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de ventas del turno
CREATE OR REPLACE FUNCTION public.get_shift_sales_stats(p_work_shift_id uuid)
RETURNS TABLE (
  total_sales_bs decimal,
  total_sales_usd decimal,
  total_transactions integer,
  cash_sales_bs decimal,
  cash_sales_usd decimal,
  card_sales_bs decimal,
  card_sales_usd decimal,
  transfer_sales_bs decimal,
  transfer_sales_usd decimal,
  other_sales_bs decimal,
  other_sales_usd decimal
) AS $$
DECLARE
  v_shift_start timestamptz;
  v_store_id uuid;
  v_company_id uuid;
BEGIN
  -- Obtener información del turno
  SELECT ws.shift_start, ws.store_id, ws.company_id
  INTO v_shift_start, v_store_id, v_company_id
  FROM public.work_shifts ws
  WHERE ws.id = p_work_shift_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work shift not found';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.total_bs), 0) as total_sales_bs,
    COALESCE(SUM(s.total_usd), 0) as total_sales_usd,
    COUNT(s.id)::integer as total_transactions,
    COALESCE(SUM(CASE WHEN s.payment_method = 'cash' THEN s.total_bs ELSE 0 END), 0) as cash_sales_bs,
    COALESCE(SUM(CASE WHEN s.payment_method = 'cash' THEN s.total_usd ELSE 0 END), 0) as cash_sales_usd,
    COALESCE(SUM(CASE WHEN s.payment_method = 'card' THEN s.total_bs ELSE 0 END), 0) as card_sales_bs,
    COALESCE(SUM(CASE WHEN s.payment_method = 'card' THEN s.total_usd ELSE 0 END), 0) as card_sales_usd,
    COALESCE(SUM(CASE WHEN s.payment_method = 'transfer' THEN s.total_bs ELSE 0 END), 0) as transfer_sales_bs,
    COALESCE(SUM(CASE WHEN s.payment_method = 'transfer' THEN s.total_usd ELSE 0 END), 0) as transfer_sales_usd,
    COALESCE(SUM(CASE WHEN s.payment_method NOT IN ('cash', 'card', 'transfer') THEN s.total_bs ELSE 0 END), 0) as other_sales_bs,
    COALESCE(SUM(CASE WHEN s.payment_method NOT IN ('cash', 'card', 'transfer') THEN s.total_usd ELSE 0 END), 0) as other_sales_usd
  FROM public.sales s
  WHERE s.store_id = v_store_id
    AND s.company_id = v_company_id
    AND s.created_at >= v_shift_start
    AND s.created_at < COALESCE((
      SELECT ws2.shift_end 
      FROM public.work_shifts ws2 
      WHERE ws2.id = p_work_shift_id
    ), now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
