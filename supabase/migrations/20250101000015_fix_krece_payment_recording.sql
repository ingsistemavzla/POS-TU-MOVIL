-- Fix Krece payment recording - Minimal change
-- Migration: 20250101000015_fix_krece_payment_recording.sql

-- Esta migración modifica SOLO la lógica de registro de pagos para Krece
-- sin tocar ninguna otra parte de la función process_sale

-- 1. ELIMINAR SOLO LA FUNCIÓN ACTUAL
DROP FUNCTION IF EXISTS public.process_sale(uuid, uuid, uuid, uuid, text, text, numeric, text, jsonb, text, numeric, boolean, numeric, numeric, numeric, boolean, jsonb);

-- 2. RECREAR LA FUNCIÓN CON SOLO EL CAMBIO EN LA SECCIÓN DE PAGOS KRECE
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

  -- CREAR LA VENTA (MANTENER LÓGICA ORIGINAL)
  INSERT INTO sales (
    company_id, store_id, customer_id, cashier_id, total_usd, total_bs, 
    bcv_rate_used, payment_method, customer_name, customer_id_number,
    subtotal_usd, tax_rate, tax_amount_usd, notes, invoice_number,
    krece_enabled, krece_initial_amount_usd, krece_financed_amount_usd, 
    krece_initial_percentage, is_mixed_payment
  ) VALUES (
    p_company_id, p_store_id, p_customer_id, p_cashier_id, v_total_usd, v_total_bs,
    p_bcv_rate, v_payment_type, v_clean_customer_name, v_clean_customer_id_number,
    v_subtotal_usd, p_tax_rate, v_tax_amount_usd, p_notes, v_invoice_number,
    p_krece_enabled, p_krece_initial_amount_usd, p_krece_financed_amount_usd,
    p_krece_initial_percentage, p_is_mixed_payment
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

  -- REGISTRAR PAGOS - SOLO AQUÍ ESTÁ EL CAMBIO PARA KRECE
  CASE v_payment_type
    WHEN 'mixed' THEN
      -- PAGOS MIXTOS (MANTENER LÓGICA ORIGINAL)
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
      -- PAGO ÚNICO (MANTENER LÓGICA ORIGINAL)
      INSERT INTO sale_payments (
        sale_id, payment_method, amount_usd, amount_bs
      ) VALUES (
        v_sale_id, v_clean_payment_method, v_total_usd, v_total_bs
      );
      
    WHEN 'krece' THEN
      -- PAGO KRECE - SOLO REGISTRAR LA INICIAL (NO EL MONTO COMPLETO)
      INSERT INTO sale_payments (
        sale_id, payment_method, amount_usd, amount_bs
      ) VALUES (
        v_sale_id, 
        COALESCE(p_payment_method, 'krece_initial'),  -- Usar el método de pago real de la inicial
        p_krece_initial_amount_usd,                   -- SOLO la inicial (no v_total_usd)
        p_krece_initial_amount_usd * p_bcv_rate       -- SOLO la inicial en bolívares
      );
  END CASE;

  -- CREAR FINANCIAMIENTO KRECE SI APLICA (MANTENER LÓGICA ORIGINAL)
  IF v_payment_type = 'krece' AND p_customer_id IS NOT NULL THEN
    INSERT INTO krece_financing (
      sale_id, customer_id, total_amount_usd, initial_amount_usd, 
      financed_amount_usd, initial_percentage, status
    ) VALUES (
      v_sale_id, p_customer_id, v_total_usd, p_krece_initial_amount_usd,
      p_krece_financed_amount_usd, p_krece_initial_percentage, 'active'
    ) RETURNING id INTO v_krece_financing_id;

    INSERT INTO krece_accounts_receivable (
      company_id, krece_financing_id, customer_id, amount_usd, 
      amount_bs, bcv_rate, status
    ) VALUES (
      p_company_id, v_krece_financing_id, p_customer_id, 
      p_krece_financed_amount_usd, p_krece_financed_amount_usd * p_bcv_rate,
      p_bcv_rate, 'pending'
    );
  END IF;

  RETURN v_sale_id;
END;
$$;
