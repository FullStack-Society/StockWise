BEGIN;

-- Keep the two-argument UTC functions for older API callers. The app uses these
-- timezone-aware overloads for per-user calendar boundaries and month buckets.
CREATE OR REPLACE FUNCTION public.stockwise_get_dashboard_stock_flow(
    p_organization_id integer,
    p_days integer,
    p_timezone text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
    v_today date := (CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date;
    v_start_day date;
    v_start_at timestamptz;
    v_end_at timestamptz;
BEGIN
    IF p_timezone NOT IN (
        'Asia/Manila', 'Asia/Singapore', 'America/Los_Angeles',
        'America/Chicago', 'America/New_York', 'Europe/London',
        'Europe/Berlin', 'UTC'
    ) THEN
        RAISE EXCEPTION 'Unsupported timezone' USING ERRCODE = '22023';
    END IF;

    IF p_days NOT IN (7, 14, 30) THEN
        RAISE EXCEPTION 'days must be 7, 14 or 30' USING ERRCODE = '22023';
    END IF;

    v_start_day := v_today - (p_days - 1);
    v_start_at := v_start_day::timestamp AT TIME ZONE p_timezone;
    v_end_at := (v_today + 1)::timestamp AT TIME ZONE p_timezone;

    RETURN jsonb_build_object(
        'days',
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'day', calendar.day::date,
                    'units_received', COALESCE(movement.units_received, 0)
                )
                ORDER BY calendar.day
            )
            FROM generate_series(
                v_start_day, v_today, interval '1 day'
            ) AS calendar(day)
            LEFT JOIN (
                SELECT (public.stockwise_transaction_timestamp(t) AT TIME ZONE p_timezone)::date AS day,
                       SUM(t.quantity)::integer AS units_received
                FROM public.inventory_transactions AS t
                WHERE t.organization_id = p_organization_id
                  AND upper(t.transaction_type) IN ('IN', 'STOCK_IN')
                  AND public.stockwise_transaction_timestamp(t) >= v_start_at
                  AND public.stockwise_transaction_timestamp(t) < v_end_at
                GROUP BY (public.stockwise_transaction_timestamp(t) AT TIME ZONE p_timezone)::date
            ) AS movement ON movement.day = calendar.day
        ), '[]'::jsonb),
        'recent_receipts',
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'product_id', receipt.product_id,
                    'product_name', receipt.product_name,
                    'sku', receipt.sku,
                    'quantity', receipt.quantity,
                    'received_at', receipt.received_at
                )
                ORDER BY receipt.received_at DESC, receipt.product_name
            )
            FROM (
                SELECT p.product_id, p.product_name, p.sku, t.quantity,
                       public.stockwise_transaction_timestamp(t) AS received_at
                FROM public.inventory_transactions AS t
                JOIN public.products AS p
                  ON p.product_id = t.product_id
                 AND p.organization_id = t.organization_id
                WHERE t.organization_id = p_organization_id
                  AND p.is_deleted = false
                  AND upper(t.transaction_type) IN ('IN', 'STOCK_IN')
                  AND public.stockwise_transaction_timestamp(t) >= v_start_at
                  AND public.stockwise_transaction_timestamp(t) < v_end_at
                ORDER BY public.stockwise_transaction_timestamp(t) DESC,
                         p.product_name
                LIMIT 10
            ) AS receipt
        ), '[]'::jsonb),
        'recent_products',
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'product_id', recent.product_id,
                    'product_name', recent.product_name,
                    'sku', recent.sku,
                    'quantity', recent.quantity,
                    'received_at', recent.received_at
                )
                ORDER BY recent.received_at DESC, recent.product_name
            )
            FROM (
                SELECT p.product_id, p.product_name, p.sku, p.quantity,
                       COALESCE(
                           (
                               SELECT public.stockwise_transaction_timestamp(t)
                               FROM public.inventory_transactions AS t
                               WHERE t.organization_id = p.organization_id
                                 AND t.product_id = p.product_id
                                 AND upper(t.transaction_type) IN ('IN', 'STOCK_IN')
                               ORDER BY public.stockwise_transaction_timestamp(t) DESC
                               LIMIT 1
                           ),
                           p.created_at
                       ) AS received_at
                FROM public.products AS p
                WHERE p.organization_id = p_organization_id
                  AND p.is_deleted = false
                ORDER BY received_at DESC, p.product_name
                LIMIT 8
            ) AS recent
        ), '[]'::jsonb)
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_inventory_report(
    p_organization_id integer,
    p_days integer,
    p_timezone text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
    v_now timestamptz;
    v_period_start timestamptz;
    v_previous_start timestamptz;
    v_start_month date;
    v_current_month date;
BEGIN
    IF p_timezone NOT IN (
        'Asia/Manila', 'Asia/Singapore', 'America/Los_Angeles',
        'America/Chicago', 'America/New_York', 'Europe/London',
        'Europe/Berlin', 'UTC'
    ) THEN
        RAISE EXCEPTION 'Unsupported timezone' USING ERRCODE = '22023';
    END IF;

    IF p_days NOT IN (30, 90, 365) THEN
        RAISE EXCEPTION 'days must be 30, 90 or 365' USING ERRCODE = '22023';
    END IF;

    v_now := (
        ((CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date + 1)::timestamp
        AT TIME ZONE p_timezone
    );
    v_period_start := (
        ((CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date - (p_days - 1))::timestamp
        AT TIME ZONE p_timezone
    );
    v_previous_start := v_period_start - make_interval(days => p_days);
    v_start_month := date_trunc(
        'month', v_period_start AT TIME ZONE p_timezone
    )::date;
    v_current_month := date_trunc(
        'month', CURRENT_TIMESTAMP AT TIME ZONE p_timezone
    )::date;

    RETURN (
        WITH product_movements AS (
            SELECT t.product_id,
                   COALESCE(SUM(t.quantity) FILTER (
                       WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
                         AND public.stockwise_transaction_timestamp(t) >= v_period_start
                         AND public.stockwise_transaction_timestamp(t) < v_now
                   ), 0)::integer AS units_issued,
                   COALESCE(SUM(t.quantity) FILTER (
                       WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
                         AND public.stockwise_transaction_timestamp(t) >= v_previous_start
                         AND public.stockwise_transaction_timestamp(t) < v_period_start
                   ), 0)::integer AS previous_units_issued
            FROM public.inventory_transactions AS t
            WHERE t.organization_id = p_organization_id
              AND public.stockwise_transaction_timestamp(t) >= v_previous_start
              AND public.stockwise_transaction_timestamp(t) < v_now
            GROUP BY t.product_id
        ),
        active_products AS (
            SELECT p.product_id AS id, p.product_name AS name, p.sku,
                   COALESCE(c.category_name, 'Uncategorized') AS category,
                   p.quantity, p.price,
                   COALESCE(m.units_issued, 0) AS units_issued,
                   COALESCE(m.previous_units_issued, 0) AS previous_units_issued
            FROM public.products AS p
            LEFT JOIN public.categories AS c
              ON c.organization_id = p.organization_id
             AND c.category_id = p.category_id
            LEFT JOIN product_movements AS m ON m.product_id = p.product_id
            WHERE p.organization_id = p_organization_id
              AND p.is_deleted = false
        ),
        movement_totals AS (
            SELECT
                COUNT(*) FILTER (
                    WHERE public.stockwise_transaction_timestamp(t) >= v_period_start
                      AND public.stockwise_transaction_timestamp(t) < v_now
                )::integer AS transaction_count,
                COALESCE(SUM(t.quantity) FILTER (
                    WHERE upper(t.transaction_type) IN ('IN', 'STOCK_IN')
                      AND public.stockwise_transaction_timestamp(t) >= v_period_start
                      AND public.stockwise_transaction_timestamp(t) < v_now
                ), 0)::integer AS units_received,
                COALESCE(SUM(t.quantity) FILTER (
                    WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
                      AND public.stockwise_transaction_timestamp(t) >= v_period_start
                      AND public.stockwise_transaction_timestamp(t) < v_now
                ), 0)::integer AS units_issued,
                COUNT(*) FILTER (
                    WHERE public.stockwise_transaction_timestamp(t) >= v_previous_start
                      AND public.stockwise_transaction_timestamp(t) < v_period_start
                )::integer AS previous_transaction_count,
                COALESCE(SUM(t.quantity) FILTER (
                    WHERE upper(t.transaction_type) IN ('IN', 'STOCK_IN')
                      AND public.stockwise_transaction_timestamp(t) >= v_previous_start
                      AND public.stockwise_transaction_timestamp(t) < v_period_start
                ), 0)::integer AS previous_units_received,
                COALESCE(SUM(t.quantity) FILTER (
                    WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
                      AND public.stockwise_transaction_timestamp(t) >= v_previous_start
                      AND public.stockwise_transaction_timestamp(t) < v_period_start
                ), 0)::integer AS previous_units_issued
            FROM public.inventory_transactions AS t
            WHERE t.organization_id = p_organization_id
              AND public.stockwise_transaction_timestamp(t) >= v_previous_start
              AND public.stockwise_transaction_timestamp(t) < v_now
        ),
        monthly_movement AS (
            SELECT date_trunc(
                       'month',
                       public.stockwise_transaction_timestamp(t) AT TIME ZONE p_timezone
                   )::date AS month,
                   COALESCE(SUM(t.quantity) FILTER (
                       WHERE upper(t.transaction_type) IN ('IN', 'STOCK_IN')
                   ), 0)::integer AS units_received,
                   COALESCE(SUM(t.quantity) FILTER (
                       WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
                   ), 0)::integer AS units_issued
            FROM public.inventory_transactions AS t
            WHERE t.organization_id = p_organization_id
              AND public.stockwise_transaction_timestamp(t) >= v_period_start
              AND public.stockwise_transaction_timestamp(t) < v_now
            GROUP BY 1
        ),
        product_totals AS (
            SELECT COUNT(*)::integer AS product_count,
                   COALESCE(SUM(quantity), 0)::integer AS stock_units,
                   COALESCE(SUM(price * quantity), 0) AS inventory_value,
                   COUNT(*) FILTER (
                       WHERE quantity > 25 AND quantity <= 50
                   )::integer AS low_stock_count,
                   COUNT(*) FILTER (WHERE quantity <= 25)::integer AS critical_count
            FROM active_products
        ),
        month_series AS (
            SELECT generated.month::date AS month
            FROM generate_series(
                v_start_month, v_current_month, interval '1 month'
            ) AS generated(month)
        )
        SELECT jsonb_build_object(
            'days', p_days,
            'period_start', (v_period_start AT TIME ZONE p_timezone)::date,
            'product_count', product_totals.product_count,
            'stock_units', product_totals.stock_units,
            'inventory_value', product_totals.inventory_value::text,
            'low_stock_count', product_totals.low_stock_count,
            'critical_count', product_totals.critical_count,
            'transaction_count', totals.transaction_count,
            'units_received', totals.units_received,
            'units_issued', totals.units_issued,
            'previous_transaction_count', totals.previous_transaction_count,
            'previous_units_received', totals.previous_units_received,
            'previous_units_issued', totals.previous_units_issued,
            'products', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', product.id,
                            'name', product.name,
                            'sku', product.sku,
                            'category', product.category,
                            'quantity', product.quantity,
                            'price', product.price::text,
                            'units_issued', product.units_issued,
                            'previous_units_issued', product.previous_units_issued
                        )
                        ORDER BY product.units_issued DESC, product.name
                    )
                    FROM active_products AS product
                ),
                '[]'::jsonb
            ),
            'monthly_movement', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'month', month_series.month,
                            'units_received', COALESCE(monthly.units_received, 0),
                            'units_issued', COALESCE(monthly.units_issued, 0)
                        )
                        ORDER BY month_series.month
                    )
                    FROM month_series
                    LEFT JOIN monthly_movement AS monthly USING (month)
                ),
                '[]'::jsonb
            )
        )
        FROM product_totals
        CROSS JOIN movement_totals AS totals
    );
END;
$function$;


INSERT INTO public.schema_migrations (version, name)
VALUES ('007', 'Timezone-aware report and dashboard calendar boundaries')
ON CONFLICT (version) DO NOTHING;

COMMIT;
