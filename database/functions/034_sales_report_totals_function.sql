

CREATE OR REPLACE FUNCTION public.stockwise_get_sales_report_totals(
    p_organization_id integer,
    p_days integer,
    p_timezone text
)
RETURNS TABLE (
    sales_count integer,
    units_sold integer,
    previous_sales_count integer
)
LANGUAGE sql
STABLE
AS $function$
    WITH bounds AS (
        SELECT ((CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date - (p_days - 1))::timestamp
                    AT TIME ZONE p_timezone AS period_start,
               ((CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date + 1)::timestamp
                    AT TIME ZONE p_timezone AS period_end
    ), sales AS (
        SELECT substring(
                   t.remarks
                   FROM '^Sale ([0-9a-fA-F-]+) \| payment:(cash|card|qr)$'
               ) AS sale_id,
               public.stockwise_transaction_timestamp(t) AS occurred_at,
               t.quantity
        FROM public.inventory_transactions AS t
        WHERE t.organization_id = p_organization_id
          AND upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
          AND t.remarks ~ '^Sale [0-9a-fA-F-]+ \| payment:(cash|card|qr)$'
    )
    SELECT
        COUNT(DISTINCT sales.sale_id) FILTER (
            WHERE sales.occurred_at >= bounds.period_start
              AND sales.occurred_at < bounds.period_end
        )::integer AS sales_count,
        COALESCE(SUM(sales.quantity) FILTER (
            WHERE sales.occurred_at >= bounds.period_start
              AND sales.occurred_at < bounds.period_end
        ), 0)::integer AS units_sold,
        COUNT(DISTINCT sales.sale_id) FILTER (
            WHERE sales.occurred_at >= bounds.period_start - (p_days * interval '1 day')
              AND sales.occurred_at < bounds.period_start
        )::integer AS previous_sales_count
    FROM bounds
    LEFT JOIN sales ON true
$function$;