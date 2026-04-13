-- Historial de ventas: created_at_fmt siempre en hora Venezuela (America/Caracas),
-- alineado con facturas/PDF y reloj del navbar (Margarita = misma zona que Caracas).

DROP FUNCTION IF EXISTS public.get_sales_history_v2(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_sales_history_v2(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_sales_history_v2(
    p_company_id UUID DEFAULT NULL,
    p_store_id UUID DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
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
    SELECT company_id INTO v_user_company_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_user_company_id IS NULL THEN RETURN; END IF;

    RETURN QUERY
    WITH sales_page AS (
        SELECT s.*
        FROM public.sales s
        WHERE s.company_id = COALESCE(p_company_id, v_user_company_id)
          AND (p_store_id IS NULL OR s.store_id = p_store_id)
          AND (p_date_from IS NULL OR s.created_at >= p_date_from)
          AND (p_date_to IS NULL OR s.created_at <= p_date_to)
          AND (
            p_category IS NULL
            OR p_category = 'all'
            OR EXISTS (
              SELECT 1
              FROM public.sale_items si
              LEFT JOIN public.products p ON p.id = si.product_id
              WHERE si.sale_id = s.id
                AND p.category = p_category
            )
          )
        ORDER BY s.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT jsonb_build_object(
        'id', sp.id,
        'invoice_number', sp.invoice_number,
        'created_at', sp.created_at,
        'created_at_fmt', to_char((sp.created_at AT TIME ZONE 'America/Caracas'), 'DD/MM/YYYY, HH24:MI'),
        'client_name', COALESCE(NULLIF(sp.customer_name, ''), 'Cliente General'),
        'client_doc', COALESCE(sp.customer_id_number, ''),
        'store_id', sp.store_id,
        'store_name', COALESCE(st.name, 'Tienda Principal'),
        'cashier_id', sp.cashier_id,
        'cashier_name', COALESCE(u.name, u.email, 'Cajero'),
        'total_usd', sp.total_usd,
        'subtotal_usd', COALESCE(sp.subtotal_usd, sp.total_usd),
        'tax_amount_usd', COALESCE(sp.tax_amount_usd, 0),
        'bcv_rate_used', COALESCE(sp.bcv_rate_used, 41.73),
        'total_bs', CASE
            WHEN sp.total_bs IS NOT NULL AND sp.total_bs > 0.01 THEN sp.total_bs
            WHEN sp.total_usd > 0 THEN ROUND(sp.total_usd * COALESCE(sp.bcv_rate_used, 1), 2)
            ELSE 0
        END,
        'krece_enabled', COALESCE(sp.krece_enabled, false),
        'krece_initial_amount_usd', COALESCE(sp.krece_initial_amount_usd, 0),
        'krece_financed_amount_usd', COALESCE(sp.krece_financed_amount_usd, 0),
        'krece_initial_percentage', CASE
            WHEN sp.total_usd > 0 AND sp.krece_initial_amount_usd > 0 THEN ROUND((sp.krece_initial_amount_usd / sp.total_usd) * 100, 0)
            ELSE 0
        END,
        'krece_initial_amount_bs', COALESCE(
            sp.krece_initial_amount_bs,
            CASE
                WHEN sp.krece_initial_amount_bs IS NULL AND sp.krece_initial_amount_usd > 0
                THEN sp.krece_initial_amount_usd * COALESCE(sp.bcv_rate_used, 41.73)
                ELSE 0
            END
        ),
        'krece_financed_amount_bs', COALESCE(
            sp.krece_financed_amount_bs,
            CASE
                WHEN sp.krece_financed_amount_bs IS NULL AND sp.krece_financed_amount_usd > 0
                THEN sp.krece_financed_amount_usd * COALESCE(sp.bcv_rate_used, 41.73)
                ELSE 0
            END
        ),
        'cashea_enabled', COALESCE(sp.cashea_enabled, false),
        'cashea_initial_amount_usd', COALESCE(sp.cashea_initial_amount_usd, 0),
        'cashea_financed_amount_usd', COALESCE(sp.cashea_financed_amount_usd, 0),
        'cashea_initial_percentage', CASE
            WHEN sp.total_usd > 0 AND sp.cashea_initial_amount_usd > 0 THEN ROUND((sp.cashea_initial_amount_usd / sp.total_usd) * 100, 0)
            ELSE 0
        END,
        'cashea_initial_amount_bs', COALESCE(
            sp.cashea_initial_amount_bs,
            CASE
                WHEN sp.cashea_initial_amount_bs IS NULL AND sp.cashea_initial_amount_usd > 0
                THEN sp.cashea_initial_amount_usd * COALESCE(sp.bcv_rate_used, 41.73)
                ELSE 0
            END
        ),
        'cashea_financed_amount_bs', COALESCE(
            sp.cashea_financed_amount_bs,
            CASE
                WHEN sp.cashea_financed_amount_bs IS NULL AND sp.cashea_financed_amount_usd > 0
                THEN sp.cashea_financed_amount_usd * COALESCE(sp.bcv_rate_used, 41.73)
                ELSE 0
            END
        ),
        'payment_method', CASE
            WHEN sp.payment_method = 'cash_usd' THEN 'Efectivo USD'
            WHEN sp.payment_method = 'zelle' THEN 'Zelle'
            WHEN sp.payment_method = 'pago_movil' THEN 'Pago Móvil'
            WHEN sp.payment_method = 'pos' OR sp.payment_method = 'card' THEN 'Punto de Venta'
            WHEN sp.payment_method = 'biopago' THEN 'Biopago'
            WHEN sp.payment_method = 'transfer_bs' THEN 'Transferencia Bs'
            ELSE sp.payment_method
        END,
        'financing_label', CASE
            WHEN COALESCE(sp.krece_enabled, false) = true THEN
                'KRECE ' || COALESCE(
                    sp.krece_initial_percentage::TEXT,
                    CASE
                        WHEN sp.total_usd > 0 AND sp.krece_initial_amount_usd > 0
                        THEN ROUND((sp.krece_initial_amount_usd / sp.total_usd) * 100, 0)::TEXT
                        ELSE '0'
                    END
                ) || '%'
            WHEN COALESCE(sp.cashea_enabled, false) = true THEN 'CASHEA'
            ELSE 'CONTADO'
        END,
        'is_mixed_payment', COALESCE(sp.is_mixed_payment, false),
        'notes', sp.notes,
        'items', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'sku', COALESCE(NULLIF(si.product_sku, ''), NULLIF(si.product_sku, 'N/A'), p.sku, p.barcode, 'N/A'),
                'name', si.product_name,
                'qty', si.qty,
                'price', si.price_usd,
                'subtotal', si.subtotal_usd,
                'category', p.category
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

GRANT EXECUTE ON FUNCTION public.get_sales_history_v2(
    UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER
) TO authenticated;
