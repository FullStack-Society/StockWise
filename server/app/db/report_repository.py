from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session


def _transaction_timestamp_column(db: Session) -> str:
    """Find the timestamp field used by this database's transaction table."""
    columns = db.execute(
        text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'inventory_transactions'
        """)
    ).scalars().all()
    supported = {"transaction_date", "created_at", "transaction_at", "timestamp", "date"}
    for name in ("transaction_date", "created_at", "transaction_at", "timestamp", "date"):
        if name in supported and name in columns:
            return name
    raise ValueError("inventory_transactions has no supported timestamp column")


def get_inventory_report(db: Session, organization_id: int, days: int) -> dict:
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=days)
    previous_start = period_start - timedelta(days=days)
    # The column comes only from the fixed allowlist above, so quoting is safe.
    transaction_time = f't."{_transaction_timestamp_column(db)}"'

    products = db.execute(
        text(f"""
            SELECT p.product_id AS id, p.product_name AS name, p.sku,
                   COALESCE(c.category_name, 'Uncategorized') AS category,
                   p.quantity, p.minimum_stock, p.price,
                   COALESCE(SUM(t.quantity) FILTER (
                       WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
                         AND {transaction_time} >= :period_start
                         AND {transaction_time} < :now
                   ), 0)::integer AS units_issued,
                   COALESCE(SUM(t.quantity) FILTER (
                       WHERE upper(t.transaction_type) IN ('OUT', 'STOCK_OUT')
                         AND {transaction_time} >= :previous_start
                         AND {transaction_time} < :period_start
                   ), 0)::integer AS previous_units_issued
            FROM public.products AS p
            LEFT JOIN public.categories AS c
              ON c.organization_id = p.organization_id
             AND c.category_id = p.category_id
            LEFT JOIN public.inventory_transactions AS t
              ON t.organization_id = p.organization_id
             AND t.product_id = p.product_id
             AND {transaction_time} >= :previous_start
             AND {transaction_time} < :now
            WHERE p.organization_id = :organization_id
              AND p.is_deleted = false
            GROUP BY p.product_id, p.product_name, p.sku, c.category_name,
                     p.quantity, p.minimum_stock, p.price
            ORDER BY units_issued DESC, p.product_name
        """),
        {
            "organization_id": organization_id,
            "period_start": period_start,
            "previous_start": previous_start,
            "now": now,
        },
    ).mappings().all()

    totals = db.execute(
        text(f"""
            SELECT
                COUNT(*) FILTER (WHERE {transaction_time} >= :period_start
                                  AND {transaction_time} < :now)::integer AS transaction_count,
                COALESCE(SUM(quantity) FILTER (
                    WHERE upper(transaction_type) IN ('IN', 'STOCK_IN')
                      AND {transaction_time} >= :period_start
                      AND {transaction_time} < :now
                ), 0)::integer AS units_received,
                COALESCE(SUM(quantity) FILTER (
                    WHERE upper(transaction_type) IN ('OUT', 'STOCK_OUT')
                      AND {transaction_time} >= :period_start
                      AND {transaction_time} < :now
                ), 0)::integer AS units_issued,
                COUNT(*) FILTER (WHERE {transaction_time} >= :previous_start
                                  AND {transaction_time} < :period_start)::integer AS previous_transaction_count,
                COALESCE(SUM(quantity) FILTER (
                    WHERE upper(transaction_type) IN ('IN', 'STOCK_IN')
                      AND {transaction_time} >= :previous_start
                      AND {transaction_time} < :period_start
                ), 0)::integer AS previous_units_received,
                COALESCE(SUM(quantity) FILTER (
                    WHERE upper(transaction_type) IN ('OUT', 'STOCK_OUT')
                      AND {transaction_time} >= :previous_start
                      AND {transaction_time} < :period_start
                ), 0)::integer AS previous_units_issued
            FROM public.inventory_transactions AS t
            WHERE organization_id = :organization_id
              AND {transaction_time} >= :previous_start
              AND {transaction_time} < :now
        """),
        {
            "organization_id": organization_id,
            "period_start": period_start,
            "previous_start": previous_start,
            "now": now,
        },
    ).mappings().one()

    monthly_rows = db.execute(
        text(f"""
            SELECT date_trunc('month', {transaction_time})::date AS month,
                   COALESCE(SUM(quantity) FILTER (WHERE upper(transaction_type) IN ('IN', 'STOCK_IN')), 0)::integer AS units_received,
                   COALESCE(SUM(quantity) FILTER (WHERE upper(transaction_type) IN ('OUT', 'STOCK_OUT')), 0)::integer AS units_issued
            FROM public.inventory_transactions AS t
            WHERE organization_id = :organization_id
              AND {transaction_time} >= :period_start
              AND {transaction_time} < :now
            GROUP BY date_trunc('month', {transaction_time})::date
            ORDER BY month
        """),
        {
            "organization_id": organization_id,
            "period_start": period_start,
            "now": now,
        },
    ).mappings().all()
    monthly_by_date = {row["month"]: dict(row) for row in monthly_rows}
    month_cursor = date(period_start.year, period_start.month, 1)
    current_month = date(now.year, now.month, 1)
    monthly_movement = []
    while month_cursor <= current_month:
        monthly_movement.append(
            monthly_by_date.get(
                month_cursor,
                {
                    "month": month_cursor,
                    "units_received": 0,
                    "units_issued": 0,
                },
            )
        )
        month_cursor = (
            date(month_cursor.year + 1, 1, 1)
            if month_cursor.month == 12
            else date(month_cursor.year, month_cursor.month + 1, 1)
        )

    return {
        "days": days,
        "period_start": period_start.date(),
        "product_count": len(products),
        "stock_units": sum(row["quantity"] for row in products),
        "inventory_value": sum((row["price"] * row["quantity"] for row in products), start=0),
        "low_stock_count": sum(
            1 for row in products if 0 < row["quantity"] <= row["minimum_stock"]
        ),
        "out_of_stock_count": sum(1 for row in products if row["quantity"] == 0),
        **dict(totals),
        "products": [dict(row) for row in products],
        "monthly_movement": monthly_movement,
    }
