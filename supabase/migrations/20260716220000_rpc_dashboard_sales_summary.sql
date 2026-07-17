-- ============================================================================
-- RPC: get_dashboard_sales_summary
-- ============================================================================
-- Fecha: 2026-07-16
-- Objetivo: agregar ventas del Dashboard en Postgres (1 llamada) con la
--           MISMA lógica que src/hooks/useDashboardData.ts (agregación JS).
--
-- Seguridad:
--   - SECURITY DEFINER + company_id del usuario autenticado
--   - manager/cashier: solo su assigned_store_id
--   - Solo lectura de sales completed
--
-- Integridad:
--   - Las fechas las envía el frontend (mismos getDateRanges() / toISOString)
--     para evitar divergencia por timezone del servidor.
--
-- Cómo aplicar (Supabase → SQL Editor):
--   1) Ejecutar TODO este archivo.
--   2) Verificar: SELECT public.get_dashboard_sales_summary(
--        '<company_uuid>'::uuid,
--        now()::date::timestamptz,           -- today_start (ejemplo)
--        ...  -- o probar desde la app con flag USE_DASHBOARD_RPC
--      );
--   3) Comparar números con baseline docs/MEJORAS_RENDIMIENTO_JUL_2026.md §14
--
-- Reversible: DROP FUNCTION IF EXISTS public.get_dashboard_sales_summary(...);
-- El frontend tiene fallback al fetch+JS si el RPC falla.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_sales_summary(
  p_company_id uuid,
  p_today_start timestamptz,
  p_today_end timestamptz,
  p_yesterday_start timestamptz,
  p_yesterday_end timestamptz,
  p_month_start timestamptz,
  p_month_end timestamptz,
  p_last_month_start timestamptz,
  p_last_month_end timestamptz,
  p_thirty_days_ago timestamptz,
  p_range_start timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_company_id uuid;
  v_role text;
  v_assigned_store_id uuid;
  v_company_id uuid;
  v_store_filter uuid;
  v_result jsonb;
BEGIN
  SELECT u.company_id, u.role, u.assigned_store_id
  INTO v_user_company_id, v_role, v_assigned_store_id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_user_company_id IS NULL AND COALESCE(v_role, '') <> 'master_admin' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Usuario no autenticado o sin empresa');
  END IF;

  -- master_admin puede consultar p_company_id; resto solo su empresa
  IF COALESCE(v_role, '') = 'master_admin' THEN
    v_company_id := COALESCE(p_company_id, v_user_company_id);
  ELSE
    v_company_id := v_user_company_id;
    IF p_company_id IS NOT NULL AND p_company_id <> v_user_company_id THEN
      RETURN jsonb_build_object('error', true, 'message', 'company_id no autorizado');
    END IF;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Company ID requerido');
  END IF;

  IF v_role IN ('manager', 'cashier') AND v_assigned_store_id IS NOT NULL THEN
    v_store_filter := v_assigned_store_id;
  ELSE
    v_store_filter := NULL;
  END IF;

  WITH base AS (
    SELECT
      s.id,
      s.store_id,
      s.created_at,
      COALESCE(s.total_usd, 0)::numeric AS total_usd,
      COALESCE(s.total_bs, 0)::numeric AS total_bs,
      CASE
        WHEN COALESCE(s.cashea_enabled, false) THEN 'cashea'
        WHEN COALESCE(s.krece_enabled, false) THEN 'krece'
        ELSE 'cash'
      END AS pay_method,
      CASE
        WHEN COALESCE(s.cashea_enabled, false) THEN COALESCE(s.cashea_financed_amount_usd, 0)::numeric
        WHEN COALESCE(s.krece_enabled, false) THEN COALESCE(s.krece_financed_amount_usd, 0)::numeric
        ELSE 0::numeric
      END AS financed_usd,
      -- Misma clave de día que JS: new Date(iso).toISOString().slice(0,10) → UTC
      to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day_utc
    FROM public.sales s
    WHERE s.company_id = v_company_id
      AND s.status = 'completed'
      AND s.created_at >= p_range_start
      AND s.created_at <= p_month_end
      AND (v_store_filter IS NULL OR s.store_id = v_store_filter)
  ),
  period_agg AS (
    SELECT
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end
      ), 0) AS today_total,
      COUNT(*) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end
      ) AS today_count,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end
      ), 0) AS yesterday_total,
      COUNT(*) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end
      ) AS yesterday_count,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end
      ), 0) AS month_total,
      COUNT(*) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end
      ) AS month_count,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_last_month_start AND created_at <= p_last_month_end
      ), 0) AS last_month_total,
      COUNT(*) FILTER (
        WHERE created_at >= p_last_month_start AND created_at <= p_last_month_end
      ) AS last_month_count
    FROM base
  ),
  fin AS (
    SELECT
      -- TODAY
      COALESCE(SUM(financed_usd) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end
      ), 0) AS t_recv,
      COALESCE(SUM(financed_usd) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end AND pay_method = 'krece'
      ), 0) AS t_krece_recv,
      COALESCE(SUM(financed_usd) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end AND pay_method = 'cashea'
      ), 0) AS t_cashea_recv,
      COUNT(*) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end AND pay_method = 'cash'
      ) AS t_cash_c,
      COUNT(*) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end AND pay_method = 'krece'
      ) AS t_krece_c,
      COUNT(*) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end AND pay_method = 'cashea'
      ) AS t_cashea_c,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end AND pay_method = 'cash'
      ), 0) AS t_cash_tot,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end AND pay_method = 'krece'
      ), 0) AS t_krece_tot,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_today_start AND created_at <= p_today_end AND pay_method = 'cashea'
      ), 0) AS t_cashea_tot,
      -- YESTERDAY
      COALESCE(SUM(financed_usd) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end
      ), 0) AS y_recv,
      COALESCE(SUM(financed_usd) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end AND pay_method = 'krece'
      ), 0) AS y_krece_recv,
      COALESCE(SUM(financed_usd) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end AND pay_method = 'cashea'
      ), 0) AS y_cashea_recv,
      COUNT(*) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end AND pay_method = 'cash'
      ) AS y_cash_c,
      COUNT(*) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end AND pay_method = 'krece'
      ) AS y_krece_c,
      COUNT(*) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end AND pay_method = 'cashea'
      ) AS y_cashea_c,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end AND pay_method = 'cash'
      ), 0) AS y_cash_tot,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end AND pay_method = 'krece'
      ), 0) AS y_krece_tot,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_yesterday_start AND created_at <= p_yesterday_end AND pay_method = 'cashea'
      ), 0) AS y_cashea_tot,
      -- THIS MONTH
      COALESCE(SUM(financed_usd) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end
      ), 0) AS m_recv,
      COALESCE(SUM(financed_usd) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end AND pay_method = 'krece'
      ), 0) AS m_krece_recv,
      COALESCE(SUM(financed_usd) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end AND pay_method = 'cashea'
      ), 0) AS m_cashea_recv,
      COUNT(*) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end AND pay_method = 'cash'
      ) AS m_cash_c,
      COUNT(*) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end AND pay_method = 'krece'
      ) AS m_krece_c,
      COUNT(*) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end AND pay_method = 'cashea'
      ) AS m_cashea_c,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end AND pay_method = 'cash'
      ), 0) AS m_cash_tot,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end AND pay_method = 'krece'
      ), 0) AS m_krece_tot,
      COALESCE(SUM(total_usd) FILTER (
        WHERE created_at >= p_month_start AND created_at <= p_month_end AND pay_method = 'cashea'
      ), 0) AS m_cashea_tot
    FROM base
  ),
  store_agg AS (
    SELECT
      b.store_id,
      COALESCE(SUM(b.total_usd) FILTER (
        WHERE b.created_at >= p_today_start AND b.created_at <= p_today_end
      ), 0) AS sales_today,
      COUNT(*) FILTER (
        WHERE b.created_at >= p_today_start AND b.created_at <= p_today_end
      ) AS orders_today,
      COALESCE(SUM(b.total_usd) FILTER (
        WHERE b.created_at >= p_yesterday_start AND b.created_at <= p_yesterday_end
      ), 0) AS sales_yesterday,
      COUNT(*) FILTER (
        WHERE b.created_at >= p_yesterday_start AND b.created_at <= p_yesterday_end
      ) AS orders_yesterday,
      COALESCE(SUM(b.total_usd) FILTER (
        WHERE b.created_at >= p_month_start AND b.created_at <= p_month_end
      ), 0) AS sales_month,
      COUNT(*) FILTER (
        WHERE b.created_at >= p_month_start AND b.created_at <= p_month_end
      ) AS orders_month
    FROM base b
    WHERE b.store_id IS NOT NULL
    GROUP BY b.store_id
  ),
  daily AS (
    SELECT
      day_utc AS date,
      COALESCE(SUM(total_bs), 0) AS sales,
      COALESCE(SUM(total_usd), 0) AS sales_usd,
      COUNT(*)::int AS orders
    FROM base
    WHERE created_at >= p_thirty_days_ago
    GROUP BY day_utc
    ORDER BY day_utc DESC
    LIMIT 30
  )
  SELECT jsonb_build_object(
    'error', false,
    'periods', jsonb_build_object(
      'today', jsonb_build_object(
        'total', pa.today_total,
        'count', pa.today_count,
        'average', CASE WHEN pa.today_count > 0 THEN pa.today_total / pa.today_count ELSE 0 END
      ),
      'yesterday', jsonb_build_object(
        'total', pa.yesterday_total,
        'count', pa.yesterday_count,
        'average', CASE WHEN pa.yesterday_count > 0 THEN pa.yesterday_total / pa.yesterday_count ELSE 0 END
      ),
      'thisMonth', jsonb_build_object(
        'total', pa.month_total,
        'count', pa.month_count,
        'average', CASE WHEN pa.month_count > 0 THEN pa.month_total / pa.month_count ELSE 0 END
      ),
      'lastMonth', jsonb_build_object(
        'total', pa.last_month_total,
        'count', pa.last_month_count,
        'average', CASE WHEN pa.last_month_count > 0 THEN pa.last_month_total / pa.last_month_count ELSE 0 END
      )
    ),
    'store_metrics', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'storeId', sa.store_id,
          'sales', jsonb_build_object(
            'today', sa.sales_today,
            'yesterday', sa.sales_yesterday,
            'thisMonth', sa.sales_month
          ),
          'orders', jsonb_build_object(
            'today', sa.orders_today,
            'yesterday', sa.orders_yesterday,
            'thisMonth', sa.orders_month
          ),
          'averageOrder', jsonb_build_object(
            'today', CASE WHEN sa.orders_today > 0 THEN sa.sales_today / sa.orders_today ELSE 0 END,
            'yesterday', CASE WHEN sa.orders_yesterday > 0 THEN sa.sales_yesterday / sa.orders_yesterday ELSE 0 END,
            'thisMonth', CASE WHEN sa.orders_month > 0 THEN sa.sales_month / sa.orders_month ELSE 0 END
          )
        )
      )
      FROM store_agg sa
    ), '[]'::jsonb),
    'daily_sales', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', d.date,
          'sales', d.sales,
          'salesUSD', d.sales_usd,
          'orders', d.orders
        )
        ORDER BY d.date DESC
      )
      FROM daily d
    ), '[]'::jsonb),
    'financial_health', jsonb_build_object(
      'today', jsonb_build_object(
        'receivables_usd', f.t_recv,
        'net_income_usd', GREATEST(0, pa.today_total - f.t_recv),
        'sales_by_method_count', jsonb_build_object(
          'cash', f.t_cash_c, 'krece', f.t_krece_c, 'cashea', f.t_cashea_c
        ),
        'receivables_breakdown', jsonb_build_object(
          'krece_usd', f.t_krece_recv, 'cashea_usd', f.t_cashea_recv
        ),
        'avg_ticket_cash', CASE WHEN f.t_cash_c > 0 THEN f.t_cash_tot / f.t_cash_c ELSE 0 END,
        'avg_ticket_krece', CASE WHEN f.t_krece_c > 0 THEN f.t_krece_tot / f.t_krece_c ELSE 0 END,
        'avg_ticket_cashea', CASE WHEN f.t_cashea_c > 0 THEN f.t_cashea_tot / f.t_cashea_c ELSE 0 END
      ),
      'yesterday', jsonb_build_object(
        'receivables_usd', f.y_recv,
        'net_income_usd', GREATEST(0, pa.yesterday_total - f.y_recv),
        'sales_by_method_count', jsonb_build_object(
          'cash', f.y_cash_c, 'krece', f.y_krece_c, 'cashea', f.y_cashea_c
        ),
        'receivables_breakdown', jsonb_build_object(
          'krece_usd', f.y_krece_recv, 'cashea_usd', f.y_cashea_recv
        ),
        'avg_ticket_cash', CASE WHEN f.y_cash_c > 0 THEN f.y_cash_tot / f.y_cash_c ELSE 0 END,
        'avg_ticket_krece', CASE WHEN f.y_krece_c > 0 THEN f.y_krece_tot / f.y_krece_c ELSE 0 END,
        'avg_ticket_cashea', CASE WHEN f.y_cashea_c > 0 THEN f.y_cashea_tot / f.y_cashea_c ELSE 0 END
      ),
      'thisMonth', jsonb_build_object(
        'receivables_usd', f.m_recv,
        'net_income_usd', GREATEST(0, pa.month_total - f.m_recv),
        'sales_by_method_count', jsonb_build_object(
          'cash', f.m_cash_c, 'krece', f.m_krece_c, 'cashea', f.m_cashea_c
        ),
        'receivables_breakdown', jsonb_build_object(
          'krece_usd', f.m_krece_recv, 'cashea_usd', f.m_cashea_recv
        ),
        'avg_ticket_cash', CASE WHEN f.m_cash_c > 0 THEN f.m_cash_tot / f.m_cash_c ELSE 0 END,
        'avg_ticket_krece', CASE WHEN f.m_krece_c > 0 THEN f.m_krece_tot / f.m_krece_c ELSE 0 END,
        'avg_ticket_cashea', CASE WHEN f.m_cashea_c > 0 THEN f.m_cashea_tot / f.m_cashea_c ELSE 0 END
      )
    )
  )
  INTO v_result
  FROM period_agg pa, fin f;

  RETURN COALESCE(v_result, jsonb_build_object('error', true, 'message', 'Sin resultado'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_sales_summary(
  uuid, timestamptz, timestamptz, timestamptz, timestamptz,
  timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz
) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_sales_summary IS
  'Agregados Dashboard (periodos, tiendas, daily, financial). Fechas desde cliente para paridad con useDashboardData.';
