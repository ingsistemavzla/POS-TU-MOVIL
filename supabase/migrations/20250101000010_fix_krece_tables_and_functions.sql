-- Fix Krece tables and functions
-- Migration: 20250101000010_fix_krece_tables_and_functions.sql

-- 1. Asegurar que las columnas de Krece existan en la tabla sales
DO $$ 
BEGIN
    -- Agregar columnas de Krece si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'krece_enabled') THEN
        ALTER TABLE public.sales ADD COLUMN krece_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'krece_financed_amount_usd') THEN
        ALTER TABLE public.sales ADD COLUMN krece_financed_amount_usd NUMERIC(12,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'krece_initial_amount_usd') THEN
        ALTER TABLE public.sales ADD COLUMN krece_initial_amount_usd NUMERIC(12,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'krece_initial_percentage') THEN
        ALTER TABLE public.sales ADD COLUMN krece_initial_percentage NUMERIC(5,2) DEFAULT 0;
    END IF;
END $$;

-- 2. Crear tabla krece_financing si no existe
CREATE TABLE IF NOT EXISTS public.krece_financing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  company_id uuid NOT NULL,
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
  CONSTRAINT krece_financing_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT krece_financing_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- 3. Crear tabla krece_accounts_receivable si no existe
CREATE TABLE IF NOT EXISTS public.krece_accounts_receivable (
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

-- 4. Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_krece_financing_sale_id ON public.krece_financing(sale_id);
CREATE INDEX IF NOT EXISTS idx_krece_financing_customer_id ON public.krece_financing(customer_id);
CREATE INDEX IF NOT EXISTS idx_krece_financing_company_id ON public.krece_financing(company_id);
CREATE INDEX IF NOT EXISTS idx_krece_financing_status ON public.krece_financing(status);
CREATE INDEX IF NOT EXISTS idx_krece_financing_due_date ON public.krece_financing(due_date);

CREATE INDEX IF NOT EXISTS idx_krece_accounts_receivable_company_id ON public.krece_accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_krece_accounts_receivable_krece_financing_id ON public.krece_accounts_receivable(krece_financing_id);
CREATE INDEX IF NOT EXISTS idx_krece_accounts_receivable_customer_id ON public.krece_accounts_receivable(customer_id);
CREATE INDEX IF NOT EXISTS idx_krece_accounts_receivable_status ON public.krece_accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_krece_accounts_receivable_payment_date ON public.krece_accounts_receivable(payment_date);

-- 5. Recrear la función get_krece_accounts_summary
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

-- 6. Función para crear automáticamente cuentas por cobrar cuando se crea un financiamiento
CREATE OR REPLACE FUNCTION public.create_krece_accounts_from_financing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Crear cuenta por cobrar automáticamente
  INSERT INTO public.krece_accounts_receivable (
    company_id,
    krece_financing_id,
    customer_id,
    amount_usd,
    amount_bs,
    bcv_rate,
    status,
    payment_date
  )
  SELECT 
    NEW.company_id,
    NEW.id,
    NEW.customer_id,
    NEW.financed_amount_usd,
    NEW.financed_amount_usd * (SELECT COALESCE(rate, 1) FROM bcv_rates ORDER BY created_at DESC LIMIT 1),
    (SELECT COALESCE(rate, 1) FROM bcv_rates ORDER BY created_at DESC LIMIT 1),
    'pending',
    NEW.due_date
  WHERE NEW.status = 'active';
  
  RETURN NEW;
END;
$$;

-- 7. Crear trigger para crear cuentas por cobrar automáticamente
DROP TRIGGER IF EXISTS trigger_create_krece_accounts ON public.krece_financing;
CREATE TRIGGER trigger_create_krece_accounts
  AFTER INSERT ON public.krece_financing
  FOR EACH ROW
  EXECUTE FUNCTION public.create_krece_accounts_from_financing();

-- 8. Función para actualizar ventas con información de Krece
CREATE OR REPLACE FUNCTION public.update_sale_krece_info(
  p_sale_id uuid,
  p_krece_enabled boolean,
  p_krece_financed_amount_usd numeric,
  p_krece_initial_amount_usd numeric,
  p_krece_initial_percentage numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sales 
  SET 
    krece_enabled = p_krece_enabled,
    krece_financed_amount_usd = p_krece_financed_amount_usd,
    krece_initial_amount_usd = p_krece_initial_amount_usd,
    krece_initial_percentage = p_krece_initial_percentage,
    updated_at = now()
  WHERE id = p_sale_id;
  
  RETURN FOUND;
END;
$$;



