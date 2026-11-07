from sqlalchemy import text
from sqlalchemy.orm import Session


USAGE_ANALYTICS_PAGES = ("dashboard", "inventory", "orders", "reports", "settings", "users")


def record_usage_page_view(db: Session, organization_id: int, email: str, page: str) -> bool:
    if page not in USAGE_ANALYTICS_PAGES:
        return False
    result = db.execute(
        text("""
            INSERT INTO public.stockwise_usage_daily (
                organization_id, usage_date, page_key, view_count
            )
            SELECT :organization_id, CURRENT_DATE, :page, 1
            WHERE EXISTS (
                SELECT 1 FROM public.user_settings
                WHERE lower(email) = lower(:email) AND usage_analytics = true
            )
            ON CONFLICT (organization_id, usage_date, page_key)
            DO UPDATE SET view_count = public.stockwise_usage_daily.view_count + 1
            RETURNING view_count
        """),
        {"organization_id": organization_id, "page": page, "email": email.strip().lower()},
    )
    return result.scalar_one_or_none() is not None


def get_usage_analytics_summary(db: Session, organization_id: int, days: int = 30) -> dict:
    rows = db.execute(
        text("""
            SELECT page_key AS page, COALESCE(SUM(view_count), 0)::integer AS views
            FROM public.stockwise_usage_daily
            WHERE organization_id = :organization_id
              AND usage_date >= CURRENT_DATE - (:days - 1)
              AND usage_date <= CURRENT_DATE
            GROUP BY page_key
            ORDER BY views DESC, page_key
        """),
        {"organization_id": organization_id, "days": days},
    ).mappings().all()
    by_page = [dict(row) for row in rows]
    return {"days": days, "total_views": sum(row["views"] for row in by_page), "by_page": by_page}


def get_dashboard_stock_flow(
    db: Session, organization_id: int, days: int = 7, timezone: str = "Asia/Manila"
) -> dict:
    result = db.execute(
        text("""
            SELECT public.stockwise_get_dashboard_stock_flow(
                :organization_id, :days, :timezone
            )
        """),
        {"organization_id": organization_id, "days": days, "timezone": timezone},
    )
    return result.scalar_one()


def get_inventory_report(
    db: Session,
    organization_id: int,
    days: int,
    timezone: str = "Asia/Manila",
    offset: int = 0,
    year_offset: int = 0,
) -> dict:
    result = db.execute(
        text("""
            SELECT public.stockwise_get_inventory_report(
                :organization_id, :days, :timezone
            )
        """),
        {"organization_id": organization_id, "days": days, "timezone": timezone},
    )
    report = result.scalar_one()
    retail_totals = db.execute(text("""
        SELECT
          COALESCE((SELECT SUM(s.quantity * p.unit_cost)
            FROM public.inventory_location_stock s
            JOIN public.products p ON p.organization_id=s.organization_id AND p.product_id=s.product_id
            WHERE s.organization_id=:org AND p.is_deleted=false), 0)::text AS stock_cost_value
    """), {"org": organization_id}).mappings().one()
    report.update(dict(retail_totals))
    daily_movement = db.execute(
        text("""
            WITH bounds AS (
                SELECT ((CURRENT_TIMESTAMP AT TIME ZONE :timezone)::date
                           - (:offset * :days) - (:days - 1)) AS start_day,
                       ((CURRENT_TIMESTAMP AT TIME ZONE :timezone)::date
                           - (:offset * :days) + 1) AS end_day
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
                    (public.stockwise_transaction_timestamp(t)
                        AT TIME ZONE :timezone)::date AS day,
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
                WHERE t.organization_id = :organization_id
                  AND public.stockwise_transaction_timestamp(t) >=
                      (bounds.start_day::timestamp AT TIME ZONE :timezone)
                  AND public.stockwise_transaction_timestamp(t) <
                      (bounds.end_day::timestamp AT TIME ZONE :timezone)
                GROUP BY 1
            )
            SELECT calendar.day,
                   COALESCE(movement.units_received, 0) AS units_received,
                   COALESCE(movement.units_issued, 0) AS units_issued,
                   COALESCE(movement.received_value, '0') AS received_value
            FROM calendar
            LEFT JOIN movement USING (day)
            ORDER BY calendar.day DESC
        """),
        {
            "organization_id": organization_id,
            "days": days,
            "timezone": timezone,
            "offset": offset,
        },
    ).mappings().all()
    report["daily_movement"] = [dict(row) for row in daily_movement]
    yearly_movement = db.execute(
        text("""
            WITH bounds AS (
                SELECT (
                    date_trunc(
                        'year', CURRENT_TIMESTAMP AT TIME ZONE :timezone
                    )::date - make_interval(years => :year_offset)
                )::date AS current_year
            ),
            movement AS (
                SELECT date_trunc(
                           'year',
                           public.stockwise_transaction_timestamp(t)
                               AT TIME ZONE :timezone
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
                WHERE t.organization_id = :organization_id
                  AND public.stockwise_transaction_timestamp(t) <
                      ((bounds.current_year + interval '1 year')::timestamp
                          AT TIME ZONE :timezone)
                GROUP BY 1
            ),
            first_year AS (
                SELECT LEAST(
                    COALESCE(
                        (SELECT MIN(movement.year) FROM movement),
                        bounds.current_year
                    ),
                    (bounds.current_year - interval '4 years')::date
                )::date AS year
                FROM bounds
            ),
            calendar AS (
                SELECT generated.year::date AS year
                FROM first_year
                CROSS JOIN bounds
                CROSS JOIN LATERAL generate_series(
                    first_year.year,
                    bounds.current_year,
                    interval '1 year'
                ) AS generated(year)
            )
            SELECT extract(year FROM calendar.year)::integer AS year,
                   COALESCE(movement.units_received, 0) AS units_received,
                   COALESCE(movement.units_issued, 0) AS units_issued,
                   COALESCE(movement.received_value, '0') AS received_value
            FROM calendar
            LEFT JOIN movement USING (year)
            ORDER BY calendar.year
        """),
        {
            "organization_id": organization_id,
            "timezone": timezone,
            "year_offset": year_offset,
        },
    ).mappings().all()
    report["yearly_movement"] = [dict(row) for row in yearly_movement]
    monthly_totals = db.execute(
        text("""
            SELECT
                COUNT(*)::integer AS transaction_count,
                COALESCE(SUM(t.quantity) FILTER (
                    WHERE upper(t.transaction_type) IN ('IN', 'STOCK_IN')
                ), 0)::integer AS units_received,
                COALESCE(SUM(t.quantity) FILTER (
                    WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
                ), 0)::integer AS units_issued
            FROM public.inventory_transactions AS t
            WHERE t.organization_id = :organization_id
              AND public.stockwise_transaction_timestamp(t)
                  >= date_trunc(
                    'month', CURRENT_TIMESTAMP AT TIME ZONE :timezone
                  ) AT TIME ZONE :timezone
              AND public.stockwise_transaction_timestamp(t) < CURRENT_TIMESTAMP
        """),
        {"organization_id": organization_id, "timezone": timezone},
    ).mappings().one()
    reorder_summary = db.execute(
        text("""
            SELECT public.stockwise_get_reorder_summary(:organization_id)
        """),
        {"organization_id": organization_id},
    ).scalar_one()
    report["low_stock_count"] = reorder_summary["low_stock_count"]
    report["critical_count"] = reorder_summary["critical_count"]
    report["monthly_transaction_count"] = monthly_totals["transaction_count"]
    report["monthly_units_received"] = monthly_totals["units_received"]
    report["monthly_units_issued"] = monthly_totals["units_issued"]
    return report
