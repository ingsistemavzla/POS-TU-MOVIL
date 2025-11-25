-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.krece_financing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.krece_accounts_receivable ENABLE ROW LEVEL SECURITY;

-- Políticas para sale_payments
CREATE POLICY "Users can view sale payments for their company" ON public.sale_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales s
      JOIN users u ON u.company_id = s.company_id
      WHERE s.id = sale_payments.sale_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sale payments for their company" ON public.sale_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s
      JOIN users u ON u.company_id = s.company_id
      WHERE s.id = sale_payments.sale_id
        AND u.id = auth.uid()
    )
  );

-- Políticas para krece_financing
CREATE POLICY "Users can view krece financing for their company" ON public.krece_financing
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales s
      JOIN users u ON u.company_id = s.company_id
      WHERE s.id = krece_financing.sale_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert krece financing for their company" ON public.krece_financing
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s
      JOIN users u ON u.company_id = s.company_id
      WHERE s.id = krece_financing.sale_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can update krece financing for their company" ON public.krece_financing
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sales s
      JOIN users u ON u.company_id = s.company_id
      WHERE s.id = krece_financing.sale_id
        AND u.id = auth.uid()
    )
  );

-- Políticas para krece_accounts_receivable
CREATE POLICY "Users can view krece accounts receivable for their company" ON public.krece_accounts_receivable
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert krece accounts receivable for their company" ON public.krece_accounts_receivable
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update krece accounts receivable for their company" ON public.krece_accounts_receivable
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );









