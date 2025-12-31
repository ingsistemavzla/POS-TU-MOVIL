-- ============================================================================
-- RPC: get_sales_metadata_v2 - Obtener metadatos de ventas (totales, conteos)
-- ============================================================================
-- Esta RPC retorna solo los metadatos (totales, conteos) sin las ventas completas
-- Útil para calcular totalizaciones correctas cuando hay filtros y paginación
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_sales_metadata_v2(
    p_company_id UUID DEFAULT NULL,
    p_store_id UUID DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_company_id UUID;
    v_total_count INTEGER;
    v_total_amount_usd NUMERIC;
    v_total_amount_bs NUMERIC;
    v_category_stats JSONB;
BEGIN
    -- 1. Seguridad
    SELECT company_id INTO v_user_company_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_user_company_id IS NULL THEN 
        RETURN jsonb_build_object('error', true, 'message', 'Usuario no autenticado');
    END IF;

    -- 2. Contar total de ventas que cumplen filtros
    SELECT COUNT(*)
    INTO v_total_count
    FROM public.sales s
    WHERE s.company_id = COALESCE(p_company_id, v_user_company_id)
    AND (p_store_id IS NULL OR s.store_id = p_store_id)
    AND (p_date_from IS NULL OR s.created_at >= p_date_from)
    AND (p_date_to IS NULL OR s.created_at <= p_date_to);

    -- 3. Calcular total USD y BS
    SELECT 
        COALESCE(SUM(s.total_usd), 0),
        COALESCE(SUM(
            CASE
                WHEN s.total_bs IS NOT NULL AND s.total_bs > 0.01 THEN s.total_bs
                WHEN s.total_usd > 0 THEN s.total_usd * COALESCE(s.bcv_rate_used, 41.73)
                ELSE 0
            END
        ), 0)
    INTO v_total_amount_usd, v_total_amount_bs
    FROM public.sales s
    WHERE s.company_id = COALESCE(p_company_id, v_user_company_id)
    AND (p_store_id IS NULL OR s.store_id = p_store_id)
    AND (p_date_from IS NULL OR s.created_at >= p_date_from)
    AND (p_date_to IS NULL OR s.created_at <= p_date_to);

    -- 4. Calcular estadísticas por categoría desde TODAS las ventas filtradas
    SELECT jsonb_build_object(
        'phones', jsonb_build_object(
            'units', COALESCE(SUM(CASE WHEN p.category = 'phones' THEN si.qty ELSE 0 END), 0),
            'amount_usd', COALESCE(SUM(CASE WHEN p.category = 'phones' THEN si.subtotal_usd ELSE 0 END), 0),
            'amount_bs', COALESCE(SUM(CASE WHEN p.category = 'phones' THEN si.subtotal_usd * COALESCE(s.bcv_rate_used, 41.73) ELSE 0 END), 0)
        ),
        'accessories', jsonb_build_object(
            'units', COALESCE(SUM(CASE WHEN p.category = 'accessories' THEN si.qty ELSE 0 END), 0),
            'amount_usd', COALESCE(SUM(CASE WHEN p.category = 'accessories' THEN si.subtotal_usd ELSE 0 END), 0),
            'amount_bs', COALESCE(SUM(CASE WHEN p.category = 'accessories' THEN si.subtotal_usd * COALESCE(s.bcv_rate_used, 41.73) ELSE 0 END), 0)
        ),
        'technical_service', jsonb_build_object(
            'units', COALESCE(SUM(CASE WHEN p.category = 'technical_service' THEN si.qty ELSE 0 END), 0),
            'amount_usd', COALESCE(SUM(CASE WHEN p.category = 'technical_service' THEN si.subtotal_usd ELSE 0 END), 0),
            'amount_bs', COALESCE(SUM(CASE WHEN p.category = 'technical_service' THEN si.subtotal_usd * COALESCE(s.bcv_rate_used, 41.73) ELSE 0 END), 0)
        )
    )
    INTO v_category_stats
    FROM public.sales s
    INNER JOIN public.sale_items si ON s.id = si.sale_id
    LEFT JOIN public.products p ON si.product_id = p.id
    WHERE s.company_id = COALESCE(p_company_id, v_user_company_id)
    AND (p_store_id IS NULL OR s.store_id = p_store_id)
    AND (p_date_from IS NULL OR s.created_at >= p_date_from)
    AND (p_date_to IS NULL OR s.created_at <= p_date_to);

    -- 5. Retornar metadatos
    RETURN jsonb_build_object(
        'total_count', v_total_count,
        'total_amount_usd', v_total_amount_usd,
        'total_amount_bs', v_total_amount_bs,
        'average_amount_usd', CASE WHEN v_total_count > 0 THEN v_total_amount_usd / v_total_count ELSE 0 END,
        'category_stats', COALESCE(v_category_stats, jsonb_build_object(
            'phones', jsonb_build_object('units', 0, 'amount_usd', 0, 'amount_bs', 0),
            'accessories', jsonb_build_object('units', 0, 'amount_usd', 0, 'amount_bs', 0),
            'technical_service', jsonb_build_object('units', 0, 'amount_usd', 0, 'amount_bs', 0)
        ))
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', true, 'message', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_sales_metadata_v2(
    UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ
) TO authenticated;

-- Comentario de documentación
COMMENT ON FUNCTION public.get_sales_metadata_v2 IS 
'RPC que retorna metadatos de ventas (totales, conteos, estadísticas por categoría) 
sin retornar las ventas completas. Útil para calcular totalizaciones correctas cuando 
hay filtros de fecha, tienda y paginación. Respeta los mismos filtros que get_sales_history_v2.';

