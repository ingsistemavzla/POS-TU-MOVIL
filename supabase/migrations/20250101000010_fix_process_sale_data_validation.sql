-- Crear una versión robusta de la función process_sale con validación de datos
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
BEGIN
  -- Validar que la tienda existe y está activa
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = p_store_id AND company_id = p_company_id AND active = true) THEN
    RAISE EXCEPTION 'Tienda no encontrada o inactiva';
  END IF;

  -- Validar que el cajero existe y está activo
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_cashier_id AND company_id = p_company_id AND active = true) THEN
    RAISE EXCEPTION 'Cajero no encontrado o inactivo';
  END IF;

  -- Validar que hay items para procesar
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No hay items para procesar en la venta';
  END IF;

  -- Calcular totales con validación robusta
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Validar y extraer datos del item con valores por defecto
    v_qty := COALESCE((v_item->>'qty')::integer, 0);
    v_price_usd := COALESCE((v_item->>'price_usd')::numeric, 0);
    
    -- Validar que los valores son válidos
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida en item: %', v_item;
    END IF;
    
    IF v_price_usd < 0 THEN
      RAISE EXCEPTION 'Precio inválido en item: %', v_item;
    END IF;
    
    v_subtotal_usd := v_subtotal_usd + (v_qty * v_price_usd);
  END LOOP;

  v_tax_amount_usd := v_subtotal_usd * p_tax_rate;
  v_total_usd := v_subtotal_usd + v_tax_amount_usd;
  v_total_bs := v_total_usd * p_bcv_rate;

  -- Generar número de factura
  SELECT 'FAC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 16) AS INTEGER)), 0) + 1)::text, 4, '0')
  INTO v_invoice_number
  FROM sales 
  WHERE company_id = p_company_id 
    AND DATE(created_at) = CURRENT_DATE;

  -- Crear la venta
  INSERT INTO sales (
    company_id, store_id, customer_id, cashier_id, total_usd, total_bs, 
    bcv_rate_used, payment_method, customer_name, customer_id_number,
    subtotal_usd, tax_rate, tax_amount_usd, notes, invoice_number,
    krece_enabled, krece_initial_amount_usd, krece_financed_amount_usd, 
    krece_initial_percentage, is_mixed_payment
  ) VALUES (
    p_company_id, p_store_id, p_customer_id, p_cashier_id, v_total_usd, v_total_bs,
    p_bcv_rate, p_payment_method, p_customer_name, p_customer_id_number,
    v_subtotal_usd, p_tax_rate, v_tax_amount_usd, p_notes, v_invoice_number,
    p_krece_enabled, p_krece_initial_amount_usd, p_krece_financed_amount_usd,
    p_krece_initial_percentage, p_is_mixed_payment
  ) RETURNING id INTO v_sale_id;

  -- Insertar items de la venta con validación robusta
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Extraer y validar datos del item
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'qty')::integer, 0);
    v_price_usd := COALESCE((v_item->>'price_usd')::numeric, 0);
    v_product_name := COALESCE(v_item->>'product_name', 'Producto sin nombre');
    v_product_sku := COALESCE(v_item->>'product_sku', 'SKU-000');
    
    -- Validar que el product_id no sea NULL
    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Product ID no puede ser NULL en item: %', v_item;
    END IF;
    
    INSERT INTO sale_items (
      sale_id, product_id, qty, price_usd, subtotal_usd, product_name, product_sku
    ) VALUES (
      v_sale_id,
      v_product_id,
      v_qty,
      v_price_usd,
      (v_qty * v_price_usd),
      v_product_name,
      v_product_sku
    );

    -- Actualizar inventario
    UPDATE inventories 
    SET qty = qty - v_qty,
        updated_at = now()
    WHERE product_id = v_product_id 
      AND store_id = p_store_id 
      AND company_id = p_company_id;
  END LOOP;

  -- Si es pago mixto, insertar los pagos individuales
  IF p_is_mixed_payment AND p_mixed_payments IS NOT NULL AND jsonb_array_length(p_mixed_payments) > 0 THEN
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_mixed_payments)
    LOOP
      INSERT INTO sale_payments (
        sale_id, payment_method, amount_usd, amount_bs
      ) VALUES (
        v_sale_id,
        COALESCE(v_payment->>'method', 'unknown'),
        COALESCE((v_payment->>'amount')::numeric, 0),
        COALESCE((v_payment->>'amount')::numeric, 0) * p_bcv_rate
      );
    END LOOP;
  END IF;

  -- Si es Krece, crear el registro de financiamiento
  IF p_krece_enabled AND p_customer_id IS NOT NULL THEN
    INSERT INTO krece_financing (
      sale_id, customer_id, total_amount_usd, initial_amount_usd, 
      financed_amount_usd, initial_percentage, status
    ) VALUES (
      v_sale_id, p_customer_id, v_total_usd, p_krece_initial_amount_usd,
      p_krece_financed_amount_usd, p_krece_initial_percentage, 'active'
    ) RETURNING id INTO v_krece_financing_id;

    -- Crear cuenta por cobrar a Krece
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









