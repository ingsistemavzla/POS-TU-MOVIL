-- Script para verificar y corregir la tabla sale_payments
-- Este script verifica la estructura y agrega las columnas faltantes

-- PASO 1: Verificar si la tabla existe
DO $$
BEGIN
    -- Si la tabla no existe, crearla
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_payments'
    ) THEN
        CREATE TABLE public.sale_payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
            payment_method TEXT NOT NULL,
            amount_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
            amount_bs NUMERIC(15,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabla sale_payments creada';
    ELSE
        RAISE NOTICE 'Tabla sale_payments ya existe';
    END IF;
END $$;

-- PASO 2: Agregar columnas faltantes si no existen
DO $$
BEGIN
    -- Agregar amount_usd si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_payments' 
        AND column_name = 'amount_usd'
    ) THEN
        ALTER TABLE public.sale_payments ADD COLUMN amount_usd NUMERIC(12,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Columna amount_usd agregada';
    END IF;
    
    -- Agregar amount_bs si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_payments' 
        AND column_name = 'amount_bs'
    ) THEN
        ALTER TABLE public.sale_payments ADD COLUMN amount_bs NUMERIC(15,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Columna amount_bs agregada';
    END IF;
    
    -- Agregar payment_method si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_payments' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.sale_payments ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash_usd';
        RAISE NOTICE 'Columna payment_method agregada';
    END IF;
    
    -- Agregar sale_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_payments' 
        AND column_name = 'sale_id'
    ) THEN
        ALTER TABLE public.sale_payments ADD COLUMN sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE;
        RAISE NOTICE 'Columna sale_id agregada';
    END IF;
END $$;

-- PASO 3: Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON public.sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_payment_method ON public.sale_payments(payment_method);

-- PASO 4: Habilitar RLS
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

-- PASO 5: Crear/actualizar políticas RLS
DROP POLICY IF EXISTS "Users can view sale payments for their company" ON public.sale_payments;
CREATE POLICY "Users can view sale payments for their company" ON public.sale_payments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM sales s
        JOIN users u ON u.company_id = s.company_id
        WHERE s.id = sale_payments.sale_id
        AND u.auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert sale payments for their company" ON public.sale_payments;
CREATE POLICY "Users can insert sale payments for their company" ON public.sale_payments
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        JOIN users u ON u.company_id = s.company_id
        WHERE s.id = sale_payments.sale_id
        AND u.auth_user_id = auth.uid()
    )
);

-- PASO 6: Otorgar permisos
GRANT SELECT, INSERT, UPDATE ON public.sale_payments TO authenticated;

-- PASO 7: Verificar estructura final
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sale_payments'
ORDER BY ordinal_position;





