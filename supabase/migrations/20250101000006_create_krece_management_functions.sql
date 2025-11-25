-- Función para obtener estadísticas de cuentas por cobrar a Krece
CREATE OR REPLACE FUNCTION public.get_krece_accounts_summary(p_company_id uuid)
RETURNS TABLE (
  total_pending_usd numeric,
  total_pending_bs numeric,
  total_paid_usd numeric,
  total_paid_bs numeric,
  total_overdue_usd numeric,
  total_overdue_bs numeric,
  count_pending integer,
  count_paid integer,
  count_overdue integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_usd ELSE 0 END), 0) as total_pending_usd,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_bs ELSE 0 END), 0) as total_pending_bs,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_usd ELSE 0 END), 0) as total_paid_usd,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_bs ELSE 0 END), 0) as total_paid_bs,
    COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount_usd ELSE 0 END), 0) as total_overdue_usd,
    COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount_bs ELSE 0 END), 0) as total_overdue_bs,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as count_pending,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as count_paid,
    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as count_overdue
  FROM krece_accounts_receivable
  WHERE company_id = p_company_id;
END;
$$;

-- Función para marcar cuenta por cobrar como pagada
CREATE OR REPLACE FUNCTION public.mark_krece_account_paid(
  p_account_id uuid,
  p_payment_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE krece_accounts_receivable 
  SET status = 'paid',
      payment_date = p_payment_date,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_account_id;
  
  -- Actualizar el estado del financiamiento si todas las cuentas están pagadas
  UPDATE krece_financing 
  SET status = 'paid',
      updated_at = now()
  WHERE id = (
    SELECT krece_financing_id 
    FROM krece_accounts_receivable 
    WHERE id = p_account_id
  )
  AND NOT EXISTS (
    SELECT 1 
    FROM krece_accounts_receivable 
    WHERE krece_financing_id = krece_financing.id 
      AND status != 'paid'
  );
  
  RETURN FOUND;
END;
$$;

-- Función para marcar cuentas vencidas como overdue
CREATE OR REPLACE FUNCTION public.update_overdue_krece_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE krece_accounts_receivable 
  SET status = 'overdue',
      updated_at = now()
  WHERE status = 'pending' 
    AND payment_date IS NOT NULL 
    AND payment_date < CURRENT_DATE;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- Trigger para actualizar automáticamente cuentas vencidas
CREATE OR REPLACE FUNCTION public.trigger_update_overdue_krece_accounts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.update_overdue_krece_accounts();
  RETURN NEW;
END;
$$;

-- Crear trigger que se ejecuta diariamente
CREATE TRIGGER update_overdue_krece_accounts_trigger
  AFTER INSERT OR UPDATE ON krece_accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_overdue_krece_accounts();









