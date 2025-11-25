-- Crear tabla para cuentas por cobrar a Krece
CREATE TABLE public.krece_accounts_receivable (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  krece_financing_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  amount_bs numeric NOT NULL,
  bcv_rate numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  payment_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT krece_accounts_receivable_pkey PRIMARY KEY (id),
  CONSTRAINT krece_accounts_receivable_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT krece_accounts_receivable_krece_financing_id_fkey FOREIGN KEY (krece_financing_id) REFERENCES public.krece_financing(id) ON DELETE CASCADE,
  CONSTRAINT krece_accounts_receivable_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_krece_accounts_receivable_company_id ON public.krece_accounts_receivable(company_id);
CREATE INDEX idx_krece_accounts_receivable_krece_financing_id ON public.krece_accounts_receivable(krece_financing_id);
CREATE INDEX idx_krece_accounts_receivable_customer_id ON public.krece_accounts_receivable(customer_id);
CREATE INDEX idx_krece_accounts_receivable_status ON public.krece_accounts_receivable(status);
CREATE INDEX idx_krece_accounts_receivable_payment_date ON public.krece_accounts_receivable(payment_date);

-- Agregar comentarios
COMMENT ON TABLE public.krece_accounts_receivable IS 'Tabla para gestionar cuentas por cobrar a Krece';
COMMENT ON COLUMN public.krece_accounts_receivable.amount_usd IS 'Monto por cobrar en USD';
COMMENT ON COLUMN public.krece_accounts_receivable.amount_bs IS 'Monto por cobrar en Bs';
COMMENT ON COLUMN public.krece_accounts_receivable.bcv_rate IS 'Tasa BCV al momento del registro';
COMMENT ON COLUMN public.krece_accounts_receivable.status IS 'Estado: pending, paid, overdue';
COMMENT ON COLUMN public.krece_accounts_receivable.payment_date IS 'Fecha cuando Krece paga';









