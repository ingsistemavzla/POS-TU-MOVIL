-- Fix Krece tables and functions - Complete solution
-- Migration: 20250101000014_fix_krece_tables_complete.sql

-- 1. CREAR TABLA krece_financing SI NO EXISTE
CREATE TABLE IF NOT EXISTS public.krece_financing (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    total_amount_usd numeric(12,2) NOT NULL,
    initial_amount_usd numeric(12,2) NOT NULL,
    financed_amount_usd numeric(12,2) NOT NULL,
    initial_percentage numeric(5,2) NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    due_date date DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. CREAR TABLA krece_accounts_receivable SI NO EXISTE
CREATE TABLE IF NOT EXISTS public.krece_accounts_receivable (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    krece_financing_id uuid NOT NULL REFERENCES public.krece_financing(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount_usd numeric(12,2) NOT NULL,
    amount_bs numeric(15,2) NOT NULL,
    bcv_rate numeric(10,4) NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    payment_date date DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. AGREGAR COLUMNAS A LA TABLA sales SI NO EXISTEN
DO $$ 
BEGIN
    -- Agregar campo para el método de pago de la inicial
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'krece_initial_payment_method') THEN
        ALTER TABLE public.sales ADD COLUMN krece_initial_payment_method TEXT DEFAULT NULL;
    END IF;
    
    -- Agregar campo para notas del método de pago
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'krece_payment_notes') THEN
        ALTER TABLE public.sales ADD COLUMN krece_payment_notes TEXT DEFAULT NULL;
    END IF;
    
    -- Agregar columnas para el total completo de la factura
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'invoice_total_usd') THEN
        ALTER TABLE public.sales ADD COLUMN invoice_total_usd NUMERIC(12,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'invoice_total_bs') THEN
        ALTER TABLE public.sales ADD COLUMN invoice_total_bs NUMERIC(15,2) DEFAULT 0;
    END IF;
END $$;

-- 4. ACTUALIZAR VENTAS EXISTENTES
UPDATE sales 
SET invoice_total_usd = total_usd, 
    invoice_total_bs = total_bs 
WHERE invoice_total_usd = 0 OR invoice_total_usd IS NULL;

-- 5. CREAR ÍNDICES PARA MEJOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_krece_financing_company_id ON public.krece_financing(company_id);
CREATE INDEX IF NOT EXISTS idx_krece_financing_customer_id ON public.krece_financing(customer_id);
CREATE INDEX IF NOT EXISTS idx_krece_financing_sale_id ON public.krece_financing(sale_id);
CREATE INDEX IF NOT EXISTS idx_krece_accounts_company_id ON public.krece_accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_krece_accounts_financing_id ON public.krece_accounts_receivable(krece_financing_id);

-- 6. ELIMINAR TODAS LAS VERSIONES ANTERIORES DE LA FUNCIÓN
DROP FUNCTION IF EXISTS public.process_sale(uuid, uuid, uuid, uuid, character varying, character varying, numeric, character varying, jsonb, text, numeric);
DROP FUNCTION IF EXISTS public.process_sale(uuid, uuid, uuid, uuid, text, text, numeric, text, jsonb, text, numeric, boolean, numeric, numeric, numeric, boolean, jsonb);
DROP FUNCTION IF EXISTS public.process_sale(uuid, uuid, uuid, uuid, text, text, numeric, text, jsonb, text, numeric, boolean, numeric, numeric, numeric, text, text, boolean, jsonb);

-- 7. CREAR FUNCIÓN process_sale CORREGIDA
CREATE OR REPLACE FUNCTION public.process_sale(
  p_company_id uuid,
  p_store_id uuid,
  p_cashier_id uuid,
  p_customer_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT 'cash_usd',
  p_customer_name text DEFAULT 'Cliente General',
  p_bcv_rate numeric DEFAULT 41.73,
  p_customer_id_number text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_notes text DEFAULT NULL,
  p_tax_rate numeric DEFAULT 0.16,
  p_krece_enabled boolean DEFAULT false,
  p_krece_initial_amount_usd numeric DEFAULT 0,
  p_krece_financed_amount_usd numeric DEFAULT 0,
  p_krece_initial_percentage numeric DEFAULT 0,
  p_krece_initial_payment_method text DEFAULT NULL,
  p_krece_payment_notes text DEFAULT NULL,
  p_is_mixed_payment boolean DEFAULT false,
  p_mixed_payments jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id uuid;
  v_item jsonb;
  v_total_usd numeric := 0;
  v_subtotal_usd numeric := 0;
  v_tax_amount_usd numeric := 0;
  v_total_bs numeric := 0;
  v_invoice_number text;
  v_payment jsonb;
  v_krece_financing_id uuid;
  v_qty integer;
  v_price_usd numeric;
  v_product_id uuid;
  v_product_name text;
  v_product_sku text;
  v_payment_type text;
  v_mixed_payment_total numeric := 0;
  v_clean_customer_id_number text;
  v_clean_payment_method text;
  v_clean_customer_name text;
  v_next_number numeric;
  v_item_qty text;
  v_item_price text;
  v_actual_payment_usd numeric := 0;
  v_actual_payment_bs numeric := 0;
  v_payment_method_to_record text;
BEGIN
  -- LIMPIEZA ULTRA AGRESIVA DE PARÁMETROS
  v_clean_customer_id_number := CASE 
    WHEN p_customer_id_number IS NULL OR p_customer_id_number = '' OR p_customer_id_number = 'null' OR p_customer_id_number = 'undefined' THEN NULL
    ELSE p_customer_id_number
  END;
  
  v_clean_payment_method := CASE 
    WHEN p_payment_method IS NULL OR p_payment_method = '' OR p_payment_method = 'null' OR p_payment_method = 'undefined' THEN 'cash_usd'
    ELSE p_payment_method
  END;
  
  v_clean_customer_name := CASE 
    WHEN p_customer_name IS NULL OR p_customer_name = '' OR p_customer_name = 'null' OR p_customer_name = 'undefined' THEN 'Cliente General'
    ELSE p_customer_name
  END;

  -- VALIDACIONES BÁSICAS
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No hay items para procesar';
  END IF;

  -- DETECTAR TIPO DE PAGO
  IF p_is_mixed_payment AND p_mixed_payments IS NOT NULL AND jsonb_array_length(p_mixed_payments) > 0 THEN
    v_payment_type := 'mixed';
    -- Calcular total de pagos mixtos
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_mixed_payments)
    LOOP
      v_mixed_payment_total := v_mixed_payment_total + COALESCE((v_payment->>'amount')::numeric, 0);
    END LOOP;
  ELSIF p_krece_enabled AND p_customer_id IS NOT NULL THEN
    v_payment_type := 'krece';
  ELSE
    v_payment_type := 'single';
  END IF;

  -- CALCULAR TOTALES CON MANEJO ROBUSTO DE CANTIDADES
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Extraer valores como texto primero
    v_item_qty := v_item->>'qty';
    v_item_price := v_item->>'price_usd';
    
    -- CONVERTIR CANTIDAD DE FORMA ROBUSTA
    v_qty := CASE 
      WHEN v_item_qty IS NULL THEN 1
      WHEN v_item_qty = '' THEN 1
      WHEN v_item_qty = 'null' THEN 1
      WHEN v_item_qty = 'undefined' THEN 1
      WHEN v_item_qty = 'NaN' THEN 1
      WHEN v_item_qty ~ '^[0-9]+$' THEN v_item_qty::integer
      WHEN v_item_qty ~ '^[0-9]+\.?[0-9]*$' THEN FLOOR(v_item_qty::numeric)::integer
      ELSE 1
    END;
    
    -- CONVERTIR PRECIO DE FORMA ROBUSTA
    v_price_usd := CASE 
      WHEN v_item_price IS NULL THEN 0
      WHEN v_item_price = '' THEN 0
      WHEN v_item_price = 'null' THEN 0
      WHEN v_item_price = 'undefined' THEN 0
      WHEN v_item_price = 'NaN' THEN 0
      WHEN v_item_price ~ '^[0-9]+\.?[0-9]*$' THEN v_item_price::numeric
      ELSE 0
    END;
    
    v_subtotal_usd := v_subtotal_usd + (v_qty * v_price_usd);
  END LOOP;

  v_tax_amount_usd := v_subtotal_usd * p_tax_rate;
  v_total_usd := v_subtotal_usd + v_tax_amount_usd;
  v_total_bs := v_total_usd * p_bcv_rate;

  -- DETERMINAR EL MONTO REAL QUE INGRESA A LA TIENDA (LÓGICA KRECE)
  IF p_krece_enabled THEN
    -- Con Krece: solo la inicial ingresa a la tienda
    v_actual_payment_usd := p_krece_initial_amount_usd;
    v_actual_payment_bs := p_krece_initial_amount_usd * p_bcv_rate;
  ELSE
    -- Sin Krece: todo el monto ingresa a la tienda
    v_actual_payment_usd := v_total_usd;
    v_actual_payment_bs := v_total_bs;
  END IF;

  -- DETERMINAR EL MÉTODO DE PAGO A REGISTRAR
  IF p_krece_enabled THEN
    -- Con Krece: usar el método de pago de la inicial
    v_payment_method_to_record := COALESCE(p_krece_initial_payment_method, p_payment_method, 'Krece - Inicial');
  ELSE
    -- Sin Krece: usar el método de pago normal
    v_payment_method_to_record := v_clean_payment_method;
  END IF;

  -- VALIDAR PAGOS MIXTOS
  IF v_payment_type = 'mixed' THEN
    IF ABS(v_mixed_payment_total - v_total_usd) > 0.01 THEN
      RAISE EXCEPTION 'El total de pagos mixtos (' || v_mixed_payment_total::text || ') no coincide con el total de la venta (' || v_total_usd::text || ')';
    END IF;
  END IF;

  -- GENERAR NÚMERO DE FACTURA MANEJANDO CORRECTAMENTE LAS CADENAS VACÍAS
  SELECT COALESCE(
    CASE 
      WHEN MAX(SUBSTRING(invoice_number FROM 16)) IS NULL OR MAX(SUBSTRING(invoice_number FROM 16)) = '' THEN 0
      WHEN MAX(SUBSTRING(invoice_number FROM 16)) ~ '^[0-9]+$' THEN MAX(SUBSTRING(invoice_number FROM 16))::numeric
      ELSE 0
    END, 0
  ) + 1
  INTO v_next_number
  FROM sales 
  WHERE company_id = p_company_id 
    AND DATE(created_at) = CURRENT_DATE;
    
  v_invoice_number := 'FAC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_next_number::text, 4, '0');

  -- CREAR LA VENTA CON EL MONTO REAL QUE INGRESA A LA TIENDA
  INSERT INTO sales (
    company_id, store_id, customer_id, cashier_id, 
    total_usd, total_bs,  -- Estos campos contienen el monto REAL que ingresa a la tienda
    bcv_rate_used, payment_method, customer_name, customer_id_number,
    subtotal_usd, tax_rate, tax_amount_usd, notes, invoice_number,
    krece_enabled, krece_initial_amount_usd, krece_financed_amount_usd, 
    krece_initial_percentage, krece_initial_payment_method, krece_payment_notes,
    is_mixed_payment,
    -- Nuevos campos para mantener el total completo de la factura
    invoice_total_usd, invoice_total_bs
  ) VALUES (
    p_company_id, p_store_id, p_customer_id, p_cashier_id, 
    v_actual_payment_usd, v_actual_payment_bs,  -- Solo lo que realmente ingresa
    p_bcv_rate, v_payment_method_to_record, v_clean_customer_name, v_clean_customer_id_number,
    v_subtotal_usd, p_tax_rate, v_tax_amount_usd, p_notes, v_invoice_number,
    p_krece_enabled, p_krece_initial_amount_usd, p_krece_financed_amount_usd,
    p_krece_initial_percentage, p_krece_initial_payment_method, p_krece_payment_notes,
    p_is_mixed_payment,
    v_total_usd, v_total_bs  -- Total completo para la factura
  ) RETURNING id INTO v_sale_id;

  -- INSERTAR ITEMS DE LA VENTA CON MANEJO ROBUSTO DE CANTIDADES
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    
    -- Extraer valores como texto primero
    v_item_qty := v_item->>'qty';
    v_item_price := v_item->>'price_usd';
    
    -- CONVERTIR CANTIDAD DE FORMA ROBUSTA
    v_qty := CASE 
      WHEN v_item_qty IS NULL THEN 1
      WHEN v_item_qty = '' THEN 1
      WHEN v_item_qty = 'null' THEN 1
      WHEN v_item_qty = 'undefined' THEN 1
      WHEN v_item_qty = 'NaN' THEN 1
      WHEN v_item_qty ~ '^[0-9]+$' THEN v_item_qty::integer
      WHEN v_item_qty ~ '^[0-9]+\.?[0-9]*$' THEN FLOOR(v_item_qty::numeric)::integer
      ELSE 1
    END;
    
    -- CONVERTIR PRECIO DE FORMA ROBUSTA
    v_price_usd := CASE 
      WHEN v_item_price IS NULL THEN 0
      WHEN v_item_price = '' THEN 0
      WHEN v_item_price = 'null' THEN 0
      WHEN v_item_price = 'undefined' THEN 0
      WHEN v_item_price = 'NaN' THEN 0
      WHEN v_item_price ~ '^[0-9]+\.?[0-9]*$' THEN v_item_price::numeric
      ELSE 0
    END;
    
    v_product_name := CASE 
      WHEN (v_item->>'product_name') IS NULL OR (v_item->>'product_name') = '' OR (v_item->>'product_name') = 'null' OR (v_item->>'product_name') = 'undefined' THEN 'Producto sin nombre'
      ELSE v_item->>'product_name'
    END;
    v_product_sku := CASE 
      WHEN (v_item->>'product_sku') IS NULL OR (v_item->>'product_sku') = '' OR (v_item->>'product_sku') = 'null' OR (v_item->>'product_sku') = 'undefined' THEN 'SKU-000'
      ELSE v_item->>'product_sku'
    END;

    INSERT INTO sale_items (
      sale_id, product_id, qty, price_usd, subtotal_usd, product_name, product_sku
    ) VALUES (
      v_sale_id, v_product_id, v_qty, v_price_usd, (v_qty * v_price_usd), v_product_name, v_product_sku
    );

    -- ACTUALIZAR INVENTARIO CON CANTIDAD REAL
    UPDATE inventories 
    SET qty = qty - v_qty, updated_at = now()
    WHERE product_id = v_product_id 
      AND store_id = p_store_id 
      AND company_id = p_company_id;
  END LOOP;

  -- REGISTRAR PAGOS
  CASE v_payment_type
    WHEN 'mixed' THEN
      -- PAGOS MIXTOS
      FOR v_payment IN SELECT * FROM jsonb_array_elements(p_mixed_payments)
      LOOP
        INSERT INTO sale_payments (
          sale_id, payment_method, amount_usd, amount_bs
        ) VALUES (
          v_sale_id,
          CASE 
            WHEN (v_payment->>'method') IS NULL OR (v_payment->>'method') = '' OR (v_payment->>'method') = 'null' OR (v_payment->>'method') = 'undefined' THEN 'unknown'
            ELSE v_payment->>'method'
          END,
          CASE 
            WHEN (v_payment->>'amount') IS NULL OR (v_payment->>'amount') = '' OR (v_payment->>'amount') = 'null' OR (v_payment->>'amount') = 'undefined' THEN 0
            ELSE COALESCE((v_payment->>'amount')::numeric, 0)
          END,
          CASE 
            WHEN (v_payment->>'amount') IS NULL OR (v_payment->>'amount') = '' OR (v_payment->>'amount') = 'null' OR (v_payment->>'amount') = 'undefined' THEN 0
            ELSE COALESCE((v_payment->>'amount')::numeric, 0) * p_bcv_rate
          END
        );
      END LOOP;
      
    WHEN 'single' THEN
      -- PAGO ÚNICO
      INSERT INTO sale_payments (
        sale_id, payment_method, amount_usd, amount_bs
      ) VALUES (
        v_sale_id, v_clean_payment_method, v_total_usd, v_total_bs
      );
      
    WHEN 'krece' THEN
      -- PAGO KRECE - REGISTRAR SOLO LA INICIAL
      INSERT INTO sale_payments (
        sale_id, payment_method, amount_usd, amount_bs
      ) VALUES (
        v_sale_id, v_payment_method_to_record, p_krece_initial_amount_usd, p_krece_initial_amount_usd * p_bcv_rate
      );
  END CASE;

  -- CREAR FINANCIAMIENTO KRECE SI APLICA
  IF v_payment_type = 'krece' AND p_customer_id IS NOT NULL THEN
    INSERT INTO krece_financing (
      sale_id, customer_id, company_id, total_amount_usd, initial_amount_usd, 
      financed_amount_usd, initial_percentage, status, due_date
    ) VALUES (
      v_sale_id, p_customer_id, p_company_id, v_total_usd, p_krece_initial_amount_usd,
      p_krece_financed_amount_usd, p_krece_initial_percentage, 'active',
      CURRENT_DATE + INTERVAL '30 days'  -- Vencimiento en 30 días por defecto
    ) RETURNING id INTO v_krece_financing_id;

    -- Crear cuenta por cobrar a Krece (el monto financiado)
    INSERT INTO krece_accounts_receivable (
      company_id, krece_financing_id, customer_id, amount_usd, 
      amount_bs, bcv_rate, status, payment_date
    ) VALUES (
      p_company_id, v_krece_financing_id, p_customer_id, 
      p_krece_financed_amount_usd, p_krece_financed_amount_usd * p_bcv_rate,
      p_bcv_rate, 'pending', CURRENT_DATE + INTERVAL '30 days'
    );
  END IF;

  RETURN v_sale_id;
END;
$$;

-- 8. CREAR FUNCIONES DE APOYO
CREATE OR REPLACE FUNCTION public.get_krece_payment_method_stats(p_company_id uuid)
RETURNS TABLE (
  payment_method text,
  total_initial_amount_usd numeric,
  total_initial_amount_bs numeric,
  count_sales integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.krece_initial_payment_method, 'No especificado') as payment_method,
    SUM(s.krece_initial_amount_usd) as total_initial_amount_usd,
    SUM(s.krece_initial_amount_usd * s.bcv_rate_used) as total_initial_amount_bs,
    COUNT(*) as count_sales
  FROM sales s
  WHERE s.company_id = p_company_id 
    AND s.krece_enabled = true
  GROUP BY s.krece_initial_payment_method
  ORDER BY total_initial_amount_usd DESC;
END;
$$;

-- 9. CREAR FUNCIÓN PARA OBTENER ESTADÍSTICAS DE KRECE
CREATE OR REPLACE FUNCTION public.get_krece_accounts_summary(p_company_id uuid)
RETURNS TABLE (
  total_financed_usd numeric,
  total_financed_bs numeric,
  total_receivable_usd numeric,
  total_receivable_bs numeric,
  active_financings integer,
  pending_payments integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(kf.financed_amount_usd), 0) as total_financed_usd,
    COALESCE(SUM(kf.financed_amount_usd * s.bcv_rate_used), 0) as total_financed_bs,
    COALESCE(SUM(kar.amount_usd), 0) as total_receivable_usd,
    COALESCE(SUM(kar.amount_bs), 0) as total_receivable_bs,
    COUNT(DISTINCT kf.id) as active_financings,
    COUNT(DISTINCT kar.id) as pending_payments
  FROM krece_financing kf
  JOIN sales s ON kf.sale_id = s.id
  LEFT JOIN krece_accounts_receivable kar ON kf.id = kar.krece_financing_id
  WHERE kf.company_id = p_company_id 
    AND kf.status = 'active'
    AND (kar.status = 'pending' OR kar.status IS NULL);
END;
$$;

-- 10. APLICAR RLS (Row Level Security)
ALTER TABLE public.krece_financing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.krece_accounts_receivable ENABLE ROW LEVEL SECURITY;

-- Políticas para krece_financing
CREATE POLICY "Users can view krece_financing from their company" ON public.krece_financing
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert krece_financing in their company" ON public.krece_financing
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Políticas para krece_accounts_receivable
CREATE POLICY "Users can view krece_accounts_receivable from their company" ON public.krece_accounts_receivable
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert krece_accounts_receivable in their company" ON public.krece_accounts_receivable
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));



