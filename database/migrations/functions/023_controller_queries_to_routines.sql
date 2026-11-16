

CREATE OR REPLACE FUNCTION public.stockwise_get_user_timezone(p_email text)
RETURNS text
LANGUAGE sql
STABLE
AS $function$
    SELECT timezone
    FROM public.user_settings
    WHERE lower(email) = lower(p_email)
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_sales_revenue_totals(
    p_organization_id integer,
    p_days integer,
    p_timezone text
)
RETURNS TABLE (
    sales_revenue text,
    sales_revenue_tracking_since date
)
LANGUAGE sql
STABLE
AS $function$
    WITH bounds AS (
        SELECT ((CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date - (p_days - 1))::timestamp
                    AT TIME ZONE p_timezone AS period_start,
               ((CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date + 1)::timestamp
                    AT TIME ZONE p_timezone AS period_end
    )
    SELECT COALESCE((
               SELECT SUM(item.quantity * item.unit_price)
               FROM public.sales AS sale
               JOIN public.sale_items AS item USING (organization_id, sale_id)
               CROSS JOIN bounds
               WHERE sale.organization_id = p_organization_id
                 AND sale.sold_at >= bounds.period_start
                 AND sale.sold_at < bounds.period_end
           ), 0)::text AS sales_revenue,
           COALESCE((
               SELECT (migration.applied_at AT TIME ZONE p_timezone)::date
               FROM public.schema_migrations AS migration
               WHERE migration.version = '031'
           ), (CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date)
               AS sales_revenue_tracking_since
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_daily_inventory_movement(
    p_organization_id integer,
    p_days integer,
    p_offset integer,
    p_timezone text
)
RETURNS TABLE (
    day date,
    units_received integer,
    units_issued integer,
    received_value text
)
LANGUAGE sql
STABLE
AS $function$
    WITH bounds AS (
        SELECT ((CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date
                   - (p_offset * p_days) - (p_days - 1)) AS start_day,
               ((CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date
                   - (p_offset * p_days) + 1) AS end_day
    ),
    calendar AS (
        SELECT generated.day::date AS day
        FROM bounds
        CROSS JOIN LATERAL generate_series(
            bounds.start_day, bounds.end_day - 1, interval '1 day'
        ) AS generated(day)
    ),
    movement AS (
        SELECT
            (public.stockwise_transaction_timestamp(t) AT TIME ZONE p_timezone)::date AS day,
            COALESCE(SUM(t.quantity) FILTER (
                WHERE upper(t.transaction_type) IN ('IN', 'STOCK_IN')
            ), 0)::integer AS units_received,
            COALESCE(SUM(t.quantity) FILTER (
                WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
            ), 0)::integer AS units_issued,
            COALESCE(SUM(t.quantity * p.price) FILTER (
                WHERE upper(t.transaction_type) IN ('IN', 'STOCK_IN')
            ), 0)::text AS received_value
        FROM public.inventory_transactions AS t
        JOIN public.products AS p
          ON p.organization_id = t.organization_id
         AND p.product_id = t.product_id
        CROSS JOIN bounds
        WHERE t.organization_id = p_organization_id
          AND public.stockwise_transaction_timestamp(t) >=
              (bounds.start_day::timestamp AT TIME ZONE p_timezone)
          AND public.stockwise_transaction_timestamp(t) <
              (bounds.end_day::timestamp AT TIME ZONE p_timezone)
        GROUP BY 1
    )
    SELECT calendar.day,
           COALESCE(movement.units_received, 0),
           COALESCE(movement.units_issued, 0),
           COALESCE(movement.received_value, '0')
    FROM calendar LEFT JOIN movement USING (day)
    ORDER BY calendar.day DESC
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_yearly_inventory_movement(
    p_organization_id integer,
    p_year_offset integer,
    p_timezone text
)
RETURNS TABLE (
    year integer,
    units_received integer,
    units_issued integer,
    received_value text
)
LANGUAGE sql
STABLE
AS $function$
    WITH bounds AS (
        SELECT (
            date_trunc('year', CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date
            - make_interval(years => p_year_offset)
        )::date AS current_year
    ),
    movement AS (
        SELECT date_trunc(
                   'year',
                   public.stockwise_transaction_timestamp(t) AT TIME ZONE p_timezone
               )::date AS year,
               COALESCE(SUM(t.quantity) FILTER (
                   WHERE upper(t.transaction_type) IN ('IN', 'STOCK_IN')
               ), 0)::integer AS units_received,
               COALESCE(SUM(t.quantity) FILTER (
                   WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
               ), 0)::integer AS units_issued,
               COALESCE(SUM(t.quantity * p.price) FILTER (
                   WHERE upper(t.transaction_type) IN ('IN', 'STOCK_IN')
               ), 0)::text AS received_value
        FROM public.inventory_transactions AS t
        JOIN public.products AS p
          ON p.organization_id = t.organization_id
         AND p.product_id = t.product_id
        CROSS JOIN bounds
        WHERE t.organization_id = p_organization_id
          AND public.stockwise_transaction_timestamp(t) <
              ((bounds.current_year + interval '1 year')::timestamp AT TIME ZONE p_timezone)
        GROUP BY 1
    ),
    first_year AS (
        SELECT LEAST(
            COALESCE((SELECT MIN(movement.year) FROM movement), bounds.current_year),
            (bounds.current_year - interval '4 years')::date
        )::date AS year
        FROM bounds
    ),
    calendar AS (
        SELECT generated.year::date AS year
        FROM first_year CROSS JOIN bounds
        CROSS JOIN LATERAL generate_series(
            first_year.year, bounds.current_year, interval '1 year'
        ) AS generated(year)
    )
    SELECT extract(year FROM calendar.year)::integer,
           COALESCE(movement.units_received, 0),
           COALESCE(movement.units_issued, 0),
           COALESCE(movement.received_value, '0')
    FROM calendar LEFT JOIN movement USING (year)
    ORDER BY calendar.year
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_monthly_inventory_movement_totals(
    p_organization_id integer,
    p_timezone text
)
RETURNS TABLE (
    transaction_count integer,
    units_received integer,
    units_issued integer
)
LANGUAGE sql
STABLE
AS $function$
    SELECT COUNT(*)::integer AS transaction_count,
           COALESCE(SUM(t.quantity) FILTER (
               WHERE upper(t.transaction_type) IN ('IN', 'STOCK_IN')
           ), 0)::integer AS units_received,
           COALESCE(SUM(t.quantity) FILTER (
               WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
           ), 0)::integer AS units_issued
    FROM public.inventory_transactions AS t
    WHERE t.organization_id = p_organization_id
      AND public.stockwise_transaction_timestamp(t) >=
          date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE p_timezone) AT TIME ZONE p_timezone
      AND public.stockwise_transaction_timestamp(t) < CURRENT_TIMESTAMP
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_usage_analytics(
    p_organization_id integer,
    p_days integer
)
RETURNS TABLE (
    page text,
    views integer
)
LANGUAGE sql
STABLE
AS $function$
    SELECT page_key AS page,
           COALESCE(SUM(view_count), 0)::integer AS views
    FROM public.stockwise_usage_daily
    WHERE organization_id = p_organization_id
      AND usage_date >= CURRENT_DATE - (p_days - 1)
      AND usage_date <= CURRENT_DATE
    GROUP BY page_key
    ORDER BY views DESC, page_key
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_organization_login_notifications(
    p_organization_id integer,
    p_email text
)
RETURNS TABLE (
    notification_id bigint,
    organization_id integer,
    actor_name text,
    actor_role text,
    created_at timestamptz,
    read_at timestamptz
)
LANGUAGE sql
STABLE
AS $function$
    SELECT notification_id,
           organization_id,
           actor_name,
           actor_role,
           created_at,
           read_at
    FROM public.organization_member_login_notifications
    WHERE organization_id = p_organization_id
      AND lower(recipient_email) = lower(p_email)
      AND created_at >= CURRENT_TIMESTAMP - interval '30 days'
    ORDER BY created_at DESC
    LIMIT 50
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_organization_member_presence(
    p_organization_id integer
)
RETURNS TABLE (
    email text,
    online boolean
)
LANGUAGE sql
STABLE
AS $function$
    SELECT lower(email) AS email,
           last_seen_at >= CURRENT_TIMESTAMP - interval '90 seconds' AS online
    FROM public.organization_member_presence
    WHERE organization_id = p_organization_id
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_merchant_qr(p_organization_id integer)
RETURNS text
LANGUAGE sql
STABLE
AS $function$
    SELECT merchant_qr_data
    FROM public.organization_payment_settings
    WHERE organization_id = p_organization_id
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_existing_sale_item_count(
    p_organization_id integer,
    p_sale_id uuid
)
RETURNS TABLE (items_sold integer)
LANGUAGE sql
STABLE
AS $function$
    SELECT COUNT(item.product_id)::integer AS items_sold
    FROM public.sales AS sale
    LEFT JOIN public.sale_items AS item
      ON item.organization_id = sale.organization_id
     AND item.sale_id = sale.sale_id
    WHERE sale.organization_id = p_organization_id
      AND sale.sale_id = p_sale_id
    GROUP BY sale.sale_id
$function$;