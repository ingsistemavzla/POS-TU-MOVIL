-- Crear tabla para financiamiento Krece
CREATE TABLE public.krece_financing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  total_amount_usd numeric NOT NULL,
  initial_amount_usd numeric NOT NULL,
  financed_amount_usd numeric NOT NULL,
  initial_percentage numeric NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'defaulted')),
  due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT krece_financing_pkey PRIMARY KEY (id),
  CONSTRAINT krece_financing_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE,
  CONSTRAINT krece_financing_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_krece_financing_sale_id ON public.krece_financing(sale_id);
CREATE INDEX idx_krece_financing_customer_id ON public.krece_financing(customer_id);
CREATE INDEX idx_krece_financing_status ON public.krece_financing(status);
CREATE INDEX idx_krece_financing_due_date ON public.krece_financing(due_date);

-- Agregar comentarios
COMMENT ON TABLE public.krece_financing IS 'Tabla para registrar financiamientos de Krece';
COMMENT ON COLUMN public.krece_financing.total_amount_usd IS 'Monto total de la venta en USD';
COMMENT ON COLUMN public.krece_financing.initial_amount_usd IS 'Monto de la inicial pagada en USD';
COMMENT ON COLUMN public.krece_financing.financed_amount_usd IS 'Monto financiado por Krece en USD';
COMMENT ON COLUMN public.krece_financing.initial_percentage IS 'Porcentaje de la inicial sobre el total';
COMMENT ON COLUMN public.krece_financing.status IS 'Estado del financiamiento: active, paid, defaulted';
COMMENT ON COLUMN public.krece_financing.due_date IS 'Fecha de vencimiento del financiamiento';









