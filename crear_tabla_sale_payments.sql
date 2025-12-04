-- Crear tabla sale_payments si no existe
CREATE TABLE IF NOT EXISTS public.sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL,
    amount_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_bs NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON public.sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_payment_method ON public.sale_payments(payment_method);

-- Habilitar RLS
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (si no existen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sale_payments' 
        AND policyname = 'Users can view sale payments for their company'
    ) THEN
        CREATE POLICY "Users can view sale payments for their company" ON public.sale_payments
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM sales s
                JOIN users u ON u.company_id = s.company_id
                WHERE s.id = sale_payments.sale_id
                AND u.auth_user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sale_payments' 
        AND policyname = 'Users can insert sale payments for their company'
    ) THEN
        CREATE POLICY "Users can insert sale payments for their company" ON public.sale_payments
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM sales s
                JOIN users u ON u.company_id = s.company_id
                WHERE s.id = sale_payments.sale_id
                AND u.auth_user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.sale_payments TO authenticated;

-- Comentarios
COMMENT ON TABLE public.sale_payments IS 'Registra los métodos de pago utilizados en cada venta';
COMMENT ON COLUMN public.sale_payments.amount_usd IS 'Monto pagado en USD';
COMMENT ON COLUMN public.sale_payments.amount_bs IS 'Monto pagado en Bs (calculado con tasa BCV)';





