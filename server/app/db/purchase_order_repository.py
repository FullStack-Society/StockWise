import json

from sqlalchemy import text
from sqlalchemy.orm import Session


def create_purchase_order(
    db: Session,
    organization_id: int,
    email: str,
    notes: str | None,
    items: list[dict],
) -> int:
    result = db.execute(
        text("""
            SELECT public.stockwise_create_purchase_order(
                :p_organization_id,
                :p_email,
                :p_notes,
                CAST(:p_items AS jsonb)
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_email": email.strip().lower(),
            "p_notes": notes,
            "p_items": json.dumps(items),
        },
    )
    return int(result.scalar_one())


def get_purchase_orders(
    db: Session,
    organization_id: int,
    order_id: int | None = None,
    limit: int = 100,
) -> list[dict]:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_get_purchase_orders(
                :p_organization_id, :p_order_id, :p_limit
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_order_id": order_id,
            "p_limit": limit,
        },
    )
    return [dict(row) for row in result.mappings().all()]


def receive_purchase_order_item(
    db: Session,
    organization_id: int,
    email: str,
    order_id: int,
    item_id: int,
    quantity: int,
) -> dict:
    result = db.execute(
        text("""
            SELECT * FROM public.stockwise_receive_purchase_order_item(
                :p_organization_id,
                :p_email,
                :p_order_id,
                :p_item_id,
                :p_quantity
            )
        """),
        {
            "p_organization_id": organization_id,
            "p_email": email.strip().lower(),
            "p_order_id": order_id,
            "p_item_id": item_id,
            "p_quantity": quantity,
        },
    )
    return dict(result.mappings().one())
