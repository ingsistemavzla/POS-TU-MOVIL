-- Fix Krece sale logic - Register only initial payment in sale but keep full total for invoice
-- Migration: 20250101000011_fix_krece_sale_logic.sql

-- Modificar la función process_sale para implementar la lógica correcta de Krece
CREATE OR REPLACE FUNCTION public.process_sale(
  p_company_id uuid,
  p_store_id uuid,
  p_cashier_id uuid,
  p_customer_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
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
  p_is_mixed_payment boolean DEFAULT false,
  p_mixed_payments jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id uuid;
  v_item record;
  v_total_usd numeric := 0;
  v_subtotal_usd numeric := 0;
  v_tax_amount_usd numeric := 0;
  v_total_bs numeric := 0;
  v_invoice_number text;
  v_payment record;
  v_krece_financing_id uuid;
  v_actual_payment_usd numeric := 0;
  v_actual_payment_bs numeric := 0;
BEGIN
  -- Validar que la tienda existe y está activa
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = p_store_id AND company_id = p_company_id AND active = true) THEN
    RAISE EXCEPTION 'Tienda no encontrada o inactiva';
  END IF;

  -- Validar que el cajero existe y está activo
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_cashier_id AND company_id = p_company_id AND active = true) THEN
    RAISE EXCEPTION 'Cajero no encontrado o inactivo';
  END IF;

  -- Calcular totales completos (para la factura)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal_usd := v_subtotal_usd + ((v_item->>'qty')::numeric * (v_item->>'price_usd')::numeric);
  END LOOP;

  v_tax_amount_usd := v_subtotal_usd * p_tax_rate;
  v_total_usd := v_subtotal_usd + v_tax_amount_usd;
  v_total_bs := v_total_usd * p_bcv_rate;

  -- Determinar el monto real que ingresa a la tienda
  IF p_krece_enabled THEN
    -- Con Krece: solo la inicial ingresa a la tienda
    v_actual_payment_usd := p_krece_initial_amount_usd;
    v_actual_payment_bs := p_krece_initial_amount_usd * p_bcv_rate;
  ELSE
    -- Sin Krece: todo el monto ingresa a la tienda
    v_actual_payment_usd := v_total_usd;
    v_actual_payment_bs := v_total_bs;
  END IF;

  -- Generar número de factura
  SELECT 'FAC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 16) AS INTEGER)), 0) + 1)::text, 4, '0')
  INTO v_invoice_number
  FROM sales 
  WHERE company_id = p_company_id 
    AND DATE(created_at) = CURRENT_DATE;

  -- Crear la venta con el monto real que ingresa a la tienda
  INSERT INTO sales (
    company_id, store_id, customer_id, cashier_id, 
    total_usd, total_bs,  -- Estos campos contienen el monto REAL que ingresa a la tienda
    bcv_rate_used, payment_method, customer_name, customer_id_number,
    subtotal_usd, tax_rate, tax_amount_usd, notes, invoice_number,
    krece_enabled, krece_initial_amount_usd, krece_financed_amount_usd, 
    krece_initial_percentage, is_mixed_payment,
    -- Nuevos campos para mantener el total completo de la factura
    invoice_total_usd, invoice_total_bs
  ) VALUES (
    p_company_id, p_store_id, p_customer_id, p_cashier_id, 
    v_actual_payment_usd, v_actual_payment_bs,  -- Solo lo que realmente ingresa
    p_bcv_rate, p_payment_method, p_customer_name, p_customer_id_number,
    v_subtotal_usd, p_tax_rate, v_tax_amount_usd, p_notes, v_invoice_number,
    p_krece_enabled, p_krece_initial_amount_usd, p_krece_financed_amount_usd,
    p_krece_initial_percentage, p_is_mixed_payment,
    v_total_usd, v_total_bs  -- Total completo para la factura
  ) RETURNING id INTO v_sale_id;

  -- Insertar items de la venta
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items (
      sale_id, product_id, qty, price_usd, subtotal_usd, product_name, product_sku
    ) VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'qty')::integer,
      (v_item->>'price_usd')::numeric,
      ((v_item->>'qty')::numeric * (v_item->>'price_usd')::numeric),
      v_item->>'product_name',
      v_item->>'product_sku'
    );

    -- Actualizar inventario
    UPDATE inventories 
    SET qty = qty - (v_item->>'qty')::integer,
        updated_at = now()
    WHERE product_id = (v_item->>'product_id')::uuid 
      AND store_id = p_store_id 
      AND company_id = p_company_id;
  END LOOP;

  -- Si es pago mixto, insertar los pagos individuales
  IF p_is_mixed_payment AND p_mixed_payments IS NOT NULL THEN
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_mixed_payments)
    LOOP
      INSERT INTO sale_payments (
        sale_id, payment_method, amount_usd, amount_bs
      ) VALUES (
        v_sale_id,
        v_payment->>'method',
        (v_payment->>'amount')::numeric,
        ((v_payment->>'amount')::numeric * p_bcv_rate)
      );
    END LOOP;
  END IF;

  -- Si es Krece, crear el registro de financiamiento
  IF p_krece_enabled AND p_customer_id IS NOT NULL THEN
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

-- Agregar las nuevas columnas a la tabla sales si no existen
DO $$ 
BEGIN
    -- Agregar columnas para el total completo de la factura
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'invoice_total_usd') THEN
        ALTER TABLE public.sales ADD COLUMN invoice_total_usd NUMERIC(12,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'invoice_total_bs') THEN
        ALTER TABLE public.sales ADD COLUMN invoice_total_bs NUMERIC(15,2) DEFAULT 0;
    END IF;
END $$;

-- Actualizar las ventas existentes para que invoice_total sea igual al total actual
UPDATE sales 
SET invoice_total_usd = total_usd, 
    invoice_total_bs = total_bs 
WHERE invoice_total_usd = 0 OR invoice_total_usd IS NULL;

-- Crear función para obtener el total de la factura (para mostrar en la factura)
CREATE OR REPLACE FUNCTION public.get_invoice_total(p_sale_id uuid)
RETURNS TABLE (
  invoice_total_usd numeric,
  invoice_total_bs numeric,
  actual_payment_usd numeric,
  actual_payment_bs numeric,
  krece_enabled boolean,
  krece_financed_amount_usd numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.invoice_total_usd, s.total_usd) as invoice_total_usd,
    COALESCE(s.invoice_total_bs, s.total_bs) as invoice_total_bs,
    s.total_usd as actual_payment_usd,
    s.total_bs as actual_payment_bs,
    s.krece_enabled,
    s.krece_financed_amount_usd
  FROM sales s
  WHERE s.id = p_sale_id;
END;
$$;



