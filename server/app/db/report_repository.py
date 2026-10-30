from sqlalchemy import text
from sqlalchemy.orm import Session


def get_dashboard_stock_flow(
    db: Session, organization_id: int, days: int = 7
) -> dict:
    result = db.execute(
        text("""
            SELECT public.stockwise_get_dashboard_stock_flow(
                :organization_id, :days
            )
        """),
        {"organization_id": organization_id, "days": days},
    )
    return result.scalar_one()


def get_inventory_report(db: Session, organization_id: int, days: int) -> dict:
    result = db.execute(
        text("""
            SELECT public.stockwise_get_inventory_report(
                :organization_id, :days
            )
        """),
        {"organization_id": organization_id, "days": days},
    )
    return result.scalar_one()
