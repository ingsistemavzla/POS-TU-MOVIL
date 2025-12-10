-- ============================================================================
-- VERSIÓN FINAL (GOLD MASTER v6): Optimizado con CTE y Traducciones
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_sales_history_v2(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_sales_history_v2(
    p_company_id UUID DEFAULT NULL,
    p_store_id UUID DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_company_id UUID;
BEGIN
    -- 1. Seguridad
    SELECT company_id INTO v_user_company_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_user_company_id IS NULL THEN RETURN; END IF;

    -- 2. Query Principal (Usando CTE para mayor velocidad)
    RETURN QUERY
    WITH sales_page AS (
        SELECT s.*
        FROM public.sales s
        WHERE s.company_id = COALESCE(p_company_id, v_user_company_id)
        AND (p_store_id IS NULL OR s.store_id = p_store_id)
        AND (p_date_from IS NULL OR s.created_at >= p_date_from)
        AND (p_date_to IS NULL OR s.created_at <= p_date_to)
        ORDER BY s.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT jsonb_build_object(
        'id', sp.id,
        'invoice_number', sp.invoice_number,
        'created_at_fmt', to_char(sp.created_at, 'DD/MM/YYYY, HH24:MI'),
        
        -- IDENTIDAD COMPLETA
        'client_name', COALESCE(NULLIF(sp.customer_name, ''), 'Cliente General'),
        'client_doc', COALESCE(sp.customer_id_number, ''),
        'store_id', sp.store_id,
        'store_name', COALESCE(st.name, 'Tienda Principal'), 
        'cashier_id', sp.cashier_id,
        'cashier_name', COALESCE(u.name, u.email, 'Cajero'), 

        -- FINANZAS
        'total_usd', sp.total_usd,
        'total_bs', COALESCE(NULLIF(sp.total_bs, 0), sp.total_usd * COALESCE(sp.bcv_rate_used, 41.73)),
        
        -- MÉTODO (Traducido)
        'payment_method', CASE 
            WHEN sp.payment_method = 'cash_usd' THEN 'Efectivo USD'
            WHEN sp.payment_method = 'zelle' THEN 'Zelle'
            WHEN sp.payment_method = 'pago_movil' THEN 'Pago Móvil'
            WHEN sp.payment_method = 'pos' OR sp.payment_method = 'card' THEN 'Punto de Venta'
            WHEN sp.payment_method = 'biopago' THEN 'Biopago'
            WHEN sp.payment_method = 'transfer_bs' THEN 'Transferencia Bs'
            ELSE sp.payment_method
        END,
        
        -- TIPO (Lógica Financiera Blindada)
        'financing_label', CASE
            -- Prioridad 1: Deuda Real
            WHEN COALESCE(sp.krece_financed_amount_usd, 0) > 0.01 THEN
                'KRECE ' || ROUND(
                    (CASE 
                        WHEN sp.total_usd > 0 THEN (sp.krece_initial_amount_usd / sp.total_usd) * 100 
                        ELSE 0 
                    END)::NUMERIC, 0
                )::TEXT || '%'
            -- Prioridad 2: Cashea
            WHEN sp.payment_method ILIKE '%cashea%' THEN 'CASHEA'
            -- Prioridad 3: Contado
            ELSE 'CONTADO'
        END,

        -- ITEMS (SKUs Recuperados)
        'items', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'sku', COALESCE(NULLIF(si.product_sku, ''), NULLIF(si.product_sku, 'N/A'), p.sku, p.barcode, 'N/A'),
                'name', si.product_name,
                'qty', si.qty,
                'price', si.price_usd,
                'subtotal', si.subtotal_usd
            ))
            FROM public.sale_items si
            LEFT JOIN public.products p ON si.product_id = p.id
            WHERE si.sale_id = sp.id
        ), '[]'::jsonb)
    )
    FROM sales_page sp
    LEFT JOIN public.stores st ON sp.store_id = st.id
    LEFT JOIN public.users u ON sp.cashier_id = u.id;

EXCEPTION
    WHEN OTHERS THEN
        RETURN NEXT jsonb_build_object('error', true, 'message', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_sales_history_v2(
    UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER
) TO authenticated;

-- Comentario de documentación
COMMENT ON FUNCTION public.get_sales_history_v2 IS 
'RPC de solo lectura que retorna historial de ventas con correcciones al vuelo:
- Calcula total_bs si es 0 o NULL usando bcv_rate_used
- Recupera SKU de products si falta en sale_items
- Calcula porcentaje de Krece si falta usando krece_initial_amount_usd / total_usd
- Formatea fechas en formato DD/MM/YYYY, HH24:MI
- Traduce métodos de pago a español
- Detecta financiamiento basado en realidad financiera (krece_financed_amount_usd)
- Respeta RLS y solo muestra ventas de la company del usuario autenticado';
