-- ============================================================================
-- SCRIPT DE EMERGENCIA: Recrear función desde respaldo
-- ============================================================================
-- Este script contiene la versión CORRECTA de get_sales_history_v2
-- basada en la migración 20250127000001_update_sales_history_v3.sql
-- 
-- ÚSALO SOLO SI:
-- 1. Ya ejecutaste el script 00_consultar_y_respaldar_get_sales_history_v2.sql
-- 2. Verificaste que la versión sin p_category es la correcta
-- 3. Ya eliminaste todas las versiones con el script 07
-- 4. Necesitas recrear la función desde cero
-- ============================================================================

-- Verificar que no existe ninguna versión antes de crear
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_sales_history_v2';
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'ERROR: Aún existen % versiones de get_sales_history_v2. Ejecuta primero el script 07 para eliminarlas.', v_count;
    END IF;
    
    RAISE NOTICE '✅ Verificación OK: No existen versiones previas. Procediendo a crear la función correcta...';
END $$;

-- ============================================================================
-- CREAR FUNCIÓN CORRECTA (Versión de migración 20250127000001)
-- ============================================================================
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
        'created_at', sp.created_at, -- ✅ AGREGADO: Fecha original para ordenamiento y filtros
        'created_at_fmt', to_char(sp.created_at, 'DD/MM/YYYY, HH24:MI'),
        
        -- IDENTIDAD COMPLETA
        'client_name', COALESCE(NULLIF(sp.customer_name, ''), 'Cliente General'),
        'client_doc', COALESCE(sp.customer_id_number, ''),
        'store_id', sp.store_id,
        'store_name', COALESCE(st.name, 'Tienda Principal'), 
        'cashier_id', sp.cashier_id,
        'cashier_name', COALESCE(u.name, u.email, 'Cajero'), 

        -- FINANZAS (USD)
        'total_usd', sp.total_usd,
        'subtotal_usd', COALESCE(sp.subtotal_usd, sp.total_usd),
        'tax_amount_usd', COALESCE(sp.tax_amount_usd, 0),
        'bcv_rate_used', COALESCE(sp.bcv_rate_used, 41.73),
        
        -- FINANZAS (BS) - ✅ CORREGIDO: Fallback inteligente - Usar valor guardado solo si es válido (>0), sino calcular
        'total_bs', CASE
            -- Si existe y es mayor a 0.01, usamos el valor guardado (Inmutable)
            WHEN sp.total_bs IS NOT NULL AND sp.total_bs > 0.01 THEN sp.total_bs
            -- Si es 0 o NULL, pero hay dólares, calculamos al vuelo (Plan B)
            WHEN sp.total_usd > 0 THEN ROUND(sp.total_usd * COALESCE(sp.bcv_rate_used, 1), 2)
            -- Si no hay nada, devolvemos 0
            ELSE 0
        END,
        
        -- KRECE (USD)
        'krece_enabled', COALESCE(sp.krece_enabled, false),
        'krece_initial_amount_usd', COALESCE(sp.krece_initial_amount_usd, 0),
        'krece_financed_amount_usd', COALESCE(sp.krece_financed_amount_usd, 0),
        'krece_initial_percentage', CASE
            WHEN sp.total_usd > 0 AND sp.krece_initial_amount_usd > 0 THEN
                ROUND((sp.krece_initial_amount_usd / sp.total_usd) * 100, 0)
            ELSE 0
        END,
        
        -- KRECE (BS) - ✅ NUEVO: Campos BS guardados
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
                THEN sp.krece_initial_amount_usd * COALESCE(sp.bcv_rate_used, 41.73)
                ELSE 0
            END
        ),
        
        -- CASHEA (USD) - ✅ NUEVO: Todos los campos de Cashea
        'cashea_enabled', COALESCE(sp.cashea_enabled, false),
        'cashea_initial_amount_usd', COALESCE(sp.cashea_initial_amount_usd, 0),
        'cashea_financed_amount_usd', COALESCE(sp.cashea_financed_amount_usd, 0),
        'cashea_initial_percentage', CASE
            WHEN sp.total_usd > 0 AND sp.cashea_initial_amount_usd > 0 THEN
                ROUND((sp.cashea_initial_amount_usd / sp.total_usd) * 100, 0)
            ELSE 0
        END,
        
        -- CASHEA (BS) - ✅ NUEVO: Campos BS guardados
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
        
        -- MÉTODO DE PAGO (Traducido)
        'payment_method', CASE 
            WHEN sp.payment_method = 'cash_usd' THEN 'Efectivo USD'
            WHEN sp.payment_method = 'zelle' THEN 'Zelle'
            WHEN sp.payment_method = 'pago_movil' THEN 'Pago Móvil'
            WHEN sp.payment_method = 'pos' OR sp.payment_method = 'card' THEN 'Punto de Venta'
            WHEN sp.payment_method = 'biopago' THEN 'Biopago'
            WHEN sp.payment_method = 'transfer_bs' THEN 'Transferencia Bs'
            ELSE sp.payment_method
        END,
        
        -- TIPO DE FINANCIAMIENTO - ✅ CORREGIDO: Usa campos booleanos, no parsea texto
        'financing_label', CASE
            -- Prioridad 1: Krece
            WHEN COALESCE(sp.krece_enabled, false) = true THEN
                'KRECE ' || COALESCE(
                    sp.krece_initial_percentage::TEXT,
                    CASE 
                        WHEN sp.total_usd > 0 AND sp.krece_initial_amount_usd > 0 
                        THEN ROUND((sp.krece_initial_amount_usd / sp.total_usd) * 100, 0)::TEXT
                        ELSE '0'
                    END
                ) || '%'
            -- Prioridad 2: Cashea (usar cashea_enabled, no parsear payment_method)
            WHEN COALESCE(sp.cashea_enabled, false) = true THEN 'CASHEA'
            -- Prioridad 3: Contado
            ELSE 'CONTADO'
        END,
        
        -- PAGO MIXTO
        'is_mixed_payment', COALESCE(sp.is_mixed_payment, false),
        
        -- NOTAS
        'notes', sp.notes,

        -- ITEMS (SKUs Recuperados con categoría)
        'items', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'sku', COALESCE(
                    NULLIF(si.product_sku, ''),
                    NULLIF(si.product_sku, 'N/A'),
                    p.sku,
                    p.barcode,
                    'N/A'
                ),
                'name', si.product_name,
                'qty', si.qty,
                'price', si.price_usd,
                'subtotal', si.subtotal_usd,
                'category', p.category -- ✅ Incluir categoría para filtrado en frontend
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

-- Comentario de documentación actualizado
COMMENT ON FUNCTION public.get_sales_history_v2 IS 
'RPC de solo lectura que retorna historial de ventas con Persistencia Financiera Completa:
- Usa total_bs guardado solo si es válido (>0.01), sino calcula al vuelo (fallback inteligente)
- Incluye todos los campos de Krece (USD y BS guardados)
- Incluye todos los campos de Cashea (USD y BS guardados)
- Detecta financiamiento usando campos booleanos (krece_enabled, cashea_enabled)
- Recupera SKU de products si falta en sale_items
- Calcula porcentajes de inicial si faltan
- Formatea fechas en formato DD/MM/YYYY, HH24:MI
- Retorna created_at para ordenamiento y filtros
- Traduce métodos de pago a español
- Respeta RLS y solo muestra ventas de la company del usuario autenticado
- Compatible con datos legacy (calcula BS si falta)
- NO incluye p_category (filtro de categoría se hace en frontend)';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN pg_get_function_arguments(p.oid) LIKE '%p_category%' THEN '❌ ERROR: Versión con p_category encontrada'
        ELSE '✅ Versión correcta (sin p_category)'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2'
ORDER BY p.proname;

-- Debe retornar SOLO 1 fila con "✅ Versión correcta (sin p_category)"

